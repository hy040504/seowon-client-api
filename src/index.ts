/**
 * seowon-client-api 라이브러리 엔트리 포인트.
 * 서원대학교 e-campus 연동을 위한 모든 공개 인터페이스를 통합 제공한다.
 */

/** 클라이언트 생성 옵션 */
export interface SeowonClientOptions {
  /** 사용자 정의 기본 도메인 */
  baseUrl?: string;
  /** 폴리필용 fetch 함수 주입 */
  fetch?: typeof fetch;
}

/** 코어 클라이언트 인터페이스 */
export interface SeowonClient {
  /** 현재 설정된 기본 도메인 */
  readonly baseUrl: string;
  /** 상대 경로를 현재 도메인 기반 URL로 변환 */
  resolveUrl(path: string): URL;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";

/**
 * 라이브러리의 기본 서원대 클라이언트를 생성한다
 * @param {SeowonClientOptions} [options={}] - 초기화 옵션
 * @returns {SeowonClient} 공통 기능을 제공하는 클라이언트 객체
 */
export function createSeowonClient(options: SeowonClientOptions = {}): SeowonClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);

  return {
    baseUrl,
    resolveUrl(path: string) {
      return new URL(path, baseUrl);
    }
  };
}

/**
 * URL 형식을 라이브러리 표준에 맞춰 정규화한다
 * @private
 */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

// --- 공개 모듈 및 타입 재수출 (Exposing Public APIs) ---

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
} from "./ecampus/login";

export {
  isCookieJarUsable,
  isSerializedCookieJarUsable,
  loadCookieJarFromFile,
  saveCookieJarToFile
} from "./ecampus/cookies";

export { createLoginEncryptData, type LoginEncryptOptions } from "./ecampus/crypto";

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
} from "./ecampus/courses";

export {
  createLessonStudyWindowRequest,
  createLessonViewRequest,
  createStudyRecordRequest,
  createEcampusLessonRequestBundle,
  parseEcampusLessonListFromSaz,
  parseEcampusLessonListHtml,
  parseEcampusLessonSchedulesFromSaz,
  parseEcampusLessonSchedulesHtml,
  parseEcampusLessonStudyWindowHtml,
  parseEcampusLessonStudyWindowsFromSaz,
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
} from "./ecampus/elearning";

export {
  createEmptyEcampusClassroomResources,
  parseEcampusAssignmentListHtml,
  parseEcampusAssignmentListFromSaz,
  parseEcampusClassroomResourcesFromSaz,
  parseEcampusMaterialListHtml,
  parseEcampusMaterialListFromSaz,
  parseEcampusNoticeListHtml,
  parseEcampusNoticeListFromSaz,
  stringifyEcampusClassroomItems,
  stringifyEcampusClassroomResources,
  type EcampusClassroomItem,
  type EcampusClassroomResources,
  type EcampusClassroomResourceOptions,
  type EcampusClassroomSection,
  type EcampusPostRequest
} from "./ecampus/classroom";

export type { SerializedCookieJar } from "tough-cookie";
