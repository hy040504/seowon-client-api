/**
 * 서원대 수강신청 매니저 (본신청 전용).
 *
 * 포함: 로그인, 과목 검색, 수강신청/취소, 내 신청 목록, 연속 재시도, 확정 시간표 이미지
 * 미포함: 수강희망바구니(예비 담기) → cli/hope-basket-manager.ts 사용
 *
 * 서버: https://sugangh.seowon.ac.kr (menuId=M100780)
 * 쿠키: .seowon-sugang.cookies.json (희망바구니 쿠키와 다름)
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
  ask,
  pickFromList
} from "../src/cli-ui.js";
import {
  createCourseRegistrationClient,
  isCookieJarUsable,
  stringifyCourseRegSubjects,
  stringifySugangSubjects,
  CourseRegErrorType,
  type CourseRegistrationClient,
  type CourseRegRegisteredSubject,
  type SugangSubject
} from "../src/index.js";
import { exportRegisteredTimetableFromClient } from "./registered-timetable.js";

const DEFAULT_COURSE_REG_COOKIE_FILE = path.resolve(
  process.cwd(),
  ".seowon-sugang.cookies.json"
);

/**
 * 수강신청 본신청 전용 매니저.
 * 수강희망바구니(예비 담기)는 포함하지 않는다.
 * @returns {Promise<void>} CLI 종료 시 resolve
 */
async function run(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🎓 서원대 수강신청 매니저 (본신청 전용) ---");
  printInfo("포함: 로그인, 과목 검색, 수강신청/취소, 내 신청 목록, 확정 시간표 이미지");
  printInfo("미포함: 수강희망바구니(예비 담기) → cli/hope-basket-manager.ts 사용");
  printInfo("서버: https://sugangh.seowon.ac.kr (menuId=M100780)");
  printInfo(`쿠키 파일: ${DEFAULT_COURSE_REG_COOKIE_FILE}\n`);

  try {
    const client = await initializeCourseRegSession(rl);

    while (true) {
      const student = client.getStudentInfo();
      if (student?.stuno) {
        printInfo(
          `세션: ${student.stdntNm || student.stuno} / ${student.deprtNm || ""} (${student.syy}-${student.smtCd})`
        );
      } else {
        printWarning("세션: 미로그인 (.env 또는 메뉴 1로 로그인)");
      }

      printSection("\n[수강신청 메뉴]");
      console.log(`${color("1", ANSI.yellow)}. ${color("로그인 / 세션 갱신", ANSI.bold)}`);
      console.log(`${color("2", ANSI.yellow)}. ${color("개설 강의 검색", ANSI.bold)}`);
      console.log(
        `${color("3", ANSI.yellow)}. ${color("수강신청 (검색 → 선택 → 등록)", ANSI.bold)}`
      );
      console.log(`${color("4", ANSI.yellow)}. ${color("수강신청 취소", ANSI.bold)}`);
      console.log(`${color("5", ANSI.yellow)}. ${color("내 수강신청 목록 조회", ANSI.bold)}`);
      console.log(
        `${color("6", ANSI.yellow)}. ${color("연속 재시도 모드 (정원 초과 과목 반복 신청)", ANSI.bold)}`
      );
      console.log(
        `${color("7", ANSI.yellow)}. ${color("내 수강신청 시간표 이미지 (HTML/PNG)", ANSI.bold)}`
      );
      console.log(
        `${color("8", ANSI.yellow)}. ${color("안내: 예약 수강신청 → npm run sugang:scheduled", ANSI.gray)}`
      );
      console.log(`${color("0", ANSI.yellow)}. ${color("종료", ANSI.bold)}`);

      const menu = (await rl.question("\n메뉴 선택: ")).trim();
      if (menu === "0") break;

      try {
        switch (menu) {
          case "1":
            await loginCourseReg(client, rl, { forcePrompt: true });
            break;
          case "2":
            await withCourseRegAuth(client, rl, () => searchSubjectsOnly(client, rl));
            break;
          case "3":
            await withCourseRegAuth(client, rl, () => registerBySearch(client, rl));
            break;
          case "4":
            await withCourseRegAuth(client, rl, () => cancelRegisteredItems(client, rl));
            break;
          case "5":
            await withCourseRegAuth(client, rl, () => listMyRegistered(client));
            break;
          case "6":
            await withCourseRegAuth(client, rl, () => retryRegisterMode(client, rl));
            break;
          case "7":
            await withCourseRegAuth(client, rl, () => exportRegisteredTimetableFromClient(client));
            break;
          default:
            printErrorMessage("올바른 메뉴를 선택하세요.");
        }
      } catch (err: any) {
        printErrorMessage(`\n❌ 오류: ${err?.message || err}`);
      }
    }
  } finally {
    rl.close();
    printInfo("수강신청 매니저를 종료합니다.");
  }
}

/**
 * 시작 시 .env 계정으로 자동 로그인한다
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<CourseRegistrationClient>} 준비된 클라이언트
 */
async function initializeCourseRegSession(
  rl: readline.Interface
): Promise<CourseRegistrationClient> {
  const client = createCourseRegistrationClient({
    cookieFilePath: DEFAULT_COURSE_REG_COOKIE_FILE,
    requestTimeoutMs: 30_000,
    maxRetries: 3,
    loginMaxRetries: 5,
    onProgress: (message) => printInfo(`… ${message}`)
  });

  const envStuno = process.env.SEOWON_ID?.trim() || "";
  const envPassword = process.env.SEOWON_PASSWORD?.trim() || "";
  if (envStuno && envPassword) {
    client.setCredentials({ stuno: envStuno, password: envPassword });
  }

  const hasCookieFile =
    fs.existsSync(DEFAULT_COURSE_REG_COOKIE_FILE) && isCookieJarUsable(client.cookieJar);
  if (hasCookieFile) {
    printInfo("기존 수강신청 본신청 쿠키 파일을 발견했습니다.");
  }

  if (envStuno && envPassword) {
    try {
      printInfo("`.env` 계정으로 자동 로그인합니다...");
      await loginCourseReg(client, rl, { silent: true });
      return client;
    } catch (err: any) {
      printWarning(`자동 로그인 실패: ${err?.message || err}`);
      printWarning("메뉴 1에서 수동 로그인을 진행하세요.");
      return client;
    }
  }

  printWarning("`.env`의 SEOWON_ID / SEOWON_PASSWORD 가 없어 자동 로그인을 건너뜁니다.");
  printInfo("메뉴 1로 로그인하거나, .env 를 설정한 뒤 다시 실행하세요.");
  return client;
}

/**
 * 수강신청 본신청 로그인을 수행한다
 * @param {CourseRegistrationClient} client - 본신청 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @param {{ silent?: boolean; forcePrompt?: boolean }} [options] - silent면 .env/저장 계정으로 무질문 로그인
 * @returns {Promise<void>}
 * @throws {Error} 학번/비밀번호 부재 또는 로그인 실패
 */
async function loginCourseReg(
  client: CourseRegistrationClient,
  rl: readline.Interface,
  options: { silent?: boolean; forcePrompt?: boolean } = {}
): Promise<void> {
  const saved = client.getCredentials();
  let stuno = saved?.stuno || process.env.SEOWON_ID?.trim() || "";
  let password = saved?.password || process.env.SEOWON_PASSWORD?.trim() || "";

  if (!options.silent || options.forcePrompt || !stuno || !password) {
    printWarning("\n🎓 수강신청 본신청 로그인을 수행합니다. (희망바구니 아님)");
    stuno = await ask(rl, "학번", stuno || process.env.SEOWON_ID || "");
    password = await ask(rl, "비밀번호", password || process.env.SEOWON_PASSWORD || "");
  }

  if (!stuno || !password) {
    throw new Error("학번과 비밀번호가 필요합니다. .env 또는 입력을 확인하세요.");
  }

  client.setCredentials({ stuno, password });
  const result = await client.login({ stuno, password });
  if (!result.success) {
    throw new Error(result.message || "수강신청 로그인에 실패했습니다.");
  }

  const student = result.student;
  printSuccess(
    `✅ 로그인 성공: ${student?.stdntNm || result.session?.userNm || stuno} / ${student?.deprtNm || result.session?.deptNm || ""}`
  );
  printInfo(
    `학년도/학기=${student?.syy || client.getTermContext().syy}-${student?.smtCd || client.getTermContext().smtCd}, 신청학점=${student?.minCdtNum || "?"}-${student?.maxCdtNum || "?"}`
  );
  if (result.termCode) {
    printInfo(`학사일정 코드: ${result.termCode}`);
  }
}

/**
 * 미로그인·세션 오류 시 자동/수동 로그인 후 작업을 이어간다
 */
async function withCourseRegAuth<T>(
  client: CourseRegistrationClient,
  rl: readline.Interface,
  action: () => Promise<T>
): Promise<T> {
  if (!client.getStudentInfo()?.stuno) {
    const silent = !!(process.env.SEOWON_ID && process.env.SEOWON_PASSWORD);
    await loginCourseReg(client, rl, { silent });
  }

  try {
    return await action();
  } catch (err: any) {
    const message = String(err?.message || "");
    if (
      message.includes("로그인") ||
      message.includes("ECONNRESET") ||
      message.includes("세션") ||
      message.includes("연결")
    ) {
      printWarning("\n🔄 세션/네트워크 문제로 재로그인 후 재시도합니다...");
      const silent = !!(process.env.SEOWON_ID && process.env.SEOWON_PASSWORD);
      await loginCourseReg(client, rl, { silent });
      return await action();
    }
    throw err;
  }
}

/**
 * 과목 라벨을 만든다
 */
function formatSubjectLabel(subject: SugangSubject | CourseRegRegisteredSubject): string {
  const time = subject.timtbNm ? subject.timtbNm.replace(/\s+/g, " ") : "시간미정";
  const dept =
    ("estblDeprtNm" in subject ? subject.estblDeprtNm : "") ||
    ("asignDeprtNm" in subject ? subject.asignDeprtNm : "") ||
    "";
  const credit = subject.cmpsjCdt ? `${subject.cmpsjCdt}학점` : "";
  const seats =
    "appcsPcnt" in subject && subject.appcsPcnt
      ? `신청=${subject.appcsPcnt}/${("appcsLmttPcnt" in subject && subject.appcsLmttPcnt) || "?"}`
      : "appcsLmttPcnt" in subject && subject.appcsLmttPcnt
        ? `정원=${subject.appcsLmttPcnt}`
        : "";
  return `[${subject.subjtCd}-${subject.corseDvclsNo}] ${subject.subjtNm}${dept ? ` | ${dept}` : ""} | ${credit}${seats ? ` | ${seats}` : ""} | ${time}`;
}

/**
 * 개설 과목 검색 결과만 출력한다
 */
async function searchSubjectsOnly(
  client: CourseRegistrationClient,
  rl: readline.Interface
): Promise<void> {
  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const deptInput = await ask(
    rl,
    "개설학과 코드 (비우면 본인 학과, 'all'이면 전체)",
    client.getStudentInfo()?.deptCd || ""
  );
  const asignDeprtCd =
    deptInput.toLowerCase() === "all" ? undefined : deptInput || client.getStudentInfo()?.deptCd;

  const subjects = await client.searchSubjects({
    keyword,
    asignDeprtCd
  });
  printSuccess(`${subjects.length}건`);

  if (subjects.length > 0) {
    const displayLimit = 50;
    let offset = 0;
    while (offset < subjects.length) {
      const chunk = subjects.slice(offset, offset + displayLimit);
      console.log(stringifySugangSubjects(chunk, offset + 1));
      offset += displayLimit;
      if (offset < subjects.length) {
        const remaining = subjects.length - offset;
        printWarning(`\n... 외 ${remaining}건의 결과가 더 있습니다.`);
        const more = (await ask(rl, "더 보시겠습니까? (Y/n)")).trim().toLowerCase();
        if (more === "n" || more === "no") break;
      }
    }
  } else {
    console.log("(없음)");
  }
}

/**
 * 검색 후 선택한 분반들을 수강신청 등록한다
 */
async function registerBySearch(
  client: CourseRegistrationClient,
  rl: readline.Interface
): Promise<void> {
  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const deptInput = await ask(
    rl,
    "개설학과 코드 (비우면 본인 학과, 'all'이면 전체)",
    client.getStudentInfo()?.deptCd || ""
  );
  const asignDeprtCd =
    deptInput.toLowerCase() === "all" ? undefined : deptInput || client.getStudentInfo()?.deptCd;

  const subjects = await client.searchSubjects({ keyword, asignDeprtCd });
  if (!subjects.length) {
    printWarning("검색 결과가 없습니다.");
    return;
  }

  const selected = await pickMultipleFromList(rl, "신청할 분반", subjects, formatSubjectLabel);
  if (!selected.length) {
    printWarning("선택된 과목이 없습니다.");
    return;
  }

  let ok = 0;
  for (const subject of selected) {
    process.stdout.write(`  신청 중: ${subject.subjtCd}-${subject.corseDvclsNo} ... `);
    const result = await client.registerCourse({
      subjtCd: subject.subjtCd,
      corseDvclsNo: subject.corseDvclsNo,
      cmpsjDivCd: subject.cmpsjDivCd,
      skipAuxRequests: true
    });
    if (result.success) {
      printSuccess("OK");
      ok += 1;
    } else {
      printErrorMessage(result.message);
    }
  }

  printSection(`\n[수강신청 결과] 성공 ${ok}/${selected.length}`);
}

/**
 * 내 수강신청 목록에서 선택해 취소한다
 */
async function cancelRegisteredItems(
  client: CourseRegistrationClient,
  rl: readline.Interface
): Promise<void> {
  const list = await client.getMyRegisteredList();
  if (!list.length) {
    printWarning("신청된 과목이 없습니다.");
    return;
  }

  printSection(`\n[내 수강신청 목록] ${list.length}건`);
  console.log(stringifyCourseRegSubjects(list));

  const selected = await pickMultipleFromList(rl, "취소할 분반", list, formatSubjectLabel);
  if (!selected.length) {
    printWarning("취소 대상이 없습니다.");
    return;
  }

  let ok = 0;
  for (const subject of selected) {
    process.stdout.write(`  취소 중: ${subject.subjtCd}-${subject.corseDvclsNo} ... `);
    const result = await client.cancelCourse({
      subjtCd: subject.subjtCd,
      corseDvclsNo: subject.corseDvclsNo,
      cmpsjDivCd: subject.cmpsjDivCd
    });
    if (result.success) {
      printSuccess("OK");
      ok += 1;
    } else {
      printErrorMessage(result.message);
    }
  }

  printSection(`\n[취소 결과] 성공 ${ok}/${selected.length}`);
}

/**
 * 내 수강신청 목록을 조회한다
 */
async function listMyRegistered(client: CourseRegistrationClient): Promise<void> {
  const list = await client.getMyRegisteredList();
  printSection(`\n[내 수강신청 목록] ${list.length}건`);
  if (!list.length) {
    printWarning("(없음)");
    return;
  }
  console.log(stringifyCourseRegSubjects(list));

  const totalCredits = list.reduce((sum, item) => sum + (Number(item.cmpsjCdt) || 0), 0);
  printInfo(`총 ${list.length}과목 / ${totalCredits}학점`);
  if (list[0]?.ttCmpsjCdt) {
    printInfo(`서버 집계 신청학점(ttCmpsjCdt): ${list[0].ttCmpsjCdt}`);
  }
}

/**
 * 정원 초과 과목을 지정 간격으로 반복 신청한다
 */
async function retryRegisterMode(
  client: CourseRegistrationClient,
  rl: readline.Interface
): Promise<void> {
  printSection("\n[연속 재시도 모드]");
  printInfo("정원 초과 과목을 반복 신청합니다. 성공 시 즉시 중단됩니다.");
  printInfo("Ctrl+C 로 중단할 수 있습니다.");

  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const subjects = await client.searchSubjects({
    keyword,
    asignDeprtCd: client.getStudentInfo()?.deptCd
  });
  if (!subjects.length) {
    printWarning("검색 결과가 없습니다. 과목코드/분반을 직접 입력합니다.");
  }

  let subject: SugangSubject | undefined;
  if (subjects.length) {
    subject = await pickFromList(rl, "반복 신청할 분반", subjects, formatSubjectLabel);
  }

  const subjtCd = subject?.subjtCd || (await ask(rl, "과목코드", ""));
  const corseDvclsNo = subject?.corseDvclsNo || (await ask(rl, "분반", "01"));
  const cmpsjDivCd = subject?.cmpsjDivCd || (await ask(rl, "이수구분코드(선택)", ""));
  const intervalMs = Number(await ask(rl, "재시도 간격(ms)", "500")) || 500;
  const maxAttemptsRaw = await ask(rl, "최대 시도 횟수 (0=무한)", "0");
  const maxAttempts = Number(maxAttemptsRaw) || 0;

  if (!subjtCd || !corseDvclsNo) {
    printWarning("과목코드와 분반이 필요합니다.");
    return;
  }

  let stopRequested = false;
  const onSigint = () => {
    stopRequested = true;
    printWarning("\n중단 요청됨... 현재 시도 후 종료합니다.");
  };
  process.on("SIGINT", onSigint);

  try {
    printInfo(
      `시작: ${subjtCd}-${corseDvclsNo}, 간격=${intervalMs}ms, 최대=${maxAttempts || "∞"}`
    );
    const result = await client.registerCourseWithRetry({
      subjtCd,
      corseDvclsNo,
      cmpsjDivCd: cmpsjDivCd || undefined,
      intervalMs,
      maxAttempts,
      skipAuxRequests: true,
      shouldStop: () => stopRequested,
      onAttempt: ({ attempt, result: r, elapsedMs }) => {
        const status = r.success
          ? color("성공", ANSI.green)
          : color(r.errorType || "실패", ANSI.red);
        console.log(
          `  #${attempt} ${status} (${elapsedMs}ms) ${r.message}`
        );
      }
    });

    if (result.success) {
      printSuccess(
        `✅ 수강신청 성공! 시도 ${result.attempts}회, 소요 ${result.elapsedMs}ms`
      );
    } else if (result.stoppedByUser) {
      printWarning(
        `사용자 중단. 시도 ${result.attempts}회, 마지막: ${result.lastResult.message}`
      );
    } else {
      printErrorMessage(
        `실패. 시도 ${result.attempts}회. ${result.lastResult.message}`
      );
      if (result.lastResult.errorType === CourseRegErrorType.CREDIT_LIMIT_EXCEEDED) {
        printInfo("학점 초과는 재시도해도 동일합니다. 다른 과목을 취소한 뒤 다시 시도하세요.");
      }
      if (result.lastResult.errorType === CourseRegErrorType.ALREADY_REGISTERED) {
        printInfo("이미 신청된 과목입니다. 메뉴 5에서 목록을 확인하세요.");
      }
    }
  } finally {
    process.off("SIGINT", onSigint);
  }
}

/**
 * `1,3-5` 형식 입력을 0 기반 인덱스로 변환한다
 */
function parseSelectionIndexes(answer: string, itemCount: number): number[] {
  const indexes = new Set<number>();
  const tokens = answer
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      for (let value = from; value <= to; value++) {
        const index = value - 1;
        if (index >= 0 && index < itemCount) indexes.add(index);
      }
      continue;
    }

    if (/^\d+$/.test(token)) {
      const index = Number(token) - 1;
      if (index >= 0 && index < itemCount) indexes.add(index);
    }
  }

  return Array.from(indexes);
}

/**
 * 번호/범위 입력으로 여러 항목을 고른다
 */
async function pickMultipleFromList<T>(
  rl: readline.Interface,
  title: string,
  items: T[],
  labelMapper: (item: T) => string
): Promise<T[]> {
  printSection(`\n${title} 목록:`);

  const displayLimit = 50;
  let offset = 0;
  while (offset < items.length) {
    const chunk = items.slice(offset, offset + displayLimit);
    chunk.forEach((item, i) =>
      console.log(`${color(String(offset + i + 1), ANSI.yellow)}. ${labelMapper(item)}`)
    );

    offset += displayLimit;
    if (offset < items.length) {
      const remaining = items.length - offset;
      printWarning(`\n... 외 ${remaining}건의 항목이 더 있습니다.`);
      const more = (await ask(rl, "더 보시겠습니까? (Y/n)")).trim().toLowerCase();
      if (more === "n" || more === "no") break;
    }
  }

  const answer = await rl.question(
    `\n번호들을 쉼표 또는 범위로 입력 (예: 1,2,3-5) (취소 시 빈 칸): `
  );
  return parseSelectionIndexes(answer, items.length).map((n) => items[n]!);
}

run().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
