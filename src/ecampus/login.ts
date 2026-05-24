import axios, { type AxiosInstance, type AxiosResponse } from "axios";
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

/** e-campus 클라이언트 초기화 옵션 명세 */
export interface EcampusClientOptions {
  /** 기본 도메인 (생략 시 서원대 공식 도메인 사용) */
  baseUrl?: string;
  /** 외부 통신 설정을 커스텀하기 위한 Axios 인스턴스 */
  axios?: AxiosInstance;
  /** 세션 유지용 쿠키 파일 저장 경로 */
  cookieFilePath?: string;
  /** 자동 세션 복구를 위한 계정 정보 */
  loginCredentials?: LoginCredentials;
}

/** 사용자 인증에 필요한 계정 및 보안 옵션 정보 */
export interface LoginCredentials extends LoginEncryptOptions {
  userId: string;
  password: string;
}

/** 암호화 처리된 패킷을 직접 전달하여 로그인을 시도할 때의 옵션 */
export interface LoginWithEncryptDataOptions {
  encryptData: string;
}

/** 특정 강의실의 리소스를 조회하기 위한 식별자 옵션 */
export interface GetClassroomResourcesOptions {
  crsCreCd: string;
  userNo: string;
  userName?: string;
  /** 한 번에 가져올 목록의 크기 (기본값: 10) */
  listScale?: number;
}

/** 게시판 성격의 목록 조회를 위한 공통 옵션 */
export interface GetClassroomBoardListOptions {
  crsCreCd: string;
  listScale?: number;
}

/** 과제 목록 조회를 위한 사용자 컨텍스트 옵션 */
export interface GetClassroomAssignmentListOptions extends GetClassroomBoardListOptions {
  userNo: string;
  userName?: string;
}

/** 온라인 강의 차시 목록 필터링 옵션 */
export interface GetElearningLessonListOptions {
  crsCreCd: string;
  /** 메뉴 코드 (시스템 내부용) */
  mcd?: string;
  /** 진도 방식 코드 (WEEK 등) */
  progressTypeCd?: string;
}

/** 온라인 강의 재생 및 학습 상태 조회를 위한 상세 옵션 */
export interface OpenElearningLessonOptions {
  crsCreCd: string;
  lessonCntsId: string;
  progressTypeCd?: string;
  seekFile?: string;
  downloadYn?: string;
}

/** 로그인 수행 절차의 최종 결과를 나타내는 합집합 타입 */
export type LoginResult =
  | { type: "redirect"; data: EcampusLoginResponse; url: string }
  | { type: "reload"; data: EcampusLoginResponse }
  | { type: "error"; data?: EcampusLoginResponse; message: string };

/** e-campus 서버가 반환하는 로그인 응답의 원시 구조 */
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
 * e-campus 연동을 총괄하는 코어 클라이언트 클래스.
 * Senior Engineer 원칙에 따라 데이터 파싱 로직은 외부로 위임하고 세션 및 라이프사이클 관리에 집중한다.
 */
export class EcampusClient {
  readonly baseUrl: string;
  readonly cookieJar: CookieJar;
  readonly http: AxiosInstance;
  private readonly cookieFilePath?: string;
  private loginCredentials?: LoginCredentials;

  /**
   * 클라이언트 인스턴스를 초기화하고 통신 인터셉터를 구성한다.
   * @param {EcampusClientOptions} options - 설정 옵션
   */
  constructor(options: EcampusClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.cookieFilePath = options.cookieFilePath;
    this.loginCredentials = options.loginCredentials;
    this.cookieJar = this.loadCookieJar();

    // 세션 유지 및 쿠키 자동 처리를 위해 axios-cookiejar-support 래퍼 적용
    this.http =
      options.axios ??
      wrapper(
        axios.create({
          baseURL: this.baseUrl,
          jar: this.cookieJar,
          withCredentials: true,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
          }
        })
      );
  }

  /**
   * 백그라운드 자동 갱신을 위해 계정 정보를 수동으로 업데이트한다.
   * @param {LoginCredentials} credentials - 보관할 계정 정보
   */
  setCredentials(credentials: LoginCredentials): void {
    this.loginCredentials = credentials;
  }

  /**
   * 저장된 계정 정보를 조회한다.
   * @returns {LoginCredentials | undefined} 현재 설정된 계정 정보
   */
  getCredentials(): LoginCredentials | undefined {
    return this.loginCredentials;
  }

  /**
   * 영구 저장소에서 쿠키 데이터를 읽어와 세션을 복구한다.
   * @private
   */
  private loadCookieJar(): CookieJar {
    if (!this.cookieFilePath) return new CookieJar();
    const loaded = loadCookieJarFromFile(this.cookieFilePath);
    return loaded ?? new CookieJar();
  }

  /**
   * 현재 활성화된 세션 쿠키를 파일로 저장한다.
   * @private
   */
  private async persistCookieJar(): Promise<void> {
    if (!this.cookieFilePath) return;
    saveCookieJarToFile(this.cookieFilePath, this.cookieJar);
  }

  /**
   * 세션 유효성을 확인하고 필요 시 백그라운드 자동 로그인을 수행한다.
   * @throws {Error} 세션 만료 및 재로그인 정보 부재 시 발생
   */
  async ensureAuthenticated(): Promise<void> {
    if (isCookieJarUsable(this.cookieJar)) return;

    if (!this.loginCredentials) {
      throw new Error("세션이 만료되었습니다. 로그인을 먼저 수행하십시오.");
    }

    await this.login(this.loginCredentials);
  }

  /**
   * 서버 측 세션 컨텍스트 생성을 위해 로그인 페이지를 선행 방문한다.
   */
  async prepareLoginSession(): Promise<void> {
    await this.http.get(LOGIN_PAGE_PATH, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });
    await this.persistCookieJar();
  }

  /**
   * 계정 정보를 서버가 요구하는 암호화 포맷으로 변환하여 로그인을 시도한다.
   * @param {LoginCredentials} credentials - 로그인 계정
   * @returns {Promise<LoginResult>} 인증 결과
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    this.loginCredentials = credentials;
    // 레거시 암호화 모듈을 통해 복잡한 인증 패킷 생성 (서버 요구사항 준수)
    const encryptData = createLoginEncryptData(credentials.userId, credentials.password, {
      reason: credentials.reason,
      foreigner: credentials.foreigner
    });

    return this.loginWithEncryptData({ encryptData });
  }

  /**
   * 생성된 암호화 패킷을 이용해 서버와 실제 세션 합의를 진행한다.
   * @param {LoginWithEncryptDataOptions} options - 암호화 데이터
   * @returns {Promise<LoginResult>} 최종 세션 획득 결과
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
   * 로그인 완료 후 진입하는 메인 대시보드 HTML을 조회한다.
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
   * 수강 중인 과목들을 교과와 비교과 카테고리로 분류하여 조회한다.
   */
  async getCourseGroups(): Promise<EcampusCourseGroups> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseGroups(html);
  }

  /**
   * 수강 중인 전체 과목 목록을 배열 형태로 조회한다.
   */
  async getCourseList(): Promise<EcampusCourseListItem[]> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseList(html);
  }

  /**
   * 과목 드롭다운 메뉴를 구성하는 AJAX HTML 소스를 가져온다.
   * @param {string} [crsCreCd=""] - 선택된 과목 코드
   */
  async getCourseListHtml(crsCreCd = ""): Promise<string> {
    await this.ensureAuthenticated();
    return this.postForm("/crs/creCrsHome/classRoomCrsCreList", { crsCreCd });
  }

  /**
   * 강의실 내 주요 리소스(공지, 자료, 과제)를 병렬 조회를 통해 통합 패키지로 가져온다.
   * @param {GetClassroomResourcesOptions} options - 조회 정보
   * @returns {Promise<EcampusClassroomResources>} 통합된 리소스 묶음
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

  /** 공지사항 목록 조회 및 파싱 */
  async getNoticeList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "NOTICE", `BBS_${options.crsCreCd}_N`);
    return parseEcampusNoticeListHtml(html, { baseUrl: this.baseUrl, crsCreCd: options.crsCreCd });
  }

  /** 강의자료실 목록 조회 및 파싱 */
  async getMaterialList(options: GetClassroomBoardListOptions): Promise<EcampusClassroomItem[]> {
    const html = await this.postBoardList(options, "PDS", `BBS_${options.crsCreCd}_P`);
    return parseEcampusMaterialListHtml(html, {
      baseUrl: this.baseUrl,
      crsCreCd: options.crsCreCd
    });
  }

  /** 과제함 목록 및 개인별 제출 상태 조회 */
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

  /** 온라인 강의(e-learning) 전체 차시 목록 조회 */
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
   * 온라인 강의 목록 화면의 핵심 HTML 데이터와 메타데이터를 통합 획득한다.
   * 복수의 폼 전송과 정보 확인 과정을 거쳐 실제 목록 데이터에 접근한다.
   */
  async getElearningLessonListHtml(options: GetElearningLessonListOptions): Promise<string> {
    await this.ensureAuthenticated();
    const formUrl = new URL("/lesson/lessonLect/Form/lessonListForm", this.baseUrl);
    formUrl.searchParams.set("mcd", options.mcd ?? DEFAULT_LESSON_MENU_CODE);
    formUrl.searchParams.set("crsCreCd", options.crsCreCd);

    await this.http.get<string>(formUrl.pathname + formUrl.search, {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }
    });

    // 해당 과목의 진도 체크 방식 등 부가 정보를 비동기로 획득
    const creInfoRes = await this.http.post<{
      result?: number;
      returnVO?: { progressTypeCd?: string };
    }>("/crs/creCrsLect/creInfo", new URLSearchParams({ crsCreCd: options.crsCreCd }), {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    const progressTypeCd =
      options.progressTypeCd ??
      creInfoRes.data.returnVO?.progressTypeCd ??
      DEFAULT_PROGRESS_TYPE_CD;

    const response = await this.http.post<string>(
      "/lesson/lessonLect/lessonList",
      new URLSearchParams({
        pageIndex: "1",
        listScale: "10",
        searchValue: "",
        crsCreCd: options.crsCreCd,
        lessonScheduleId: "",
        subParam: "GRID",
        progressTypeCd
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

  /** 특정 차시의 시청 창을 활성화하고 관련 데이터(studyDetailId 등)를 획득한다 */
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

  /** 실제 스트리밍 가능한 MP4 파일의 직주소를 지능형 엔진을 통해 도출한다 */
  async getElearningMp4Url(crsCreCd: string, lessonCntsId: string): Promise<ElearningMp4UrlResult> {
    try {
      const windowInfo = await this.openLessonWindow({ crsCreCd, lessonCntsId });
      if (!windowInfo.contentUrl) {
        return {
          success: false,
          message: "콘텐츠 페이지 경로 확보 실패",
          debugInfo: { crsCreCd, lessonCntsId }
        };
      }
      return getElearningMp4Url(this.http, windowInfo.contentUrl, { crsCreCd, lessonCntsId });
    } catch (error: any) {
      return {
        success: false,
        message: `URL 분석 과정 중 예외 발생: ${error.message}`,
        debugInfo: { crsCreCd, lessonCntsId }
      };
    }
  }

  /** 원본 영상을 고속 스트림 방식으로 로컬에 다운로드한다 */
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
        return { success: false, message: urlResult.message || "스트리밍 주소 유실" };
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
      return {
        success: false,
        message: error instanceof Error ? error.message : util.inspect(error)
      };
    }
  }

  /** 단일 시청 기록(패킷)을 서버로 전송하여 학습 시간을 적재한다 */
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

  /** 현재 세션의 전체 학습 이력 및 상세 정보를 조회한다 */
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

  /** 게시판류 리소스 조회를 위한 내부 전용 POST 도우미 */
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

  /** 공통적인 form-urlencoded 데이터 전송을 처리한다 */
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

/** 팩토리 함수: 신규 클라이언트 생성 */
export function createEcampusClient(options: EcampusClientOptions = {}): EcampusClient {
  return new EcampusClient(options);
}

/** 서버 응답 분석: 결과 상태에 따른 캡슐화 처리 */
export function parseLoginResponse(data: EcampusLoginResponse): LoginResult {
  if (!data.redirectUrl)
    return { type: "error", data, message: data.message ?? "아이디/비밀번호 정합성 오류" };
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
    return { type: "redirect", data, url: url.toString() };
  }
  return { type: "reload", data };
}

/** URL 경로 표준화 */
function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

import { getElearningMp4Url } from "./elearning.js";
