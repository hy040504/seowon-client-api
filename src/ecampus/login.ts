import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import util from "node:util";
import { isCookieJarUsable, loadCookieJarFromFile, saveCookieJarToFile } from "./cookies.js";
import {
  createEmptyEcampusClassroomResources,
  parseEcampusAssignmentListHtml,
  parseEcampusMaterialListHtml,
  parseEcampusNoticeListHtml,
  stringifyEcampusClassroomItems,
  stringifyEcampusClassroomResources,
  type EcampusClassroomItem,
  type EcampusClassroomResources
} from "./classroom.js";
import {
  parseEcampusCourseGroups,
  parseEcampusCourseList,
  parseEcampusCourseListJson,
  parseEcampusCourseNamesJson,
  type EcampusCourseListItem
} from "./courses.js";
import { createLoginEncryptData, type LoginEncryptOptions } from "./crypto.js";
import {
  createStudyRecordRequest,
  createViewLessonStudyDetailRequest,
  downloadElearningMp4 as downloadElearningMp4File,
  parseEcampusLessonListHtml,
  parseEcampusLessonStudyWindowHtml,
  stringifyEcampusLessons,
  type EcampusLessonItem,
  type EcampusLessonRecordOptions,
  type EcampusLessonStudyWindow,
  type ElearningMp4UrlResult,
  type ElearningDownloadResult
} from "./elearning.js";
import type { EcampusCourseGroups } from "./courses.js";

/** e-campus 클라이언트 초기화 옵션 */
export interface EcampusClientOptions {
  baseUrl?: string;
  axios?: AxiosInstance;
  cookieFilePath?: string;
  loginCredentials?: LoginCredentials;
}

/** e-campus 로그인 계정 정보 */
export interface LoginCredentials extends LoginEncryptOptions {
  userId: string;
  password: string;
}

/** 암호화된 데이터를 이용한 로그인 옵션 */
export interface LoginWithEncryptDataOptions {
  encryptData: string;
}

/** 강의실 리소스 조회 옵션 */
export interface GetClassroomResourcesOptions {
  crsCreCd: string;
  userNo: string;
  userName?: string;
  listScale?: number;
}

/** 게시판 목록 조회 옵션 */
export interface GetClassroomBoardListOptions {
  crsCreCd: string;
  listScale?: number;
}

/** 과제 목록 조회 옵션 */
export interface GetClassroomAssignmentListOptions extends GetClassroomBoardListOptions {
  userNo: string;
  userName?: string;
}

/** 온라인 강의 목록 조회 옵션 */
export interface GetElearningLessonListOptions {
  crsCreCd: string;
  mcd?: string;
  progressTypeCd?: string;
}

/** 온라인 강의 상세 조회 옵션 */
export interface OpenElearningLessonOptions {
  crsCreCd: string;
  lessonCntsId: string;
  progressTypeCd?: string;
  seekFile?: string;
  downloadYn?: string;
}

/** 로그인 수행 결과 타입 */
export type LoginResult =
  | { type: "redirect"; data: EcampusLoginResponse; url: string; }
  | { type: "reload"; data: EcampusLoginResponse; }
  | { type: "error"; data?: EcampusLoginResponse; message: string; };

/** e-campus 서버 로그인 응답 구조 */
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
 * e-campus 세션 관리 및 데이터 연동을 담당하는 핵심 클라이언트 클래스.
 * 쿠키 기반의 세션 유지와 만료 시 자동 로그인 기능을 포함한다.
 */
export class EcampusClient {
  readonly baseUrl: string;
  readonly cookieJar: CookieJar;
  readonly http: AxiosInstance;
  private readonly cookieFilePath?: string;
  private loginCredentials?: LoginCredentials;

  /**
   * 클라이언트 인스턴스를 초기화한다
   * @param {EcampusClientOptions} options - 설정 옵션
   */
  constructor(options: EcampusClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.cookieFilePath = options.cookieFilePath;
    this.loginCredentials = options.loginCredentials;
    this.cookieJar = this.loadCookieJar();
    
    // axios-cookiejar-support를 사용하여 세션 쿠키를 자동으로 관리
    this.http = options.axios ?? wrapper(
      axios.create({
        baseURL: this.baseUrl,
        jar: this.cookieJar,
        withCredentials: true,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
        }
      })
    );
  }

  /**
   * 계정 정보를 내부 상태에 보관한다 (자동 재로그인용)
   */
  setCredentials(credentials: LoginCredentials): void {
    this.loginCredentials = credentials;
  }

  /** @returns {LoginCredentials | undefined} 현재 설정된 계정 정보 */
  getCredentials(): LoginCredentials | undefined {
    return this.loginCredentials;
  }

  /**
   * 영구 저장된 쿠키 파일을 읽어 CookieJar를 구성한다
   * @returns {CookieJar} 초기화된 쿠키 저장소
   * @private
   */
  private loadCookieJar(): CookieJar {
    if (!this.cookieFilePath) return new CookieJar();
    const loaded = loadCookieJarFromFile(this.cookieFilePath);
    return loaded ?? new CookieJar();
  }

  /**
   * 현재 세션 쿠키 상태를 파일로 기록한다
   * @returns {Promise<void>}
   * @private
   */
  private async persistCookieJar(): Promise<void> {
    if (!this.cookieFilePath) return;
    saveCookieJarToFile(this.cookieFilePath, this.cookieJar);
  }

  /**
   * API 호출 전 세션 유효성을 검사하고, 필요 시 자동 재로그인을 수행한다
   * @throws {Error} 세션이 만료되었으나 재로그인 정보가 없을 때
   */
  async ensureAuthenticated(): Promise<void> {
    if (isCookieJarUsable(this.cookieJar)) return;

    if (!this.loginCredentials) {
      throw new Error("세션이 만료되었으며, 자동 로그인을 위한 계정 정보가 설정되어 있지 않습니다.");
    }

    await this.login(this.loginCredentials);
  }

  /**
   * 서버 측 세션 초기화를 위해 로그인 팝업 페이지를 사전 방문한다
   * @returns {Promise<void>}
   */
  async prepareLoginSession(): Promise<void> {
    await this.http.get(LOGIN_PAGE_PATH, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    await this.persistCookieJar();
  }

  /**
   * 사용자 계정 정보를 기반으로 로그인을 수행한다
   * @param {LoginCredentials} credentials - 로그인 정보
   * @returns {Promise<LoginResult>} 로그인 처리 결과
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    this.loginCredentials = credentials;
    // 레거시 암호화 모듈을 통해 서버가 요구하는 특수 포맷의 문자열 생성
    const encryptData = createLoginEncryptData(credentials.userId, credentials.password, {
      reason: credentials.reason,
      foreigner: credentials.foreigner
    });

    return this.loginWithEncryptData({ encryptData });
  }

  /**
   * 생성된 암호화 문자열을 서버로 전송하여 세션을 획득한다
   * @param {LoginWithEncryptDataOptions} options - 암호화 데이터
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
   * 로그인 후 접근 가능한 메인 대시보드 HTML을 가져온다
   * @returns {Promise<string>} 메인 페이지 HTML
   */
  async getMainPageHtml(): Promise<string> {
    await this.ensureAuthenticated();
    const response = await this.http.get<string>(MAIN_PAGE_PATH, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    await this.persistCookieJar();
    return response.data;
  }

  /**
   * 수강 중인 과목들을 교과/비교과 그룹으로 분류하여 가져온다
   * @returns {Promise<EcampusCourseGroups>} 그룹화된 과목 정보
   */
  async getCourseGroups(): Promise<EcampusCourseGroups> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseGroups(html);
  }

  /**
   * 수강 중인 전체 과목 목록을 가져온다
   * @returns {Promise<EcampusCourseListItem[]>} 과목 정보 배열
   */
  async getCourseList(): Promise<EcampusCourseListItem[]> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseList(html);
  }

  /**
   * 과목 목록을 정규화된 JSON 문자열 형식으로 가져온다
   * @returns {Promise<string>} 포맷팅된 JSON 문자열
   */
  async getCourseListJson(): Promise<string> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseListJson(html);
  }

  /**
   * 하위 호환성을 위해 이전 버전 포맷의 과목 목록 JSON을 반환한다
   * @returns {Promise<string>} 레거시 포맷 JSON 문자열
   */
  async getCourseNamesJson(): Promise<string> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseNamesJson(html);
  }

  /**
   * 과목 선택 드롭다운에 사용되는 강의실 목록 AJAX HTML을 가져온다
   * @param {string} [crsCreCd=""] - 현재 선택된 강의실 코드
   * @returns {Promise<string>} AJAX 응답 HTML
   */
  async getCourseListHtml(crsCreCd = ""): Promise<string> {
    await this.ensureAuthenticated();
    return this.postForm("/crs/creCrsHome/classRoomCrsCreList", { crsCreCd });
  }

  /**
   * 특정 강의실의 모든 주요 리소스(공지, 자료, 과제)를 통합 조회한다
   * @param {GetClassroomResourcesOptions} options - 조회 옵션
   * @returns {Promise<EcampusClassroomResources>} 통합 리소스 객체
   */
  async getClassroomResources(options: GetClassroomResourcesOptions): Promise<EcampusClassroomResources> {
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
   * 통합 리소스를 JSON 문자열로 반환한다
   * @param {GetClassroomResourcesOptions} options - 조회 옵션
   * @returns {Promise<string>} JSON 문자열
   */
  async getClassroomResourcesJson(options: GetClassroomResourcesOptions): Promise<string> {
    return stringifyEcampusClassroomResources(await this.getClassroomResources(options));
  }

  /**
   * 강의실 공지사항 목록을 파싱하여 반환한다
   * @param {GetClassroomBoardListOptions} options - 조회 옵션
   * @returns {Promise<EcampusClassroomItem[]>} 공지사항 배열
   */
  async getNoticeList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "NOTICE", `BBS_${options.crsCreCd}_N`);
    return parseEcampusNoticeListHtml(html, { baseUrl: this.baseUrl, crsCreCd: options.crsCreCd });
  }

  /**
   * 강의실 공지사항 목록을 JSON으로 반환한다
   * @param {GetClassroomBoardListOptions} options - 조회 옵션
   * @returns {Promise<string>} JSON 문자열
   */
  async getNoticeListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getNoticeList(options));
  }

  /**
   * 강의실 자료실 목록을 파싱하여 반환한다
   * @param {GetClassroomBoardListOptions} options - 조회 옵션
   * @returns {Promise<EcampusClassroomItem[]>} 자료실 항목 배열
   */
  async getMaterialList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "PDS", `BBS_${options.crsCreCd}_P`);
    return parseEcampusMaterialListHtml(html, { baseUrl: this.baseUrl, crsCreCd: options.crsCreCd });
  }

  /**
   * 강의실 자료실 목록을 JSON으로 반환한다
   * @param {GetClassroomBoardListOptions} options - 조회 옵션
   * @returns {Promise<string>} JSON 문자열
   */
  async getMaterialListJson(options: GetClassroomBoardListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getMaterialList(options));
  }

  /**
   * 제출해야 할 과제 목록을 파싱하여 반환한다
   * @param {GetClassroomAssignmentListOptions} options - 조회 옵션
   * @returns {Promise<EcampusClassroomItem[]>} 과제 항목 배열
   */
  async getAssignmentList(options: GetClassroomAssignmentListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postForm("/asmnt/asmntHome/stuAsmntGridList", {
      pageIndex: "1",
      listScale: String(options.listScale ?? 10),
      searchValue: "",
      crsCreCd: options.crsCreCd,
      userNo: options.userNo,
      userName: options.userName ?? ""
    });

    return parseEcampusAssignmentListHtml(html, { baseUrl: this.baseUrl, crsCreCd: options.crsCreCd });
  }

  /**
   * 과제 목록을 JSON으로 반환한다
   * @param {GetClassroomAssignmentListOptions} options - 조회 옵션
   * @returns {Promise<string>} JSON 문자열
   */
  async getAssignmentListJson(options: GetClassroomAssignmentListOptions): Promise<string> {
    return stringifyEcampusClassroomItems(await this.getAssignmentList(options));
  }

  /**
   * 온라인 강의(e-learning) 차시 목록을 파싱하여 반환한다
   * @param {GetElearningLessonListOptions} options - 조회 옵션
   * @returns {Promise<EcampusLessonItem[]>} 차시 정보 배열
   */
  async getElearningLessonList(options: GetElearningLessonListOptions): Promise<EcampusLessonItem[]> {
    const html = await this.getElearningLessonListHtml(options);
    return parseEcampusLessonListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd,
      progressTypeCd: options.progressTypeCd ?? DEFAULT_PROGRESS_TYPE_CD
    });
  }

  /**
   * 온라인 강의 차시 목록을 JSON으로 반환한다
   * @param {GetElearningLessonListOptions} options - 조회 옵션
   * @returns {Promise<string>} JSON 문자열
   */
  async getElearningLessonListJson(options: GetElearningLessonListOptions): Promise<string> {
    return stringifyEcampusLessons(await this.getElearningLessonList(options));
  }

  /**
   * 온라인 강의 목록 페이지의 HTML 소스를 가져온다
   * @param {GetElearningLessonListOptions} options - 조회 옵션
   * @returns {Promise<string>} 응답 HTML
   */
  async getElearningLessonListHtml(options: GetElearningLessonListOptions): Promise<string> {
    await this.ensureAuthenticated();
    const formUrl = new URL("/lesson/lessonLect/Form/lessonListForm", this.baseUrl);
    formUrl.searchParams.set("mcd", options.mcd ?? DEFAULT_LESSON_MENU_CODE);
    formUrl.searchParams.set("crsCreCd", options.crsCreCd);

    await this.http.get<string>(formUrl.pathname + formUrl.search, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });

    const creInfoResponse = await this.http.post<{ result?: number; returnVO?: { progressTypeCd?: string; }; }>(
      "/crs/creCrsLect/creInfo",
      new URLSearchParams({ crsCreCd: options.crsCreCd }),
      {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: this.baseUrl.replace(/\/$/, ""),
          "X-Requested-With": "XMLHttpRequest"
        }
      }
    );

    const progressTypeCd = options.progressTypeCd ?? creInfoResponse.data.returnVO?.progressTypeCd ?? DEFAULT_PROGRESS_TYPE_CD;

    const response = await this.http.post<string>(
      "/lesson/lessonLect/lessonList",
      new URLSearchParams({
        pageIndex: "1", listScale: "10", searchValue: "",
        crsCreCd: options.crsCreCd, lessonScheduleId: "", subParam: "GRID", progressTypeCd
      }),
      {
        headers: {
          Accept: "text/html, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: this.baseUrl.replace(/\/$/, ""),
          "X-Requested-With": "XMLHttpRequest"
        }
      }
    );

    await this.persistCookieJar();
    return response.data;
  }

  /**
   * 특정 차시의 재생 창을 열고 메타데이터(studyDetailId 등)를 추출한다
   * @param {OpenElearningLessonOptions} options - 조회 옵션
   * @returns {Promise<EcampusLessonStudyWindow>} 재생 창 정보
   */
  async openLessonWindow(options: OpenElearningLessonOptions): Promise<EcampusLessonStudyWindow> {
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
   * e-learning 학습 세션 시작 전 초기 기록을 생성하고 고유 ID를 획득한다
   * @param {string} lessonCntsId - 콘텐츠 ID
   * @param {string} crsCreCd - 강의실 ID
   * @param {string} [stdNo] - 사용자 식별번호
   * @returns {Promise<EcampusLessonStudyWindow>} 초기화된 세션 정보
   */
  async createInitialStudyRecord(lessonCntsId: string, crsCreCd: string, stdNo?: string): Promise<EcampusLessonStudyWindow> {
    const windowInfo = await this.openLessonWindow({ crsCreCd, lessonCntsId });
    if (stdNo) windowInfo.stdNo = stdNo;
    return windowInfo;
  }

  /**
   * 특정 e-learning 차시의 실제 스트리밍 MP4 URL을 도출한다
   * @param {string} crsCreCd - 강의실 ID
   * @param {string} lessonCntsId - 콘텐츠 ID
   * @returns {Promise<ElearningMp4UrlResult>} 추출 결과
   */
  async getElearningMp4Url(crsCreCd: string, lessonCntsId: string): Promise<ElearningMp4UrlResult> {
    try {
      // 1. 서버로부터 재생 창 메타데이터(contentUrl 포함)를 먼저 확보한다
      const windowInfo = await this.openLessonWindow({ crsCreCd, lessonCntsId });
      
      if (!windowInfo.contentUrl) {
        return {
          success: false,
          message: "콘텐츠 URL(contentUrl)을 찾을 수 없습니다. (재생 창 파싱 실패)",
          debugInfo: { crsCreCd, lessonCntsId }
        };
      }

      // 2. 확보된 URL을 분석하여 실제 MP4 주소를 추출한다
      return getElearningMp4Url(this.http, windowInfo.contentUrl, { crsCreCd, lessonCntsId });
    } catch (error: any) {
      return {
        success: false,
        message: `URL 추출 중 오류 발생: ${error.message}`,
        debugInfo: { crsCreCd, lessonCntsId }
      };
    }
  }

  /**
   * 온라인 강의 영상을 로컬 파일로 저장한다
   * @param {string} crsCreCd - 강의실 ID
   * @param {string} lessonCntsId - 콘텐츠 ID
   * @param {string} courseTitle - 과목명
   * @param {string} lessonTitle - 강의명
   * @param {string} [baseDir="./downloads"] - 저장 경로
   * @param {Function} [progressCallback] - 진행률 콜백
   * @returns {Promise<ElearningDownloadResult>} 다운로드 결과
   */
  async downloadElearningMp4(
    crsCreCd: string,
    lessonCntsId: string,
    courseTitle: string,
    lessonTitle: string,
    baseDir: string = "./downloads",
    progressCallback?: (progress: { percent: number; loaded: number }) => void
  ): Promise<ElearningDownloadResult> {
    try {
      const urlResult = await this.getElearningMp4Url(crsCreCd, lessonCntsId);
      if (!urlResult.success || !urlResult.mp4Url) {
        return { success: false, message: urlResult.message || "MP4 URL을 추출하지 못했습니다." };
      }

      return await downloadElearningMp4File(
        this.http,
        urlResult.mp4Url,
        courseTitle,
        lessonTitle,
        baseDir,
        progressCallback
      );
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : util.inspect(error) };
    }
  }

  /**
   * e-campus 서버로 단일 학습 기록을 전송한다
   * @param {EcampusLessonRecordOptions} options - 전송 데이터
   * @returns {Promise<any>} 서버 응답
   */
  async addStudyRecord(options: EcampusLessonRecordOptions): Promise<any> {
    await this.ensureAuthenticated();
    const request = createStudyRecordRequest(this.baseUrl, options);
    const response = await this.http.get<any>(new URL(request.url).pathname, {
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
   * 현재까지의 학습 상세 이력을 서버에서 조회한다
   * @param {string} lessonCntsId - 콘텐츠 ID
   * @param {string} crsCreCd - 강의실 ID
   * @returns {Promise<any>} 상세 이력 응답
   */
  async viewLessonStudyDetail(lessonCntsId: string, crsCreCd: string): Promise<any> {
    await this.ensureAuthenticated();
    const request = createViewLessonStudyDetailRequest(this.baseUrl, lessonCntsId, crsCreCd);
    const response = await this.http.get<any>(new URL(request.url).pathname, {
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
   * 공통 게시판 목록 조회를 위한 헬퍼 메서드
   * @private
   */
  private async postBoardList(options: GetClassroomBoardListOptions, bbsCd: "NOTICE" | "PDS", bbsId: string): Promise<string> {
    return this.postForm("/bbs/bbsLect/atclList", {
      formType: "LIST", bbsId, atclId: "", searchKey: "all", searchValue: "",
      listScale: String(options.listScale ?? 10), pageIndex: "1", headCd: "",
      bbsCd, crsCreCd: options.crsCreCd
    });
  }

  /**
   * Form-data를 포함한 POST 요청을 공통 헤더와 함께 전송한다
   * @private
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
 * e-campus 클라이언트를 생성하는 팩토리 함수
 * @param {EcampusClientOptions} options - 클라이언트 옵션
 * @returns {EcampusClient} 초기화된 클라이언트 인스턴스
 */
export function createEcampusClient(options: EcampusClientOptions = {}): EcampusClient {
  return new EcampusClient(options);
}

/**
 * 서버의 로그인 응답 데이터를 분석하여 결과를 추상화한다
 * @param {EcampusLoginResponse} data - 서버 응답 객체
 * @returns {LoginResult} 분석된 결과 타입
 */
export function parseLoginResponse(data: EcampusLoginResponse): LoginResult {
  if (!data.redirectUrl) {
    return { type: "error", data, message: data.message ?? "아이디 또는 비밀번호가 맞지 않습니다." };
  }

  // OTP 및 학습자 권한 확인 로직 포함
  if (data.otpLogin === "Y" && data.otpUserYn === "Y" && data.otpUserType?.includes("LEARNER") && data.userId && data.userNo) {
    const url = new URL(data.redirectUrl, DEFAULT_BASE_URL);
    url.searchParams.set("userId", data.userId);
    url.searchParams.set("userNo", data.userNo);
    return { type: "redirect", data, url: url.toString() };
  }

  return { type: "reload", data };
}

/** URL 경로 끝의 슬래시 유무를 정규화한다 */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

/** 내부 MP4 추출 함수 노출 */
import { getElearningMp4Url } from "./elearning.js";
