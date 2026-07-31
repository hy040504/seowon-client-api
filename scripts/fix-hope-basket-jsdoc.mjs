import fs from "node:fs";

const path = "src/hope-basket/basket.ts";
let s = fs.readFileSync(path, "utf8");

/** @type {Array<[string, string]>} */
const pairs = [
  [
    `/**
 * 수강신청 포털 홈 요청을 만든다 (SESSIONID 확보용)
 */
export function createSugangHomeRequest(baseUrl = DEFAULT_SUGANG_BASE_URL) {`,
    `/**
 * SESSIONID 확보용 포털 홈 진입 요청을 만든다
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {{ method: "GET"; url: string }} 홈 진입 GET 요청
 */
export function createSugangHomeRequest(baseUrl = DEFAULT_SUGANG_BASE_URL) {`
  ],
  [
    `/**
 * 학사일정 코드(예: 202620) 조회 요청을 만든다
 */
export function createSugangTermCodeRequest(`,
    `/**
 * 현재 학년도/학기 결합 코드 조회 요청을 만든다
 * @param {{ unvfrSchdlCd?: string; regDeptCd?: string; baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 일정 코드 조회 옵션
 * @returns {SugangSsvPostRequest} 학사일정 코드 POST 요청
 */
export function createSugangTermCodeRequest(`
  ],
  [
    `/**
 * 수강 일정 목록 조회 요청을 만든다
 */
export function createSugangAppcsScheduleListRequest(`,
    `/**
 * 희망바구니 관련 일정 목록 조회 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string; atnlcNotcClCd?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 일정 목록 POST 요청
 */
export function createSugangAppcsScheduleListRequest(`
  ],
  [
    `/**
 * 수강신청 로그인 요청을 만든다
 */
export function createSugangLoginRequest(`,
    `/**
 * 희망바구니 로그인 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 로그인 POST 요청
 */
export function createSugangLoginRequest(`
  ],
  [
    `/**
 * 학생 정보 조회 요청을 만든다
 */
export function createSugangStudentInfoRequest(`,
    `/**
 * 로그인 직후 학생 기본정보 조회 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 학생 정보 POST 요청
 */
export function createSugangStudentInfoRequest(`
  ],
  [
    `/**
 * 로그인 후 신청 가능 일정 확인 요청을 만든다
 */
export function createSugangLoginCheckRequest(`,
    `/**
 * 희망바구니 등 신청 가능 일정 확인 요청을 만든다
 * @param {SugangLoginCredentials} credentials - 학번/비밀번호
 * @param {Pick<SugangStudentInfo, "hy" | "deptCd">} student - 학생 학년/학과
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 일정 가능 여부 POST 요청
 */
export function createSugangLoginCheckRequest(`
  ],
  [
    `/**
 * 개설 학과 목록 조회 요청을 만든다
 */
export function createSugangDepartmentListRequest(`,
    `/**
 * 희망바구니 검색용 개설 학과 목록 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 학과 목록 POST 요청
 */
export function createSugangDepartmentListRequest(`
  ],
  [
    `/**
 * 교양 영역 목록 조회 요청을 만든다
 */
export function createSugangCultureDomainListRequest(`,
    `/**
 * 희망바구니 검색용 교양 영역 목록 요청을 만든다
 * @param {SugangTermContext} context - 학년도/학기 문맥
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @returns {SugangSsvPostRequest} 교양 영역 POST 요청
 */
export function createSugangCultureDomainListRequest(`
  ],
  [
    `/**
 * 전공/희망바구니용 과목 검색 요청(shpbs)을 만든다
 */
export function createSugangSpecialtySubjectListRequest(`,
    `/**
 * 전공계열 과목 검색 요청(shpbs)을 만든다
 * @param {SugangSubjectSearchOptions} options - 검색 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 전공계열 검색 POST 요청
 */
export function createSugangSpecialtySubjectListRequest(`
  ],
  [
    `/**
 * 일반 과목 검색 요청(gnrl)을 만든다
 */
export function createSugangGeneralSubjectListRequest(`,
    `/**
 * 일반 개설 과목 검색 요청(gnrl)을 만든다
 * @param {SugangSubjectSearchOptions} options - 검색 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 일반 과목 검색 POST 요청
 */
export function createSugangGeneralSubjectListRequest(`
  ],
  [
    `/**
 * 희망바구니 담기 전 검증 요청을 만든다
 */
export function createSugangBasketCheckRequest(`,
    `/**
 * 희망바구니 담기 전 서버 검증 요청을 만든다
 * @param {SugangSubjectSearchOptions & { keyword?: string }} options - 검증 대상 조건
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 담기 검증 POST 요청
 */
export function createSugangBasketCheckRequest(`
  ],
  [
    `/**
 * 희망바구니 담기 요청을 만든다
 */
export function createSugangBasketAddRequest(`,
    `/**
 * 희망바구니 담기 요청을 만든다
 * @param {SugangBasketMutationOptions} options - 담을 과목 정보
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 담기 POST 요청
 */
export function createSugangBasketAddRequest(`
  ],
  [
    `/**
 * 희망바구니 취소 요청을 만든다
 */
export function createSugangBasketCancelRequest(`,
    `/**
 * 희망바구니 취소 요청을 만든다
 * @param {SugangBasketMutationOptions} options - 취소할 과목 정보
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 취소 POST 요청
 */
export function createSugangBasketCancelRequest(`
  ],
  [
    `/**
 * 전공 강의시간표 학과 목록 요청을 만든다
 */
export function createSugangTimetableDepartmentListRequest(`,
    `/**
 * 전공 강의시간표 학과 목록 요청을 만든다
 * @param {SugangTimetableDeptSearchOptions} options - 학과 검색 옵션
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 시간표 학과 목록 POST 요청
 */
export function createSugangTimetableDepartmentListRequest(`
  ],
  [
    `/**
 * 전공 강의시간표 상세(분반) 목록 요청을 만든다
 */
export function createSugangTimetableDetailListRequest(`,
    `/**
 * 전공 강의시간표 분반 상세 목록 요청을 만든다
 * @param {SugangTimetableDetailSearchOptions} options - 분반 검색 옵션
 * @param {string} [baseUrl=DEFAULT_SUGANG_BASE_URL] - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 시간표 분반 POST 요청
 */
export function createSugangTimetableDetailListRequest(`
  ],
  [
    `/**
 * findAppcsLogin 응답을 정규화한다
 */
export function parseSugangLoginResponse(body: string): {`,
    `/**
 * findAppcsLogin 응답을 로그인 결과 형태로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {{ success: boolean; flag: string; session?: SugangSessionInfo; errorCode?: number; message: string; raw: import("./ssv.js").SsvDocument }} 로그인 파싱 결과
 */
export function parseSugangLoginResponse(body: string): {`
  ],
  [
    `/**
 * findStunoInfo 응답을 정규화한다
 */
export function parseSugangStudentInfoResponse(body: string): SugangStudentInfo | undefined {`,
    `/**
 * findStunoInfo 응답을 학생 기본정보로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangStudentInfo | undefined} 학생 정보. 행이 없으면 undefined
 */
export function parseSugangStudentInfoResponse(body: string): SugangStudentInfo | undefined {`
  ],
  [
    `/**
 * findAppcsLoginChk 응답을 정규화한다
 */
export function parseSugangLoginCheckResponse(body: string): SugangLoginScheduleCheck[] {`,
    `/**
 * findAppcsLoginChk 응답을 신청 가능 일정 목록으로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangLoginScheduleCheck[]} 일정 가능 여부 목록
 */
export function parseSugangLoginCheckResponse(body: string): SugangLoginScheduleCheck[] {`
  ],
  [
    `/**
 * 학사일정 코드 응답을 정규화한다
 */
export function parseSugangTermCodeResponse(body: string): SugangTermCodeInfo | undefined {`,
    `/**
 * 학사일정 코드 응답을 syy/smtCd로 분리한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTermCodeInfo | undefined} 학년도/학기 코드. 없으면 undefined
 */
export function parseSugangTermCodeResponse(body: string): SugangTermCodeInfo | undefined {`
  ],
  [
    `/**
 * 수강 일정 목록 응답을 정규화한다
 */
export function parseSugangAppcsScheduleListResponse(body: string): SugangAppcsSchedule[] {`,
    `/**
 * 희망바구니 관련 일정 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangAppcsSchedule[]} 일정 목록
 */
export function parseSugangAppcsScheduleListResponse(body: string): SugangAppcsSchedule[] {`
  ],
  [
    `/**
 * 개설 학과 목록 응답을 정규화한다
 */
export function parseSugangDepartmentListResponse(body: string): SugangDepartment[] {`,
    `/**
 * 개설 학과 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangDepartment[]} 학과 목록
 */
export function parseSugangDepartmentListResponse(body: string): SugangDepartment[] {`
  ],
  [
    `/**
 * 교양 영역 목록 응답을 정규화한다
 */
export function parseSugangCultureDomainListResponse(body: string): SugangCultureDomain[] {`,
    `/**
 * 교양 영역 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangCultureDomain[]} 교양 영역 목록
 */
export function parseSugangCultureDomainListResponse(body: string): SugangCultureDomain[] {`
  ],
  [
    `/**
 * 과목 검색 응답을 정규화한다
 */
export function parseSugangSubjectListResponse(`,
    `/**
 * 과목 검색 응답을 공통 SugangSubject 형태로 정규화한다
 * @param {string} body - SSV 응답 본문
 * @param {SugangSubject["sourceList"]} [sourceList="unknown"] - 목록 출처 표시용 값
 * @returns {SugangSubject[]} 과목 목록
 */
export function parseSugangSubjectListResponse(`
  ],
  [
    `/**
 * 바구니 담기/취소/검증 응답을 정규화한다
 */
export function parseSugangBasketMutationResponse(`,
    `/**
 * 희망바구니 담기/취소/검증 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @param {SugangBasketMutationResult["action"]} action - 수행 동작
 * @param {Pick<SugangBasketMutationOptions, "subjtCd" | "corseDvclsNo">} options - 대상 과목 식별자
 * @returns {SugangBasketMutationResult} 정규화된 작업 결과
 */
export function parseSugangBasketMutationResponse(`
  ],
  [
    `/**
 * 전공 시간표 학과 목록 응답을 정규화한다
 */
export function parseSugangTimetableDepartmentListResponse(`,
    `/**
 * 전공 시간표 학과 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTimetableDepartment[]} 시간표 학과 목록
 */
export function parseSugangTimetableDepartmentListResponse(`
  ],
  [
    `/**
 * 전공 시간표 상세 목록 응답을 정규화한다
 */
export function parseSugangTimetableDetailListResponse(body: string): SugangTimetableSubject[] {`,
    `/**
 * 전공 시간표 분반 상세 목록 응답을 정규화한다
 * @param {string} body - SSV 응답 본문
 * @returns {SugangTimetableSubject[]} 분반 목록
 */
export function parseSugangTimetableDetailListResponse(body: string): SugangTimetableSubject[] {`
  ],
  [
    `/**
 * 로그인/학생/일정 확인 응답을 하나의 로그인 결과로 합친다
 */
export function composeSugangLoginResult(parts: {`,
    `/**
 * 로그인 단계별 응답을 하나의 결과 객체로 합친다
 * @param {{ loginBody: string; studentBody?: string; loginCheckBody?: string }} parts - 단계별 응답 본문
 * @returns {SugangLoginResult} 통합 로그인 결과
 */
export function composeSugangLoginResult(parts: {`
  ],
  [
    `/**
 * 과목 목록을 사람이 읽기 쉬운 문자열로 변환한다
 */
export function stringifySugangSubjects(subjects: SugangSubject[]): string {`,
    `/**
 * CLI 출력용 과목 목록 문자열을 만든다
 * @param {SugangSubject[]} subjects - 과목 목록
 * @returns {string} 콘솔 표시 문자열
 */
export function stringifySugangSubjects(subjects: SugangSubject[]): string {`
  ],
  [
    `\nfunction createSearchStyleRequest(`,
    `\n/**
 * 검색/검증 API 공통 dsParam 요청을 만든다
 * @param {string} path - API 경로
 * @param {Partial<SugangTermContext> & { stuno?: string }} context - 학년도/학기/학번 문맥
 * @param {Partial<Record<(typeof SEARCH_COLUMNS)[number], string>>} fields - 검색 필드 값
 * @param {{ baseUrl?: string; menuId?: string; pgmId?: string }} [options={}] - 요청 옵션
 * @param {string} [rowType="N"] - Nexacro 행 타입
 * @returns {SugangSsvPostRequest} SSV POST 요청
 * @private
 */
function createSearchStyleRequest(`
  ],
  [
    `\nfunction createBasketMutationRequest(`,
    `\n/**
 * 희망바구니 담기/취소 공통 요청을 만든다
 * @param {string} path - API 경로
 * @param {SugangBasketMutationOptions} options - 대상 과목 정보
 * @param {string} baseUrl - sugangh 기본 URL
 * @param {Partial<Record<(typeof BASKET_MUTATION_COLUMNS)[number], string>>} [overrides={}] - 필드 덮어쓰기
 * @returns {SugangSsvPostRequest} SSV POST 요청
 * @private
 */
function createBasketMutationRequest(`
  ],
  [
    `\nfunction createSsvPost(`,
    `\n/**
 * SSV POST 요청 객체를 조립한다
 * @param {string} path - API 경로
 * @param {string} body - SSV 본문
 * @param {Record<string, string>} query - 쿼리 파라미터
 * @param {string} baseUrl - sugangh 기본 URL
 * @returns {SugangSsvPostRequest} 완성된 POST 요청
 * @private
 */
function createSsvPost(`
  ],
  [
    `\nfunction normalizeTerm(context: Partial<SugangTermContext>): SugangTermContext {`,
    `\n/**
 * 학년도/학기 문맥 기본값을 채운다
 * @param {Partial<SugangTermContext>} context - 부분 문맥
 * @returns {SugangTermContext} 정규화된 문맥
 * @private
 */
function normalizeTerm(context: Partial<SugangTermContext>): SugangTermContext {`
  ],
  [
    `\nfunction mapSession(row: SsvRow): SugangSessionInfo {`,
    `\n/**
 * dsSession 행을 세션 정보로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @returns {SugangSessionInfo} 세션 정보
 * @private
 */
function mapSession(row: SsvRow): SugangSessionInfo {`
  ],
  [
    `\nfunction mapStudent(row: SsvRow): SugangStudentInfo {`,
    `\n/**
 * dsStunoInfo 행을 학생 정보로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @returns {SugangStudentInfo} 학생 정보
 * @private
 */
function mapStudent(row: SsvRow): SugangStudentInfo {`
  ],
  [
    `\nfunction mapSubject(row: SsvRow, sourceList: SugangSubject["sourceList"]): SugangSubject {`,
    `\n/**
 * dsSles131 행을 공통 과목 모델로 변환한다
 * @param {import("./ssv.js").SsvRow} row - 원본 행
 * @param {SugangSubject["sourceList"]} sourceList - 목록 출처
 * @returns {SugangSubject} 과목 모델
 * @private
 */
function mapSubject(row: SsvRow, sourceList: SugangSubject["sourceList"]): SugangSubject {`
  ]
];

let ok = 0;
for (const [from, to] of pairs) {
  if (!s.includes(from)) {
    console.log("MISS", from.slice(0, 70).replace(/\n/g, " "));
    continue;
  }
  s = s.replace(from, to);
  ok += 1;
}

// 모듈 헤더를 의도 중심으로 정리
s = s.replace(
  /^\/\*\*[\s\S]*?\*\/\n\nimport type \{/m,
  `/**
 * 수강희망바구니 요청 생성/응답 파싱.
 *
 * 범위는 예비 담기(appcsKindCd=100)에 한정한다.
 * 정식 수강신청 본신청은 포함하지 않는다.
 *
 * 세션 관리: HopeBasketClient
 * SAZ 복원: hope-basket/saz.ts
 */

import type {`
);

fs.writeFileSync(path, s);
console.log(`replaced ${ok}/${pairs.length}`);
