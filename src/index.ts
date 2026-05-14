export interface SeowonClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface SeowonClient {
  readonly baseUrl: string;
  resolveUrl(path: string): URL;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";

export function createSeowonClient(options: SeowonClientOptions = {}): SeowonClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);

  return {
    baseUrl,
    resolveUrl(path: string) {
      return new URL(path, baseUrl);
    }
  };
}

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
