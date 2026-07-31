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
} from "./src/cli-ui.js";
import {
  createHopeBasketClient,
  exportHopeBasketTimetableImage,
  formatHopeBasketTimetableGrid,
  isCookieJarUsable,
  stringifySugangSubjects,
  mapCourseYearToNumericGrade,
  type HopeBasketClient,
  type SugangSubject,
  type SugangTimetableSubject
} from "./src/index.js";
import type { BasketBatchAddItem, BasketBatchCancelItem } from "./src/types/auto-manager.js";

const DEFAULT_SUGANG_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-hope-basket.cookies.json");

/**
 * 수강희망바구니(예비 담기) 전용 매니저.
 * 정식 수강신청(본신청)·ClipReport 원본 시간표 이미지는 포함하지 않는다.
 * @returns {Promise<void>} CLI 종료 시 resolve
 */
async function run(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🧺 서원대 수강희망바구니 매니저 (예비담기 전용) ---");
  printInfo("포함: 개설 검색, 담기/취소, 내 바구니 목록, 문자 데이터 기반 간이 시간표, 학과별 개설 시간표");
  printInfo("미포함: 정식 수강신청 본신청, 학교 공식 시간표 이미지");
  printInfo("호스트: https://sugangh.seowon.ac.kr");
  printInfo(`쿠키 파일: ${DEFAULT_SUGANG_COOKIE_FILE}\n`);

  try {
    const basket = await initializeHopeBasketSession(rl);

    while (true) {
      const student = basket.getStudentInfo();
      if (student?.stuno) {
        printInfo(
          `세션: ${student.stdntNm || student.stuno} / ${student.deprtNm || ""} (${student.syy}-${student.smtCd})`
        );
      } else {
        printWarning("세션: 미로그인 (.env 또는 메뉴 1로 로그인)");
      }

      printSection("\n[희망바구니 메뉴]");
      console.log(`${color("1", ANSI.yellow)}. ${color("로그인 / 세션 갱신", ANSI.bold)}`);
      console.log(`${color("2", ANSI.yellow)}. ${color("개설 강의 검색", ANSI.bold)}`);
      console.log(
        `${color("3", ANSI.yellow)}. ${color("희망바구니 검색 후 선택 담기", ANSI.bold)}`
      );
      console.log(`${color("4", ANSI.yellow)}. ${color("희망바구니 취소", ANSI.bold)}`);
      console.log(`${color("5", ANSI.yellow)}. ${color("내가 담은 희망바구니 목록", ANSI.bold)}`);
      console.log(
        `${color("6", ANSI.yellow)}. ${color("본인 학과·학년 전공 일괄 담기 (전공 자동담기)", ANSI.bold)}`
      );
      console.log(
        `${color("7", ANSI.yellow)}. ${color("내 희망바구니 시간표 이미지 (HTML/PNG)", ANSI.bold)}`
      );
      console.log(`${color("8", ANSI.yellow)}. ${color("희망바구니 관련 일정 조회", ANSI.bold)}`);
      console.log(`${color("9", ANSI.yellow)}. ${color("개설 학과 / 교양 영역 조회", ANSI.bold)}`);
      console.log(
        `${color("10", ANSI.yellow)}. ${color("학과별 개설 강의시간표 조회 (내 시간표 아님)", ANSI.bold)}`
      );
      console.log(`${color("0", ANSI.yellow)}. ${color("종료", ANSI.bold)}`);

      const menu = (await rl.question("\n메뉴 선택: ")).trim();
      if (menu === "0") break;

      try {
        switch (menu) {
          case "1":
            await loginHopeBasket(basket, rl, { forcePrompt: true });
            break;
          case "2":
            await withHopeBasketAuth(basket, rl, () => searchSubjectsOnly(basket, rl));
            break;
          case "3":
            await withHopeBasketAuth(basket, rl, () => addBasketBySearch(basket, rl));
            break;
          case "4":
            await withHopeBasketAuth(basket, rl, () => cancelBasketItems(basket, rl));
            break;
          case "5":
            await withHopeBasketAuth(basket, rl, () => listMyHopeBasket(basket));
            break;
          case "6":
            await withHopeBasketAuth(basket, rl, () => addMajorCoursesForMyProfile(basket, rl));
            break;
          case "7":
            await withHopeBasketAuth(basket, rl, () => viewMyHopeBasketTimetable(basket));
            break;
          case "8":
            await withHopeBasketAuth(basket, rl, () => listSchedules(basket));
            break;
          case "9":
            await withHopeBasketAuth(basket, rl, () => listDepartmentsAndDomains(basket));
            break;
          case "10":
            await withHopeBasketAuth(basket, rl, () => viewMajorTimetable(basket, rl));
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
    printInfo("희망바구니 매니저를 종료합니다.");
  }
}

/**
 * auto-manager와 같이 시작 시 .env 계정으로 자동 로그인한다
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<HopeBasketClient>} 준비된 클라이언트
 */
async function initializeHopeBasketSession(rl: readline.Interface): Promise<HopeBasketClient> {
  const basket = createHopeBasketClient({
    cookieFilePath: DEFAULT_SUGANG_COOKIE_FILE,
    requestTimeoutMs: 30_000,
    maxRetries: 3,
    onProgress: (message) => printInfo(`… ${message}`)
  });

  const envStuno = process.env.SEOWON_ID?.trim() || "";
  const envPassword = process.env.SEOWON_PASSWORD?.trim() || "";
  if (envStuno && envPassword) {
    basket.setCredentials({ stuno: envStuno, password: envPassword });
  }

  const hasCookieFile =
    fs.existsSync(DEFAULT_SUGANG_COOKIE_FILE) && isCookieJarUsable(basket.cookieJar);
  if (hasCookieFile) {
    printInfo("기존 희망바구니 쿠키 파일을 발견했습니다.");
  }

  // .env 가 있으면 질문 없이 로그인 (쿠키 재사용 + 학생 문맥 확보)
  if (envStuno && envPassword) {
    try {
      printInfo("`.env` 계정으로 자동 로그인합니다...");
      await loginHopeBasket(basket, rl, { silent: true });
      return basket;
    } catch (err: any) {
      printWarning(`자동 로그인 실패: ${err?.message || err}`);
      printWarning("메뉴 1에서 수동 로그인을 진행하세요.");
      return basket;
    }
  }

  printWarning("`.env`의 SEOWON_ID / SEOWON_PASSWORD 가 없어 자동 로그인을 건너뜁니다.");
  printInfo("메뉴 1로 로그인하거나, .env 를 설정한 뒤 다시 실행하세요.");
  return basket;
}

/**
 * 희망바구니 로그인을 수행한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @param {{ silent?: boolean; forcePrompt?: boolean }} [options] - silent면 .env/저장 계정으로 무질문 로그인
 * @returns {Promise<void>} 로그인 완료 시 resolve
 * @throws {Error} 학번/비밀번호 부재 또는 로그인 실패
 */
async function loginHopeBasket(
  basket: HopeBasketClient,
  rl: readline.Interface,
  options: { silent?: boolean; forcePrompt?: boolean } = {}
): Promise<void> {
  const saved = basket.getCredentials();
  let stuno = saved?.stuno || process.env.SEOWON_ID?.trim() || "";
  let password = saved?.password || process.env.SEOWON_PASSWORD?.trim() || "";

  if (!options.silent || options.forcePrompt || !stuno || !password) {
    printWarning("\n🧺 희망바구니 로그인을 수행합니다. (정식 수강신청 본신청 아님)");
    stuno = await ask(rl, "학번", stuno || process.env.SEOWON_ID || "");
    password = await ask(rl, "비밀번호", password || process.env.SEOWON_PASSWORD || "");
  }

  if (!stuno || !password) {
    throw new Error("학번과 비밀번호가 필요합니다. .env 또는 입력을 확인하세요.");
  }

  basket.setCredentials({ stuno, password });
  const result = await basket.login({ stuno, password });
  if (!result.success) {
    throw new Error(result.message || "희망바구니 로그인에 실패했습니다.");
  }

  const student = result.student;
  printSuccess(
    `✅ 로그인 성공: ${student?.stdntNm || result.session?.userNm || stuno} / ${student?.deprtNm || result.session?.deptNm || ""}`
  );
  printInfo(
    `학년도/학기=${student?.syy || basket.getTermContext().syy}-${student?.smtCd || basket.getTermContext().smtCd}, 신청학점=${student?.minCdtNum || "?"}-${student?.maxCdtNum || "?"}`
  );

  const activeSchedules = (result.scheduleChecks || []).filter((item) => item.allowed);
  if (activeSchedules.length) {
    printInfo(
      `현재 신청 가능 일정 코드: ${activeSchedules.map((item) => item.appcsSchdlCd).join(", ")}`
    );
  }
}

/**
 * 미로그인·세션 오류 시 자동/수동 로그인 후 작업을 이어간다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @param {() => Promise<T>} action - 실행할 작업
 * @returns {Promise<T>} 작업 결과
 * @throws {Error} 재로그인 후에도 실패한 원본 오류
 */
async function withHopeBasketAuth<T>(
  basket: HopeBasketClient,
  rl: readline.Interface,
  action: () => Promise<T>
): Promise<T> {
  if (!basket.getStudentInfo()?.stuno) {
    const silent = !!(process.env.SEOWON_ID && process.env.SEOWON_PASSWORD);
    await loginHopeBasket(basket, rl, { silent });
  }

  try {
    return await action();
  } catch (err: any) {
    const message = String(err?.message || "");
    // 서버 세션 만료와 ECONNRESET을 같은 재시도 경로로 처리한다
    if (
      message.includes("로그인") ||
      message.includes("ECONNRESET") ||
      message.includes("세션") ||
      message.includes("연결")
    ) {
      printWarning("\n🔄 세션/네트워크 문제로 재로그인 후 재시도합니다...");
      const silent = !!(process.env.SEOWON_ID && process.env.SEOWON_PASSWORD);
      await loginHopeBasket(basket, rl, { silent });
      return await action();
    }
    throw err;
  }
}

/**
 * 복수 선택 목록에 표시할 과목 라벨을 만든다
 * @param {SugangSubject | SugangTimetableSubject} subject - 과목
 * @returns {string} 선택 목록 라벨
 */
function formatSubjectLabel(subject: SugangSubject | SugangTimetableSubject): string {
  const time = subject.timtbNm ? subject.timtbNm.replace(/\s+/g, " ") : "시간미정";
  const dept =
    ("estblDeprtNm" in subject ? subject.estblDeprtNm : "") ||
    ("asignDeprtCd" in subject ? subject.asignDeprtCd : "") ||
    "";
  const credit = subject.cmpsjCdt ? `${subject.cmpsjCdt}학점` : "";
  return `[${subject.subjtCd}-${subject.corseDvclsNo}] ${subject.subjtNm}${dept ? ` | ${dept}` : ""} | ${credit} | ${time}`;
}

/**
 * 검색된 과목들에 대해 시간표 상세 정보를 백그라운드로 조회하여 속성(e러닝 등)을 채워 넣는다
 * @param {HopeBasketClient} basket - 클라이언트
 * @param {SugangSubject[]} subjects - 검색된 과목 목록
 */
async function enrichSubjectsWithTimetableInfo(basket: HopeBasketClient, subjects: SugangSubject[]): Promise<void> {
  const depts = [...new Set(subjects.map(s => s.asignDeprtCd))].filter(Boolean);
  if (!depts.length) return;
  
  process.stdout.write(`  (추가 정보 조회 중: ${depts.length}개 학과) ... `);
  try {
    await Promise.all(
      depts.map(async (dept) => {
        try {
          const timetable = await basket.getTimetableSubjects({ asignDeprtCd: dept });
          for (const s of subjects) {
            if (s.asignDeprtCd === dept) {
              const match = timetable.find((t) => t.subjtCd === s.subjtCd && t.corseDvclsNo === s.corseDvclsNo);
              if (match && match.slesLessnItem) {
                s.slesLessnItem = match.slesLessnItem;
              }
            }
          }
        } catch (err) {
          // 조회 실패 시 무시
        }
      })
    );
    console.log("완료");
  } catch (err) {
    console.log("실패");
  }
}

/**
 * 과목 검색 결과만 출력한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function searchSubjectsOnly(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const deptInput = await ask(
    rl,
    "개설학과 코드 ('all' 입력 시 전체 학과 및 교양 검색, 비우면 본인 학과)",
    basket.getStudentInfo()?.deptCd || ""
  );
  const asignDeprtCd = deptInput.toLowerCase() === "all" ? undefined : (deptInput || undefined);
  const subjects = await basket.searchSubjects({
    keyword,
    asignDeprtCd
  });
  if (subjects.length > 0) {
    await enrichSubjectsWithTimetableInfo(basket, subjects);
  }
  printSuccess(`${subjects.length}건`);
  console.log(stringifySugangSubjects(subjects) || "(없음)");
}

/**
 * 검색 후 선택한 분반들을 바구니에 담는다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function addBasketBySearch(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const deptInput = await ask(
    rl,
    "개설학과 코드 ('all' 입력 시 전체 학과 및 교양 검색, 비우면 본인 학과)",
    basket.getStudentInfo()?.deptCd || ""
  );
  const asignDeprtCd = deptInput.toLowerCase() === "all" ? undefined : (deptInput || undefined);
  const subjects = await basket.searchSubjects({
    keyword,
    asignDeprtCd
  });
  if (!subjects.length) {
    printWarning("검색 결과가 없습니다.");
    return;
  }

  await enrichSubjectsWithTimetableInfo(basket, subjects);
  console.log(stringifySugangSubjects(subjects));
  const selected = await pickMultipleFromList(rl, "담을 분반", subjects, formatSubjectLabel);
  if (!selected.length) {
    printWarning("선택된 과목이 없습니다.");
    return;
  }

  const results: BasketBatchAddItem[] = [];
  for (const subject of selected) {
    process.stdout.write(`  담는 중: ${subject.subjtCd}-${subject.corseDvclsNo} ... `);
    const result = await basket.addToBasket({
      subjtCd: subject.subjtCd,
      corseDvclsNo: subject.corseDvclsNo
    });
    results.push({ subject, result });
    if (result.success) printSuccess("OK");
    else printErrorMessage(result.message);
  }

  const ok = results.filter((item) => item.result.success).length;
  printSection(`\n[담기 결과] 성공 ${ok}/${results.length}`);
}

/**
 * 로그인 학생의 학과·학년·학기 기준으로 전공 개설 과목을 조회해 일괄 담는다
 *
 * - 학과: 학생 deptCd
 * - 학기/학년도: 학생 syy·smtCd (시간표 API 요청에 반영)
 * - 학년: 과목 cmpsjHyDivCd 와 학생 hy 매칭
 *
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function addMajorCoursesForMyProfile(
  basket: HopeBasketClient,
  rl: readline.Interface
): Promise<void> {
  const student = basket.getStudentInfo();
  if (!student?.stuno) {
    throw new Error("학생 정보가 없습니다. 메뉴 1로 로그인하세요.");
  }

  printSection("\n[본인 학과·학년 전공 일괄 담기]");
  printInfo(
    `대상: ${student.stdntNm || student.stuno} / ${student.deprtNm || student.deptCd} / ${student.hy}학년 / ${student.syy}-${student.smtCd}`
  );
  printInfo("학과별 개설 강의시간표에서 전공 분반을 조회한 뒤, 학년 조건에 맞는 과목만 담습니다.");

  const includeUnknownAnswer = (await ask(rl, "학년 미지정(전체) 과목도 포함할까요? (Y/n)", "Y"))
    .trim()
    .toLowerCase();
  const includeUnknownYear = includeUnknownAnswer !== "n" && includeUnknownAnswer !== "no";

  printInfo("\n담을 전공 과목 목록을 조회하는 중...");
  // 1) 조회만 먼저 (dryRun)
  const preview = await basket.addMajorCoursesForStudent({
    dryRun: true,
    includeUnknownYear
  });

  printInfo(
    `학과 시간표 전체 ${preview.allSubjects.length}분반 → 학년 매칭 후보 ${preview.candidates.length}분반`
  );

  if (!preview.candidates.length) {
    printWarning("담을 전공 후보가 없습니다. 학과/학년 코드 또는 개설 현황을 확인하세요.");
    return;
  }

  const totalCredits = preview.candidates.reduce(
    (sum, item) => sum + (Number(item.cmpsjCdt) || 0),
    0
  );

  printSection(
    `\n[담기 대상 과목 리스트 (총 ${preview.candidates.length}과목 / ${totalCredits}학점)]`
  );
  for (const [index, item] of preview.candidates.entries()) {
    const numericYear = item.cmpsjHyDivCd ? mapCourseYearToNumericGrade(item.cmpsjHyDivCd) : "0";
    const year = (numericYear && numericYear !== "0" && numericYear !== "99") ? `${numericYear}학년` : "전체학년";
    const time = item.timtbNm ? item.timtbNm.replace(/\s+/g, " ") : "시간미정";
    const credit = item.cmpsjCdt ? `${item.cmpsjCdt}학점` : "";
    const prof = item.chrgInstrEmpnm || "교수미정";
    console.log(
      `${color(String(index + 1), ANSI.yellow)}. [${item.subjtCd}-${item.corseDvclsNo}] ${color(item.subjtNm, ANSI.bold)} | ${credit} | 학년: ${year} | 교수: ${prof} | ${time}`
    );
  }

  printInfo("\n위 과목 리스트를 희망바구니에 담기 전 동의를 받습니다.");
  console.log("  Y: 전체 동의 및 담기 진행");
  console.log("  S: 원하는 과목만 선택해서 담기");
  console.log("  N: 취소 (담지 않음)");

  const consent = (await ask(rl, `위 과목들을 희망바구니에 담으시겠습니까? (Y/s/N)`, "N"))
    .trim()
    .toLowerCase();

  let targetSubjects: SugangTimetableSubject[] = [];

  if (consent === "y" || consent === "yes") {
    targetSubjects = preview.candidates;
    printInfo(`\n전체 ${targetSubjects.length}개 과목 담기에 동의하셨습니다.`);
  } else if (consent === "s" || consent === "select") {
    targetSubjects = await pickMultipleFromList(
      rl,
      "담을 전공 과목",
      preview.candidates,
      formatSubjectLabel
    );
    if (!targetSubjects.length) {
      printWarning("선택된 과목이 없습니다. 담기를 취소합니다.");
      return;
    }
    const selectedCredits = targetSubjects.reduce(
      (sum, item) => sum + (Number(item.cmpsjCdt) || 0),
      0
    );
    const finalConfirm = (
      await ask(
        rl,
        `선택한 ${targetSubjects.length}개 과목(${selectedCredits}학점)을 희망바구니에 담으시겠습니까? (y/N)`,
        "N"
      )
    )
      .trim()
      .toLowerCase();
    if (finalConfirm !== "y" && finalConfirm !== "yes") {
      printWarning("취소했습니다. 담지 않았습니다.");
      return;
    }
  } else {
    printWarning("동의하지 않았습니다. 희망바구니 담기를 취소합니다.");
    return;
  }

  // 2) 실제 담기
  printSection(`\n[희망바구니 담기 실행] 총 ${targetSubjects.length}건`);
  const results: BasketBatchAddItem[] = [];
  for (const subject of targetSubjects) {
    process.stdout.write(
      `  담는 중: [${subject.subjtCd}-${subject.corseDvclsNo}] ${subject.subjtNm} ... `
    );
    const result = await basket.addToBasket({
      subjtCd: subject.subjtCd,
      corseDvclsNo: subject.corseDvclsNo
    });
    results.push({ subject, result });
    if (result.success) {
      printSuccess("OK");
    } else {
      printErrorMessage(result.message);
    }
  }

  const ok = results.filter((item) => item.result.success).length;
  printSection(`\n[전공 담기 결과] 성공 ${ok}/${results.length}`);
}

/**
 * 내가 담은 희망바구니 목록을 조회·출력한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @returns {Promise<void>} 완료 시 resolve
 */
async function listMyHopeBasket(basket: HopeBasketClient): Promise<void> {
  printInfo("내 희망바구니 목록 조회 중... (findEstblSubjtShpbsList)");
  const subjects = await basket.getMyHopeBasketList();
  const totalCredits = subjects.reduce((sum, item) => sum + (Number(item.cmpsjCdt) || 0), 0);

  printSection(`\n[내가 담은 희망바구니] ${subjects.length}과목 / ${totalCredits}학점`);
  if (!subjects.length) {
    printWarning("담은 과목이 없습니다.");
    return;
  }
  console.log(stringifySugangSubjects(subjects));
  printSuccess(`총 ${subjects.length}건`);
}

/**
 * 내 희망바구니 시간표를 이미지(HTML/PNG)로 생성한다
 *
 * AI 사진 생성이 아니라 과목 데이터로 그린 격자 이미지다.
 * SVG 단독 파일은 만들지 않고, HTML + (가능하면) PNG 만 저장한다.
 *
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @returns {Promise<void>} 완료 시 resolve
 */
async function viewMyHopeBasketTimetable(basket: HopeBasketClient): Promise<void> {
  printInfo("내 희망바구니 시간표 이미지 생성 중...");
  printInfo("HTML/PNG 저장 (SVG 파일은 생성하지 않음). 학교 공식 시간표와 다를 수 있습니다.");
  const timetable = await basket.getMyHopeBasketTimetable();
  if (!timetable.courseCount) {
    printWarning("담은 과목이 없어 시간표를 그릴 수 없습니다.");
    return;
  }

  const outputDir = path.resolve(process.cwd(), "output");
  const student = basket.getStudentInfo();
  
  const title = student?.stdntNm ? `${student.stdntNm} 수강희망바구니 시간표` : "수강희망바구니 시간표";
  const statsSubtitle = `신청 ${timetable.courseCount}과목 · ${timetable.totalCredits}학점` + (timetable.conflicts.length ? ` · 충돌 ${timetable.conflicts.length}건` : "");
  
  let subtitle = statsSubtitle;
  if (student) {
    const smtMap: Record<string, string> = { "10": "1", "11": "여름", "20": "2", "21": "겨울" };
    const smtName = smtMap[student.smtCd] || student.smtCd;
    subtitle = `${student.stuno} · ${student.deprtNm || ""} ${student.hy}학년 · ${student.syy}학년도 ${smtName}학기 | ${statsSubtitle}`;
  }

  const files = await exportHopeBasketTimetableImage(timetable, {
    outputDir,
    title,
    subtitle,
    tryPng: true
  });

  printSection("\n[내 희망바구니 시간표 이미지]");
  printSuccess(`HTML: ${files.htmlPath}`);
  if (files.pngPath) {
    printSuccess(`PNG: ${files.pngPath}`);
  } else {
    printWarning("PNG 변환 실패 또는 브라우저 없음 → HTML로 확인하세요.");
  }

  printSection("\n[텍스트 요약]");
  console.log(formatHopeBasketTimetableGrid(timetable));
  printSection("\n[과목 목록]");
  console.log(stringifySugangSubjects(timetable.subjects));

  // PNG 우선, 없으면 HTML(브라우저)을 연다
  const openTarget = files.pngPath || files.htmlPath;
  try {
    await openLocalFile(openTarget);
    printInfo(`뷰어로 열기: ${openTarget}`);
  } catch (err: any) {
    printWarning(`자동 열기 실패: ${err?.message || err}`);
    printInfo(`직접 열어보세요: ${openTarget}`);
  }
}

/**
 * OS 기본 앱으로 로컬 파일을 연다
 * @param {string} filePath - 파일 절대/상대 경로
 * @returns {Promise<void>} 프로세스 기동 시 resolve
 */
async function openLocalFile(filePath: string): Promise<void> {
  const { exec } = await import("node:child_process");
  const target = path.resolve(filePath);

  return new Promise<void>((resolve) => {
    let command;
    if (process.platform === "win32") {
      command = `explorer.exe "${target}"`;
    } else if (process.platform === "darwin") {
      command = `open "${target}"`;
    } else {
      command = `xdg-open "${target}"`;
    }

    exec(command, () => {
      // 성공/실패 여부와 무관하게 무시 (오류로 앱이 종료되지 않게 함)
    });

    // 뷰어 실행 즉시 다음으로 넘어가도록 300ms 후 자동 resolve
    setTimeout(() => resolve(), 300);
  });
}

/**
 * 내 바구니 목록에서 고르거나 코드 직접 입력으로 취소를 수행한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function cancelBasketItems(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  printInfo("1) 내 바구니에서 선택  2) 과목코드-분반 직접 입력");
  const mode = (await ask(rl, "방식", "1")).trim() || "1";

  const targets: Array<{ subjtCd: string; corseDvclsNo: string }> = [];

  if (mode === "2") {
    printInfo("형식: 과목코드-분반 (여러 개는 쉼표). 예: 736010-01,008565-KO");
    const raw = await ask(rl, "취소 목록", "");
    const tokens = raw
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    for (const token of tokens) {
      const match = token.match(/^([^-]+)-(.+)$/);
      if (!match) {
        printWarning(`형식 오류: ${token}`);
        continue;
      }
      targets.push({ subjtCd: match[1]!.trim(), corseDvclsNo: match[2]!.trim() });
    }
  } else {
    const subjects = await basket.getMyHopeBasketList();
    if (!subjects.length) {
      printWarning("담은 과목이 없습니다.");
      return;
    }
    console.log(stringifySugangSubjects(subjects));
    const selected = await pickMultipleFromList(rl, "취소할 분반", subjects, formatSubjectLabel);
    for (const subject of selected) {
      targets.push({ subjtCd: subject.subjtCd, corseDvclsNo: subject.corseDvclsNo });
    }
  }

  if (!targets.length) {
    printWarning("취소 대상이 없습니다.");
    return;
  }

  const results: BasketBatchCancelItem[] = [];
  for (const target of targets) {
    process.stdout.write(`  취소 중: ${target.subjtCd}-${target.corseDvclsNo} ... `);
    const result = await basket.cancelFromBasket(target);
    results.push({ ...target, result });
    if (result.success) printSuccess("OK");
    else printErrorMessage(result.message);
  }

  const ok = results.filter((item) => item.result.success).length;
  printSection(`\n[취소 결과] 성공 ${ok}/${results.length}`);
}

/**
 * 희망바구니 관련 일정을 출력한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @returns {Promise<void>} 완료 시 resolve
 */
async function listSchedules(basket: HopeBasketClient): Promise<void> {
  const schedules = await basket.getAppcsSchedules();
  printSection("\n[희망바구니 관련 일정]");
  if (!schedules.length) {
    printWarning("조회된 일정이 없습니다.");
    return;
  }
  for (const item of schedules) {
    const mark = item.isActive ? color("ACTIVE", ANSI.green) : color("idle  ", ANSI.gray);
    console.log(
      `${mark} [${item.appcsSchdlCd}] ${item.appcsSchdlNm || item.appcsNm} | ${item.endDate}`
    );
  }
}

/**
 * 검색 필터용 개설 학과·교양 영역 코드를 조회해 출력한다
 * (희망바구니 과목 검색 시 asignDeprtCd / cltrDomnCd 입력 참고용)
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @returns {Promise<void>} 완료 시 resolve
 */
async function listDepartmentsAndDomains(basket: HopeBasketClient): Promise<void> {
  // cookie jar + Connection: close 환경에서 동시 POST가 빈 응답을 내는 경우가 있어 순차 조회한다
  printInfo("개설 학과 목록 조회 중...");
  const departments = await basket.getDepartments();
  printInfo("교양 영역 목록 조회 중...");
  const domains = await basket.getCultureDomains();

  printSection(`\n[개설 학과] 총 ${departments.length}건 (화면 최대 40건)`);
  if (!departments.length) {
    printWarning(
      "개설 학과가 비어 있습니다. 로그인 세션을 확인한 뒤 1번 메뉴로 다시 로그인하세요."
    );
  } else {
    for (const item of departments.slice(0, 40)) {
      console.log(`[${item.asignDeprtCd}] ${item.deptNm}`);
    }
    if (departments.length > 40) {
      printInfo(`... 외 ${departments.length - 40}건 (전체 ${departments.length}건)`);
    }
  }

  printSection(`\n[교양 영역] 총 ${domains.length}건`);
  if (!domains.length) {
    printWarning(
      "교양 영역이 비어 있습니다. 로그인 세션을 확인한 뒤 1번 메뉴로 다시 로그인하세요."
    );
  } else {
    for (const item of domains) {
      console.log(`[${item.code}] ${item.codeNm}`);
    }
  }

  printInfo("과목 검색(메뉴 2/3) 시 학과 코드·교양 영역 코드를 필터로 사용할 수 있습니다.");
}

/**
 * 전공 강의시간표를 조회한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function viewMajorTimetable(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  const departments = await basket.getTimetableDepartments();
  if (!departments.length) {
    printWarning("학과 목록이 없습니다.");
    return;
  }
  const department = await pickFromList(
    rl,
    "학과",
    departments,
    (item) => `${item.deptNm} (${item.asignDeprtCd})`
  );
  const subjects = await basket.getTimetableSubjects({
    asignDeprtCd: department.asignDeprtCd
  });

  printSection(`\n[학과별 개설 강의시간표] ${department.deptNm}`);
  printInfo("이 목록은 개설 현황 조회용이며, 내 바구니/확정 수강 시간표가 아닙니다.");
  for (const item of subjects) {
    console.log(
      `[${item.subjtCd}-${item.corseDvclsNo}] ${item.subjtNm} | ${item.chrgInstrEmpnm || "-"} | ${item.cmpsjCdt || "?"}학점 | ${item.cmpsjDivNm || ""}`
    );
    if (item.timtbNm) printInfo(`   ${item.timtbNm.replace(/\s+/g, " ")}`);
  }
  printSuccess(`총 ${subjects.length}건`);
}

/**
 * `1,3-5` 형식 입력을 0 기반 인덱스로 변환한다
 * @param {string} answer - 사용자 입력
 * @param {number} itemCount - 전체 항목 수
 * @returns {number[]} 유효 범위의 인덱스 배열
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
 * @param {readline.Interface} rl - 입력 인터페이스
 * @param {string} title - 목록 제목
 * @param {T[]} items - 선택 항목
 * @param {(item: T) => string} labelMapper - 라벨 함수
 * @returns {Promise<T[]>} 선택된 항목
 */
async function pickMultipleFromList<T>(
  rl: readline.Interface,
  title: string,
  items: T[],
  labelMapper: (item: T) => string
): Promise<T[]> {
  printSection(`\n${title} 목록:`);
  items.forEach((item, i) =>
    console.log(`${color(String(i + 1), ANSI.yellow)}. ${labelMapper(item)}`)
  );
  const answer = await rl.question(`\n번호들을 쉼표 또는 범위로 입력 (예: 1,2,3-5): `);
  return parseSelectionIndexes(answer, items.length).map((n) => items[n]!);
}

run().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
