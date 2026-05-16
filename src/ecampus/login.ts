import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { isCookieJarUsable, loadCookieJarFromFile, saveCookieJarToFile } from "./cookies";
import {
  createEmptyEcampusClassroomResources,
  parseEcampusAssignmentListHtml,
  parseEcampusMaterialListHtml,
  parseEcampusNoticeListHtml,
  stringifyEcampusClassroomItems,
  stringifyEcampusClassroomResources,
  type EcampusClassroomItem,
  type EcampusClassroomResources
} from "./classroom";
import {
  parseEcampusCourseGroups,
  parseEcampusCourseList,
  parseEcampusCourseListJson,
  parseEcampusCourseNamesJson,
  type EcampusCourseListItem
} from "./courses";
import { createLoginEncryptData, type LoginEncryptOptions } from "./crypto";
import {
  createStudyRecordRequest,
  parseEcampusLessonListHtml,
  parseEcampusLessonStudyWindowHtml,
  stringifyEcampusLessons,
  type EcampusLessonItem,
  type EcampusLessonRecordOptions,
  type EcampusLessonStudyWindow
} from "./elearning";
import type { EcampusCourseGroups } from "./courses";

export interface EcampusClientOptions {
  baseUrl?: string;
  axios?: AxiosInstance;
  cookieFilePath?: string;
  loginCredentials?: LoginCredentials;
}

export interface LoginCredentials extends LoginEncryptOptions {
  userId: string;
  password: string;
}

export interface LoginWithEncryptDataOptions {
  encryptData: string;
}

export interface GetClassroomResourcesOptions {
  crsCreCd: string;
  userNo: string;
  userName?: string;
  listScale?: number;
}

export interface GetClassroomBoardListOptions {
  crsCreCd: string;
  listScale?: number;
}

export interface GetClassroomAssignmentListOptions extends GetClassroomBoardListOptions {
  userNo: string;
  userName?: string;
}

export interface GetElearningLessonListOptions {
  crsCreCd: string;
  mcd?: string;
  progressTypeCd?: string;
}

export interface OpenElearningLessonOptions {
  crsCreCd: string;
  lessonCntsId: string;
  progressTypeCd?: string;
  seekFile?: string;
  downloadYn?: string;
}

export type LoginResult =
  | {
      type: "redirect";
      data: EcampusLoginResponse;
      url: string;
    }
  | {
      type: "reload";
      data: EcampusLoginResponse;
    }
  | {
      type: "error";
      data?: EcampusLoginResponse;
      message: string;
    };

export interface EcampusLoginResponse {
  redirectUrl?: string;
  otpLogin?: "Y" | "N" | string;
  otpUserYn?: "Y" | "N" | string;
  otpUserType?: string;
  userId?: string;
  userNo?: string;
  message?: string;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const LOGIN_PAGE_PATH = "/home/mainPop/popup/login";
const LOGIN_API_PATH = "/user/userHome/login";
const MAIN_PAGE_PATH = "/home/mainHome/Form/main";
const DEFAULT_LESSON_MENU_CODE = "MH_210504T143020d03000a";
const DEFAULT_PROGRESS_TYPE_CD = "WEEK";

/**
 * e-campus 세션과 로그인/목록 조회를 담당하는 클라이언트
 */
export class EcampusClient {
  readonly baseUrl: string;
  readonly cookieJar: CookieJar;
  private readonly http: AxiosInstance;
  private readonly cookieFilePath?: string;
  private loginCredentials?: LoginCredentials;

  /**
   * 클라이언트를 초기화한다
   * @param {EcampusClientOptions} options - 기본 URL과 axios 인스턴스를 덮어쓸 옵션
   */
  constructor(options: EcampusClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.cookieFilePath = options.cookieFilePath;
    this.loginCredentials = options.loginCredentials;
    this.cookieJar = this.loadCookieJar();
    this.http =
      options.axios ??
      wrapper(
        axios.create({
          baseURL: this.baseUrl,
          jar: this.cookieJar,
          withCredentials: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
          }
        })
      );
  }

  /**
   * 쿠키 파일이 있으면 불러오고, 없으면 새 저장소를 만든다
   * @returns {CookieJar} 사용 가능한 쿠키 저장소
   */
  private loadCookieJar(): CookieJar {
    if (!this.cookieFilePath) {
      return new CookieJar();
    }

    const loaded = loadCookieJarFromFile(this.cookieFilePath);
    return loaded ?? new CookieJar();
  }

  /**
   * 쿠키 파일이 설정되어 있으면 현재 저장소를 파일에 기록한다
   * @returns {Promise<void>} 저장 완료를 기다리는 Promise
   */
  private async persistCookieJar(): Promise<void> {
    if (!this.cookieFilePath) {
      return;
    }

    saveCookieJarToFile(this.cookieFilePath, this.cookieJar);
  }

  /**
   * 쿠키가 유효하면 그대로 쓰고, 만료되었으면 저장된 계정으로 다시 로그인한다
   * @returns {Promise<void>} 사용 가능한 세션이 확보될 때까지 기다리는 Promise
   * @throws {Error} 저장된 계정 정보가 없는데 재로그인이 필요한 경우
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.cookieFilePath && !this.loginCredentials) {
      return;
    }

    if (isCookieJarUsable(this.cookieJar)) {
      return;
    }

    if (!this.loginCredentials) {
      throw new Error("쿠키가 만료되었고 재로그인할 계정 정보가 없습니다.");
    }

    await this.login(this.loginCredentials);
  }

  /**
   * 로그인에 필요한 초기 세션을 준비한다
   * @returns {Promise<void>} 세션 준비 완료를 기다리는 Promise
   */
  async prepareLoginSession(): Promise<void> {
    await this.http.get(LOGIN_PAGE_PATH, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    await this.persistCookieJar();
  }

  /**
   * 계정 정보로 암호화 문자열을 만들어 로그인한다
   * @param {LoginCredentials} credentials - 로그인에 필요한 계정 정보
   * @returns {Promise<LoginResult>} 로그인 결과
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    this.loginCredentials = credentials;
    const encryptData = createLoginEncryptData(credentials.userId, credentials.password, {
      reason: credentials.reason,
      foreigner: credentials.foreigner
    });

    return this.loginWithEncryptData({ encryptData });
  }

  /**
   * 암호화 문자열을 이용해 로그인한다
   * @param {LoginWithEncryptDataOptions} options - 서버로 보낼 encryptData
   * @returns {Promise<LoginResult>} 로그인 결과
   */
  async loginWithEncryptData(options: LoginWithEncryptDataOptions): Promise<LoginResult> {
    await this.prepareLoginSession();

    const params = new URLSearchParams();
    params.set("encryptData", options.encryptData);

    const response = await this.http.post<EcampusLoginResponse>(LOGIN_API_PATH, params, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: this.baseUrl.replace(/\/$/, ""),
        Referer: new URL(LOGIN_PAGE_PATH, this.baseUrl).toString(),
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    const result = parseLoginResponse(response.data);
    await this.persistCookieJar();
    return result;
  }

  /**
   * 로그인 후 메인 페이지 HTML을 가져온다
   * @returns {Promise<string>} 메인 페이지 HTML
   */
  async getMainPageHtml(): Promise<string> {
    await this.ensureAuthenticated();
    const response = await this.http.get<string>(MAIN_PAGE_PATH, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    await this.persistCookieJar();
    return response.data;
  }

  /**
   * 메인 페이지에서 교과와 비교과 그룹 정보를 추출한다
   * @returns {Promise<EcampusCourseGroups>} 교과와 비교과 그룹 정보
   */
  async getCourseGroups(): Promise<EcampusCourseGroups> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseGroups(html);
  }

  /**
   * 메인 페이지에서 과목 목록 배열을 가져온다
   * @returns {Promise<EcampusCourseListItem[]>} 과목명, 강의실 코드, 과목 타입 배열
   */
  async getCourseList(): Promise<EcampusCourseListItem[]> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseList(html);
  }

  /**
   * 메인 페이지 과목 목록을 JSON 문자열로 가져온다
   * @returns {Promise<string>} 과목 목록 JSON 문자열
   */
  async getCourseListJson(): Promise<string> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseListJson(html);
  }

  /**
   * 과목 목록 JSON을 기존 호환 이름으로 가져온다
   * @returns {Promise<string>} 과목 목록 JSON 문자열
   */
  async getCourseNamesJson(): Promise<string> {
    const html = await this.getMainPageHtml();
    return parseEcampusCourseNamesJson(html);
  }

  /**
   * 강의실의 공지사항, 강의자료실, 과제 목록을 한 번에 조회한다
   * @param {GetClassroomResourcesOptions} options - 강의실 조회에 필요한 식별 정보
   * @returns {Promise<EcampusClassroomResources>} 세 영역의 목록 묶음
   */
  async getClassroomResources(
    options: GetClassroomResourcesOptions
  ): Promise<EcampusClassroomResources> {
    const resources = createEmptyEcampusClassroomResources();
    const [notices, materials, assignments] = await Promise.all([
      this.getNoticeList(options),
      this.getMaterialList(options),
      this.getAssignmentList(options)
    ]);

    resources.notices = notices;
    resources.materials = materials;
    resources.assignments = assignments;

    return resources;
  }

  /**
   * 강의실 목록 묶음을 JSON 문자열로 반환한다
   * @param {GetClassroomResourcesOptions} options - 강의실 조회에 필요한 식별 정보
   * @returns {Promise<string>} 공지사항, 강의자료실, 과제 JSON 문자열
   */
  async getClassroomResourcesJson(options: GetClassroomResourcesOptions): Promise<string> {
    return stringifyEcampusClassroomResources(await this.getClassroomResources(options));
  }

  /**
   * 강의실 공지사항 목록을 조회한다
   * @param {GetClassroomBoardListOptions} options - 강의실 코드와 목록 크기
   * @returns {Promise<EcampusClassroomItem[]>} 공지사항 목록
   */
  async getNoticeList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "NOTICE", `BBS_${options.crsCreCd}_N`);
    return parseEcampusNoticeListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  /**
   * 강의실 공지사항 목록을 JSON 문자열로 반환한다
   * @param {GetClassroomBoardListOptions} options - 강의실 코드와 목록 크기
   * @returns {Promise<string>} 공지사항 JSON 문자열
   */
  async getNoticeListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getNoticeList(options));
  }

  /**
   * 강의실 강의자료실 목록을 조회한다
   * @param {GetClassroomBoardListOptions} options - 강의실 코드와 목록 크기
   * @returns {Promise<EcampusClassroomItem[]>} 강의자료실 목록
   */
  async getMaterialList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "PDS", `BBS_${options.crsCreCd}_P`);
    return parseEcampusMaterialListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  /**
   * 강의실 강의자료실 목록을 JSON 문자열로 반환한다
   * @param {GetClassroomBoardListOptions} options - 강의실 코드와 목록 크기
   * @returns {Promise<string>} 강의자료실 JSON 문자열
   */
  async getMaterialListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getMaterialList(options));
  }

  /**
   * 강의실 과제 목록을 조회한다
   * @param {GetClassroomAssignmentListOptions} options - 강의실 코드와 사용자 정보
   * @returns {Promise<EcampusClassroomItem[]>} 과제 목록
   */
  async getAssignmentList(
    options: GetClassroomAssignmentListOptions
  ): Promise<EcampusClassroomItem[]> {
    const html = await this.postForm("/asmnt/asmntHome/stuAsmntGridList", {
      pageIndex: "1",
      listScale: String(options.listScale ?? 10),
      searchValue: "",
      crsCreCd: options.crsCreCd,
      userNo: options.userNo,
      userName: options.userName ?? ""
    });

    return parseEcampusAssignmentListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  /**
   * 강의실 과제 목록을 JSON 문자열로 반환한다
   * @param {GetClassroomAssignmentListOptions} options - 강의실 코드와 사용자 정보
   * @returns {Promise<string>} 과제 목록 JSON 문자열
   */
  async getAssignmentListJson(options: GetClassroomAssignmentListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getAssignmentList(options));
  }

  /**
   * e-learning 온라인 강의 목록을 조회한다
   * @param {GetElearningLessonListOptions} options - 강의실 코드와 메뉴/진도 옵션
   * @returns {Promise<EcampusLessonItem[]>} 온라인 강의 차시 목록
   */
  async getElearningLessonList(
    options: GetElearningLessonListOptions
  ): Promise<EcampusLessonItem[]> {
    const html = await this.getElearningLessonListHtml(options);
    return parseEcampusLessonListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd,
      progressTypeCd: options.progressTypeCd ?? DEFAULT_PROGRESS_TYPE_CD
    });
  }

  /**
   * e-learning 온라인 강의 목록을 JSON 문자열로 조회한다
   * @param {GetElearningLessonListOptions} options - 강의실 코드와 메뉴/진도 옵션
   * @returns {Promise<string>} 온라인 강의 차시 목록 JSON
   */
  async getElearningLessonListJson(options: GetElearningLessonListOptions): Promise<string> {
    return stringifyEcampusLessons(await this.getElearningLessonList(options));
  }

  /**
   * 온라인 강의 목록 화면 HTML을 가져온다
   * @param {GetElearningLessonListOptions} options - 강의실 코드와 메뉴/진도 옵션
   * @returns {Promise<string>} 온라인 강의 목록 HTML
   */
  async getElearningLessonListHtml(options: GetElearningLessonListOptions): Promise<string> {
    await this.ensureAuthenticated();
    const url = new URL("/lesson/lessonLect/Form/lessonListForm", this.baseUrl);
    url.searchParams.set("mcd", options.mcd ?? DEFAULT_LESSON_MENU_CODE);
    url.searchParams.set("crsCreCd", options.crsCreCd);

    const response = await this.http.get<string>(url.pathname + url.search, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    await this.persistCookieJar();
    return response.data;
  }

  /**
   * 온라인 강의 재생 창을 열고 콘텐츠 정보를 파싱한다
   * @param {OpenElearningLessonOptions} options - 강의실 코드와 차시 콘텐츠 코드
   * @returns {Promise<EcampusLessonStudyWindow>} 강의 재생 창 메타데이터
   */
  async openElearningLesson(
    options: OpenElearningLessonOptions
  ): Promise<EcampusLessonStudyWindow> {
    const html = await this.postForm(
      `/lesson/lessonOpen/lessonNewWindow?crsCreCd=${encodeURIComponent(options.crsCreCd)}`,
      {
        lessonCntsId: options.lessonCntsId,
        seekFile: options.seekFile ?? "",
        downloadYn: options.downloadYn ?? "",
        progressTypeCd: options.progressTypeCd ?? DEFAULT_PROGRESS_TYPE_CD
      }
    );

    return parseEcampusLessonStudyWindowHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd,
      progressTypeCd: options.progressTypeCd ?? DEFAULT_PROGRESS_TYPE_CD
    });
  }

  /**
   * e-campus가 사용하는 학습기록 저장 API를 호출한다
   * @param {EcampusLessonRecordOptions} options - 실제 학습 창에서 확보한 학습기록 값
   * @returns {Promise<unknown>} 서버의 JSON 응답
   */
  async addElearningStudyRecord(options: EcampusLessonRecordOptions): Promise<unknown> {
    await this.ensureAuthenticated();
    const request = createStudyRecordRequest(this.baseUrl, options);
    const response = await this.http.get<unknown>(new URL(request.url).pathname, {
      params: request.query,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    await this.persistCookieJar();
    return response.data;
  }

  /**
   * 게시판 목록 조회용 POST 요청을 보낸다
   * @param {GetClassroomBoardListOptions} options - 강의실 코드와 목록 크기
   * @param {"NOTICE" | "PDS"} bbsCd - 게시판 구분 코드
   * @param {string} bbsId - 게시판 식별자
   * @returns {Promise<string>} HTML 응답 본문
   */
  private async postBoardList(
    options: GetClassroomBoardListOptions,
    bbsCd: "NOTICE" | "PDS",
    bbsId: string
  ): Promise<string> {
    return this.postForm("/bbs/bbsLect/atclList", {
      formType: "LIST",
      bbsId,
      atclId: "",
      searchKey: "all",
      searchValue: "",
      listScale: String(options.listScale ?? 10),
      pageIndex: "1",
      headCd: "",
      bbsCd,
      crsCreCd: options.crsCreCd
    });
  }

  /**
   * form POST 요청을 공통 헤더로 전송한다
   * @param {string} path - 요청 경로
   * @param {Record<string, string>} body - form body
   * @returns {Promise<string>} HTML 응답 본문
   */
  private async postForm(path: string, body: Record<string, string>): Promise<string> {
    await this.ensureAuthenticated();
    const params = new URLSearchParams(body);
    const response = await this.http.post<string>(path, params, {
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: this.baseUrl.replace(/\/$/, ""),
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    await this.persistCookieJar();
    return response.data;
  }
}

/**
 * e-campus 클라이언트를 생성한다
 * @param {EcampusClientOptions} options - 기본 URL과 axios 인스턴스를 덮어쓸 옵션
 * @returns {EcampusClient} e-campus 클라이언트
 */
export function createEcampusClient(options: EcampusClientOptions = {}): EcampusClient {
  return new EcampusClient(options);
}

/**
 * 로그인 응답을 결과 타입으로 변환한다
 * @param {EcampusLoginResponse} data - 로그인 응답 객체
 * @returns {LoginResult} redirect, reload, error 중 하나의 결과
 */
export function parseLoginResponse(data: EcampusLoginResponse): LoginResult {
  if (!data.redirectUrl) {
    return {
      type: "error",
      data,
      message: data.message ?? "아이디 또는 비밀번호가 맞지 않습니다."
    };
  }

  if (
    data.otpLogin === "Y" &&
    data.otpUserYn === "Y" &&
    data.otpUserType?.includes("LEARNER") &&
    data.userId &&
    data.userNo
  ) {
    const url = new URL(data.redirectUrl, DEFAULT_BASE_URL);
    url.searchParams.set("userId", data.userId);
    url.searchParams.set("userNo", data.userNo);

    return {
      type: "redirect",
      data,
      url: url.toString()
    };
  }

  return {
    type: "reload",
    data
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
