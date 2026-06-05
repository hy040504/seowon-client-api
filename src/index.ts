/**
 * seowon-client-api 라이브러리 엔트리 포인트.
 * 서원대학교 e-campus 연동을 위한 모든 공개 인터페이스를 통합 제공한다.
 * 개발자는 이 파일에서 노출된 함수와 클래스만으로 프로젝트의 모든 기능을 수행할 수 있다.
 */

/** 클라이언트 인스턴스 생성을 위한 초기화 옵션 명세 */
export interface SeowonClientOptions {
  /** 커스텀 e-campus 기본 URL (기본값: 서원대 공식 도메인) */
  baseUrl?: string;
  /** 네트워크 요청에 사용할 fetch API 폴리필 */
  fetch?: typeof fetch;
}

/** 서원대 클라이언트의 공통 인프라 기능을 정의한 인터페이스 */
export interface SeowonClient {
  /** 현재 활성화된 기본 도메인 */
  readonly baseUrl: string;
  /** 상대 경로를 절대 URL 주소로 정규화한다 */
  resolveUrl(path: string): URL;
}

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
    resolveUrl(path: string) {
      return new URL(path, baseUrl);
    }
  };
}

/**
 * 도메인 끝에 슬래시 유무 등 URL 형식을 라이브러리 표준에 맞춰 정규화한다.
 * @param {string} baseUrl - 정규화할 원본 URL
 * @returns {string} 끝에 슬래시가 보장된 URL 문자열
 * @private
 */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
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
} from "./ecampus/elearning.js";

export {
  createEmptyEcampusClassroomResources,
  parseEcampusClassroomAttachmentsHtml,
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
  type EcampusClassroomAttachment,
  type EcampusClassroomResources,
  type EcampusClassroomResourceOptions,
  type EcampusClassroomSection,
  type EcampusPostRequest
} from "./ecampus/classroom.js";

// 외부 의존성 중 라이브러리 인터페이스에 직접 노출되는 타입들
export type { SerializedCookieJar } from "tough-cookie";
