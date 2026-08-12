/**
 * 수강신청 본신청 스모크 테스트 (실제 sugangh 서버).
 *
 * 포함: 세션, 로그인, 학년도 동기화, 개설 검색, 내 신청 목록
 * 제외: 실제 수강신청/취소 (부작용 방지)
 *
 * 실행:
 *   npx vitest run test/course-registration.smoke.test.ts --reporter verbose
 *
 * 필요: .env 의 SEOWON_ID / SEOWON_PASSWORD
 */
import "dotenv/config";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COURSE_REG_BASE_URL,
  COURSE_REG_MENU_ID,
  COURSE_REG_PATHS,
  COURSE_REG_PGM_ID,
  createCourseRegistrationClient,
  createCourseRegLoginRequest,
  createCourseRegMyListRequest,
  createCourseRegRegisterRequest
} from "../src/index";

const STUNO = process.env.SEOWON_ID?.trim() || "";
const PASSWORD = process.env.SEOWON_PASSWORD?.trim() || "";
const HAS_CREDS = Boolean(STUNO && PASSWORD);

const COOKIE_FILE = path.resolve(process.cwd(), ".seowon-sugang.cookies.smoke.json");
const TIMEOUT_MS = 90_000;

describe("course-registration smoke (본신청 모듈 정체성)", () => {
  it("src/course-registration 은 실제 수강신청(본신청) 모듈이다", () => {
    // 희망바구니(M100779/P001609, saveHope*) 가 아님
    expect(COURSE_REG_BASE_URL).toContain("sugangh.seowon.ac.kr");
    expect(COURSE_REG_MENU_ID).toBe("M100780");
    expect(COURSE_REG_PGM_ID).toBe("P001619");
    expect(COURSE_REG_PATHS.saveAppcsDtls).toBe("/com/sapl/SaplapCtr/saveAppcsDtls.do");
    expect(COURSE_REG_PATHS.saveAppcsDtlsCancl).toBe(
      "/com/sapl/SaplapCtr/saveAppcsDtlsCancl.do"
    );
    expect(COURSE_REG_PATHS.findAppcsDtlsList).toBe("/com/sapl/SaplapCtr/findAppcsDtlsList.do");

    // 희망바구니 경로 혼용 금지
    expect(COURSE_REG_PATHS.saveAppcsDtls).not.toContain("Hope");
    expect(COURSE_REG_PATHS.findAppcsDtlsList).not.toContain("Shpbs");

    const login = createCourseRegLoginRequest(
      { stuno: "dummy", password: "x" },
      { syy: "2026", smtCd: "20" }
    );
    expect(login.body).not.toContain("appcsKindCd");

    const list = createCourseRegMyListRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "dummy"
    });
    expect(list.url).toContain("menuId=M100780");
    expect(list.url).toContain("findAppcsDtlsList.do");

    const register = createCourseRegRegisterRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "dummy",
      subjtCd: "736012",
      corseDvclsNo: "01"
    });
    expect(register.url).toContain("saveAppcsDtls.do");
    expect(register.url).toContain("menuId=M100780");
    expect(register.url).not.toContain("saveHope");
  });
});

describe.skipIf(!HAS_CREDS)("course-registration live smoke (sugangh)", () => {
  it(
    "로그인 → 학년도 동기화 → 개설 검색 → 내 수강신청 목록",
    async () => {
      const client = createCourseRegistrationClient({
        cookieFilePath: COOKIE_FILE,
        requestTimeoutMs: 30_000,
        maxRetries: 3,
        loginMaxRetries: 5,
        onProgress: (msg) => console.log(`  … ${msg}`)
      });

      console.log("\n[1/4] 본신청 로그인 (menuId=edu, appcsKindCd 없음)");
      const login = await client.login({ stuno: STUNO, password: PASSWORD });
      console.log("  success:", login.success);
      console.log("  flag:", login.flag);
      console.log("  mayBeFalseError:", login.mayBeFalseError);
      console.log("  message:", login.message);
      console.log("  user:", login.session?.userNm || login.student?.stdntNm);
      console.log("  dept:", login.student?.deprtNm || login.session?.deptNm);
      console.log("  term:", `${login.student?.syy || ""}-${login.student?.smtCd || ""}`);
      console.log("  termCode:", login.termCode);
      console.log("  credits:", `${login.student?.minCdtNum}-${login.student?.maxCdtNum}`);

      expect(login.success).toBe(true);
      expect(login.flag).toBe("1");
      expect(login.student?.stuno || login.session?.persNo).toBeTruthy();

      const term = client.getTermContext();
      console.log("\n[2/4] 학년도/학기 문맥", term);
      expect(term.syy).toBeTruthy();
      expect(term.smtCd).toBeTruthy();

      console.log("\n[3/4] 개설 과목 검색 (findEstblSubjtGnrlList, M100780)");
      // 학과 코드로 검색 (전체 검색은 서버 부하)
      const deptCd = login.student?.deptCd || "";
      const searchKeyword = process.env.SMOKE_SEARCH_KEYWORD?.trim() || "";
      const subjects = await client.searchSubjects({
        keyword: searchKeyword,
        asignDeprtCd: deptCd || undefined,
        serchDiv: "0"
      });
      console.log(
        `  검색 결과: ${subjects.length}건 (dept=${deptCd || "all"}, keyword=${searchKeyword || "(empty)"})`
      );
      if (subjects[0]) {
        console.log(
          `  예시: [${subjects[0].subjtCd}-${subjects[0].corseDvclsNo}] ${subjects[0].subjtNm}`
        );
      }
      // 기간 외/빈 결과는 허용. 네트워크·권한 오류만 실패로 본다.
      expect(Array.isArray(subjects)).toBe(true);

      console.log("\n[4/4] 내 수강신청 목록 (findAppcsDtlsList — ShpbsList 아님)");
      const myList = await client.getMyRegisteredList();
      console.log(`  신청 과목: ${myList.length}건`);
      for (const item of myList.slice(0, 10)) {
        console.log(
          `  - [${item.subjtCd}-${item.corseDvclsNo}] ${item.subjtNm} | ${item.cmpsjCdt}학점 | ${item.timtbNm?.replace(/\s+/g, " ") || "-"}`
        );
      }
      if (myList.length > 10) {
        console.log(`  ... 외 ${myList.length - 10}건`);
      }
      expect(Array.isArray(myList)).toBe(true);

      // sourceList 없음 (본신청 목록 타입)
      if (myList[0]) {
        expect((myList[0] as { sourceList?: string }).sourceList).toBeUndefined();
      }

      console.log("\n✅ 스모크 완료 (등록/취소는 수행하지 않음)");
    },
    TIMEOUT_MS
  );
});

describe.skipIf(HAS_CREDS)("course-registration live smoke (skipped)", () => {
  it("SEOWON_ID / SEOWON_PASSWORD 가 없어 live smoke 를 건너뜁니다", () => {
    console.warn("live smoke skipped: set SEOWON_ID and SEOWON_PASSWORD in .env");
    expect(true).toBe(true);
  });
});
