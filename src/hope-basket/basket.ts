/**
 * 수강희망바구니 요청 생성/응답 파싱.
 *
 * 범위는 예비 담기(appcsKindCd=100)에 한정한다.
 * 정식 수강신청 본신청은 포함하지 않는다.
 *
 * 세션 관리: HopeBasketClient
 * SAZ 복원: hope-basket/saz.ts
 */

import type {
  SugangAppcsSchedule,
  SugangBasketMutationOptions,
  SugangBasketMutationResult,
  SugangCultureDomain,
  SugangDepartment,
  SugangLoginCredentials,
  SugangLoginResult,
  SugangLoginScheduleCheck,
  SugangSessionInfo,
  SugangStudentInfo,
  SugangSubject,
  SugangSubjectSearchOptions,
  SugangSsvPostRequest,
  SugangTermCodeInfo,
  SugangTermContext,
  SugangTimetableDepartment,
  SugangTimetableDeptSearchOptions,
  SugangTimetableDetailSearchOptions,
  SugangTimetableSubject
} from "./types/basket.js";

export type {
  SugangAppcsSchedule,
  SugangBasketMutationOptions,
  SugangBasketMutationResult,
  HopeBasketClientOptions,
  SugangCultureDomain,
  SugangDepartment,
  SugangGetRequest,
  SugangLoginCredentials,
  SugangLoginResult,
  SugangLoginScheduleCheck,
  SugangSazBasketSummary,
  SugangSessionInfo,
  SugangStudentInfo,
  SugangSubject,
  SugangSubjectSearchOptions,
  SugangSsvPostRequest,
  SugangTermCodeInfo,
  SugangTermContext,
  SugangTimetableDepartment,
  SugangTimetableDeptSearchOptions,
  SugangTimetableDetailSearchOptions,
  SugangTimetableSubject
} from "./types/basket.js";

import { absoluteUrl } from "../ecampus/utils.js";
import {
  DEFAULT_APPCS_KIND_CD,
  DEFAULT_BASKET_CHECK_TARGET,
  DEFAULT_BASKET_MENU_ID,
  DEFAULT_BASKET_PGM_ID,
  DEFAULT_NOTC_CL_CD,
  DEFAULT_PORTAL_MENU_ID,
  DEFAULT_PORTAL_PGM_ID,
  DEFAULT_SUGANG_BASE_URL,
  DEFAULT_UNVFR_STDR_DEPT_CD,
  SUGANG_PATHS
} from "./constants.js";
import {
  createSsvRequestTimeStr,
  encodeSsvParams,
  encodeSsvRequest,
  findSsvDataset,
  parseSsv,
  readSsvErrorCode,
  type SsvDocument,
  type SsvRow
} from "./ssv.js";

export {
  DEFAULT_APPCS_KIND_CD,
  DEFAULT_BASKET_CHECK_TARGET,
  DEFAULT_BASKET_MENU_ID,
  DEFAULT_BASKET_PGM_ID,
  DEFAULT_NOTC_CL_CD,
  DEFAULT_PORTAL_MENU_ID,
  DEFAULT_PORTAL_PGM_ID,
  DEFAULT_SUGANG_BASE_URL,
  DEFAULT_UNVFR_STDR_DEPT_CD,
  SUGANG_PATHS
} from "./constants.js";

const SEARCH_COLUMNS = [
  "syy",
  "smtCd",
  "unvfrStdrDeptCd",
  "cmpsjHyDivCd",
  "cmpsjDivCd",
  "serchDiv",
  "estblCrseDivCd",
  "cltrDomnCd",
  "stuno",
  "asignDeprtCd",
  "subjtCd",
  "corseDvclsNo"
] as const;

const BASKET_MUTATION_COLUMNS = [
  "syy",
  "smtCd",
  "stuno",
  "unvfrStdrDeptCd",
  "subjtCd",
  "corseDvclsNo",
  "ceckTrgetGbn",
  "hiPass",
  "ttcMapngNo",
  "gschSubjtYn",
  "stdntChngLmttYn",
  "bchdmCntcSubjtYn"
] as const;

const LOGIN_COLUMNS = [
  "syy",
  "smtCd",
  "unvfrStdrDeptCd",
  "stuno",
  "password",
  "hy",
  "deptCd",
  "notcClCd",
  "appcsKindCd"
] as const;

/**
 * SESSIONID 확보용 포털 홈 진입 요청을 만든다
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {{ method: "GET"; url: string }} 홈 진입 GET 요청
 */
export function createSugangHomeRequest(baseUrl = DEFAULT_SUGANG_BASE_URL) {
  return {
    method: "GET" as const,
    url: absoluteUrl(SUGANG_PATHS.nxHome, baseUrl)
  };
}

/**
 * 현재 학년도/학기 결합 코드 조회 요청을 만든다
 * @param {{ unvfrSchdlCd?: string; regDeptCd?: string; baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 일정 코드 조회 옵션
 * @returns {SugangSsvPostRequest} 학사일정 코드 POST 요청
 */
export function createSugangTermCodeRequest(
  options: {
    unvfrSchdlCd?: string;
    regDeptCd?: string;
    baseUrl?: string;
    menuId?: string;
    pgmId?: string;
  } = {}
): SugangSsvPostRequest {
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const body = encodeSsvParams({
    flag: "1",
    univunvfrSchdlCd: options.unvfrSchdlCd ?? "SAPL00010001",
    regDeptCd: options.regDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
    applcDeptCd: "",
    applyCrseCd: "",
    dgriCrseCd: "",
    hy: "",
    syy: "",
    smtCd: "",
    requestTimeStr: createSsvRequestTimeStr()
  });

  return createSsvPost(
    SUGANG_PATHS.findScomUnvfrSchdlInfo,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 희망바구니 관련 일정 목록 조회 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string; atnlcNotcClCd?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 일정 목록 POST 요청
 */
export function createSugangAppcsScheduleListRequest(
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string; atnlcNotcClCd?: string } = {}
): SugangSsvPostRequest {
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: ["syy", "smtCd", "unvfrStdrDeptCd", "notcClCd", "atnlcNotcClCd"],
        rows: [
          {
            _rowType: "N",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd: context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
            notcClCd: "",
            atnlcNotcClCd: options.atnlcNotcClCd ?? ""
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findAppcsSchdlList,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 희망바구니 로그인 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 로그인 POST 요청
 */
export function createSugangLoginRequest(
  credentials: SugangLoginCredentials,
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {}
): SugangSsvPostRequest {
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const unvfrStdrDeptCd = context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD;
  const notcClCd = credentials.notcClCd ?? DEFAULT_NOTC_CL_CD;
  const appcsKindCd = credentials.appcsKindCd ?? DEFAULT_APPCS_KIND_CD;

  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [...LOGIN_COLUMNS],
        rows: [
          {
            _rowType: "U",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd,
            stuno: credentials.stuno,
            password: credentials.password,
            hy: "",
            deptCd: "",
            notcClCd,
            appcsKindCd
          },
          {
            _rowType: "O",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd,
            stuno: "",
            password: "",
            hy: "",
            deptCd: "",
            notcClCd,
            appcsKindCd: ""
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findAppcsLogin,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 로그인 직후 학생 기본정보 조회 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 학생 정보 POST 요청
 */
export function createSugangStudentInfoRequest(
  credentials: SugangLoginCredentials,
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {}
): SugangSsvPostRequest {
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [...LOGIN_COLUMNS],
        rows: [
          {
            _rowType: "N",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd: context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
            stuno: credentials.stuno,
            password: credentials.password,
            hy: "",
            deptCd: "",
            notcClCd: credentials.notcClCd ?? DEFAULT_NOTC_CL_CD,
            appcsKindCd: credentials.appcsKindCd ?? DEFAULT_APPCS_KIND_CD
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findStunoInfo,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 희망바구니 등 신청 가능 일정 확인 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {Pick<SugangStudentInfo, "hy" | "deptCd">} student - 학생 학년/학과
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 일정 가능 여부 POST 요청
 */
export function createSugangLoginCheckRequest(
  credentials: SugangLoginCredentials,
  student: Pick<SugangStudentInfo, "hy" | "deptCd">,
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {}
): SugangSsvPostRequest {
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const unvfrStdrDeptCd = context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD;
  const notcClCd = credentials.notcClCd ?? DEFAULT_NOTC_CL_CD;
  const appcsKindCd = credentials.appcsKindCd ?? DEFAULT_APPCS_KIND_CD;

  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [...LOGIN_COLUMNS],
        rows: [
          {
            _rowType: "U",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd,
            stuno: credentials.stuno,
            password: credentials.password,
            hy: student.hy,
            deptCd: student.deptCd,
            notcClCd,
            appcsKindCd
          },
          {
            _rowType: "O",
            syy: context.syy,
            smtCd: context.smtCd,
            unvfrStdrDeptCd,
            stuno: credentials.stuno,
            password: credentials.password,
            hy: "",
            deptCd: "",
            notcClCd,
            appcsKindCd
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findAppcsLoginChk,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 희망바구니 검색용 개설 학과 목록 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 학과 목록 POST 요청
 */
export function createSugangDepartmentListRequest(
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {}
): SugangSsvPostRequest {
  return createSearchStyleRequest(SUGANG_PATHS.findEstblDeprtList, context, {}, options);
}

/**
 * 희망바구니 검색용 교양 영역 목록 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 교양 영역 POST 요청
 */
export function createSugangCultureDomainListRequest(
  context: SugangTermContext,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {}
): SugangSsvPostRequest {
  return createSearchStyleRequest(SUGANG_PATHS.findCltrDomnList, context, {}, options);
}

/**
 * 전공계열 과목 검색 요청(shpbs)을 만든다
 * @param {SugangSubjectSearchOptions} options - 검색 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 전공계열 검색 POST 요청
 */
export function createSugangSpecialtySubjectListRequest(
  options: SugangSubjectSearchOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  return createSearchStyleRequest(
    SUGANG_PATHS.findEstblSubjtShpbsList,
    options,
    {
      serchDiv: options.serchDiv ?? "0",
      cmpsjHyDivCd: options.cmpsjHyDivCd ?? "",
      cmpsjDivCd: options.cmpsjDivCd ?? "",
      estblCrseDivCd: options.estblCrseDivCd ?? "",
      cltrDomnCd: options.cltrDomnCd ?? "",
      asignDeprtCd: options.asignDeprtCd ?? "",
      subjtCd: options.subjtCd ?? options.keyword ?? "",
      corseDvclsNo: options.corseDvclsNo ?? ""
    },
    {
      baseUrl,
      menuId: options.menuId ?? DEFAULT_BASKET_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_BASKET_PGM_ID
    }
  );
}

/**
 * 일반 개설 과목 검색 요청(gnrl)을 만든다
 * @param {SugangSubjectSearchOptions} options - 검색 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 일반 과목 검색 POST 요청
 */
export function createSugangGeneralSubjectListRequest(
  options: SugangSubjectSearchOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  return createSearchStyleRequest(
    SUGANG_PATHS.findEstblSubjtGnrlList,
    options,
    {
      serchDiv: options.serchDiv ?? "0",
      cmpsjHyDivCd: options.cmpsjHyDivCd ?? "",
      cmpsjDivCd: options.cmpsjDivCd ?? "",
      estblCrseDivCd: options.estblCrseDivCd ?? "",
      cltrDomnCd: options.cltrDomnCd ?? "",
      asignDeprtCd: options.asignDeprtCd ?? "",
      subjtCd: options.subjtCd ?? options.keyword ?? "",
      corseDvclsNo: options.corseDvclsNo ?? ""
    },
    {
      baseUrl,
      menuId: options.menuId ?? DEFAULT_BASKET_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_BASKET_PGM_ID
    }
  );
}

/**
 * 희망바구니 담기 전 서버 검증 요청을 만든다
 * @param {SugangSubjectSearchOptions & { keyword?: string }} options - 검증 대상 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 담기 검증 POST 요청
 */
export function createSugangBasketCheckRequest(
  options: SugangSubjectSearchOptions & { keyword?: string },
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  return createSearchStyleRequest(
    SUGANG_PATHS.findSaplHopeAppcsChk,
    options,
    {
      serchDiv: options.serchDiv ?? "0",
      cmpsjHyDivCd: options.cmpsjHyDivCd ?? "",
      cmpsjDivCd: options.cmpsjDivCd ?? "",
      estblCrseDivCd: options.estblCrseDivCd ?? "",
      cltrDomnCd: options.cltrDomnCd ?? "",
      asignDeprtCd: options.asignDeprtCd ?? "",
      subjtCd: options.subjtCd ?? options.keyword ?? "",
      corseDvclsNo: options.corseDvclsNo ?? ""
    },
    {
      baseUrl,
      menuId: options.menuId ?? DEFAULT_BASKET_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_BASKET_PGM_ID
    },
    "N"
  );
}

/**
 * 희망바구니 담기 요청을 만든다
 * @param {SugangBasketMutationOptions} options - 담을 과목 정보
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 담기 POST 요청
 */
export function createSugangBasketAddRequest(
  options: SugangBasketMutationOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  return createBasketMutationRequest(SUGANG_PATHS.saveHopeAppcsDtls, options, baseUrl);
}

/**
 * 희망바구니 취소 요청을 만든다
 * @param {SugangBasketMutationOptions} options - 취소할 과목 정보
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 취소 POST 요청
 */
export function createSugangBasketCancelRequest(
  options: SugangBasketMutationOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  return createBasketMutationRequest(SUGANG_PATHS.saveHopeAppcsDtlsCancl, options, baseUrl, {
    ceckTrgetGbn: options.ceckTrgetGbn ?? "",
    hiPass: options.hiPass ?? "",
    gschSubjtYn: options.gschSubjtYn ?? ""
  });
}

/**
 * 전공 강의시간표 학과 목록 요청을 만든다
 * @param {SugangTimetableDeptSearchOptions} options - 학과 검색 옵션
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 시간표 학과 목록 POST 요청
 */
export function createSugangTimetableDepartmentListRequest(
  options: SugangTimetableDeptSearchOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  const context = normalizeTerm(options);
  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [
          "syy",
          "smtCd",
          "smtClCd",
          "unvfrStdrDeptCd",
          "subjtCd",
          "subjtNm",
          "cmpsjDivCd",
          "cmpsjHyDivCd",
          "asignDeprtCd",
          "asignDeprtNm",
          "estblCrseDivCd",
          "instrEmpnm",
          "instrEmpno",
          "prgGbn",
          "serchDiv"
        ],
        rows: [
          {
            _rowType: "N",
            syy: context.syy,
            smtCd: context.smtCd,
            smtClCd: "",
            unvfrStdrDeptCd: context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
            subjtCd: options.subjtCd ?? "",
            subjtNm: options.subjtNm ?? "",
            cmpsjDivCd: options.cmpsjDivCd ?? "",
            cmpsjHyDivCd: options.cmpsjHyDivCd ?? "",
            asignDeprtCd: options.asignDeprtCd ?? "",
            asignDeprtNm: "",
            estblCrseDivCd: options.estblCrseDivCd ?? "",
            instrEmpnm: options.instrEmpnm ?? "",
            instrEmpno: options.instrEmpno ?? "",
            prgGbn: options.prgGbn ?? "SLESCS0250",
            serchDiv: options.serchDiv ?? "0"
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findEstblCorseList,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * 전공 강의시간표 분반 상세 목록 요청을 만든다
 * @param {SugangTimetableDetailSearchOptions} options - 분반 검색 옵션
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 시간표 분반 POST 요청
 */
export function createSugangTimetableDetailListRequest(
  options: SugangTimetableDetailSearchOptions,
  baseUrl = DEFAULT_SUGANG_BASE_URL
): SugangSsvPostRequest {
  const context = normalizeTerm(options);
  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [
          "syy",
          "smtCd",
          "smtClCd",
          "unvfrStdrDeptCd",
          "asignDeprtCd",
          "serchDiv",
          "estblDeprtCd"
        ],
        rows: [
          {
            _rowType: "N",
            syy: context.syy,
            smtCd: context.smtCd,
            smtClCd: "",
            unvfrStdrDeptCd: context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
            asignDeprtCd: options.asignDeprtCd,
            serchDiv: options.serchDiv ?? "0",
            estblDeprtCd: options.estblDeprtCd ?? ""
          }
        ]
      }
    ]
  );

  return createSsvPost(
    SUGANG_PATHS.findEstblCorseDtlList,
    body,
    {
      menuId: options.menuId ?? DEFAULT_PORTAL_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_PORTAL_PGM_ID
    },
    baseUrl
  );
}

/**
 * findAppcsLogin 응답을 로그인 결과 형태로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {{ success: boolean; flag: string; session?: SugangSessionInfo; errorCode?: number; message: string; raw: import("./ssv.js").SsvDocument }} 로그인 파싱 결과
 */
export function parseSugangLoginResponse(body: string): {
  success: boolean;
  flag: string;
  session?: SugangSessionInfo;
  errorCode?: number;
  message: string;
  raw: SsvDocument;
} {
  const raw = parseSsv(body);
  const errorCode = readSsvErrorCode(raw);
  const flag = findSsvDataset(raw, "dsFlag")?.rows[0]?.flag ?? "";
  const sessionRow = findSsvDataset(raw, "dsSession")?.rows[0];
  const session = sessionRow ? mapSession(sessionRow) : undefined;
  const success = errorCode === 0 && (flag === "1" || session?.msg === "success");

  return {
    success,
    flag,
    session,
    errorCode,
    message: success
      ? "로그인에 성공했습니다."
      : session?.msg && session.msg !== "success"
        ? session.msg
        : "로그인에 실패했습니다.",
    raw
  };
}

/**
 * findStunoInfo 응답을 학생 기본정보로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangStudentInfo | undefined} 학생 정보. 행이 없으면 undefined
 */
export function parseSugangStudentInfoResponse(body: string): SugangStudentInfo | undefined {
  const raw = parseSsv(body);
  const row = findSsvDataset(raw, "dsStunoInfo")?.rows[0];
  if (!row) return undefined;
  return mapStudent(row);
}

/**
 * findAppcsLoginChk 응답을 신청 가능 일정 목록으로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangLoginScheduleCheck[]} 일정 가능 여부 목록
 */
export function parseSugangLoginCheckResponse(body: string): SugangLoginScheduleCheck[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsLoginInfoChk")?.rows ?? []).map((row) => ({
    possYn: row.possYn ?? "",
    appcsSchdlCd: row.appcsSchdlCd ?? "",
    appcsSchdlSeqno: row.appcsSchdlSeqno ?? "",
    appcsTrgetTypeCnt: row.appcsTrgetTypeCnt ?? "",
    allowed: row.possYn === "1",
    raw: row
  }));
}

/**
 * 학사일정 코드 응답을 syy/smtCd로 분리한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTermCodeInfo | undefined} 학년도/학기 코드. 없으면 undefined
 */
export function parseSugangTermCodeResponse(body: string): SugangTermCodeInfo | undefined {
  const raw = parseSsv(body);
  const row = findSsvDataset(raw, "dsUnvfc")?.rows[0];
  if (!row) return undefined;
  const termCode = row.reslt ?? "";
  const syy = termCode.slice(0, 4);
  const smtCd = termCode.slice(4) || "";
  return { termCode, syy, smtCd, raw: row, params: raw.params };
}

/**
 * 희망바구니 관련 일정 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangAppcsSchedule[]} 일정 목록
 */
export function parseSugangAppcsScheduleListResponse(body: string): SugangAppcsSchedule[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsSapl121")?.rows ?? []).map((row) => ({
    appcsSchdlCd: row.appcsSchdlCd ?? "",
    appcsNm: row.appcsNm ?? "",
    appcsSchdlNm: row.appcsSchdlNm ?? "",
    beginDt: row.beginDt ?? "",
    endDt: row.endDt ?? "",
    beginTm: row.beginTm ?? "",
    endTm: row.endTm ?? "",
    endDate: row.endDate ?? "",
    aplyFlag: row.aplyFlag ?? "",
    gopubYn: row.gopubYn ?? "",
    remrk: row.remrk ?? "",
    isActive: row.aplyFlag === "1",
    raw: row
  }));
}

/**
 * 개설 학과 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangDepartment[]} 학과 목록
 */
export function parseSugangDepartmentListResponse(body: string): SugangDepartment[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsEstblDeprtCd")?.rows ?? []).map((row) => ({
    asignDeprtCd: row.asignDeprtCd ?? "",
    deptNm: row.deptNm ?? "",
    cmpsjDivCd: row.cmpsjDivCd ?? "",
    raw: row
  }));
}

/**
 * 교양 영역 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangCultureDomain[]} 교양 영역 목록
 */
export function parseSugangCultureDomainListResponse(body: string): SugangCultureDomain[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsCltrDomnCd")?.rows ?? []).map((row) => ({
    code: row.code ?? "",
    codeNm: row.codeNm ?? "",
    raw: row
  }));
}

/**
 * 과목 검색 응답을 공통 SugangSubject 형태로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @param {SugangSubject["sourceList"]} [sourceList="unknown"] - 목록 출처 표시용 값
 * @returns {SugangSubject[]} 과목 목록
 */
export function parseSugangSubjectListResponse(
  body: string,
  sourceList: SugangSubject["sourceList"] = "unknown"
): SugangSubject[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsSles131")?.rows ?? []).map((row) => mapSubject(row, sourceList));
}

/**
 * 희망바구니 담기/취소/검증 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @param {SugangBasketMutationResult["action"]} action - 수행 동작
 * @param {Pick<SugangBasketMutationOptions, "subjtCd" | "corseDvclsNo">} options - 대상 과목 식별자
 * @returns {SugangBasketMutationResult} 정규화된 작업 결과
 */
export function parseSugangBasketMutationResponse(
  body: string,
  action: SugangBasketMutationResult["action"],
  options: Pick<SugangBasketMutationOptions, "subjtCd" | "corseDvclsNo">
): SugangBasketMutationResult {
  const raw = parseSsv(body);
  const errorCode = readSsvErrorCode(raw);
  const errorMsg = raw.params.ErrorMsg ?? raw.params.errorMsg ?? "";
  const success = errorCode === 0;

  return {
    success,
    errorCode,
    errorMsg: errorMsg || undefined,
    message: success
      ? action === "add"
        ? "희망바구니에 담았습니다."
        : action === "cancel"
          ? "희망바구니에서 취소했습니다."
          : "희망바구니 검증을 통과했습니다."
      : errorMsg ||
        `희망바구니 ${action} 요청이 실패했습니다. (ErrorCode=${errorCode ?? "?"})`,
    action,
    subjtCd: options.subjtCd,
    corseDvclsNo: options.corseDvclsNo,
    raw
  };
}

/**
 * 전공 시간표 학과 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTimetableDepartment[]} 시간표 학과 목록
 */
export function parseSugangTimetableDepartmentListResponse(
  body: string
): SugangTimetableDepartment[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsSles131")?.rows ?? []).map((row) => ({
    univCd: row.univCd ?? "",
    asignDeprtCd: row.asignDeprtCd ?? "",
    deptNm: row.deptNm ?? "",
    univDeptNm: row.univDeptNm ?? "",
    cmpsjDivNm: row.cmpsjDivNm ?? "",
    raw: row
  }));
}

/**
 * 전공 시간표 분반 상세 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTimetableSubject[]} 분반 목록
 */
export function parseSugangTimetableDetailListResponse(body: string): SugangTimetableSubject[] {
  const raw = parseSsv(body);
  return (findSsvDataset(raw, "dsSles131")?.rows ?? []).map((row) => ({
    subjtCd: row.subjtCd ?? "",
    subjtNm: row.subjtNm ?? "",
    corseDvclsNo: row.corseDvclsNo ?? "",
    chrgInstrEmpnm: row.chrgInstrEmpnm ?? "",
    chrgInstrEmpno: row.chrgInstrEmpno ?? "",
    timtbNm: row.timtbNm ?? "",
    cmpsjCdt: row.cmpsjCdt ?? "",
    cmpsjDivCd: row.cmpsjDivCd ?? "",
    cmpsjDivNm: row.cmpsjDivNm ?? "",
    cmpsjHyDivCd: row.cmpsjHyDivCd ?? "",
    thryHrs: row.thryHrs ?? "",
    prctsHrs: row.prctsHrs ?? "",
    atnlcPosblPcnt: row.atnlcPosblPcnt ?? "",
    slesLessnItem: row.slesLessnItem ?? "",
    remrk: row.remrk ?? "",
    raw: row
  }));
}

/**
 * 로그인 단계별 응답을 하나의 결과 객체로 합친다
 * @param {{ loginBody: string; studentBody?: string; loginCheckBody?: string }} parts - 단계별 응답 본문
 * @returns {SugangLoginResult} 통합 로그인 결과
 */
export function composeSugangLoginResult(parts: {
  loginBody: string;
  studentBody?: string;
  loginCheckBody?: string;
}): SugangLoginResult {
  const login = parseSugangLoginResponse(parts.loginBody);
  const student = parts.studentBody
    ? parseSugangStudentInfoResponse(parts.studentBody)
    : undefined;
  const scheduleChecks = parts.loginCheckBody
    ? parseSugangLoginCheckResponse(parts.loginCheckBody)
    : undefined;

  return {
    success: login.success,
    message: login.message,
    flag: login.flag,
    session: login.session,
    student,
    scheduleChecks,
    errorCode: login.errorCode,
    raw: {
      login: login.raw,
      student: parts.studentBody ? parseSsv(parts.studentBody) : undefined,
      loginCheck: parts.loginCheckBody ? parseSsv(parts.loginCheckBody) : undefined
    }
  };
}

/**
 * CLI 출력용 과목 목록 문자열을 만든다
 * @param {SugangSubject[]} subjects - 과목 목록
 * @returns {string} 콘솔 표시 문자열
 */
export function stringifySugangSubjects(subjects: SugangSubject[]): string {
  return subjects
    .map((subject, index) => {
      const title = `${index + 1}. [${subject.subjtCd}-${subject.corseDvclsNo}] ${subject.subjtNm}`;
      const meta = [
        subject.estblDeprtNm && `개설=${subject.estblDeprtNm}`,
        subject.cmpsjCdt && `학점=${subject.cmpsjCdt}`,
        subject.chrgInstrEmpnm && `담당=${subject.chrgInstrEmpnm}`,
        subject.timtbNm && `시간=${subject.timtbNm.replace(/\s+/g, " ")}`
      ]
        .filter(Boolean)
        .join(" | ");
      return meta ? `${title}\n   ${meta}` : title;
    })
    .join("\n");
}

/**
 * 검색/검증 API 공통 dsParam 요청을 만든다
 * @param {string} path - API 경로
 * @param {Partial<SugangTermContext> & { stuno?: string }} context - 학년도/학기/학번 문맥
 * @param {Partial<Record<(typeof SEARCH_COLUMNS)[number], string>>} fields - 검색 필드 값
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @param {string} [rowType="N"] - Nexacro 행 타입
 * @returns {SugangSsvPostRequest} SSV POST 요청
 * @private
 */
function createSearchStyleRequest(
  path: string,
  context: Partial<SugangTermContext> & { stuno?: string },
  fields: Partial<Record<(typeof SEARCH_COLUMNS)[number], string>>,
  options: { baseUrl?: string; menuId?: string; pgmId?: string } = {},
  rowType: string = "N"
): SugangSsvPostRequest {
  const term = normalizeTerm(context);
  const baseUrl = options.baseUrl ?? DEFAULT_SUGANG_BASE_URL;
  const row = {
    _rowType: rowType,
    syy: term.syy,
    smtCd: term.smtCd,
    unvfrStdrDeptCd: term.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
    cmpsjHyDivCd: fields.cmpsjHyDivCd ?? "",
    cmpsjDivCd: fields.cmpsjDivCd ?? "",
    serchDiv: fields.serchDiv ?? "0",
    estblCrseDivCd: fields.estblCrseDivCd ?? "",
    cltrDomnCd: fields.cltrDomnCd ?? "",
    stuno: context.stuno ?? term.stuno ?? "",
    asignDeprtCd: fields.asignDeprtCd ?? "",
    subjtCd: fields.subjtCd ?? "",
    corseDvclsNo: fields.corseDvclsNo ?? ""
  };

  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [...SEARCH_COLUMNS],
        rows: [row]
      }
    ]
  );

  return createSsvPost(
    path,
    body,
    {
      menuId: options.menuId ?? DEFAULT_BASKET_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_BASKET_PGM_ID
    },
    baseUrl
  );
}

/**
 * 희망바구니 담기/취소 공통 요청을 만든다
 * @param {string} path - API 경로
 * @param {SugangBasketMutationOptions} options - 대상 과목 정보
 * @param {string} baseUrl - sugangh 기본 URL
 * @param {Partial<Record<(typeof BASKET_MUTATION_COLUMNS)[number], string>>} [overrides={}] - 필드 덮어쓰기
 * @returns {SugangSsvPostRequest} SSV POST 요청
 * @private
 */
function createBasketMutationRequest(
  path: string,
  options: SugangBasketMutationOptions,
  baseUrl: string,
  overrides: Partial<Record<(typeof BASKET_MUTATION_COLUMNS)[number], string>> = {}
): SugangSsvPostRequest {
  const term = normalizeTerm(options);
  const body = encodeSsvRequest(
    { requestTimeStr: createSsvRequestTimeStr() },
    [
      {
        id: "dsParam",
        columns: [...BASKET_MUTATION_COLUMNS],
        rows: [
          {
            _rowType: "I",
            syy: term.syy,
            smtCd: term.smtCd,
            stuno: options.stuno ?? term.stuno ?? "",
            unvfrStdrDeptCd: term.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
            subjtCd: options.subjtCd,
            corseDvclsNo: options.corseDvclsNo,
            ceckTrgetGbn: overrides.ceckTrgetGbn ?? options.ceckTrgetGbn ?? DEFAULT_BASKET_CHECK_TARGET,
            hiPass: overrides.hiPass ?? options.hiPass ?? "0",
            ttcMapngNo: overrides.ttcMapngNo ?? options.ttcMapngNo ?? "",
            gschSubjtYn: overrides.gschSubjtYn ?? options.gschSubjtYn ?? "0",
            stdntChngLmttYn: overrides.stdntChngLmttYn ?? options.stdntChngLmttYn ?? "",
            bchdmCntcSubjtYn: overrides.bchdmCntcSubjtYn ?? options.bchdmCntcSubjtYn ?? ""
          }
        ]
      }
    ]
  );

  return createSsvPost(
    path,
    body,
    {
      menuId: options.menuId ?? DEFAULT_BASKET_MENU_ID,
      pgmId: options.pgmId ?? DEFAULT_BASKET_PGM_ID
    },
    baseUrl
  );
}

/**
 * SSV POST 요청 객체를 조립한다
 * @param {string} path - API 경로
 * @param {string} body - SSV 본문
 * @param {Record<string, string>} query - 쿼리 파라미터
 * @param {string} baseUrl - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 완성된 POST 요청
 * @private
 */
function createSsvPost(
  path: string,
  body: string,
  query: Record<string, string>,
  baseUrl: string
): SugangSsvPostRequest {
  const url = new URL(absoluteUrl(path, baseUrl));
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return {
    method: "POST",
    url: url.toString(),
    query,
    body,
    contentType: "text/xml",
    accept: "application/xml, text/xml, */*"
  };
}

/**
 * 학년도/학기 문맥 기본값을 채운다
 * @param {Partial<SugangTermContext>} context - 부분 문맥
 * @returns {SugangTermContext} 정규화된 문맥
 * @private
 */
function normalizeTerm(context: Partial<SugangTermContext>): SugangTermContext {
  return {
    syy: context.syy ?? "",
    smtCd: context.smtCd ?? "",
    unvfrStdrDeptCd: context.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
    stuno: context.stuno
  };
}

/**
 * dsSession 행을 세션 정보로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @returns {SugangSessionInfo} 세션 정보
 * @private
 */
function mapSession(row: SsvRow): SugangSessionInfo {
  return {
    msg: row.msg ?? "",
    initPswdYn: row.initPswdYn ?? "",
    userSupport: row.userSupport ?? "",
    userNm: row.userNm ?? "",
    encStr: row.encStr ?? "",
    persNo: row.persNo ?? "",
    wasInfo: row.wasInfo ?? "",
    needChangePwd: row.needChangePwd ?? "",
    deptNm: row.deptNm ?? "",
    locale: row.locale ?? "",
    raw: row
  };
}

/**
 * dsStunoInfo 행을 학생 정보로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @returns {SugangStudentInfo} 학생 정보
 * @private
 */
function mapStudent(row: SsvRow): SugangStudentInfo {
  return {
    stuno: row.stuno ?? "",
    stdntNm: row.stdntNm ?? "",
    deptCd: row.deptCd ?? "",
    deprtCd: row.deprtCd ?? "",
    deprtNm: row.deprtNm ?? "",
    hy: row.hy ?? "",
    syy: row.syy ?? "",
    smtCd: row.smtCd ?? "",
    unvfrStdrDeptCd: row.unvfrStdrDeptCd ?? DEFAULT_UNVFR_STDR_DEPT_CD,
    schrgSttusCd: row.schrgSttusCd ?? "",
    schrgSttusNm: row.schrgSttusNm ?? "",
    minCdtNum: row.minCdtNum ?? "",
    maxCdtNum: row.maxCdtNum ?? "",
    cmpsjSecnt: row.cmpsjSecnt ?? "",
    dghtDivCd: row.dghtDivCd ?? "",
    univCd: row.univCd ?? "",
    entnsDt: row.entnsDt ?? "",
    raw: row
  };
}

/**
 * dsSles131 행을 공통 과목 모델로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @param {SugangSubject["sourceList"]} sourceList - 목록 출처
 * @returns {SugangSubject} 과목 모델
 * @private
 */
function mapSubject(row: SsvRow, sourceList: SugangSubject["sourceList"]): SugangSubject {
  return {
    subjtCd: row.subjtCd ?? "",
    subjtNm: row.subjtNm ?? "",
    orgSubjtNm: row.orgSubjtNm ?? row.subjtNm ?? "",
    corseDvclsNo: row.corseDvclsNo ?? "",
    estblDeprtCd: row.estblDeprtCd ?? row.asignDeprtCd ?? "",
    estblDeprtNm: row.estblDeprtNm ?? row.deptNm ?? "",
    asignDeprtCd: row.asignDeprtCd ?? row.estblDeprtCd ?? "",
    univCd: row.univCd ?? "",
    univNm: row.univNm ?? "",
    cmpsjCdt: row.cmpsjCdt ?? "",
    cmpsjDivCd: row.cmpsjDivCd ?? "",
    cmpsjHyDivCd: row.cmpsjHyDivCd ?? "",
    dghtDivCd: row.dghtDivCd ?? "",
    estblCrseDivCd: row.estblCrseDivCd ?? "",
    timtbNm: row.timtbNm ?? "",
    syy: row.syy ?? "",
    smtCd: row.smtCd ?? "",
    unvfrStdrDeptCd: row.unvfrStdrDeptCd ?? "",
    chk: row.chk ?? "",
    remrk: row.remrk ?? "",
    chrgInstrEmpnm: row.chrgInstrEmpnm ?? "",
    chrgInstrEmpno: row.chrgInstrEmpno ?? "",
    hopeAppcsCnt: row.hopeAppcsCnt ?? "",
    appcsLmttPcnt: row.appcsLmttPcnt ?? "",
    thryHrs: row.thryHrs ?? "",
    prctsHrs: row.prctsHrs ?? "",
    sourceList,
    raw: row
  };
}

