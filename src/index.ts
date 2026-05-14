export interface SeowonClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface SeowonClient {
  readonly baseUrl: string;
  resolveUrl(path: string): URL;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";

/**
 * 서원대학교 기본 클라이언트를 생성한다
 * @param {SeowonClientOptions} options - 기본 URL과 fetch 구현을 덮어쓸 옵션
 * @returns {SeowonClient} 기본 URL 해석 기능을 가진 클라이언트 객체
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
 * 기본 URL을 패키지 내부 규칙에 맞게 정규화한다
 * @param {string} baseUrl - 정규화할 기본 URL
 * @returns {string} 끝에 슬래시가 맞춰진 정규화된 URL
 */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

export {
  EcampusClient,
  createEcampusClient,
  parseLoginResponse,
  type EcampusClientOptions,
  type GetClassroomAssignmentListOptions,
  type GetClassroomBoardListOptions,
  type GetClassroomResourcesOptions,
  type EcampusLoginResponse,
  type LoginCredentials,
  type LoginResult,
  type LoginWithEncryptDataOptions
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
