/**
 * 수강신청 본신청 전용 클라이언트.
 *
 * 본신청 전용 — 수강희망바구니와 다름.
 * 미포함: 수강희망바구니(예비 담기) → HopeBasketClient 사용
 *
 * 서버: sugangh.seowon.ac.kr (희망바구니와 동일 서버)
 * menuId=M100780, pgmId=P001619 (희망바구니 M100779/P001609와 다름)
 *
 * 수강신청 시간대 서버 과부하로 인해 아래 현상이 발생할 수 있으며 대응 로직이 포함됨:
 * - TCP TimedOut (연결 자체 불가): 자동 재시도
 * - findAppcsLogin flag=0 (허위 로그인 실패): 자동 재시도 (mayBeFalseError)
 * - ECONNRESET: Connection: close 헤더 사용 + 재시도
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

import {
  isCookieJarUsable,
  loadCookieJarFromFile,
  saveCookieJarToFile
} from "../ecampus/cookies.js";
import type { SugangStudentInfo, SugangSubject } from "../hope-basket/types/basket.js";
import {
  COURSE_REG_BASE_URL,
  COURSE_REG_DEFAULT_COOKIE_FILE,
  COURSE_REG_DEFAULT_DEPT_CD
} from "./constants.js";
import {
  classifyCourseRegNetworkError,
  CourseRegErrorType,
  formatCourseRegError
} from "./errors.js";
import {
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
  parseCourseRegMutationResponse,
  parseCourseRegMyListResponse,
  parseCourseRegSearchResponse,
  parseCourseRegSysdateResponse,
  parseCourseRegTermCodeResponse,
  type CourseRegLoginCredentials,
  type CourseRegLoginResult,
  type CourseRegMutationOptions,
  type CourseRegMutationResult,
  type CourseRegMyListOptions,
  type CourseRegRegisteredSubject,
  type CourseRegRetryRegisterOptions,
  type CourseRegRetryRegisterResult,
  type CourseRegSearchOptions,
  type CourseRegSsvPostRequest,
  type CourseRegTermCodeInfo,
  type CourseRegTermContext,
  type CourseRegistrationClientOptions
} from "./registration.js";

export type { CourseRegistrationClientOptions } from "./types/registration.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_LOGIN_RETRY_COUNT = 5;
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ERR_NETWORK",
  "ERR_BAD_RESPONSE"
]);

/**
 * 수강신청 본신청 전용 클라이언트.
 *
 * 범위:
 * - 포함: 로그인, 수강신청 등록/취소, 내 신청 목록 조회, 개설 과목 검색
 * - 미포함: 수강희망바구니(예비 담기) → HopeBasketClient 를 사용할 것
 *
 * 서버: sugangh.seowon.ac.kr (희망바구니와 동일 서버)
 * menuId=M100780, pgmId=P001619 (희망바구니 M100779/P001609와 다름)
 *
 * HopeBasketClient 를 상속하거나 감싸지 않는다.
 */
export class CourseRegistrationClient {
  readonly baseUrl: string;
  readonly cookieJar: CookieJar;
  readonly http: AxiosInstance;
  private readonly cookieFilePath?: string;
  private readonly requestTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly loginMaxRetries: number;
  private onProgress?: (message: string) => void;
  private credentials?: CourseRegLoginCredentials;
  private term: CourseRegTermContext;
  private student?: SugangStudentInfo;

  /**
   * 클라이언트 인스턴스를 초기화하고 통신 인터셉터를 구성한다.
   * @param {CourseRegistrationClientOptions} [options={}] - 설정 옵션
   */
  constructor(options: CourseRegistrationClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? COURSE_REG_BASE_URL);
    this.cookieFilePath = options.cookieFilePath ?? COURSE_REG_DEFAULT_COOKIE_FILE;
    this.credentials = options.credentials;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_RETRY_COUNT;
    this.loginMaxRetries = options.loginMaxRetries ?? DEFAULT_LOGIN_RETRY_COUNT;
    this.onProgress = options.onProgress;
    this.term = {
      syy: options.defaultSyy ?? "",
      smtCd: options.defaultSmtCd ?? "",
      unvfrStdrDeptCd: options.unvfrStdrDeptCd ?? COURSE_REG_DEFAULT_DEPT_CD
    };
    this.cookieJar = this.loadCookieJar();
    this.http =
      options.axios ??
      wrapper(
        axios.create({
          baseURL: this.baseUrl,
          jar: this.cookieJar,
          withCredentials: true,
          timeout: this.requestTimeoutMs,
          // keep-alive 소켓이 서버에서 먼저 닫히면 ECONNRESET이 나기 쉬워 요청마다 연결을 닫는다.
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
            "Accept-Language": "ko,ko-KR;q=0.9,en-US;q=0.8,en;q=0.7",
            Accept: "*/*",
            Connection: "close",
            "Accept-Encoding": "gzip, deflate"
          },
          transitional: {
            clarifyTimeoutError: true
          }
        })
      );
  }

  /**
   * 자동 재로그인용 계정 정보를 수동으로 업데이트한다
   * @param {CourseRegLoginCredentials} credentials - 보관할 계정 정보
   * @returns {void}
   */
  setCredentials(credentials: CourseRegLoginCredentials): void {
    this.credentials = credentials;
  }

  /**
   * 저장된 계정 정보를 조회한다
   * @returns {CourseRegLoginCredentials | undefined} 현재 설정된 계정 정보
   */
  getCredentials(): CourseRegLoginCredentials | undefined {
    return this.credentials;
  }

  /**
   * 현재 학년도/학기 문맥을 조회한다
   * @returns {CourseRegTermContext} 학년도/학기/부서 문맥
   */
  getTermContext(): CourseRegTermContext {
    return { ...this.term };
  }

  /**
   * 학년도/학기 문맥을 수동 설정한다
   * @param {Partial<CourseRegTermContext>} context - 덮어쓸 문맥 값
   * @returns {void}
   */
  setTermContext(context: Partial<CourseRegTermContext>): void {
    this.term = {
      syy: context.syy ?? this.term.syy,
      smtCd: context.smtCd ?? this.term.smtCd,
      unvfrStdrDeptCd:
        context.unvfrStdrDeptCd ?? this.term.unvfrStdrDeptCd ?? COURSE_REG_DEFAULT_DEPT_CD,
      stuno: context.stuno ?? this.term.stuno,
      asignDeprtCd: context.asignDeprtCd ?? this.term.asignDeprtCd
    };
  }

  /**
   * 최근 로그인으로 확보한 학생 정보를 반환한다
   * @returns {SugangStudentInfo | undefined} 학생 기본 정보
   */
  getStudentInfo(): SugangStudentInfo | undefined {
    return this.student;
  }

  /**
   * 진행 상황 콜백을 교체한다
   * @param {(message: string) => void} [handler] - 진행 메시지 핸들러
   * @returns {void}
   */
  setProgressHandler(handler?: (message: string) => void): void {
    this.onProgress = handler;
  }

  /**
   * 현재 쿠키 jar를 파일에 저장한다
   * @returns {Promise<void>}
   */
  async saveCookies(): Promise<void> {
    await this.persistCookieJar();
  }

  /**
   * SESSIONID 확보를 위해 /nx/ 홈을 방문한다
   * @returns {Promise<void>}
   */
  async prepareSession(): Promise<void> {
    this.emitProgress("세션 쿠키 확보 중 (/nx/)...");
    const request = createCourseRegHomeRequest(this.baseUrl);
    await this.requestWithRetry({
      method: "GET",
      url: request.url,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      responseType: "text",
      transformResponse: [(data) => data]
    });
    await this.persistCookieJar();
    this.emitProgress("세션 쿠키 확보 완료");
  }

  /**
   * 서버 학사일정 코드로 학년도/학기를 동기화한다
   * @returns {Promise<CourseRegTermCodeInfo>} 동기화된 학사일정 코드
   * @throws {Error} 학년도/학기를 확인하지 못한 경우
   */
  async syncTermContext(): Promise<CourseRegTermCodeInfo> {
    await this.ensureSessionCookie();
    this.emitProgress("학년도/학기 코드 조회 중...");
    const request = createCourseRegTermCodeRequest({
      baseUrl: this.baseUrl,
      regDeptCd: this.term.unvfrStdrDeptCd
    });
    const body = await this.postSsv(request);
    const term = parseCourseRegTermCodeResponse(body);
    if (!term?.syy || !term.smtCd) {
      throw new Error("학사일정 코드(syy/smtCd)를 확인하지 못했습니다.");
    }
    this.setTermContext({
      syy: term.syy,
      smtCd: term.smtCd,
      unvfrStdrDeptCd: this.term.unvfrStdrDeptCd
    });
    this.emitProgress(`학년도/학기 동기화 완료: ${term.syy}-${term.smtCd}`);
    return term;
  }

  /**
   * 수강신청 본신청 로그인을 수행한다.
   * 서버 과부하로 flag=0이 반환될 경우 loginMaxRetries 만큼 자동 재시도한다.
   * 정식 수강희망바구니 로그인이 아니다.
   * @param {CourseRegLoginCredentials} [credentials] - 학번/비밀번호 (미지정 시 저장 계정)
   * @returns {Promise<CourseRegLoginResult>} 로그인 결과
   * @throws {Error} 계정 정보 부재
   */
  async login(credentials?: CourseRegLoginCredentials): Promise<CourseRegLoginResult> {
    const creds = credentials ?? this.credentials;
    if (!creds?.stuno || !creds?.password) {
      throw new Error("학번과 비밀번호가 필요합니다.");
    }
    this.credentials = creds;

    await this.ensureSessionCookie(true);

    let termCode: string | undefined;
    if (!this.term.syy || !this.term.smtCd) {
      const term = await this.syncTermContext();
      termCode = term.termCode;
    } else {
      termCode = `${this.term.syy}${this.term.smtCd}`;
    }

    let lastResult: CourseRegLoginResult | undefined;

    for (let attempt = 1; attempt <= this.loginMaxRetries; attempt++) {
      this.emitProgress(
        attempt === 1
          ? "수강신청 본신청 로그인 요청 중..."
          : `로그인 재시도 ${attempt}/${this.loginMaxRetries} (서버 과부하 허위 실패 대응)...`
      );

      const loginRequest = createCourseRegLoginRequest(creds, this.term, {
        baseUrl: this.baseUrl
      });
      const loginBody = await this.postSsv(loginRequest);
      const loginPartial = composeCourseRegLoginResult({ loginBody, termCode });

      if (!loginPartial.success) {
        lastResult = loginPartial;
        await this.persistCookieJar();

        // 허위 실패(mayBeFalseError)면 지수 백오프 후 재시도
        if (loginPartial.mayBeFalseError && attempt < this.loginMaxRetries) {
          const waitMs = 500 * attempt * attempt;
          this.emitProgress(
            `로그인 flag=0 (허위 실패 가능). ${waitMs}ms 후 재시도...`
          );
          await sleep(waitMs);
          // 세션 쿠키 재확보 후 재시도
          await this.ensureSessionCookie(true);
          continue;
        }

        this.emitProgress(`로그인 실패: ${loginPartial.message}`);
        return loginPartial;
      }

      // 성공 → 학생 정보·일정 체크
      this.emitProgress("학생 정보 조회 중...");
      const studentRequest = createCourseRegStudentInfoRequest(creds, this.term, {
        baseUrl: this.baseUrl
      });
      const studentBody = await this.postSsv(studentRequest);
      const resultWithStudent = composeCourseRegLoginResult({
        loginBody,
        studentBody,
        termCode
      });
      this.student = resultWithStudent.student;
      if (this.student) {
        this.setTermContext({
          syy: this.student.syy || this.term.syy,
          smtCd: this.student.smtCd || this.term.smtCd,
          unvfrStdrDeptCd: this.student.unvfrStdrDeptCd || this.term.unvfrStdrDeptCd,
          stuno: this.student.stuno,
          asignDeprtCd: this.student.deptCd
        });
      }

      let loginCheckBody: string | undefined;
      if (this.student) {
        this.emitProgress("신청 가능 일정 확인 중...");
        const checkRequest = createCourseRegLoginCheckRequest(creds, this.student, this.term, {
          baseUrl: this.baseUrl
        });
        loginCheckBody = await this.postSsv(checkRequest);
      }

      // 수강신청 메뉴 진입 (패킷: findMenu strMenuId=M100780)
      try {
        this.emitProgress("수강신청 메뉴 진입 중 (M100780)...");
        const menuRequest = createCourseRegMenuRequest(undefined, { baseUrl: this.baseUrl });
        await this.postSsv(menuRequest);
      } catch {
        // 메뉴 조회 실패는 치명적이지 않음
        this.emitProgress("메뉴 진입 요청 실패 (계속 진행)");
      }

      const result = composeCourseRegLoginResult({
        loginBody,
        studentBody,
        loginCheckBody,
        termCode
      });
      this.student = result.student ?? this.student;
      await this.persistCookieJar();
      this.emitProgress(result.success ? "로그인 완료" : `로그인 실패: ${result.message}`);
      return result;
    }

    await this.persistCookieJar();
    return (
      lastResult ?? {
        success: false,
        flag: "0",
        mayBeFalseError: true,
        message: formatCourseRegError(CourseRegErrorType.LOGIN_FAILED),
        errorType: CourseRegErrorType.LOGIN_FAILED,
        raw: {}
      }
    );
  }

  /**
   * 현재 세션이 유효한지 확인하고, 만료 시 자동 재로그인한다
   * @returns {Promise<void>}
   */
  async ensureLoggedIn(): Promise<void> {
    await this.ensureReady();
  }

  /**
   * 개설 과목을 검색한다.
   * findEstblSubjtGnrlList API를 사용하며 menuId=M100780을 전송한다.
   * @param {CourseRegSearchOptions} [options={}] - 검색 조건
   * @returns {Promise<SugangSubject[]>} 개설 과목 목록
   */
  async searchSubjects(options: CourseRegSearchOptions = {}): Promise<SugangSubject[]> {
    await this.ensureReady();
    const query = this.withStudentContext(options);
    const request = createCourseRegSearchRequest(query, this.baseUrl);
    const body = await this.postSsv(request);
    return dedupeSubjects(parseCourseRegSearchResponse(body));
  }

  /**
   * 내 수강신청 목록을 조회한다.
   * findAppcsDtlsList API 사용. 희망바구니의 findEstblSubjtShpbsList와 다른 경로.
   * @param {CourseRegMyListOptions} [options={}] - 조회 옵션
   * @returns {Promise<CourseRegRegisteredSubject[]>} 내 신청 과목 목록
   */
  async getMyRegisteredList(
    options: CourseRegMyListOptions = {}
  ): Promise<CourseRegRegisteredSubject[]> {
    await this.ensureReady();
    const query = this.withStudentContext(options);
    // 화면 기본은 학과 코드가 들어가지만, 학번 기준으로도 목록이 내려온다
    if (!query.asignDeprtCd && this.student?.deptCd) {
      query.asignDeprtCd = this.student.deptCd;
    }
    const request = createCourseRegMyListRequest(query, this.baseUrl);
    const body = await this.postSsv(request);
    return dedupeRegistered(parseCourseRegMyListResponse(body));
  }

  /**
   * 수강신청을 등록한다 (saveAppcsDtls).
   *
   * 패킷에서 확인된 실제 수강신청 1건 처리 순서:
   * 1. findWarnStdrInqryCscnt (경고장학생 조회 횟수 확인)
   * 2. saveWarnStdrInqrtCscnt (경고장학생 조회 횟수 저장)
   * 3. findMyGLIOList (접속 정보 — skipAuxRequests 시 생략)
   * 4. findSysdate (서버 시각 — skipAuxRequests 시 생략)
   * 5. saveAppcsDtls (실제 수강신청 등록) ← 핵심
   *
   * @param {CourseRegMutationOptions} options - 등록할 과목 정보
   * @returns {Promise<CourseRegMutationResult>} 등록 결과
   */
  async registerCourse(options: CourseRegMutationOptions): Promise<CourseRegMutationResult> {
    await this.ensureReady();
    const mutation = this.withStudentContext(options);

    // 1~2. 경고 장학생 체크 (패킷에서 매 신청 전 선행)
    if (!options.skipWarnCheck) {
      await this.runWarnChecks(mutation);
    }

    // 3~4. 보조 요청 (브라우저 동일 흐름; 자동화 시 생략 가능)
    if (!options.skipAuxRequests) {
      try {
        this.emitProgress("접속 정보 조회 중 (findMyGLIOList)...");
        const glioRequest = createCourseRegGLIORequest("deptCd", { baseUrl: this.baseUrl });
        await this.postSsv(glioRequest);
      } catch {
        this.emitProgress("findMyGLIOList 실패 (계속 진행)");
      }

      try {
        this.emitProgress("서버 시각 조회 중...");
        await this.fetchSysdate();
      } catch {
        this.emitProgress("findSysdate 실패 (계속 진행)");
      }
    }

    // 5. 실제 수강신청
    this.emitProgress(
      `수강신청 등록 중: ${options.subjtCd}-${options.corseDvclsNo}...`
    );
    const request = createCourseRegRegisterRequest(mutation, this.baseUrl);
    const body = await this.postSsv(request);
    return parseCourseRegMutationResponse(body, "register", options);
  }

  /**
   * 수강신청을 취소한다 (saveAppcsDtlsCancl).
   * @param {CourseRegMutationOptions} options - 취소할 과목 정보
   * @returns {Promise<CourseRegMutationResult>} 취소 결과
   */
  async cancelCourse(options: CourseRegMutationOptions): Promise<CourseRegMutationResult> {
    await this.ensureReady();
    const mutation = this.withStudentContext(options);
    this.emitProgress(
      `수강신청 취소 중: ${options.subjtCd}-${options.corseDvclsNo}...`
    );
    const request = createCourseRegCancelRequest(mutation, this.baseUrl);
    const body = await this.postSsv(request);
    return parseCourseRegMutationResponse(body, "cancel", options);
  }

  /**
   * 정원 초과 과목을 지정 간격으로 반복 신청한다.
   * 성공 시 즉시 중단. 서버 타임아웃/연결 오류 시 대기 후 재시도.
   * @param {CourseRegRetryRegisterOptions} options - 대상 과목 및 재시도 옵션
   * @returns {Promise<CourseRegRetryRegisterResult>} 재시도 결과
   */
  async registerCourseWithRetry(
    options: CourseRegRetryRegisterOptions
  ): Promise<CourseRegRetryRegisterResult> {
    const intervalMs = options.intervalMs ?? 500;
    const maxAttempts = options.maxAttempts && options.maxAttempts > 0 ? options.maxAttempts : 0;
    const started = Date.now();
    let attempts = 0;
    let lastResult: CourseRegMutationResult | undefined;
    let stoppedByUser = false;

    while (true) {
      if (options.shouldStop?.()) {
        stoppedByUser = true;
        break;
      }
      if (maxAttempts > 0 && attempts >= maxAttempts) break;

      attempts += 1;
      try {
        // 재시도 루프에서는 보조 요청 생략으로 속도 확보
        lastResult = await this.registerCourse({
          ...options,
          skipAuxRequests: options.skipAuxRequests ?? true
        });
      } catch (error) {
        // 네트워크 오류 → 재시도 가능 결과로 변환
        const code = getErrorCode(error);
        const message = getErrorMessage(error);
        const errorType = classifyCourseRegNetworkError(code, message);
        lastResult = createEmptyMutationResult(options, {
          message: formatCourseRegError(errorType, message),
          errorType
        });
      }

      if (!lastResult) {
        lastResult = createEmptyMutationResult(options, { message: "시도 결과 없음" });
      }

      const elapsedMs = Date.now() - started;
      options.onAttempt?.({ attempt: attempts, result: lastResult, elapsedMs });

      if (lastResult.success) {
        return {
          success: true,
          attempts,
          elapsedMs,
          lastResult,
          stoppedByUser: false
        };
      }

      // 정원 초과/연결 오류만 재시도. 학점초과·이미신청 등은 즉시 중단
      if (!isRetryableMutationError(lastResult)) {
        return {
          success: false,
          attempts,
          elapsedMs,
          lastResult,
          stoppedByUser: false
        };
      }

      if (options.shouldStop?.()) {
        stoppedByUser = true;
        break;
      }
      if (maxAttempts > 0 && attempts >= maxAttempts) break;

      await sleep(intervalMs);
    }

    return {
      success: false,
      attempts,
      elapsedMs: Date.now() - started,
      lastResult:
        lastResult ??
        createEmptyMutationResult(options, { message: "시도 결과 없음" }),
      stoppedByUser
    };
  }

  /**
   * 경고 장학생 조회/저장 선행 호출
   * @private
   */
  private async runWarnChecks(context: CourseRegTermContext): Promise<void> {
    try {
      this.emitProgress("경고 장학생 조회 횟수 확인 중...");
      const checkReq = createCourseRegWarnCheckRequest(context, this.baseUrl);
      await this.postSsv(checkReq);
    } catch {
      this.emitProgress("경고 체크 조회 실패 (계속 진행)");
    }

    try {
      this.emitProgress("경고 장학생 조회 횟수 저장 중...");
      const saveReq = createCourseRegWarnSaveRequest(context, this.baseUrl);
      await this.postSsv(saveReq);
    } catch {
      this.emitProgress("경고 체크 저장 실패 (계속 진행)");
    }
  }

  /**
   * 서버 시각을 조회한다
   * @returns {Promise<string>} _sysdate 값
   * @private
   */
  private async fetchSysdate(): Promise<string> {
    const request = createCourseRegSysdateRequest(this.baseUrl);
    const response = await this.requestWithRetry({
      method: "GET",
      url: request.url,
      headers: {
        Accept: "application/xml, text/xml, */*",
        "X-Requested-With": "XMLHttpRequest",
        Origin: this.baseUrl.replace(/\/$/, ""),
        Referer: new URL("/nx/", this.baseUrl).toString(),
        Connection: "close"
      },
      responseType: "text",
      transformResponse: [(data) => data]
    });
    const xml = typeof response.data === "string" ? response.data : String(response.data ?? "");
    return parseCourseRegSysdateResponse(xml);
  }

  /**
   * 요청 옵션에 로그인 문맥(syy/smtCd/stuno)을 채운다
   * @private
   */
  private withStudentContext<T extends Partial<CourseRegTermContext>>(
    options: T = {} as T
  ): T & CourseRegTermContext {
    return {
      ...options,
      syy: options.syy || this.term.syy,
      smtCd: options.smtCd || this.term.smtCd,
      unvfrStdrDeptCd:
        options.unvfrStdrDeptCd || this.term.unvfrStdrDeptCd || COURSE_REG_DEFAULT_DEPT_CD,
      stuno: options.stuno || this.term.stuno || this.student?.stuno || this.credentials?.stuno,
      asignDeprtCd:
        options.asignDeprtCd || this.term.asignDeprtCd || this.student?.deptCd
    };
  }

  /**
   * 보호 API 호출 전 세션/학기/로그인 상태를 맞춘다
   * @private
   */
  private async ensureReady(): Promise<void> {
    await this.ensureSessionCookie();
    if (!this.term.syy || !this.term.smtCd) {
      await this.syncTermContext();
    }
    if (!this.student?.stuno && this.credentials) {
      await this.login(this.credentials);
    }
  }

  /**
   * SESSIONID가 없으면 /nx/ 로 세션을 다시 연다
   * @private
   */
  private async ensureSessionCookie(force = false): Promise<void> {
    if (!force && (await this.hasSessionIdCookie())) return;
    await this.prepareSession();
  }

  /**
   * sugangh SESSIONID 보유 여부를 확인한다
   * @private
   */
  private async hasSessionIdCookie(): Promise<boolean> {
    try {
      const cookies = await this.cookieJar.getCookies(this.baseUrl);
      return cookies.some((cookie) => cookie.key.toUpperCase() === "SESSIONID" && !!cookie.value);
    } catch {
      return isCookieJarUsable(this.cookieJar);
    }
  }

  /**
   * SSV POST를 재시도 포함해 전송한다
   * @private
   */
  private async postSsv(request: CourseRegSsvPostRequest): Promise<string> {
    const response = await this.requestWithRetry({
      method: "POST",
      url: request.url,
      data: request.body,
      headers: {
        Accept: request.accept,
        "Content-Type": request.contentType,
        "X-Requested-With": "XMLHttpRequest",
        Origin: this.baseUrl.replace(/\/$/, ""),
        Referer: new URL("/nx/", this.baseUrl).toString(),
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
        Connection: "close"
      },
      responseType: "text",
      transformResponse: [(data) => data],
      timeout: this.requestTimeoutMs
    });
    await this.persistCookieJar();
    return typeof response.data === "string" ? response.data : String(response.data ?? "");
  }

  /**
   * 일시적 네트워크 오류에 지수 백오프 재시도를 적용한다
   * @private
   */
  private async requestWithRetry(config: AxiosRequestConfig) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.http.request(config);
      } catch (error) {
        lastError = error;
        const retryable = isRetryableNetworkError(error);
        if (!retryable || attempt >= this.maxRetries) break;

        const waitMs = 400 * attempt * attempt;
        const code = getErrorCode(error);
        this.emitProgress(
          `네트워크 오류(${code || "unknown"}) 재시도 ${attempt}/${this.maxRetries - 1}...`
        );
        await sleep(waitMs);
      }
    }
    throw normalizeNetworkError(lastError);
  }

  /**
   * 파일에서 쿠키 jar를 복원한다
   * @private
   */
  private loadCookieJar(): CookieJar {
    if (!this.cookieFilePath) return new CookieJar();
    return loadCookieJarFromFile(this.cookieFilePath) ?? new CookieJar();
  }

  /**
   * 현재 쿠키 jar를 파일에 저장한다
   * @private
   */
  private async persistCookieJar(): Promise<void> {
    if (!this.cookieFilePath) return;
    saveCookieJarToFile(this.cookieFilePath, this.cookieJar);
  }

  /**
   * 진행 콜백이 있으면 메시지를 전달한다
   * @private
   */
  private emitProgress(message: string): void {
    this.onProgress?.(message);
  }
}

/**
 * 수강신청 본신청 클라이언트를 생성하는 팩토리 함수
 * @param {CourseRegistrationClientOptions} [options={}] - 초기화 옵션
 * @returns {CourseRegistrationClient} 본신청 클라이언트
 */
export function createCourseRegistrationClient(
  options: CourseRegistrationClientOptions = {}
): CourseRegistrationClient {
  return new CourseRegistrationClient(options);
}

// ---------------------------------------------------------------------------
// private module helpers
// ---------------------------------------------------------------------------

function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = url.pathname.replace(/\/?$/, "/");
  return url.toString();
}

/** 네트워크 오류 등 raw SSV 가 없을 때 빈 mutation 결과 생성 */
function createEmptyMutationResult(
  options: Pick<CourseRegMutationOptions, "subjtCd" | "corseDvclsNo">,
  extra: { message: string; errorType?: CourseRegErrorType }
): CourseRegMutationResult {
  return {
    success: false,
    message: extra.message,
    errorType: extra.errorType,
    action: "register",
    subjtCd: options.subjtCd,
    corseDvclsNo: options.corseDvclsNo,
    raw: { encoding: "utf-8", params: {}, datasets: [], raw: "" }
  };
}

function dedupeSubjects(subjects: SugangSubject[]): SugangSubject[] {
  const map = new Map<string, SugangSubject>();
  for (const subject of subjects) {
    const key = `${subject.subjtCd}::${subject.corseDvclsNo}`;
    if (!map.has(key)) map.set(key, subject);
  }
  return [...map.values()];
}

function dedupeRegistered(subjects: CourseRegRegisteredSubject[]): CourseRegRegisteredSubject[] {
  const map = new Map<string, CourseRegRegisteredSubject>();
  for (const subject of subjects) {
    const key = `${subject.subjtCd}::${subject.corseDvclsNo}`;
    if (!map.has(key)) map.set(key, subject);
  }
  return [...map.values()];
}

function isRetryableNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code && RETRYABLE_CODES.has(code)) return true;
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("timeout") ||
    message.includes("network error")
  );
}

/**
 * 연속 재시도 모드에서 재시도할 수 있는 mutation 오류인지 판별한다.
 * 정원 초과·네트워크 오류만 재시도. 학점초과/이미신청 등은 즉시 중단.
 */
function isRetryableMutationError(result: CourseRegMutationResult): boolean {
  if (result.success) return false;
  const type = result.errorType;
  if (!type) {
    // errorType 없으면 메시지 휴리스틱
    const msg = (result.errorMsg || result.message || "").toLowerCase();
    return (
      msg.includes("정원") ||
      msg.includes("인원") ||
      msg.includes("연결") ||
      msg.includes("timeout") ||
      msg.includes("시간 초과")
    );
  }
  return (
    type === CourseRegErrorType.CAPACITY_EXCEEDED ||
    type === CourseRegErrorType.CONNECTION_TIMEOUT ||
    type === CourseRegErrorType.CONNECTION_RESET ||
    type === CourseRegErrorType.REQUEST_TIMEOUT ||
    type === CourseRegErrorType.UNKNOWN // 서버 과부하성 미분류 오류 재시도
  );
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const maybe = error as { code?: string; cause?: { code?: string } };
  return String(maybe.code || maybe.cause?.code || "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

function normalizeNetworkError(error: unknown): Error {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  if (code === "ECONNRESET" || message.toLowerCase().includes("econnreset")) {
    return new Error(
      "수강신청 서버 연결이 중간에 끊겼습니다(ECONNRESET). 네트워크 상태를 확인한 뒤 다시 시도하세요."
    );
  }
  if (code === "ETIMEDOUT" || message.toLowerCase().includes("timeout")) {
    return new Error(
      "수강신청 서버 응답 시간이 초과되었습니다. 수강신청 시간대 서버 과부하일 수 있습니다."
    );
  }
  if (error instanceof Error) return error;
  return new Error(message || "수강신청 요청 중 알 수 없는 오류가 발생했습니다.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
