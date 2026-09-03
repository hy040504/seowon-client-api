import type { SeowonClient, SeowonClientOptions } from "./types/client.js";
import { normalizeBaseUrl } from "./utils.js";

export type { SeowonClient, SeowonClientOptions } from "./types/client.js";
export {
  COMMON_AJAX_HEADERS,
  DEFAULT_BROWSER_USER_AGENT,
  errorMessage,
  escapeRegExp,
  normalizeBaseUrl
} from "./utils.js";

/**
 * seowon-client-api 라이브러리 엔트리 포인트.
 * 서원대학교 e-campus 연동을 위한 모든 공개 인터페이스를 통합 제공한다.
 * 개발자는 이 파일에서 노출된 함수와 클래스만으로 프로젝트의 모든 기능을 수행할 수 있다.
 */

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";

/**
 * 라이브러리의 기본 서원대 클라이언트를 생성하는 팩토리 함수
 * @param {SeowonClientOptions} [options={}] - 초기화 옵션
 * @returns {SeowonClient} 기본 유틸리티가 포함된 클라이언트 객체
 */
export function createSeowonClient(options: SeowonClientOptions = {}): SeowonClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);

  return {
    baseUrl,
    /**
     * 상대 경로를 기본 e-campus URL 기준의 절대 URL로 변환한다.
     * @param {string} path - 변환할 상대 경로 또는 절대 URL
     * @returns {URL} 기준 URL이 적용된 URL 객체
     */
    resolveUrl(path: string) {
      return new URL(path, baseUrl);
    }
  };
}

// --- 핵심 비즈니스 로직 모듈 통합 수출 (Public API Surface) ---

export {
  EcampusClient,
  createEcampusClient,
  parseLoginResponse,
  type EcampusClientOptions,
  type GetElearningLessonListOptions,
  type GetClassroomAssignmentListOptions,
  type GetClassroomBoardListOptions,
  type GetClassroomResourcesOptions,
  type EcampusLoginResponse,
  type LoginCredentials,
  type LoginResult,
  type LoginWithEncryptDataOptions,
  type OpenElearningLessonOptions
} from "./ecampus/login.js";

export {
  createDebouncedCookieSaver,
  isCookieJarUsable,
  isSerializedCookieJarUsable,
  loadCookieJarFromFile,
  saveCookieJarToFile
} from "./ecampus/cookies.js";

export { createLoginEncryptData, type LoginEncryptOptions } from "./ecampus/crypto.js";

export {
  parseEcampusCourseList,
  parseEcampusCourseListJson,
  parseEcampusCourseGroups,
  parseEcampusCourseNames,
  parseEcampusCourseNamesJson,
  type EcampusCourse,
  type EcampusCourseCategory,
  type EcampusCourseListItem,
  type EcampusCourseTypeCode,
  type EcampusCourseNamesJson,
  type EcampusCourseGroups
} from "./ecampus/courses.js";

export {
  createLessonStudyWindowRequest,
  createLessonViewRequest,
  createStudyRecordRequest,
  createEcampusLessonRequestBundle,
  parseEcampusLessonListHtml,
  parseEcampusLessonSchedulesHtml,
  parseEcampusLessonStudyWindowHtml,
  parseStudyRecordSnapshot,
  stringifyEcampusLessons,
  getElearningMp4Url,
  downloadElearningMp4,
  ElearningSession,
  watchLesson,
  type EcampusLessonGetRequest,
  type EcampusLessonItem,
  type EcampusLessonParseOptions,
  type EcampusLessonPostRequest,
  type EcampusLessonRequestBundle,
  type EcampusLessonRequestBundleOptions,
  type EcampusLessonRecordOptions,
  type EcampusLessonSchedule,
  type EcampusLessonStudyStatus,
  type EcampusStudyRecordSnapshot,
  type EcampusStudyRecordSnapshotInput,
  type EcampusLessonStudyWindow,
  type ElearningMp4UrlResult,
  type ElearningDownloadResult
} from "./ecampus/elearning.js";

export {
  assignmentDetailCandidateUrls,
  createEmptyEcampusClassroomResources,
  isHtmlFileBody,
  looksLikeAssignmentDetailHtml,
  parseEcampusClassroomAttachmentsHtml,
  parseEcampusAssignmentDetailHtml,
  parseEcampusAssignmentFileLinks,
  parseEcampusAssignmentListHtml,
  parseEcampusAssignmentRightViewCanSubmit,
  parseEcampusAssignmentSendType,
  buildEcampusAssignmentSubmitForm,
  parseEcampusAssignmentSubmitForm,
  parseEcampusAssignmentUploadUrl,
  parseEcampusMaterialListHtml,
  parseEcampusNoticeListHtml,
  stringifyEcampusClassroomItems,
  stringifyEcampusClassroomResources,
  type EcampusAssignmentDetail,
  type EcampusAssignmentSubmitForm,
  type EcampusClassroomItem,
  type EcampusClassroomAttachment,
  type EcampusClassroomResources,
  type EcampusClassroomResourceOptions,
  type EcampusClassroomSection,
  type EcampusDownloadedFile,
  type EcampusPostRequest
} from "./ecampus/classroom.js";

// 외부 의존성 중 라이브러리 인터페이스에 직접 노출되는 타입들
export {
  createEcampusScoreOpenRequest,
  createEcampusScorePageRequest,
  createEcampusScoreSummaryRequest,
  createEcampusScoreSurveyCheckRequest,
  parseEcampusScoreOpenResponse,
  parseEcampusScorePageHtml,
  parseEcampusScoreSummaryHtml,
  parseEcampusScoreSurveyResponse,
  resolveEcampusScoreAccess,
  stringifyEcampusScoreOpenInfo,
  type EcampusScoreAccessInfo,
  type EcampusScoreAccessStatus,
  type EcampusScoreGetRequest,
  type EcampusScoreOpenInfo,
  type EcampusScoreOpenJsonResponse,
  type EcampusScoreOpenReturnVO,
  type EcampusScorePage,
  type EcampusScorePageCapture,
  type EcampusScorePageResult,
  type EcampusScorePageResponseFormat,
  type EcampusScorePostRequest,
  type EcampusScoreParseOptions,
  type EcampusScoreItem,
  type EcampusScoreItemKind,
  type EcampusScoreSummary,
  type EcampusScoreSummaryCapture,
  type EcampusScoreSurveyCapture,
  type EcampusScoreSurveyInfo,
  type EcampusScoreSurveyJsonResponse,
  type EcampusScoreSurveyReturnVO,
  type GetScoreOptions
} from "./ecampus/score.js";

export {
  getSazHeaderValue,
  parseEcampusAssignmentListFromSaz,
  parseEcampusClassroomResourcesFromSaz,
  parseEcampusLessonListFromSaz,
  parseEcampusLessonSchedulesFromSaz,
  parseEcampusLessonStudyWindowsFromSaz,
  parseEcampusMaterialListFromSaz,
  parseEcampusNoticeListFromSaz,
  parseEcampusScoreOpenInfoFromSaz,
  parseEcampusScorePageFromSaz,
  parseEcampusScoreSummariesFromSaz,
  parseEcampusScoreSurveyInfoFromSaz,
  parseFiddlerSazSessions,
  readSazQuery,
  stringifyEcampusScorePages,
  stringifyEcampusScoreSummaries,
  stripSazQuery,
  type SazHttpRequest,
  type SazHttpResponse,
  type SazHttpSession
} from "./ecampus/saz.js";

export {
  createHopeBasketClient,
  HopeBasketClient,
  type HopeBasketClientOptions
} from "./hope-basket/client.js";

export {
  buildHopeBasketTimetable,
  buildKoreanTimetableFileBaseName,
  composeSugangLoginResult,
  exportHopeBasketTimetableImage,
  formatStudentTimetableSubtitle,
  createSugangAppcsScheduleListRequest,
  createSugangBasketAddRequest,
  createSugangBasketCancelRequest,
  createSugangBasketCheckRequest,
  createSugangCultureDomainListRequest,
  createSugangDepartmentListRequest,
  createSugangGeneralSubjectListRequest,
  createSugangHomeRequest,
  createSugangLoginCheckRequest,
  createSugangLoginRequest,
  createSugangMyHopeBasketListRequest,
  createSugangSpecialtySubjectListRequest,
  filterTimetableSubjectsForStudentYear,
  mapCourseYearToNumericGrade,
  matchesStudentGradeYear,
  normalizeGradeYearCode,
  createSugangStudentInfoRequest,
  createSugangTermCodeRequest,
  createSugangTimetableDepartmentListRequest,
  createSugangTimetableDetailListRequest,
  DEFAULT_APPCS_KIND_CD,
  DEFAULT_BASKET_CHECK_TARGET,
  DEFAULT_BASKET_MENU_ID,
  DEFAULT_BASKET_PGM_ID,
  DEFAULT_NOTC_CL_CD,
  DEFAULT_PORTAL_MENU_ID,
  DEFAULT_PORTAL_PGM_ID,
  DEFAULT_SUGANG_BASE_URL,
  DEFAULT_UNVFR_STDR_DEPT_CD,
  formatHopeBasketTimetableGrid,
  getSeowonPeriodEndTime,
  getSeowonPeriodStartTime,
  parseSugangAppcsScheduleListResponse,
  parseSugangBasketMutationResponse,
  parseSugangCultureDomainListResponse,
  parseSugangDepartmentListResponse,
  parseSugangLoginCheckResponse,
  parseSugangLoginResponse,
  parseSugangStudentInfoResponse,
  parseSugangSubjectListResponse,
  parseSugangTermCodeResponse,
  parseSugangTimetableDepartmentListResponse,
  parseSugangTimetableDetailListResponse,
  parseTimtbNm,
  renderHopeBasketTimetableSvg,
  SEOWON_PERIOD_TIMES,
  stringifySugangSubjects,
  SUGANG_PATHS,
  SUGANG_WEEKDAYS,
  type SugangAppcsSchedule,
  type SugangBasketMutationOptions,
  type SugangBasketMutationResult,
  type SugangCultureDomain,
  type SugangDepartment,
  type SugangHopeBasketTimetable,
  type SugangHopeBasketTimetableCell,
  type SugangTimetableSubjectLike,
  type SugangLoginCredentials,
  type SugangLoginResult,
  type SugangLoginScheduleCheck,
  type SugangMajorAutoAddOptions,
  type SugangMajorAutoAddResult,
  type SugangMyHopeBasketListOptions,
  type SugangSazBasketSummary,
  type SugangSessionInfo,
  type SugangStudentInfo,
  type SugangSubject,
  type SugangSubjectSearchOptions,
  type SugangSsvPostRequest,
  type SugangTermCodeInfo,
  type SugangTermContext,
  type SugangTimetableDepartment,
  type SugangTimetableDeptSearchOptions,
  type SugangTimetableDetailSearchOptions,
  type SugangTimetableSubject,
  type SugangTimtbSlot,
  type SugangWeekdayCode
} from "./hope-basket/basket.js";

export { parseSugangBasketFromSaz } from "./hope-basket/saz.js";

export {
  createSsvRequestTimeStr,
  encodeSsvParams,
  encodeSsvRequest,
  findSsvDataset,
  fromSsvCell,
  parseSsv,
  readNexacroXmlErrorCode,
  readNexacroXmlParameter,
  readSsvErrorCode,
  SSV_EMPTY,
  SSV_RS,
  SSV_US,
  toSsvCell,
  type EncodeSsvDatasetOptions,
  type SsvDataset,
  type SsvDocument,
  type SsvParams,
  type SsvRow
} from "./hope-basket/ssv.js";

export type { SerializedCookieJar } from "tough-cookie";

// --- 수강신청 본신청 모듈 ---
// 희망바구니(M100779)와 완전히 별개. menuId=M100780 / pgmId=P001619.
// 등록: saveAppcsDtls.do (saveHopeAppcsDtls.do 아님)
// 목록: findAppcsDtlsList.do (findEstblSubjtShpbsList.do 아님)

export {
  CourseRegistrationClient,
  createCourseRegistrationClient,
  type CourseRegistrationClientOptions
} from "./course-registration/client.js";

export {
  CourseRegErrorType,
  classifyCourseRegError,
  classifyCourseRegNetworkError,
  formatCourseRegError
} from "./course-registration/errors.js";

export {
  COURSE_REG_BASE_URL,
  COURSE_REG_CHECK_TARGET,
  COURSE_REG_DEFAULT_COOKIE_FILE,
  COURSE_REG_DEFAULT_DEPT_CD,
  COURSE_REG_MENU_ID,
  COURSE_REG_MENU_STR_ID,
  COURSE_REG_NOTC_CL_CD,
  COURSE_REG_PATHS,
  COURSE_REG_PGM_ID,
  COURSE_REG_PORTAL_MENU_ID,
  COURSE_REG_PORTAL_PGM_ID
} from "./course-registration/constants.js";

export {
  composeCourseRegLoginResult,
  createCourseRegCancelRequest,
  createCourseRegGLIORequest,
  createCourseRegHomeRequest,
  createCourseRegLoginCheckRequest,
  createCourseRegLoginRequest,
  createCourseRegMenuRequest,
  createCourseRegMyListRequest,
  createCourseRegRegisterRequest,
  createCourseRegSearchRequest,
  createCourseRegStudentInfoRequest,
  createCourseRegSysdateRequest,
  createCourseRegTermCodeRequest,
  createCourseRegWarnCheckRequest,
  createCourseRegWarnSaveRequest,
  parseCourseRegLoginCheckResponse,
  parseCourseRegLoginResponse,
  parseCourseRegMutationResponse,
  parseCourseRegMyListResponse,
  parseCourseRegSearchResponse,
  parseCourseRegStudentInfoResponse,
  parseCourseRegSysdateResponse,
  parseCourseRegTermCodeResponse,
  stringifyCourseRegSubjects,
  type CourseRegGetRequest,
  type CourseRegLoginCredentials,
  type CourseRegLoginOptions,
  type CourseRegLoginResult,
  type CourseRegMutationOptions,
  type CourseRegMutationResult,
  type CourseRegMyListOptions,
  type CourseRegRegisteredSubject,
  type CourseRegRegisteredTimetable,
  type CourseRegRetryRegisterOptions,
  type CourseRegRetryRegisterResult,
  type CourseRegSearchOptions,
  type CourseRegSearchSubject,
  type CourseRegSessionInfo,
  type CourseRegSsvPostRequest,
  type CourseRegTermCodeInfo,
  type CourseRegTermContext
} from "./course-registration/registration.js";

// --- 로컬 개설 과목 카탈로그 (db-generator JSON) ---
export {
  COURSE_DB_ENV_PATH,
  COURSE_DB_LATEST_POINTER,
  COURSE_DB_OUTPUT_REL,
  defaultCourseDbOutputDir,
  formatCourseDbRef,
  listCourseDbFiles,
  loadCourseDbFile,
  loadLatestCourseDb,
  readCourseDbPointer,
  resolveLatestCourseDb,
  searchLocalCourses,
  writeCourseDbPointer,
  listLocalCourseColleges,
  listLocalCourseDepartments,
  listLocalCourseDomains,
  matchLocalCourseFacets,
  filterLocalCoursesByFacet,
  type CourseDbPointer,
  type CourseDbRef,
  type LoadCourseDbResult,
  type LocalCourseFacet,
  type LocalCourseFacetKind,
  type LocalCourseRecord,
  type ResolveCourseDbOptions
} from "./course-catalog/local-db.js";

export {
  catalogCourseKey,
  generateCourseDb,
  mergeCultureDomainIntoCatalog,
  HOPE_BASKET_COOKIE_FILE,
  type CourseCatalogRow,
  type GenerateCourseDbOptions,
  type GenerateCourseDbResult
} from "./course-catalog/generate-db.js";
