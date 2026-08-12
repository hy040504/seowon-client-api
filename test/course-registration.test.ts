import { describe, expect, it } from "vitest";
import {
  classifyCourseRegError,
  CourseRegErrorType,
  COURSE_REG_MENU_ID,
  COURSE_REG_PATHS,
  COURSE_REG_PGM_ID,
  createCourseRegCancelRequest,
  createCourseRegLoginRequest,
  createCourseRegMyListRequest,
  createCourseRegRegisterRequest,
  createCourseRegSearchRequest,
  formatCourseRegError,
  parseCourseRegLoginResponse,
  parseCourseRegMutationResponse,
  parseCourseRegMyListResponse,
  parseCourseRegSearchResponse,
  parseCourseRegSysdateResponse,
  SSV_RS,
  SSV_US
} from "../src/index";

describe("course-registration constants (본신청 vs 희망바구니 혼용 금지)", () => {
  it("uses M100780 / P001619 and never hope-basket paths", () => {
    expect(COURSE_REG_MENU_ID).toBe("M100780");
    expect(COURSE_REG_PGM_ID).toBe("P001619");
    expect(COURSE_REG_PATHS.saveAppcsDtls).toContain("saveAppcsDtls.do");
    expect(COURSE_REG_PATHS.saveAppcsDtls).not.toContain("Hope");
    expect(COURSE_REG_PATHS.saveAppcsDtlsCancl).toContain("saveAppcsDtlsCancl.do");
    expect(COURSE_REG_PATHS.findAppcsDtlsList).toContain("findAppcsDtlsList.do");
    expect(COURSE_REG_PATHS.findAppcsDtlsList).not.toContain("Shpbs");
    expect(COURSE_REG_PATHS.findWarnStdrInqryCscnt).toContain("findWarnStdrInqryCscnt");
  });
});

describe("course-registration request builders", () => {
  it("builds login without appcsKindCd", () => {
    const login = createCourseRegLoginRequest(
      { stuno: "202300000", password: "secret" },
      { syy: "2026", smtCd: "20" }
    );
    expect(login.url).toContain("https://sugangh.seowon.ac.kr/com/SsoCtr/findAppcsLogin.do");
    expect(login.url).toContain("menuId=edu");
    expect(login.body).toContain("202300000");
    expect(login.body).toContain("secret");
    expect(login.body).not.toContain("appcsKindCd");
    expect(login.contentType).toBe("text/xml");
  });

  it("builds register/cancel with M100780 and saveAppcsDtls paths", () => {
    const register = createCourseRegRegisterRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "202300000",
      subjtCd: "736012",
      corseDvclsNo: "01",
      cmpsjDivCd: "01"
    });
    expect(register.url).toContain("/com/sapl/SaplapCtr/saveAppcsDtls.do");
    expect(register.url).not.toContain("saveHopeAppcsDtls");
    expect(register.url).toContain("menuId=M100780");
    expect(register.url).toContain("pgmId=P001619");
    expect(register.body).toContain("736012");
    expect(register.body).toContain("cmpsjDivCd");

    const cancel = createCourseRegCancelRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "202300000",
      subjtCd: "008599",
      corseDvclsNo: "01",
      cmpsjDivCd: "04"
    });
    expect(cancel.url).toContain("saveAppcsDtlsCancl.do");
    expect(cancel.url).not.toContain("Hope");
    expect(cancel.url).toContain("menuId=M100780");
  });

  it("builds my list with findAppcsDtlsList (not ShpbsList)", () => {
    const request = createCourseRegMyListRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "202300000",
      asignDeprtCd: "B10547"
    });
    expect(request.url).toContain("findAppcsDtlsList.do");
    expect(request.url).not.toContain("Shpbs");
    expect(request.url).toContain("menuId=M100780");
    expect(request.body).toContain("202300000");
    expect(request.body).toContain("B10547");
  });

  it("builds search with M100780", () => {
    const request = createCourseRegSearchRequest({
      syy: "2026",
      smtCd: "20",
      stuno: "202300000",
      keyword: "736012"
    });
    expect(request.url).toContain("findEstblSubjtGnrlList.do");
    expect(request.url).toContain("menuId=M100780");
    expect(request.url).toContain("pgmId=P001619");
    expect(request.body).toContain("736012");
  });
});

describe("course-registration response parsers", () => {
  it("parses login success and mayBeFalseError flag", () => {
    const successBody = [
      "SSV:UTF-8",
      "ErrorCode:int=0",
      "Dataset:dsFlag",
      `_RowType_${SSV_US}flag:string(32)`,
      `N${SSV_US}1`,
      "",
      "Dataset:dsSession",
      `_RowType_${SSV_US}msg:string(32)${SSV_US}userNm:string(32)${SSV_US}persNo:string(32)${SSV_US}deptNm:string(32)`,
      `N${SSV_US}success${SSV_US}홍길동${SSV_US}202300000${SSV_US}컴퓨터공학과`
    ].join(SSV_RS);

    const ok = parseCourseRegLoginResponse(successBody);
    expect(ok.success).toBe(true);
    expect(ok.mayBeFalseError).toBe(false);
    expect(ok.session).toMatchObject({
      msg: "success",
      userNm: "홍길동",
      persNo: "202300000"
    });

    const failBody = [
      "SSV:UTF-8",
      "ErrorCode:int=0",
      "Dataset:dsFlag",
      `_RowType_${SSV_US}flag:string(32)`,
      `N${SSV_US}0`,
      "",
      "Dataset:dsSession",
      `_RowType_${SSV_US}msg:string(32)${SSV_US}userNm:string(32)`,
      `N${SSV_US}${SSV_US}undefined`
    ].join(SSV_RS);

    const fail = parseCourseRegLoginResponse(failBody);
    expect(fail.success).toBe(false);
    expect(fail.mayBeFalseError).toBe(true);
    expect(fail.flag).toBe("0");
    expect(fail.errorType).toBe(CourseRegErrorType.LOGIN_FAILED);
  });

  it("parses mutation success and ErrorCode=-20001 failures", () => {
    const successBody = ["SSV:UTF-8", "ErrorCode:int=0"].join(SSV_RS);
    const success = parseCourseRegMutationResponse(successBody, "register", {
      subjtCd: "736012",
      corseDvclsNo: "01"
    });
    expect(success.success).toBe(true);
    expect(success.action).toBe("register");

    const creditBody = [
      "SSV:UTF-8",
      "ErrorCode:int=-20001",
      "ErrorMsg:string=ＵＮＩＸ시스템실습 교과목은 총 신청 가능학점 초과이어서 신청할 수 없습니다."
    ].join(SSV_RS);
    const credit = parseCourseRegMutationResponse(creditBody, "register", {
      subjtCd: "736012",
      corseDvclsNo: "01"
    });
    expect(credit.success).toBe(false);
    expect(credit.errorCode).toBe(-20001);
    expect(credit.errorType).toBe(CourseRegErrorType.CREDIT_LIMIT_EXCEEDED);

    const alreadyBody = [
      "SSV:UTF-8",
      "ErrorCode:int=-20001",
      "ErrorMsg:string=금학기에 이미 신청한 교과목입니다.."
    ].join(SSV_RS);
    const already = parseCourseRegMutationResponse(alreadyBody, "register", {
      subjtCd: "736012",
      corseDvclsNo: "01"
    });
    expect(already.errorType).toBe(CourseRegErrorType.ALREADY_REGISTERED);
  });

  it("parses my list dsSapl231 and search dsSles131", () => {
    const listBody = [
      "SSV:UTF-8",
      "ErrorCode:int=0",
      "Dataset:dsSapl231",
      `_RowType_${SSV_US}subjtCd:string(32)${SSV_US}subjtNm:string(32)${SSV_US}corseDvclsNo:string(32)${SSV_US}cmpsjCdt:string(32)${SSV_US}appcsPcnt:string(32)${SSV_US}appcsLmttPcnt:string(32)${SSV_US}timtbNm:string(32)`,
      `N${SSV_US}008683${SSV_US}빅데이터프로그래밍${SSV_US}01${SSV_US}2${SSV_US}15${SSV_US}30${SSV_US}화 2,3`
    ].join(SSV_RS);

    const list = parseCourseRegMyListResponse(listBody);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      subjtCd: "008683",
      subjtNm: "빅데이터프로그래밍",
      corseDvclsNo: "01",
      appcsPcnt: "15",
      appcsLmttPcnt: "30"
    });
    // 본신청 목록은 sourceList 필드 없음
    expect((list[0] as any).sourceList).toBeUndefined();

    const searchBody = [
      "SSV:UTF-8",
      "ErrorCode:int=0",
      "Dataset:dsSles131",
      `_RowType_${SSV_US}subjtCd:string(32)${SSV_US}subjtNm:string(32)${SSV_US}corseDvclsNo:string(32)${SSV_US}cmpsjCdt:string(32)`,
      `N${SSV_US}736012${SSV_US}운영체제${SSV_US}01${SSV_US}3`
    ].join(SSV_RS);

    const search = parseCourseRegSearchResponse(searchBody);
    expect(search).toHaveLength(1);
    expect(search[0]).toMatchObject({
      subjtCd: "736012",
      subjtNm: "운영체제",
      sourceList: "general"
    });
  });

  it("parses sysdate XML", () => {
    const xml = `<?xml version="1.0"?><Root><Parameters><Parameter id="_sysdate">20260812100439</Parameter></Parameters></Root>`;
    expect(parseCourseRegSysdateResponse(xml)).toBe("20260812100439");
  });
});

describe("course-registration error classification", () => {
  it("classifies known ErrorMsg patterns", () => {
    expect(classifyCourseRegError(-20001, "총 신청 가능학점 초과이어서 신청할 수 없습니다")).toBe(
      CourseRegErrorType.CREDIT_LIMIT_EXCEEDED
    );
    expect(classifyCourseRegError(-20001, "금학기에 이미 신청한 교과목입니다.")).toBe(
      CourseRegErrorType.ALREADY_REGISTERED
    );
    expect(classifyCourseRegError(-20001, "수강 정원이 초과되었습니다")).toBe(
      CourseRegErrorType.CAPACITY_EXCEEDED
    );
    expect(classifyCourseRegError(0, undefined, { flag: "0" })).toBe(
      CourseRegErrorType.LOGIN_FAILED
    );
    expect(formatCourseRegError(CourseRegErrorType.CONNECTION_TIMEOUT)).toContain("과부하");
  });
});
