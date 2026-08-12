/**
 * 예약 수강신청 스크립트 (본신청 전용).
 *
 * 흐름:
 * 1) 시작 시각(시:분:초) 설정
 * 2) 신청할 과목을 우선순위와 함께 미리 담기
 * 3) 시각 도달 → 로그인 성공할 때까지 반복
 * 4) 로그인 성공 후 대기 과목을 우선순위 순 라운드로빈으로 신청 (될 때까지)
 * 5) 종료 시 성공/실패 요약 + 서버 내 신청 목록 표시
 *
 * 희망바구니 아님. 쿠키: .seowon-sugang.cookies.json
 * Ctrl+C 로 언제든 중단 가능.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  ANSI,
  color,
  printSection,
  printInfo,
  printSuccess,
  printWarning,
  printErrorMessage,
  ask
} from "../src/cli-ui.js";
import {
  createCourseRegistrationClient,
  CourseRegErrorType,
  type CourseRegistrationClient,
  type CourseRegLoginResult,
  type CourseRegMutationResult,
  type SugangSubject
} from "../src/index.js";
import {
  COURSE_DB_ENV_PATH,
  formatCourseDbRef,
  loadLatestCourseDb,
  searchLocalCourses,
  type LocalCourseRecord
} from "../src/course-catalog/local-db.js";
import { generateCourseDb } from "../src/course-catalog/generate-db.js";
import { exportRegisteredTimetableFromClient } from "./registered-timetable.js";

const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-sugang.cookies.json");
const DEFAULT_PLAN_FILE = path.resolve(process.cwd(), "scheduled-registration.plan.json");

/** 미리 담아 둘 과목 (우선순위 낮을수록 먼저 시도) */
interface PlannedCourse {
  priority: number;
  subjtCd: string;
  corseDvclsNo: string;
  cmpsjDivCd?: string;
  subjtNm?: string;
  cmpsjCdt?: string;
  timtbNm?: string;
  note?: string;
}

/** 디스크에 저장하는 예약 플랜 */
interface RegistrationPlan {
  /** HH:MM 또는 HH:MM:SS */
  targetTime: string;
  /** YYYY-MM-DD (없으면 오늘, 이미 지났으면 내일) */
  targetDate?: string;
  loginIntervalMs: number;
  registerIntervalMs: number;
  /** 과목당 최대 신청 시도 (0=무한, 전체 라운드 기준이 아니라 과목별 누적) */
  maxAttemptsPerCourse: number;
  courses: PlannedCourse[];
}

type CourseOutcomeStatus = "pending" | "success" | "failed" | "skipped";

interface CourseRuntimeState extends PlannedCourse {
  status: CourseOutcomeStatus;
  attempts: number;
  lastMessage?: string;
  lastErrorType?: CourseRegErrorType | string;
  finishedAt?: string;
}

/**
 * 예약 수강신청 진입점
 */
async function run(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- ⏰ 서원대 예약 수강신청 (본신청) ---");
  printInfo("시각 예약 → 로그인 성공할 때까지 → 우선순위 라운드로빈 신청");
  printInfo("희망바구니 아님 · menuId=M100780 · 쿠키=.seowon-sugang.cookies.json");
  printInfo("Ctrl+C 로 중단할 수 있습니다.\n");

  let stopRequested = false;
  const onSigint = () => {
    stopRequested = true;
    printWarning("\n중단 요청됨… 현재 단계 종료 후 멈춥니다.");
  };
  process.on("SIGINT", onSigint);

  try {
    const plan = await buildOrLoadPlan(rl);
    printPlanSummary(plan);

    const confirm = (await ask(rl, "이 설정으로 대기/실행할까요? (y/n)", "y")).toLowerCase();
    if (confirm !== "y" && confirm !== "yes" && confirm !== "ㅇ") {
      printWarning("취소되었습니다.");
      return;
    }

    const savePlan = (await ask(rl, "플랜을 파일로 저장할까요? (y/n)", "y")).toLowerCase();
    if (savePlan === "y" || savePlan === "yes" || savePlan === "ㅇ") {
      const planPath = await ask(rl, "저장 경로", DEFAULT_PLAN_FILE);
      writePlanFile(planPath, plan);
      printSuccess(`플랜 저장: ${planPath}`);
    }

    // 매크로 모드: 진행 로그는 핵심만 (일정확인·장학생·메뉴 등은 호출 자체 생략)
    const client = createCourseRegistrationClient({
      cookieFilePath: DEFAULT_COOKIE_FILE,
      requestTimeoutMs: 20_000,
      maxRetries: 2,
      // 예약 모드에서는 바깥 루프가 로그인 재시도를 담당
      loginMaxRetries: 2,
      onProgress: (message) => {
        if (isNoisyProgress(message)) return;
        printInfo(`… ${message}`);
      }
    });

    const stuno = process.env.SEOWON_ID?.trim() || "";
    const password = process.env.SEOWON_PASSWORD?.trim() || "";
    if (!stuno || !password) {
      printWarning(".env 의 SEOWON_ID / SEOWON_PASSWORD 가 없습니다. 직접 입력합니다.");
    }
    const finalStuno = stuno || (await ask(rl, "학번", ""));
    const finalPassword = password || (await ask(rl, "비밀번호", ""));
    if (!finalStuno || !finalPassword) {
      throw new Error("학번과 비밀번호가 필요합니다.");
    }
    client.setCredentials({ stuno: finalStuno, password: finalPassword });

    const targetAt = resolveTargetDateTime(plan);
    printInfo(`설정된 예약 시각: ${formatDateTime(targetAt)}`);
    printInfo("y = 예약 시각을 무시하고 지금 즉시 로그인·신청 시작 (테스트용)");
    printInfo("n = 위 예약 시각까지 대기 후 시작");
    const startNow =
      (await ask(rl, "대기 없이 지금 바로 시작할까요? (y/n)", "n")).toLowerCase() === "y";

    if (!startNow) {
      await waitUntil(targetAt, () => stopRequested);
      if (stopRequested) {
        printWarning("대기 중 중단되었습니다.");
        return;
      }
    } else {
      printWarning(
        `대기 생략 — 예약 시각(${formatDateTime(targetAt)})과 무관하게 즉시 실행합니다.`
      );
    }

    printSection("\n[1/3] 로그인 (fast · 성공할 때까지)");
    printInfo("fast 모드: 세션·학기·로그인·학생문맥만 (일정확인/메뉴진입 생략)");
    const loginOk = await loginUntilSuccess(client, {
      stuno: finalStuno,
      password: finalPassword,
      intervalMs: plan.loginIntervalMs,
      shouldStop: () => stopRequested
    });
    if (!loginOk) {
      printErrorMessage("로그인에 성공하지 못한 채 종료되었습니다.");
      return;
    }

    printSection("\n[2/3] 우선순위 라운드로빈 수강신청");
    const states = plan.courses
      .slice()
      .sort((a, b) => a.priority - b.priority || a.subjtCd.localeCompare(b.subjtCd))
      .map(
        (c): CourseRuntimeState => ({
          ...c,
          status: "pending",
          attempts: 0
        })
      );

    await registerRoundRobin(client, states, {
      intervalMs: plan.registerIntervalMs,
      maxAttemptsPerCourse: plan.maxAttemptsPerCourse,
      shouldStop: () => stopRequested
    });

    printSection("\n[3/3] 결과 요약");
    printOutcomeSummary(states);

    try {
      const registered = await client.getMyRegisteredList();
      printSection("\n[서버 내 수강신청 목록]");
      if (!registered.length) {
        printWarning("(목록 비어 있음)");
      } else {
        let credits = 0;
        for (const [i, s] of registered.entries()) {
          const cdt = Number(s.cmpsjCdt) || 0;
          credits += cdt;
          console.log(
            `  ${i + 1}. [${s.subjtCd}-${s.corseDvclsNo}] ${s.subjtNm} | ${cdt || "?"}학점 | ${
              s.timtbNm || "시간미정"
            }`
          );
        }
        printInfo(`합계 ${registered.length}과목 / 약 ${credits}학점`);
        const saveImage = (
          await ask(rl, "확정 수강 시간표 이미지를 저장할까요? (y/n)", "y")
        ).toLowerCase();
        if (saveImage === "y" || saveImage === "yes" || saveImage === "ㅇ") {
          await exportRegisteredTimetableFromClient(client);
        }
      }
    } catch (err) {
      printWarning(`내 신청 목록 조회 실패: ${err instanceof Error ? err.message : String(err)}`);
    }
  } catch (err) {
    printErrorMessage(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    process.off("SIGINT", onSigint);
    rl.close();
    printInfo("\n예약 수강신청 스크립트를 종료합니다.");
  }
}

/**
 * 플랜을 파일에서 불러오거나 대화형으로 구성한다
 */
async function buildOrLoadPlan(rl: readline.Interface): Promise<RegistrationPlan> {
  const mode = await ask(
    rl,
    "1=새로 구성  2=플랜 파일 불러오기",
    fs.existsSync(DEFAULT_PLAN_FILE) ? "2" : "1"
  );

  if (mode === "2") {
    const planPath = await ask(rl, "플랜 파일 경로", DEFAULT_PLAN_FILE);
    if (!fs.existsSync(planPath)) {
      printWarning(`파일 없음: ${planPath} → 새로 구성합니다.`);
    } else {
      const loaded = readPlanFile(planPath);
      printSuccess(`플랜 로드: ${planPath} (${loaded.courses.length}과목)`);
      const edit = (await ask(rl, "과목/시각을 수정할까요? (y/n)", "n")).toLowerCase();
      if (edit !== "y" && edit !== "yes") {
        return loaded;
      }
      return await editPlanInteractively(rl, loaded);
    }
  }

  return await editPlanInteractively(rl, defaultPlan());
}

/**
 * 기본 플랜 값
 */
function defaultPlan(): RegistrationPlan {
  return {
    targetTime: "09:00:00",
    loginIntervalMs: 300,
    registerIntervalMs: 200,
    maxAttemptsPerCourse: 0,
    courses: []
  };
}

/**
 * 대화형으로 시각·간격·과목 큐를 편집한다
 */
async function editPlanInteractively(
  rl: readline.Interface,
  base: RegistrationPlan
): Promise<RegistrationPlan> {
  printSection("\n[예약 시각]");
  const targetDate = await ask(
    rl,
    "날짜 YYYY-MM-DD (빈 칸=오늘, 지난 시각이면 내일)",
    base.targetDate || ""
  );
  const targetTime = await ask(rl, "시각 HH:MM 또는 HH:MM:SS", base.targetTime || "09:00:00");

  printSection("\n[간격 설정]");
  const loginIntervalMs =
    Number(await ask(rl, "로그인 재시도 간격(ms)", String(base.loginIntervalMs || 300))) || 300;
  const registerIntervalMs =
    Number(await ask(rl, "과목 신청 간격(ms)", String(base.registerIntervalMs || 200))) || 200;
  const maxAttemptsPerCourse =
    Number(
      await ask(rl, "과목당 최대 시도 횟수 (0=무한)", String(base.maxAttemptsPerCourse ?? 0))
    ) || 0;

  const courses = [...(base.courses || [])];
  printSection("\n[신청 과목 큐 — 우선순위 순]");
  if (courses.length) {
    printCourseQueue(courses);
  }

  const clientForSearch = createCourseRegistrationClient({
    cookieFilePath: DEFAULT_COOKIE_FILE,
    requestTimeoutMs: 30_000,
    maxRetries: 2,
    loginMaxRetries: 3,
    onProgress: (message) => printInfo(`… ${message}`)
  });
  const envStuno = process.env.SEOWON_ID?.trim() || "";
  const envPassword = process.env.SEOWON_PASSWORD?.trim() || "";
  if (envStuno && envPassword) {
    clientForSearch.setCredentials({ stuno: envStuno, password: envPassword });
  }

  let searchReady = false;
  while (true) {
    console.log(
      `\n${color("a", ANSI.yellow)}=검색으로 추가(라이브→로컬DB)  ${color("b", ANSI.yellow)}=로컬 DB만 검색  ${color("g", ANSI.yellow)}=로컬 DB 생성  ${color("m", ANSI.yellow)}=코드 직접 입력`
    );
    console.log(
      `${color("d", ANSI.yellow)}=삭제  ${color("p", ANSI.yellow)}=우선순위 변경  ${color("l", ANSI.yellow)}=목록  ${color("q", ANSI.yellow)}=담기 완료`
    );
    const cmd = (await rl.question("선택: ")).trim().toLowerCase();
    if (cmd === "q" || cmd === "0") break;

    if (cmd === "g") {
      await runGenerateLocalDbMenu(rl, {
        envStuno,
        envPassword,
        shouldStop: () => false
      });
      continue;
    }

    if (cmd === "l") {
      printCourseQueue(courses);
      continue;
    }

    if (cmd === "d") {
      if (!courses.length) {
        printWarning("삭제할 과목이 없습니다.");
        continue;
      }
      printCourseQueue(courses);
      const idx = Number(await ask(rl, "삭제할 번호(1-based)", "")) - 1;
      if (idx >= 0 && idx < courses.length) {
        const removed = courses.splice(idx, 1)[0];
        printSuccess(`삭제: [${removed?.subjtCd}-${removed?.corseDvclsNo}]`);
        renumberPriorities(courses);
      }
      continue;
    }

    if (cmd === "p") {
      if (!courses.length) {
        printWarning("과목이 없습니다.");
        continue;
      }
      printCourseQueue(courses);
      const idx = Number(await ask(rl, "우선순위 바꿀 번호", "")) - 1;
      const newPri = Number(await ask(rl, "새 우선순위 (숫자, 작을수록 먼저)", ""));
      if (idx >= 0 && idx < courses.length && Number.isFinite(newPri)) {
        courses[idx]!.priority = newPri;
        courses.sort((a, b) => a.priority - b.priority);
        printSuccess("우선순위를 반영했습니다.");
        printCourseQueue(courses);
      }
      continue;
    }

    if (cmd === "m") {
      const subjtCd = await ask(rl, "과목코드", "");
      const corseDvclsNo = await ask(rl, "분반", "01");
      const cmpsjDivCd = await ask(rl, "이수구분코드(선택)", "");
      const subjtNm = await ask(rl, "과목명(선택)", "");
      if (!subjtCd || !corseDvclsNo) {
        printWarning("과목코드/분반이 필요합니다.");
        continue;
      }
      if (courses.some((c) => c.subjtCd === subjtCd && c.corseDvclsNo === corseDvclsNo)) {
        printWarning("이미 큐에 있는 분반입니다.");
        continue;
      }
      const priority = Number(
        await ask(rl, "우선순위 (작을수록 먼저)", String(nextPriority(courses)))
      );
      courses.push({
        priority: Number.isFinite(priority) ? priority : nextPriority(courses),
        subjtCd,
        corseDvclsNo,
        cmpsjDivCd: cmpsjDivCd || undefined,
        subjtNm: subjtNm || undefined
      });
      courses.sort((a, b) => a.priority - b.priority);
      printSuccess(`담김: P${priority} [${subjtCd}-${corseDvclsNo}] ${subjtNm}`);
      continue;
    }

    if (cmd === "a" || cmd === "b") {
      const localOnly = cmd === "b";
      const keyword = await ask(rl, "검색어(과목명/코드)", "");
      if (!keyword.trim()) {
        printWarning("검색어를 입력하세요.");
        continue;
      }

      const hits = await findCoursesForPlan(keyword, {
        localOnly,
        envStuno,
        envPassword,
        clientForSearch,
        getSearchReady: () => searchReady,
        setSearchReady: (v) => {
          searchReady = v;
        }
      });
      if (!hits.length) {
        printWarning("검색 결과 없음. 코드 직접 입력(m) 또는 npm run generate:db 후 다시 시도하세요.");
        continue;
      }

      printInfo(`${hits.length}건 — 번호로 선택 (예: 1 또는 1,3,5)`);
      hits.slice(0, 50).forEach((s, i) => {
        const src = s._source === "local" ? color(" [로컬DB]", ANSI.cyan) : "";
        console.log(`  ${i + 1}. ${formatSearchHit(s)}${src}`);
      });
      if (hits.length > 50) {
        printWarning("50건만 표시. 검색어를 좁혀 주세요.");
      }
      const pick = await ask(rl, "선택할 번호", "1");
      const indexes = parseIndexes(pick, Math.min(hits.length, 50));
      for (const i of indexes) {
        const s = hits[i];
        if (!s) continue;
        if (courses.some((c) => c.subjtCd === s.subjtCd && c.corseDvclsNo === s.corseDvclsNo)) {
          printWarning(`이미 있음: [${s.subjtCd}-${s.corseDvclsNo}]`);
          continue;
        }
        const priority = Number(
          await ask(
            rl,
            `[${s.subjtCd}-${s.corseDvclsNo}] ${s.subjtNm || ""} 우선순위`,
            String(nextPriority(courses))
          )
        );
        courses.push({
          priority: Number.isFinite(priority) ? priority : nextPriority(courses),
          subjtCd: s.subjtCd,
          corseDvclsNo: s.corseDvclsNo,
          cmpsjDivCd: s.cmpsjDivCd || undefined,
          subjtNm: s.subjtNm,
          cmpsjCdt: s.cmpsjCdt,
          timtbNm: s.timtbNm
        });
        printSuccess(`담김: P${priority} [${s.subjtCd}-${s.corseDvclsNo}] ${s.subjtNm || ""}`);
      }
      courses.sort((a, b) => a.priority - b.priority);
      continue;
    }

    printWarning("알 수 없는 명령입니다.");
  }

  if (!courses.length) {
    throw new Error("신청할 과목이 하나도 없습니다. 큐에 과목을 담아 주세요.");
  }

  return {
    targetTime: normalizeTimeString(targetTime),
    targetDate: targetDate.trim() || undefined,
    loginIntervalMs,
    registerIntervalMs,
    maxAttemptsPerCourse,
    courses
  };
}

/**
 * 플랜 요약 출력
 */
function printPlanSummary(plan: RegistrationPlan): void {
  printSection("\n[설정 요약]");
  const at = resolveTargetDateTime(plan);
  printInfo(`예약 시각: ${formatDateTime(at)} (로컬)`);
  printInfo(`로그인 간격: ${plan.loginIntervalMs}ms`);
  printInfo(`신청 간격: ${plan.registerIntervalMs}ms`);
  printInfo(
    `과목당 최대 시도: ${plan.maxAttemptsPerCourse > 0 ? plan.maxAttemptsPerCourse : "무한"}`
  );
  printCourseQueue(plan.courses);
}

/**
 * 과목 큐 출력
 */
function printCourseQueue(courses: PlannedCourse[]): void {
  if (!courses.length) {
    printWarning("(비어 있음)");
    return;
  }
  const sorted = courses.slice().sort((a, b) => a.priority - b.priority);
  sorted.forEach((c, i) => {
    console.log(
      `  ${i + 1}. P${c.priority} [${c.subjtCd}-${c.corseDvclsNo}] ${c.subjtNm || ""}${
        c.cmpsjCdt ? ` | ${c.cmpsjCdt}학점` : ""
      }${c.timtbNm ? ` | ${c.timtbNm}` : ""}`
    );
  });
}

/**
 * 예약 시각까지 대기 (1초마다 카운트다운)
 */
async function waitUntil(target: Date, shouldStop: () => boolean): Promise<void> {
  printSection("\n[대기]");
  printInfo(`목표: ${formatDateTime(target)}`);
  while (!shouldStop()) {
    const now = Date.now();
    const remain = target.getTime() - now;
    if (remain <= 0) {
      printSuccess("⏰ 예약 시각 도달!");
      return;
    }
    const sec = Math.ceil(remain / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const label = h > 0 ? `${h}시간 ${m}분 ${s}초` : m > 0 ? `${m}분 ${s}초` : `${s}초`;
    process.stdout.write(`\r  남은 시간: ${label}   `);
    await sleep(Math.min(1000, remain));
  }
  process.stdout.write("\n");
}

/**
 * 로그인 성공할 때까지 반복 (mode=fast: 신청에 필요한 최소 단계만)
 */
async function loginUntilSuccess(
  client: CourseRegistrationClient,
  options: {
    stuno: string;
    password: string;
    intervalMs: number;
    shouldStop: () => boolean;
  }
): Promise<boolean> {
  let attempt = 0;
  while (!options.shouldStop()) {
    attempt += 1;
    const started = Date.now();
    try {
      printInfo(`로그인 시도 #${attempt}…`);
      const result: CourseRegLoginResult = await client.login(
        {
          stuno: options.stuno,
          password: options.password
        },
        { mode: "fast" }
      );
      const ms = Date.now() - started;
      if (result.success) {
        const student = result.student;
        printSuccess(
          `✅ 로그인 성공 (#${attempt}, ${ms}ms): ${student?.stdntNm || options.stuno} / ${
            student?.deprtNm || ""
          }`
        );
        return true;
      }
      printWarning(`실패 (#${attempt}, ${ms}ms): ${result.message} [${result.errorType || "?"}]`);
    } catch (err) {
      printWarning(
        `예외 (#${attempt}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (options.shouldStop()) break;
    await sleep(options.intervalMs);
  }
  return false;
}

/**
 * 대기 과목을 우선순위 순 라운드로빈으로 신청한다.
 * - 성공 / 이미 신청 → 큐에서 제거
 * - 학점초과·시간충돌·학과제한 등 고정 실패 → 스킵(실패 확정)
 * - 정원초과·네트워크 등 → 큐에 남겨 다음 라운드 재시도
 */
async function registerRoundRobin(
  client: CourseRegistrationClient,
  states: CourseRuntimeState[],
  options: {
    intervalMs: number;
    maxAttemptsPerCourse: number;
    shouldStop: () => boolean;
  }
): Promise<void> {
  printInfo(
    `${states.length}과목 라운드로빈 (우선순위 순 · 과목 간 순환 · saveAppcsDtls 만 전송)`
  );
  printInfo("생략: 경고 장학생 조회/저장, GLIO, sysdate (매크로 경로)");

  let round = 0;
  while (!options.shouldStop()) {
    const pending = states.filter((s) => s.status === "pending");
    if (!pending.length) {
      printSuccess("모든 과목 처리가 끝났습니다.");
      break;
    }

    round += 1;
    printInfo(`—— 라운드 ${round} · 남은 ${pending.length}과목 ——`);

    for (const course of pending) {
      if (options.shouldStop()) break;

      if (
        options.maxAttemptsPerCourse > 0 &&
        course.attempts >= options.maxAttemptsPerCourse
      ) {
        course.status = "failed";
        course.lastMessage = `과목당 최대 시도(${options.maxAttemptsPerCourse}) 초과`;
        course.finishedAt = new Date().toISOString();
        printWarning(
          `⏭ [${course.subjtCd}-${course.corseDvclsNo}] 최대 시도 초과 → 실패 처리`
        );
        continue;
      }

      course.attempts += 1;
      const label = `P${course.priority} [${course.subjtCd}-${course.corseDvclsNo}] ${
        course.subjtNm || ""
      }`;
      printInfo(`▶ 신청 ${label} (시도 ${course.attempts})`);

      let result: CourseRegMutationResult;
      try {
        // 핵심 등록 패킷만 — 경고장학생·보조 요청 생략
        result = await client.registerCourse({
          subjtCd: course.subjtCd,
          corseDvclsNo: course.corseDvclsNo,
          cmpsjDivCd: course.cmpsjDivCd,
          skipAuxRequests: true,
          skipWarnCheck: true
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        course.lastMessage = message;
        course.lastErrorType = CourseRegErrorType.CONNECTION_RESET;
        printWarning(`  예외: ${message}`);
        // 세션 문제 시 fast 재로그인
        if (/로그인|세션|ECONNRESET|timeout/i.test(message)) {
          try {
            printWarning("  세션 복구 로그인(fast)…");
            await client.login(undefined, { mode: "fast" });
          } catch {
            /* ignore */
          }
        }
        await sleep(options.intervalMs);
        continue;
      }

      course.lastMessage = result.message;
      course.lastErrorType = result.errorType;

      if (result.success || result.errorType === CourseRegErrorType.ALREADY_REGISTERED) {
        course.status = "success";
        course.finishedAt = new Date().toISOString();
        printSuccess(
          `  ✅ 성공${result.errorType === CourseRegErrorType.ALREADY_REGISTERED ? " (이미 신청됨)" : ""}: ${result.message}`
        );
      } else if (isPermanentFailure(result.errorType)) {
        course.status = "failed";
        course.finishedAt = new Date().toISOString();
        printErrorMessage(
          `  ❌ 고정 실패 [${result.errorType}]: ${result.message} → 이 과목은 더 이상 시도하지 않음`
        );
        if (result.errorType === CourseRegErrorType.CREDIT_LIMIT_EXCEEDED) {
          printWarning(
            "  학점 초과: 남은 과목도 실패할 수 있습니다. 계속 시도하되, 필요하면 Ctrl+C 로 중단하세요."
          );
        }
      } else {
        // 정원 초과 등 — 다음 라운드에서 재시도
        printWarning(`  ⏳ 재시도 예정 [${result.errorType || "?"}]: ${result.message}`);
      }

      await sleep(options.intervalMs);
    }
  }
}

/**
 * 재시도해도 결과가 바뀌지 않는 오류인지
 */
function isPermanentFailure(errorType?: CourseRegErrorType | string): boolean {
  return (
    errorType === CourseRegErrorType.CREDIT_LIMIT_EXCEEDED ||
    errorType === CourseRegErrorType.TIME_CONFLICT ||
    errorType === CourseRegErrorType.NOT_IN_PERIOD ||
    errorType === CourseRegErrorType.DEPARTMENT_RESTRICTED
  );
  // CAPACITY_EXCEEDED / 네트워크 / UNKNOWN / UNKNOWN_SERVER_ERROR → 재시도
}

/**
 * 성공/실패 표 출력
 */
function printOutcomeSummary(states: CourseRuntimeState[]): void {
  const ok = states.filter((s) => s.status === "success");
  const fail = states.filter((s) => s.status === "failed");
  const pending = states.filter((s) => s.status === "pending");

  printSuccess(`성공 ${ok.length} · 실패 ${fail.length} · 미완료 ${pending.length}`);

  if (ok.length) {
    console.log(color("\n[신청 성공]", ANSI.green));
    for (const c of ok) {
      console.log(
        `  ✓ P${c.priority} [${c.subjtCd}-${c.corseDvclsNo}] ${c.subjtNm || ""} · 시도 ${c.attempts}회 · ${c.lastMessage || ""}`
      );
    }
  }
  if (fail.length) {
    console.log(color("\n[신청 실패(확정)]", ANSI.red));
    for (const c of fail) {
      console.log(
        `  ✗ P${c.priority} [${c.subjtCd}-${c.corseDvclsNo}] ${c.subjtNm || ""} · [${c.lastErrorType || "?"}] ${c.lastMessage || ""}`
      );
    }
  }
  if (pending.length) {
    console.log(color("\n[미완료(중단 등)]", ANSI.yellow));
    for (const c of pending) {
      console.log(
        `  · P${c.priority} [${c.subjtCd}-${c.corseDvclsNo}] ${c.subjtNm || ""} · 시도 ${c.attempts}회 · ${c.lastMessage || ""}`
      );
    }
  }
}

// ── 유틸 ──

/** 플랜 검색 결과 (라이브 SugangSubject 또는 로컬 레코드) */
interface PlanSearchHit {
  subjtCd: string;
  corseDvclsNo: string;
  subjtNm?: string;
  cmpsjDivCd?: string;
  cmpsjCdt?: string;
  timtbNm?: string;
  _source: "live" | "local";
}

let cachedLocalDb:
  | { loadedAt: number; courses: LocalCourseRecord[]; label: string }
  | undefined;

/**
 * 라이브 검색 후 실패/0건이면 로컬 DB 폴백.
 * b 명령은 처음부터 로컬만.
 */
async function findCoursesForPlan(
  keyword: string,
  ctx: {
    localOnly: boolean;
    envStuno: string;
    envPassword: string;
    clientForSearch: CourseRegistrationClient;
    getSearchReady: () => boolean;
    setSearchReady: (v: boolean) => void;
  }
): Promise<PlanSearchHit[]> {
  if (!ctx.localOnly) {
    const live = await tryLiveSearch(keyword, ctx);
    if (live.length) {
      printSuccess(`라이브 검색 ${live.length}건`);
      return live;
    }
    printWarning("라이브 검색 불가/결과 없음 → 로컬 과목 DB로 폴백합니다.");
  }

  return searchFromLocalDb(keyword);
}

async function tryLiveSearch(
  keyword: string,
  ctx: {
    envStuno: string;
    envPassword: string;
    clientForSearch: CourseRegistrationClient;
    getSearchReady: () => boolean;
    setSearchReady: (v: boolean) => void;
  }
): Promise<PlanSearchHit[]> {
  if (!ctx.envStuno || !ctx.envPassword) {
    printWarning(
      `.env 계정이 없어 라이브 검색을 건너뜁니다. (${COURSE_DB_ENV_PATH} 또는 generate:db 로컬 DB 사용)`
    );
    return [];
  }

  if (!ctx.getSearchReady()) {
    try {
      printInfo("검색용 로그인 중… (담기만 하고 본 신청은 예약 시각에 수행)");
      const login = await ctx.clientForSearch.login({
        stuno: ctx.envStuno,
        password: ctx.envPassword
      });
      if (!login.success) {
        printWarning(`검색용 로그인 실패: ${login.message}`);
        return [];
      }
      ctx.setSearchReady(true);
      printSuccess("검색용 로그인 완료");
    } catch (err) {
      printWarning(`검색용 로그인 오류: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  try {
    const subjects = await ctx.clientForSearch.searchSubjects({
      keyword,
      asignDeprtCd: ctx.clientForSearch.getStudentInfo()?.deptCd
    });
    return subjects.map((s) => toHit(s, "live"));
  } catch (err) {
    printWarning(`라이브 검색 실패: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * 희망바구니로 전체 개설 DB를 새로 만들고 latest.json 을 갱신한다.
 * generate.ts 와 동일한 generateCourseDb 를 사용한다.
 */
async function runGenerateLocalDbMenu(
  rl: readline.Interface,
  ctx: {
    envStuno: string;
    envPassword: string;
    shouldStop: () => boolean;
  }
): Promise<void> {
  printSection("\n[로컬 과목 DB 생성]");
  printInfo("희망바구니 로그인 후 전체 개설 과목을 수집합니다 (수 분 소요).");
  printInfo("결과는 db-generator/output + latest.json — 이후 a/b 검색에 바로 사용됩니다.");

  const confirm = (await ask(rl, "지금 생성할까요? (y/n)", "y")).toLowerCase();
  if (confirm !== "y" && confirm !== "yes" && confirm !== "ㅇ") {
    printWarning("생성 취소.");
    return;
  }

  const stuno = ctx.envStuno || (await ask(rl, "학번", ""));
  const password = ctx.envPassword || (await ask(rl, "비밀번호", ""));
  if (!stuno || !password) {
    printErrorMessage("학번/비밀번호가 필요합니다.");
    return;
  }

  try {
    const result = await generateCourseDb({
      stuno,
      password,
      shouldStop: ctx.shouldStop,
      onProgress: (message) => printInfo(`… ${message}`)
    });
    cachedLocalDb = undefined;
    printSuccess(`DB 생성 완료: ${result.fileName} (${result.count}과목)`);
    printInfo(`경로: ${result.filePath}`);
    printInfo(`포인터: ${result.pointerPath}`);
    printInfo("이제 b(로컬 검색) 또는 a(라이브 실패 시 폴백)로 담을 수 있습니다.");
  } catch (err) {
    printErrorMessage(`DB 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
    printInfo("희망바구니 서버가 열려 있는지, .env 계정이 맞는지 확인하세요.");
  }
}

async function searchFromLocalDb(keyword: string): Promise<PlanSearchHit[]> {
  try {
    if (!cachedLocalDb) {
      printInfo("로컬 과목 DB 자동 감지 중 (latest.json 또는 최신 파일명)…");
      const loaded = await loadLatestCourseDb();
      cachedLocalDb = {
        loadedAt: Date.now(),
        courses: loaded.courses,
        label: formatCourseDbRef(loaded.ref)
      };
      printSuccess(`로컬 DB: ${cachedLocalDb.label} (${loaded.courses.length}건)`);
    }
    const matched = searchLocalCourses(cachedLocalDb.courses, keyword);
    printInfo(`로컬 DB 검색: "${keyword}" → ${matched.length}건`);
    return matched.map((s) => toHit(s, "local"));
  } catch (err) {
    printErrorMessage(err instanceof Error ? err.message : String(err));
    printInfo("대비: 코드 직접 입력(m) 또는 npm run generate:db");
    return [];
  }
}

function toHit(
  s: Pick<SugangSubject, "subjtCd" | "corseDvclsNo"> &
    Partial<Pick<SugangSubject, "subjtNm" | "cmpsjDivCd" | "cmpsjCdt" | "timtbNm">>,
  source: PlanSearchHit["_source"]
): PlanSearchHit {
  return {
    subjtCd: s.subjtCd,
    corseDvclsNo: s.corseDvclsNo,
    subjtNm: s.subjtNm,
    cmpsjDivCd: s.cmpsjDivCd,
    cmpsjCdt: s.cmpsjCdt,
    timtbNm: s.timtbNm,
    _source: source
  };
}

function formatSearchHit(s: PlanSearchHit): string {
  const time = s.timtbNm ? s.timtbNm.replace(/\s+/g, " ") : "시간미정";
  const credit = s.cmpsjCdt ? `${s.cmpsjCdt}학점` : "";
  return `[${s.subjtCd}-${s.corseDvclsNo}] ${s.subjtNm || ""} | ${credit} | ${time}`;
}

function nextPriority(courses: PlannedCourse[]): number {
  if (!courses.length) return 1;
  return Math.max(...courses.map((c) => c.priority)) + 1;
}

function renumberPriorities(courses: PlannedCourse[]): void {
  courses.sort((a, b) => a.priority - b.priority);
  courses.forEach((c, i) => {
    c.priority = i + 1;
  });
}

function parseIndexes(answer: string, max: number): number[] {
  const set = new Set<number>();
  for (const token of answer.split(/[,\s]+/).filter(Boolean)) {
    if (token.includes("-")) {
      const [a, b] = token.split("-").map((x) => Number(x.trim()));
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      for (let i = Math.min(a!, b!); i <= Math.max(a!, b!); i++) {
        if (i >= 1 && i <= max) set.add(i - 1);
      }
    } else {
      const n = Number(token);
      if (n >= 1 && n <= max) set.add(n - 1);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function normalizeTimeString(raw: string): string {
  const parts = raw
    .trim()
    .split(":")
    .map((p) => p.trim());
  if (parts.length === 2) {
    return `${pad2(parts[0]!) }:${pad2(parts[1]!)}:00`;
  }
  if (parts.length >= 3) {
    return `${pad2(parts[0]!)}:${pad2(parts[1]!)}:${pad2(parts[2]!)}`;
  }
  throw new Error(`시각 형식 오류: ${raw} (HH:MM 또는 HH:MM:SS)`);
}

function pad2(v: string): string {
  return v.padStart(2, "0");
}

/**
 * 플랜의 날짜·시각을 Date 로 변환. 날짜 없고 이미 지났으면 다음날.
 */
function resolveTargetDateTime(plan: RegistrationPlan): Date {
  const time = normalizeTimeString(plan.targetTime);
  const [hh, mm, ss] = time.split(":").map(Number) as [number, number, number];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (plan.targetDate) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(plan.targetDate.trim());
    if (!m) throw new Error(`날짜 형식 오류: ${plan.targetDate} (YYYY-MM-DD)`);
    year = Number(m[1]);
    month = Number(m[2]) - 1;
    day = Number(m[3]);
  }

  const target = new Date(year, month, day, hh, mm, ss, 0);
  if (!plan.targetDate && target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

function formatDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function readPlanFile(filePath: string): RegistrationPlan {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<RegistrationPlan>;
  if (!raw.targetTime || !Array.isArray(raw.courses) || !raw.courses.length) {
    throw new Error("플랜 파일에 targetTime 과 courses 가 필요합니다.");
  }
  return {
    targetTime: normalizeTimeString(String(raw.targetTime)),
    targetDate: raw.targetDate,
    loginIntervalMs: Number(raw.loginIntervalMs) || 300,
    registerIntervalMs: Number(raw.registerIntervalMs) || 200,
    maxAttemptsPerCourse: Number(raw.maxAttemptsPerCourse) || 0,
    courses: raw.courses.map((c, i) => ({
      priority: Number(c.priority) || i + 1,
      subjtCd: String(c.subjtCd || "").trim(),
      corseDvclsNo: String(c.corseDvclsNo || "01").trim(),
      cmpsjDivCd: c.cmpsjDivCd,
      subjtNm: c.subjtNm,
      cmpsjCdt: c.cmpsjCdt,
      timtbNm: c.timtbNm,
      note: c.note
    }))
  };
}

function writePlanFile(filePath: string, plan: RegistrationPlan): void {
  fs.writeFileSync(filePath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 매크로 실행 시 불필요하게 시끄러운 진행 메시지 */
function isNoisyProgress(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("경고") ||
    m.includes("장학생") ||
    m.includes("일정 확인") ||
    m.includes("메뉴 진입") ||
    m.includes("findmyglio") ||
    m.includes("findsysdate") ||
    m.includes("학생 정보") ||
    m.includes("접속 정보") ||
    m.includes("서버 시각")
  );
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
