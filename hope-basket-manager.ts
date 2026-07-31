import "dotenv/config";
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
  stringifySugangSubjects,
  type HopeBasketClient,
  type SugangSubject
} from "./src/index.js";
import type {
  BasketBatchAddItem,
  BasketBatchCancelItem
} from "./src/types/auto-manager.js";

const DEFAULT_SUGANG_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-hope-basket.cookies.json");

/**
 * 수강희망바구니(예비 담기) 전용 매니저.
 * 정식 수강신청(본신청)은 포함하지 않으며, e-campus auto-manager와도 분리한다.
 * @returns {Promise<void>} CLI 종료 시 resolve
 */
async function run(): Promise<void> {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🧺 서원대 수강희망바구니 매니저 (예비담기 전용) ---");
  printInfo("범위: 희망바구니 로그인/검색/담기/취소 (정식 수강신청 본신청 아님)");
  printInfo("호스트: https://sugangh.seowon.ac.kr");
  printInfo(`쿠키 파일: ${DEFAULT_SUGANG_COOKIE_FILE}\n`);

  const basket = createHopeBasketClient({
    cookieFilePath: DEFAULT_SUGANG_COOKIE_FILE,
    requestTimeoutMs: 30_000,
    maxRetries: 3,
    onProgress: (message) => printInfo(`… ${message}`)
  });

  if (process.env.SEOWON_ID && process.env.SEOWON_PASSWORD) {
    basket.setCredentials({
      stuno: process.env.SEOWON_ID,
      password: process.env.SEOWON_PASSWORD
    });
  }

  try {
    while (true) {
      printSection("\n[희망바구니 메뉴]");
      console.log(`${color("1", ANSI.yellow)}. ${color("로그인 / 세션 갱신", ANSI.bold)}`);
      console.log(`${color("2", ANSI.yellow)}. ${color("과목 검색", ANSI.bold)}`);
      console.log(`${color("3", ANSI.yellow)}. ${color("희망바구니 검색 후 선택 담기", ANSI.bold)}`);
      console.log(`${color("4", ANSI.yellow)}. ${color("희망바구니 키워드 일괄 담기", ANSI.bold)}`);
      console.log(`${color("5", ANSI.yellow)}. ${color("희망바구니 취소", ANSI.bold)}`);
      console.log(`${color("6", ANSI.yellow)}. ${color("희망바구니 관련 일정 조회", ANSI.bold)}`);
      console.log(`${color("7", ANSI.yellow)}. ${color("개설 학과 / 교양 영역 조회", ANSI.bold)}`);
      console.log(`${color("8", ANSI.yellow)}. ${color("전공 강의시간표 조회", ANSI.bold)}`);
      console.log(`${color("0", ANSI.yellow)}. ${color("종료", ANSI.bold)}`);

      const menu = (await rl.question("\n메뉴 선택: ")).trim();
      if (menu === "0") break;

      try {
        switch (menu) {
          case "1":
            await loginHopeBasket(basket, rl);
            break;
          case "2":
            await withHopeBasketAuth(basket, rl, () => searchSubjectsOnly(basket, rl));
            break;
          case "3":
            await withHopeBasketAuth(basket, rl, () => addBasketBySearch(basket, rl));
            break;
          case "4":
            await withHopeBasketAuth(basket, rl, () => addBasketByKeywords(basket, rl));
            break;
          case "5":
            await withHopeBasketAuth(basket, rl, () => cancelBasketItems(basket, rl));
            break;
          case "6":
            await withHopeBasketAuth(basket, rl, () => listSchedules(basket));
            break;
          case "7":
            await withHopeBasketAuth(basket, rl, () => listDepartmentsAndDomains(basket));
            break;
          case "8":
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
 * 희망바구니 로그인 절차를 수행한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 로그인 완료 시 resolve
 */
async function loginHopeBasket(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  printWarning("\n🧺 희망바구니 로그인을 수행합니다. (정식 수강신청 본신청 아님)");
  const stuno = await ask(rl, "학번", process.env.SEOWON_ID || "");
  const password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD || "");
  if (!stuno || !password) {
    throw new Error("학번과 비밀번호가 필요합니다.");
  }

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
 * 미로그인 상태이거나 세션 오류 시 재로그인 후 작업을 이어간다
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
    await loginHopeBasket(basket, rl);
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
      await loginHopeBasket(basket, rl);
      return await action();
    }
    throw err;
  }
}

/**
 * 복수 선택 목록에 표시할 과목 라벨을 만든다
 * @param {SugangSubject} subject - 과목
 * @returns {string} 선택 목록 라벨
 */
function formatSubjectLabel(subject: SugangSubject): string {
  const time = subject.timtbNm ? subject.timtbNm.replace(/\s+/g, " ") : "시간미정";
  const dept = subject.estblDeprtNm || subject.asignDeprtCd || "";
  const credit = subject.cmpsjCdt ? `${subject.cmpsjCdt}학점` : "";
  return `[${subject.subjtCd}-${subject.corseDvclsNo}] ${subject.subjtNm} | ${dept} | ${credit} | ${time}`;
}

/**
 * 과목 검색 결과만 출력한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function searchSubjectsOnly(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  const keyword = await ask(rl, "검색어(과목명/코드)", "");
  const asignDeprtCd = await ask(
    rl,
    "개설학과 코드(비우면 본인 학과)",
    basket.getStudentInfo()?.deptCd || ""
  );
  const subjects = await basket.searchSubjects({
    keyword,
    asignDeprtCd: asignDeprtCd || undefined,
    listType: "both"
  });
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
  const asignDeprtCd = await ask(
    rl,
    "개설학과 코드(비우면 본인 학과)",
    basket.getStudentInfo()?.deptCd || ""
  );
  const subjects = await basket.searchSubjects({
    keyword,
    asignDeprtCd: asignDeprtCd || undefined,
    listType: "both"
  });
  if (!subjects.length) {
    printWarning("검색 결과가 없습니다.");
    return;
  }

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
 * 키워드 목록으로 첫 분반을 일괄 담는다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function addBasketByKeywords(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  const raw = await ask(rl, "키워드들(쉼표 구분)", "");
  const keywords = raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!keywords.length) {
    printWarning("키워드가 없습니다.");
    return;
  }

  const asignDeprtCd = await ask(
    rl,
    "개설학과 코드(비우면 본인 학과)",
    basket.getStudentInfo()?.deptCd || ""
  );

  const results: BasketBatchAddItem[] = [];
  for (const keyword of keywords) {
    printInfo(`\n키워드: ${keyword}`);
    const subjects = await basket.searchSubjects({
      keyword,
      asignDeprtCd: asignDeprtCd || undefined,
      listType: "both"
    });
    if (!subjects.length) {
      printWarning("  검색 결과 없음");
      continue;
    }
    const subject = subjects[0]!;
    printInfo(`  선택: ${formatSubjectLabel(subject)}`);
    const result = await basket.addToBasket({
      subjtCd: subject.subjtCd,
      corseDvclsNo: subject.corseDvclsNo
    });
    results.push({ subject, result });
    if (result.success) printSuccess(`  담기 성공`);
    else printErrorMessage(`  담기 실패: ${result.message}`);
  }

  const ok = results.filter((item) => item.result.success).length;
  printSection(`\n[키워드 일괄 담기] 성공 ${ok}/${results.length}`);
}

/**
 * 과목코드-분반 목록으로 바구니 취소를 수행한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @param {readline.Interface} rl - 입력 인터페이스
 * @returns {Promise<void>} 완료 시 resolve
 */
async function cancelBasketItems(basket: HopeBasketClient, rl: readline.Interface): Promise<void> {
  printInfo("형식: 과목코드-분반 (여러 개는 쉼표). 예: 736010-01,008565-77");
  const raw = await ask(rl, "취소 목록", "");
  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) {
    printWarning("취소 대상이 없습니다.");
    return;
  }

  const results: BasketBatchCancelItem[] = [];
  for (const token of tokens) {
    const match = token.match(/^([^-]+)-(.+)$/);
    if (!match) {
      printWarning(`형식 오류: ${token}`);
      continue;
    }
    const subjtCd = match[1]!.trim();
    const corseDvclsNo = match[2]!.trim();
    process.stdout.write(`  취소 중: ${subjtCd}-${corseDvclsNo} ... `);
    const result = await basket.cancelFromBasket({ subjtCd, corseDvclsNo });
    results.push({ subjtCd, corseDvclsNo, result });
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
 * 개설 학과와 교양 영역을 요약 출력한다
 * @param {HopeBasketClient} basket - 희망바구니 클라이언트
 * @returns {Promise<void>} 완료 시 resolve
 */
async function listDepartmentsAndDomains(basket: HopeBasketClient): Promise<void> {
  const [departments, domains] = await Promise.all([
    basket.getDepartments(),
    basket.getCultureDomains()
  ]);

  printSection("\n[개설 학과] (최대 40건)");
  for (const item of departments.slice(0, 40)) {
    console.log(`[${item.asignDeprtCd}] ${item.deptNm}`);
  }
  if (departments.length > 40) printInfo(`... 외 ${departments.length - 40}건`);

  printSection("\n[교양 영역]");
  for (const item of domains) {
    console.log(`[${item.code}] ${item.codeNm}`);
  }
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

  printSection(`\n[전공 강의시간표] ${department.deptNm}`);
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
