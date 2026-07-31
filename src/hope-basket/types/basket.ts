import type { AxiosInstance } from "axios";
import type { SsvDocument, SsvParams, SsvRow } from "./ssv.js";

/**
 * 수강희망바구니 클라이언트 생성 옵션.
 * 정식 수강신청 클라이언트가 추가되면 별도 Options 타입을 둔다.
 */
export interface HopeBasketClientOptions {
  baseUrl?: string; // sugangh 기본 URL
  axios?: AxiosInstance; // 커스텀 Axios 인스턴스
  cookieFilePath?: string; // 쿠키 저장 파일 경로
  credentials?: SugangLoginCredentials; // 자동 재로그인 계정 정보
  defaultSyy?: string; // 기본 학년도
  defaultSmtCd?: string; // 기본 학기 코드
  unvfrStdrDeptCd?: string; // 대학 기준 부서 코드 (기본 20000)
  requestTimeoutMs?: number; // 요청 타임아웃(ms), 기본 30000
  maxRetries?: number; // 네트워크 오류 재시도 횟수, 기본 3
  onProgress?: (message: string) => void; // 로그인/요청 진행 메시지 콜백
}

/** 희망바구니 로그인 계정 정보 */
export interface SugangLoginCredentials {
  stuno: string; // 학번
  password: string; // 비밀번호
  notcClCd?: string; // 로그인 공지 구분 (기본 L)
  appcsKindCd?: string; // 신청 종류 코드 (희망바구니 기본 100, 본신청 아님)
}

/** 공통 학년도/학기 문맥 */
export interface SugangTermContext {
  syy: string; // 학년도
  smtCd: string; // 학기 코드
  unvfrStdrDeptCd?: string; // 대학 기준 부서 코드
  stuno?: string; // 학번
}

/** SSV POST 요청 정보 */
export interface SugangSsvPostRequest {
  method: "POST"; // HTTP 메서드
  url: string; // 요청 URL
  query: Record<string, string>; // 쿼리 파라미터
  body: string; // SSV 본문
  contentType: "text/xml"; // Content-Type
  accept: string; // Accept 헤더
}

/** GET 요청 정보 */
export interface SugangGetRequest {
  method: "GET"; // HTTP 메서드
  url: string; // 요청 URL
  query?: Record<string, string>; // 쿼리 파라미터
}

/** 희망바구니 로그인 결과 */
export interface SugangLoginResult {
  success: boolean; // 로그인 성공 여부
  message: string; // 사용자 표시 메시지
  flag?: string; // dsFlag.flag 값
  session?: SugangSessionInfo; // 세션 정보
  student?: SugangStudentInfo; // 학생 기본 정보
  scheduleChecks?: SugangLoginScheduleCheck[]; // 신청 가능 일정 체크
  errorCode?: number; // SSV ErrorCode
  raw: {
    login?: SsvDocument; // findAppcsLogin 원본
    student?: SsvDocument; // findStunoInfo 원본
    loginCheck?: SsvDocument; // findAppcsLoginChk 원본
  };
}

/** 로그인 세션 정보 (dsSession) */
export interface SugangSessionInfo {
  msg: string; // 로그인 메시지 (success 등)
  initPswdYn: string; // 초기 비밀번호 여부
  userSupport: string; // 지원 정보 원문
  userNm: string; // 사용자 이름
  encStr: string; // 암호화 문자열
  persNo: string; // 개인번호(학번)
  wasInfo: string; // WAS 정보
  needChangePwd: string; // 비밀번호 변경 필요 여부
  deptNm: string; // 학과명
  locale: string; // 로케일
  raw: SsvRow; // 원본 행
}

/** 학생 기본 정보 (dsStunoInfo) */
export interface SugangStudentInfo {
  stuno: string; // 학번
  stdntNm: string; // 학생 이름
  deptCd: string; // 학과 코드
  deprtCd: string; // 학과 코드(동의 필드)
  deprtNm: string; // 학과명
  hy: string; // 학년
  syy: string; // 학년도
  smtCd: string; // 학기 코드
  unvfrStdrDeptCd: string; // 대학 기준 부서 코드
  schrgSttusCd: string; // 학적 상태 코드
  schrgSttusNm: string; // 학적 상태명
  minCdtNum: string; // 최소 신청 학점
  maxCdtNum: string; // 최대 신청 학점
  cmpsjSecnt: string; // 이수 학기 수
  dghtDivCd: string; // 주야 구분 코드
  univCd: string; // 대학 코드
  entnsDt: string; // 입학일
  raw: SsvRow; // 원본 행
}

/** 로그인 가능 일정 체크 (dsLoginInfoChk) */
export interface SugangLoginScheduleCheck {
  possYn: string; // 가능 여부 (1/0)
  appcsSchdlCd: string; // 신청 일정 코드
  appcsSchdlSeqno: string; // 신청 일정 순번
  appcsTrgetTypeCnt: string; // 대상 유형 건수
  allowed: boolean; // possYn 정규화 값
  raw: SsvRow; // 원본 행
}

/** 수강 일정 항목 */
export interface SugangAppcsSchedule {
  appcsSchdlCd: string; // 신청 일정 코드
  appcsNm: string; // 신청명
  appcsSchdlNm: string; // 일정 표시명
  beginDt: string; // 시작 일시 원문
  endDt: string; // 종료 일시 원문
  beginTm: string; // 시작 시각
  endTm: string; // 종료 시각
  endDate: string; // 기간 표시 문자열
  aplyFlag: string; // 적용 중 여부 (1/0)
  gopubYn: string; // 공개 여부
  remrk: string; // 비고
  isActive: boolean; // aplyFlag 정규화 값
  raw: SsvRow; // 원본 행
}

/** 개설 학과 */
export interface SugangDepartment {
  asignDeprtCd: string; // 개설 학과 코드
  deptNm: string; // 학과명
  cmpsjDivCd: string; // 이수 구분 코드
  raw: SsvRow; // 원본 행
}

/** 교양 영역 */
export interface SugangCultureDomain {
  code: string; // 영역 코드
  codeNm: string; // 영역명
  raw: SsvRow; // 원본 행
}

/** 과목 검색 옵션 */
export interface SugangSubjectSearchOptions extends Partial<SugangTermContext> {
  serchDiv?: string; // 검색 구분 (0: 학과/과목, 1: 교양영역 등)
  cmpsjHyDivCd?: string; // 이수 학년 구분
  cmpsjDivCd?: string; // 이수 구분
  estblCrseDivCd?: string; // 개설 과정 구분
  cltrDomnCd?: string; // 교양 영역 코드
  asignDeprtCd?: string; // 개설 학과 코드
  keyword?: string; // 과목명/코드 검색어
  subjtCd?: string; // 과목 코드 또는 검색어
  corseDvclsNo?: string; // 분반
  listType?: "specialty" | "general" | "both"; // 조회 목록 종류
  menuId?: string; // 메뉴 ID
  pgmId?: string; // 프로그램 ID
}

/** 개설 과목(검색 결과) */
export interface SugangSubject {
  subjtCd: string; // 과목 코드
  subjtNm: string; // 과목명
  orgSubjtNm: string; // 원본 과목명
  corseDvclsNo: string; // 분반
  estblDeprtCd: string; // 개설 학과 코드
  estblDeprtNm: string; // 개설 학과명
  asignDeprtCd: string; // 배정 학과 코드
  univCd: string; // 대학 코드
  univNm: string; // 대학명
  cmpsjCdt: string; // 학점
  cmpsjDivCd: string; // 이수 구분 코드
  cmpsjHyDivCd: string; // 이수 학년 구분
  dghtDivCd: string; // 주야 구분
  estblCrseDivCd: string; // 개설 과정 구분
  timtbNm: string; // 시간표 문자열
  syy: string; // 학년도
  smtCd: string; // 학기 코드
  unvfrStdrDeptCd: string; // 대학 기준 부서 코드
  chk: string; // 선택 체크 값
  remrk: string; // 비고
  chrgInstrEmpnm: string; // 담당 교원명
  chrgInstrEmpno: string; // 담당 교원 사번
  hopeAppcsCnt: string; // 희망 신청 인원
  appcsLmttPcnt: string; // 수강 제한 인원
  thryHrs: string; // 이론 시수
  prctsHrs: string; // 실습 시수
  sourceList: "specialty" | "general" | "timetable" | "unknown"; // 출처 목록
  raw: SsvRow; // 원본 행
}

/** 바구니 담기/취소 옵션 */
export interface SugangBasketMutationOptions extends Partial<SugangTermContext> {
  subjtCd: string; // 과목 코드
  corseDvclsNo: string; // 분반
  ceckTrgetGbn?: string; // 검증 대상 구분 (희망바구니 H)
  hiPass?: string; // hiPass 값
  ttcMapngNo?: string; // 시간표 매핑 번호
  gschSubjtYn?: string; // 대학원 과목 여부
  stdntChngLmttYn?: string; // 학생 변경 제한 여부
  bchdmCntcSubjtYn?: string; // 학부-대학원 연계 과목 여부
  menuId?: string; // 메뉴 ID
  pgmId?: string; // 프로그램 ID
  skipCheck?: boolean; // true면 담기 전 검증 생략
}

/** 바구니 작업 결과 */
export interface SugangBasketMutationResult {
  success: boolean; // 성공 여부
  errorCode?: number; // SSV ErrorCode
  errorMsg?: string; // 서버 ErrorMsg
  message: string; // 사용자 표시 메시지
  action: "add" | "cancel" | "check"; // 수행 동작
  subjtCd: string; // 대상 과목 코드
  corseDvclsNo: string; // 대상 분반
  raw: SsvDocument; // 원본 응답
}

/** 전공 시간표 학과 목록 검색 옵션 */
export interface SugangTimetableDeptSearchOptions extends Partial<SugangTermContext> {
  serchDiv?: string; // 검색 구분
  subjtCd?: string; // 과목 코드
  subjtNm?: string; // 과목명
  cmpsjDivCd?: string; // 이수 구분
  cmpsjHyDivCd?: string; // 이수 학년 구분
  asignDeprtCd?: string; // 개설 학과 코드
  estblCrseDivCd?: string; // 개설 과정 구분
  instrEmpnm?: string; // 교원명
  instrEmpno?: string; // 교원 사번
  prgGbn?: string; // 프로그램 구분 코드
  menuId?: string; // 메뉴 ID
  pgmId?: string; // 프로그램 ID
}

/** 전공 시간표 상세(분반) 검색 옵션 */
export interface SugangTimetableDetailSearchOptions extends Partial<SugangTermContext> {
  asignDeprtCd: string; // 개설 학과 코드
  serchDiv?: string; // 검색 구분
  estblDeprtCd?: string; // 개설 학과 필터
  menuId?: string; // 메뉴 ID
  pgmId?: string; // 프로그램 ID
}

/** 전공 시간표 학과 항목 */
export interface SugangTimetableDepartment {
  univCd: string; // 대학 코드
  asignDeprtCd: string; // 개설 학과 코드
  deptNm: string; // 학과명
  univDeptNm: string; // 단과대/상위 조직명
  cmpsjDivNm: string; // 이수 구분명
  raw: SsvRow; // 원본 행
}

/** 전공 시간표 상세 과목 */
export interface SugangTimetableSubject {
  subjtCd: string; // 과목 코드
  subjtNm: string; // 과목명
  corseDvclsNo: string; // 분반
  chrgInstrEmpnm: string; // 담당 교원명
  chrgInstrEmpno: string; // 담당 교원 사번
  timtbNm: string; // 시간표 문자열
  cmpsjCdt: string; // 학점
  cmpsjDivCd: string; // 이수 구분 코드
  cmpsjDivNm: string; // 이수 구분명
  cmpsjHyDivCd: string; // 이수 학년 구분
  thryHrs: string; // 이론 시수
  prctsHrs: string; // 실습 시수
  atnlcPosblPcnt: string; // 수강 가능 인원
  slesLessnItem: string; // 평가/수업 속성 요약
  remrk: string; // 비고
  raw: SsvRow; // 원본 행
}

/** 학사일정 코드 조회 결과 (예: 202620) */
export interface SugangTermCodeInfo {
  termCode: string; // 결합 코드 (YYYY + smtCd)
  syy: string; // 학년도
  smtCd: string; // 학기 코드
  raw: SsvRow; // 원본 행
  params: SsvParams; // 응답 파라미터
}

/** SAZ 분석 요약 */
export interface SugangSazBasketSummary {
  logins: SugangLoginResult[]; // 로그인 복원 결과
  subjects: SugangSubject[]; // 검색된 과목
  basketAdds: SugangBasketMutationResult[]; // 바구니 담기 결과
  basketCancels: SugangBasketMutationResult[]; // 바구니 취소 결과
  schedules: SugangAppcsSchedule[]; // 수강 일정
  departments: SugangDepartment[]; // 개설 학과
  cultureDomains: SugangCultureDomain[]; // 교양 영역
  timetableDepartments: SugangTimetableDepartment[]; // 시간표 학과
  timetableSubjects: SugangTimetableSubject[]; // 시간표 상세
  termCodes: SugangTermCodeInfo[]; // 학사일정 코드
}
