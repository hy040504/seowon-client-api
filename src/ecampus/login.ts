import axios, { type AxiosInstance } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";
import { isCookieJarUsable, loadCookieJarFromFile, saveCookieJarToFile } from "./cookies";
import util from "node:util";
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
  readonly http: AxiosInstance;
  private readonly cookieFilePath?: string;
  private loginCredentials?: LoginCredentials;

  // 학습 자동화 상태 관리
  private studyInterval: NodeJS.Timeout | null = null;
  private currentStudyDetailId: string | null = null;
  private currentStudyTotalTm = 0;
  private isWatching = false;
  private stdNo: string | null = null;

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
    const html = await this.getCourseListHtml();
    return parseEcampusCourseGroups(html);
  }

  /**
   * 메인 페이지에서 과목 목록 배열을 가져온다
   * @returns {Promise<EcampusCourseListItem[]>} 과목명, 강의실 코드, 과목 타입 배열
   */
  async getCourseList(): Promise<EcampusCourseListItem[]> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseList(html);
  }

  /**
   * 메인 페이지 과목 목록을 JSON 문자열로 가져온다
   * @returns {Promise<string>} 과목 목록 JSON 문자열
   */
  async getCourseListJson(): Promise<string> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseListJson(html);
  }

  /**
   * 과목 목록 JSON을 기존 호환 이름으로 가져온다
   * @returns {Promise<string>} 과목 목록 JSON 문자열
   */
  async getCourseNamesJson(): Promise<string> {
    const html = await this.getCourseListHtml();
    return parseEcampusCourseNamesJson(html);
  }

  /**
   * 메인 페이지에서 AJAX로 불러오는 강의실 목록 HTML을 가져온다.
   * @param {string} crsCreCd - 현재 선택된 강의실 코드
   * @returns {Promise<string>} 강의실 드롭다운 HTML
   */
  async getCourseListHtml(crsCreCd = ""): Promise<string> {
    await this.ensureAuthenticated();
    const html = await this.postForm("/crs/creCrsHome/classRoomCrsCreList", {
      crsCreCd
    });

    return html;
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
    const formUrl = new URL("/lesson/lessonLect/Form/lessonListForm", this.baseUrl);
    formUrl.searchParams.set("mcd", options.mcd ?? DEFAULT_LESSON_MENU_CODE);
    formUrl.searchParams.set("crsCreCd", options.crsCreCd);

    await this.http.get<string>(formUrl.pathname + formUrl.search, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const creInfoResponse = await this.http.post<{
      result?: number;
      returnVO?: {
        progressTypeCd?: string;
      };
    }>(
      "/crs/creCrsLect/creInfo",
      new URLSearchParams({
        crsCreCd: options.crsCreCd
      }),
      {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: this.baseUrl.replace(/\/$/, ""),
          "X-Requested-With": "XMLHttpRequest"
        }
      }
    );

    const progressTypeCd =
      options.progressTypeCd ??
      creInfoResponse.data.returnVO?.progressTypeCd ??
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

  /**
   * 온라인 강의 재생 창을 열고 콘텐츠 정보를 파싱한다
   * @param {OpenElearningLessonOptions} options - 강의실 코드와 차시 콘텐츠 코드
   * @returns {Promise<EcampusLessonStudyWindow>} 강의 재생 창 메타데이터
   */
  async openLessonWindow(
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
   * 초기 학습 기록을 생성하고 studyDetailId를 확보한다
   * @param {string} lessonCntsId - 차시 콘텐츠 코드
   * @param {string} crsCreCd - 강의실 코드
   * @param {string} [stdNo] - 학번 (선택 사항, 지정하지 않으면 openLessonWindow 결과에서 추출)
   * @returns {Promise<EcampusLessonStudyWindow>} 학습 창 메타데이터
   */
  async createInitialStudyRecord(
    lessonCntsId: string,
    crsCreCd: string,
    stdNo?: string
  ): Promise<EcampusLessonStudyWindow> {
    const windowInfo = await this.openLessonWindow({ crsCreCd, lessonCntsId });
    if (stdNo) {
      windowInfo.stdNo = stdNo;
    }
    return windowInfo;
  }

  /**
   * 실제 사람이 강의를 보는 것처럼 자연스럽게 학습 인증 시작
   * @param {string} lessonCntsId - 차시 콘텐츠 코드
   * @param {string} crsCreCd - 강의실 코드
   * @param {string} [stdNo] - 학번
   * @returns {Promise<void>}
   */
  public async startWatchingLesson(
    lessonCntsId: string,
    crsCreCd: string,
    stdNo?: string
  ): Promise<void> {
    if (this.isWatching) {
      console.log("[이미 학습 중] stopWatchingLesson 먼저 호출하세요.");
      return;
    }

    console.log(`[학습 시작] lessonCntsId=${lessonCntsId}, crsCreCd=${crsCreCd}`);

    // 1. lessonNewWindow 호출 (동영상 재생 창 열기) 및 studyDetailId 확보
    const initialRecord = await this.createInitialStudyRecord(lessonCntsId, crsCreCd, stdNo);
    
    this.currentStudyDetailId = initialRecord.studyDetailId ?? null;
    this.stdNo = initialRecord.stdNo ?? null;
    this.currentStudyTotalTm = Number(initialRecord.recordRequest?.query.studyTotalTm) || 0;
    this.isWatching = true;

    if (!this.currentStudyDetailId) {
      console.warn("[경고] studyDetailId를 확보하지 못했습니다. 학습 기록이 누락될 수 있습니다.");
    }

    console.log(`[학습 인증 시작] studyDetailId = ${this.currentStudyDetailId}`);

    // 3. 자연스러운 주기로 학습 기록 전송 (60초 ± 랜덤)
    this.studyInterval = setInterval(() => {
      this.sendStudyRecordWithNaturalDelay(lessonCntsId, crsCreCd);
    }, 60000);
  }

  /**
   * 사람처럼 5~15초 사이 랜덤 딜레이 후 학습 기록 전송
   */
  private async sendStudyRecordWithNaturalDelay(lessonCntsId: string, crsCreCd: string) {
    if (!this.isWatching) return;

    const randomDelayMs = Math.floor(Math.random() * 10000) + 5000; // 5~15초
    await new Promise((r) => setTimeout(r, randomDelayMs));

    if (!this.isWatching) return;

    this.currentStudyTotalTm += 60;

    await this.addStudyRecord({
      lessonCntsId,
      stdNo: this.stdNo!,
      studyDetailId: this.currentStudyDetailId!,
      studyTotalTm: this.currentStudyTotalTm,
      studyAfterTm: 0,
      studyStatusCd: "STUDY",
      crsCreCd
    });

    // 학습 이력이 제대로 쌓이는지 확인
    await this.viewLessonStudyDetail(lessonCntsId, crsCreCd);
  }

  /**
   * 학습 종료 (타이머 정리 + 최종 로그)
   */
  public async stopWatchingLesson(): Promise<void> {
    if (this.studyInterval) {
      clearInterval(this.studyInterval);
      this.studyInterval = null;
    }
    this.isWatching = false;

    console.log(
      `[학습 종료] 총 학습 시간: ${this.currentStudyTotalTm}초 (studyDetailId: ${this.currentStudyDetailId})`
    );
  }

  /**
   * 특정 e-learning 강의의 MP4 URL을 가져온다
   * @param {string} crsCreCd - 강의실 코드
   * @param {string} lessonCntsId - 차시 콘텐츠 코드
   * @returns {Promise<ElearningMp4UrlResult>} MP4 URL 추출 결과
   */
  async getElearningMp4Url(
    crsCreCd: string,
    lessonCntsId: string
  ): Promise<ElearningMp4UrlResult> {
    try {
      const openResult = await this.openLessonWindow({ crsCreCd, lessonCntsId });
      const contentUrl = openResult?.contentUrl;
      if (!contentUrl) {
        return {
          success: false,
          message: "contentUrl을 찾을 수 없습니다.",
          debugInfo: openResult
        };
      }

      const response = await axios.get(contentUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        withCredentials: true
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // 1순위: <source> 태그
      let mp4Url =
        $('source[type="video/mp4"]').first()?.attr("src") || $("source#lessonVodSrc")?.attr("src");

      // 2순위: regex 직접 검색
      if (!mp4Url) {
        const regexMatch = html.match(
          /https:\/\/eplus\.seowon\.ac\.kr\/WebContentStorage\/[^"\s]+\.mp4\?tsdata=[^"\s]+/
        );
        if (regexMatch) mp4Url = regexMatch[0];
      }

      // 3순위: base64 JSON fallback (VideoPlayerWidgetViewModel)
      if (!mp4Url) {
        const viewModelMatch = html.match(/new VideoPlayerWidgetViewModel\('([^']+)'/);
        if (viewModelMatch?.[1]) {
          try {
            const jsonStr = Buffer.from(viewModelMatch[1], "base64").toString("utf8");
            const parsed = JSON.parse(jsonStr);
            if (parsed.videoUrl) mp4Url = parsed.videoUrl;
          } catch (e) {
            // base64 파싱 실패 무시
          }
        }
      }

      if (mp4Url) {
        return { success: true, mp4Url };
      }

      // 실패 시 상세 디버그
      return {
        success: false,
        message: "실제 MP4 URL을 찾지 못했습니다.",
        debugInfo: {
          crsCreCd,
          lessonCntsId,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers["content-type"],
          bodyLength: html.length,
          bodySnippet: html.substring(0, 6000)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: "MP4 URL 추출 중 오류 발생",
        debugInfo: {
          crsCreCd,
          lessonCntsId,
          error: error.message,
          stack: error.stack
        }
      };
    }
  }

  /**
   * 특정 e-learning 강의 MP4를 다운로드한다
   * @param {string} crsCreCd - 강의실 코드
   * @param {string} lessonCntsId - 차시 콘텐츠 코드
   * @param {string} downloadDir - 저장할 폴더 경로
   * @param {Function} onProgress - 진행 상황 콜백
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
        return {
          success: false,
          message: urlResult.message || "MP4 URL을 추출하지 못했습니다."
        };
      }

      return await downloadElearningMp4File(
        this.http,
        urlResult.mp4Url,
        this.sanitizeFilename(courseTitle),
        this.sanitizeFilename(lessonTitle),
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

  private sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().substring(0, 100);
  }

  /**
   * e-campus가 사용하는 학습기록 저장 API를 호출한다
   * @param {EcampusLessonRecordOptions} options - 실제 학습 창에서 확보한 학습기록 값
   * @returns {Promise<unknown>} 서버의 JSON 응답
   */
  async addStudyRecord(options: EcampusLessonRecordOptions): Promise<unknown> {
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
   * 학습 이력 상세 정보를 조회한다 (학습 이력 적재 확인용)
   * @param {string} lessonCntsId - 차시 콘텐츠 코드
   * @param {string} crsCreCd - 강의실 코드
   * @returns {Promise<unknown>} 서버 응답
   */
  async viewLessonStudyDetail(lessonCntsId: string, crsCreCd: string): Promise<unknown> {
    await this.ensureAuthenticated();
    const request = createViewLessonStudyDetailRequest(this.baseUrl, lessonCntsId, crsCreCd);
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
