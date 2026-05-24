import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import {
  absoluteUrl,
  escapeRegExp,
  normalizeSpace,
  parseFormBody,
  parseFunctionArguments,
  splitHttpMessage
} from "./utils.js";

import util from "node:util";
import fs from "node:fs";
import path from "node:path";
import type { AxiosInstance } from "axios";

/** e-러닝 학습 진행 상태를 나타내는 코드 집합 */
export type EcampusLessonStudyStatus = "STUDY" | "COMPLETE" | string;

/** e-campus 서버로의 데이터 전송을 위한 표준 POST 구조 */
export interface EcampusLessonPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

/** 데이터 조회를 위한 표준 GET 구조 */
export interface EcampusLessonGetRequest {
  method: "GET";
  url: string;
  query: Record<string, string>;
}

/** 개별 온라인 강의(차시)에 대한 정밀 메타데이터 */
export interface EcampusLessonItem {
  /** 주차별 묶음 식별자 */
  lessonScheduleId: string;
  /** 콘텐츠 고유 식별자 */
  lessonCntsId: string;
  /** 강의 제목 */
  title: string;
  /** 강의 유형 (동영상, 과제 등) */
  typeLabel?: string;
  /** 정규 수강 기간 */
  period?: string;
  /** 지각 수강 허용 기간 */
  extraPeriod?: string;
  /** 재생 시간 텍스트 (예: 25분 30초) */
  durationText?: string;
  /** 재생 시간 총 초 단위 수치 */
  durationSeconds?: number;
  /** 출결 상태 문구 */
  attendanceStatus?: string;
  /** 강의 시작 일시 */
  lessonStartDttm?: string;
  /** 상세 진입을 위한 사전 구성 요청 정보 */
  viewRequest: EcampusLessonPostRequest;
  /** 시청 창 오픈을 위한 사전 구성 요청 정보 */
  studyWindowRequest: EcampusLessonPostRequest;
}

/** 주차별로 그룹화된 강의 정보 구조 */
export interface EcampusLessonSchedule {
  lessonScheduleId: string;
  title: string;
  period?: string;
  summary?: string;
  lessons: EcampusLessonItem[];
}

/** 동영상 시청 창에서 추출된 실시간 세션 메타데이터 */
export interface EcampusLessonStudyWindow {
  crsCreCd: string;
  lessonCntsId: string;
  /** 사용자 식별용 고유 번호 */
  stdNo?: string;
  /** 서버 측 세션 추적용 고유 ID (학습 기록 전송 시 필수) */
  studyDetailId?: string;
  /** 현재 서버에 기록된 학습 상태 */
  currentStudyStatusCd?: EcampusLessonStudyStatus;
  /** 실제 영상/콘텐츠가 호스팅된 주소 */
  contentUrl?: string;
  /** 콘텐츠 기술 방식 분류 */
  contentKind: "mp4" | "hls" | "youtube" | "ted" | "doczoom" | "url" | "unknown";
  /** 학습 기록 전송을 위해 미리 구성된 GET 요청 정보 */
  recordRequest?: EcampusLessonGetRequest;
}

/** 학습 기록 생성을 위한 가변적인 입력 데이터 조각 */
export interface EcampusStudyRecordSnapshotInput {
  baseUrl?: string;
  crsCreCd?: string;
  lessonCntsId?: string;
  contentUrl?: string;
  contentKind?: EcampusLessonStudyWindow["contentKind"];
  lessonScheduleId?: string;
  stdNo?: string;
  studyDetailId?: string;
  studyStatusCd?: EcampusLessonStudyStatus;
  studyTotalTm?: number | string;
  studyAfterTm?: number | string;
  studySessionLoc?: number | string;
  studyMaxLoc?: number | string;
  playerTm?: number | string;
  progressTm?: number | string;
}

/** 특정 시점의 학습 상태를 보존하고 재현하기 위한 스냅샷 */
export interface EcampusStudyRecordSnapshot {
  baseUrl: string;
  lessonScheduleId?: string;
  lessonCntsId: string;
  crsCreCd: string;
  stdNo?: string;
  studyDetailId?: string;
  currentStudyStatusCd?: EcampusLessonStudyStatus;
  contentUrl?: string;
  contentKind: EcampusLessonStudyWindow["contentKind"];
  recordRequest?: EcampusLessonGetRequest;
}

/** 학습 기록 서버 동기화를 위한 정규화된 옵션 */
export interface EcampusLessonRecordOptions {
  crsCreCd: string;
  lessonCntsId: string;
  stdNo: string;
  studyDetailId?: string;
  /** 누적 학습 시간(초) */
  studyTotalTm?: number | string;
  /** 세션 내 추가 학습 시간 */
  studyAfterTm?: number | string;
  studyStatusCd?: EcampusLessonStudyStatus;
  /** 마지막 재생 위치 */
  studySessionLoc?: number | string;
  /** 최대 재생 위치 */
  studyMaxLoc?: number | string;
  /** 플레이어 현재 시각 */
  playerTm?: number | string;
  /** 실제 진행 시간 */
  progressTm?: number | string;
}

/** 강의 목록 파싱 시 컨텍스트 유지를 위한 옵션 */
export interface EcampusLessonParseOptions {
  baseUrl?: string;
  crsCreCd?: string;
  progressTypeCd?: string;
}

/** 자동화 요청 세트 구성을 위한 입력 옵션 */
export interface EcampusLessonRequestBundleOptions extends EcampusStudyRecordSnapshotInput {
  baseUrl?: string;
  progressTypeCd?: string;
}

/** 특정 강의에 대한 모든 네트워크 상호작용 정보의 집합 */
export interface EcampusLessonRequestBundle {
  viewRequest: EcampusLessonPostRequest;
  studyWindowRequest: EcampusLessonPostRequest;
  recordRequest?: EcampusLessonGetRequest;
  snapshot: EcampusStudyRecordSnapshot;
}

/** 스트리밍 주소 분석 결과 객체 */
export interface ElearningMp4UrlResult {
  success: boolean;
  mp4Url?: string;
  message?: string;
  debugInfo?: {
    crsCreCd: string;
    lessonCntsId: string;
    contentUrl?: string;
    contentKind?: string;
    htmlSnippets?: string[];
    [key: string]: any;
  };
}

/** 파일 다운로드 수행 결과 정보 */
export interface ElearningDownloadResult {
  success: boolean;
  filePath?: string;
  message?: string;
}

/** 로컬 패킷 분석을 위한 세션 레코드 인터페이스 */
interface RawHttpSession {
  request: {
    method: string;
    url: string;
    body: Record<string, string>;
  };
  responseBody: string;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const DEFAULT_PROGRESS_TYPE_CD = "WEEK";
const LESSON_VIEW_PATH = "/lesson/lessonLect/Form/mainLesson";
const LESSON_WINDOW_PATH = "/lesson/lessonOpen/lessonNewWindow";
const ADD_STUDY_RECORD_PATH = "/lesson/lessonHome/addStudyRecord";
const VIEW_STUDY_DETAIL_PATH = "/lesson/lessonLect/viewLessonStudyDetail";
const VIEW_LESSON_CMNT_PATH = "/lesson/lessonLect/viewLessonCmnt";
const EXIT_STUDY_PATH = "/lesson/lessonPop/Form/exitStudy";

/**
 * e-learning 학습 세션 라이프사이클을 관리하는 핵심 클래스.
 * 정밀한 시퀀스 제어와 가변 딜레이를 통해 봇 탐지를 회피하고 학습 이력을 적재한다.
 */
export class ElearningSession {
  private studyDetailId: string | null = null;
  private totalStudyTime: number = 0;
  private progressPercent: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isWatching = false;

  /**
   * 학습 세션을 구성한다.
   * @param {AxiosInstance} http - 인증된 HTTP 클라이언트
   * @param {string} baseUrl - LMS 도메인
   * @param {string} lessonCntsId - 대상 콘텐츠 ID
   * @param {string} crsCreCd - 대상 강의실 ID
   * @param {string} stdNo - 사용자 식별자 (학번 기반 패킷 데이터)
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly baseUrl: string,
    private readonly lessonCntsId: string,
    private readonly crsCreCd: string,
    private readonly stdNo: string
  ) {}

  /**
   * 서버 측 시퀀스를 하나씩 실행하여 실제 학습 중인 상태로 전환한다.
   */
  async startWatchingLesson(): Promise<void> {
    if (this.isWatching) return;
    console.log(`[ElearningSession] 🎬 ${this.lessonCntsId} 자연스러운 학습 시작`);

    // 1. 재생 환경 초기화
    await this.openLessonWindow();

    // 2. 콘텐츠 데이터 매핑 확인
    await this.enterLessonContent();

    // 3. 최초 학습 이력 생성 및 세션 키(studyDetailId) 확보
    await this.initializeStudyRecord();

    // 4. 인간적인 시청 패턴을 모사한 주기적 기록 갱신 모드 진입
    this.startPeriodicStudyRecord();

    this.isWatching = true;
  }

  /** 재생 창 활성화 요청 */
  private async openLessonWindow() {
    await this.http.get(LESSON_WINDOW_PATH, {
      params: { crsCreCd: this.crsCreCd }
    });
    console.log("[ElearningSession] ✅ lessonNewWindow 호출 완료");
  }

  /** 콘텐츠 시청 상태 진입 통보 */
  private async enterLessonContent() {
    const params = new URLSearchParams({
      lessonCntsId: this.lessonCntsId,
      progressTypeCd: DEFAULT_PROGRESS_TYPE_CD,
      stdNo: this.stdNo,
      crsCreCd: this.crsCreCd
    });
    await this.http.post(VIEW_LESSON_CMNT_PATH, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    console.log("[ElearningSession] ✅ viewLessonCmnt (콘텐츠 진입)");
  }

  /** 초기 세션 데이터를 생성하고 추적용 ID를 저장한다 */
  private async initializeStudyRecord() {
    const initialTm = 60; // 시작 시 1분 학습 데이터 선적재
    const res = await this.callAddStudyRecord(initialTm);

    let data = res;
    if (typeof data === "string" && data.trim().startsWith("{")) {
      try {
        data = JSON.parse(data);
      } catch {}
    }

    if (data?.returnVO?.studyDetailId) {
      this.studyDetailId = data.returnVO.studyDetailId;
      this.totalStudyTime = initialTm;
      console.log(`[ElearningSession] ✅ studyDetailId 생성: ${this.studyDetailId}`);
    } else {
      console.warn("[ElearningSession] ⚠️ studyDetailId 확보 실패: 기록 누락 우려");
    }
  }

  /** 서버로 단일 학습 기록을 전송하고 결과(진행률)를 동기화한다 */
  private async callAddStudyRecord(studyTotalTm: number) {
    const query = {
      lessonCntsId: this.lessonCntsId,
      stdNo: this.stdNo,
      studyDetailId: this.studyDetailId || "",
      studyTotalTm: studyTotalTm.toString(),
      studyAfterTm: "0",
      studyStatusCd: "STUDY",
      crsCreCd: this.crsCreCd
    };
    const response = await this.http.get(ADD_STUDY_RECORD_PATH, {
      params: query,
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    let data = response.data;
    if (typeof data === "string" && data.trim().startsWith("{")) {
      try {
        data = JSON.parse(data);
      } catch {}
    }

    // 서버 응답 본문에서 진행률(%) 추출
    const rawRatio = data?.returnVO?.prgrRatio ?? data?.prgrRatio;
    if (rawRatio !== undefined && rawRatio !== null) {
      const parsedRatio = Number(rawRatio);
      if (!isNaN(parsedRatio)) {
        this.progressPercent = parsedRatio;
      }
    }

    return data;
  }

  /** 45~75초 사이의 유동적인 딜레이를 적용하여 로그를 반복 적재한다 */
  private startPeriodicStudyRecord() {
    const sendNext = async () => {
      if (!this.isWatching) return;

      const randomDelay = 45000 + Math.random() * 30000;
      this.totalStudyTime += 60;

      console.log(`[ElearningSession] ⏰ addStudyRecord 호출 → 누적 ${this.totalStudyTime}초`);
      await this.callAddStudyRecord(this.totalStudyTime);

      // 세션 정합성을 위해 학습 상세 조회를 병행 호출 (패킷 모사)
      await this.verifyStudyDetail();

      this.intervalId = setTimeout(sendNext, randomDelay);
    };

    // 첫 전송을 가변적으로 배치하여 정형화된 패턴 탈피
    this.intervalId = setTimeout(sendNext, 25000 + Math.random() * 10000);
  }

  /** 학습 상세 정보 조회 (패킷 정합성 유지용) */
  private async verifyStudyDetail() {
    const params = new URLSearchParams({
      lessonCntsId: this.lessonCntsId,
      prgrRatioTypeCd: "STUDY_TOTAL_TM",
      stdNo: this.stdNo,
      crsCreCd: this.crsCreCd,
      pageIndex: "1",
      listScale: "10"
    });
    await this.http.post(VIEW_STUDY_DETAIL_PATH, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    console.log("[ElearningSession] ✅ viewLessonStudyDetail (학습 이력 확인)");
  }

  /** 학습 세션을 종료하고 서버에 창 닫기 패킷(exitStudy)을 전송한다 */
  async stopWatchingLesson(): Promise<void> {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    if (!this.isWatching) return;

    try {
      const params = new URLSearchParams({
        lessonCntsId: this.lessonCntsId,
        seekFile: "",
        downloadYn: "",
        progressTypeCd: DEFAULT_PROGRESS_TYPE_CD
      });
      await this.http.post(EXIT_STUDY_PATH, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      console.log(
        `[ElearningSession] 🛑 학습 종료 패킷(exitStudy) 전송 완료 (총 ${this.totalStudyTime}초)`
      );
    } catch (error) {
      console.error(
        "[ElearningSession] ⚠️ 종료 패킷 전송 오류:",
        error instanceof Error ? error.message : error
      );
    } finally {
      this.isWatching = false;
    }
  }

  /** @returns {number} 서버 측에 반영된 최종 진행률(%) */
  getProgressPercent() {
    return this.progressPercent;
  }
}

/** 학습 세션 생성 및 즉시 시작 팩토리 */
export async function watchLesson(
  http: AxiosInstance,
  baseUrl: string,
  lessonCntsId: string,
  crsCreCd: string,
  stdNo: string
): Promise<ElearningSession> {
  const session = new ElearningSession(http, baseUrl, lessonCntsId, crsCreCd, stdNo);
  await session.startWatchingLesson();
  return session;
}

/** HTML 목록에서 주차별 강의 구조 분석 */
export function parseEcampusLessonSchedulesHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  const $ = cheerio.load(html);
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const crsCreCd =
    options.crsCreCd ??
    extractFirstValue(html, /crsCreCd["']?\s*(?:value=|:)\s*["']([^"']+)/) ??
    "";
  const schedules: EcampusLessonSchedule[] = [];

  $(".title.header[id^='dropdown_']").each((_, element) => {
    const header = $(element);
    const lessonScheduleId = (header.attr("id") ?? "").replace(/^dropdown_/, "");
    const content = $(`#${escapeCssId(lessonScheduleId)}`);

    if (!lessonScheduleId || content.length === 0) return;

    const schedule: EcampusLessonSchedule = {
      lessonScheduleId,
      title: normalizeSpace(header.find("section").first().text()),
      period: extractLabeledText(header.text(), "기간"),
      summary: extractLabeledText(header.text(), "수업내용"),
      lessons: []
    };

    content.find(".card").each((__, cardElement) => {
      const card = $(cardElement);
      const href = card.find("a.header").first().attr("href") ?? "";
      const buttonOnclick = card.find("button[onclick]").first().attr("onclick") ?? "";
      const viewArgs = parseFunctionArguments(href);
      const buttonArgs = parseFunctionArguments(buttonOnclick);
      const lessonCntsId = viewArgs[1] ?? buttonArgs[0] ?? "";

      if (!lessonCntsId) return;

      const text = normalizeSpace(card.text());
      const durationText = extractDurationText(text);
      const item: EcampusLessonItem = {
        lessonScheduleId,
        lessonCntsId,
        title: normalizeSpace(card.find("a.header").first().text()),
        durationText,
        durationSeconds: parseDurationSeconds(durationText),
        viewRequest: createLessonViewRequest(baseUrl, crsCreCd, lessonScheduleId, lessonCntsId),
        studyWindowRequest: createLessonStudyWindowRequest(baseUrl, crsCreCd, lessonCntsId)
      };

      schedule.lessons.push(item);
    });

    schedules.push(schedule);
  });

  return schedules;
}

/** HTML 차시 목록을 평탄화된 배열로 추출 */
export function parseEcampusLessonListHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesHtml(html, options).flatMap((s) => s.lessons);
}

/** SAZ 패킷에서 주차별 강의 구조를 복원 */
export function parseEcampusLessonSchedulesFromSaz(
  saz: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  for (const session of parseSazHttpSessions(saz)) {
    const html = session.responseBody;
    if (!html.includes("dropdown_") || !html.includes("lessonCntsId")) continue;

    const schedules = parseEcampusLessonSchedulesHtml(html, options);
    if (schedules.length > 0) return schedules;
  }

  return [];
}

/** SAZ 패킷에서 평탄화된 강의 목록을 복원 */
export function parseEcampusLessonListFromSaz(
  saz: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesFromSaz(saz, options).flatMap((s) => s.lessons);
}

/** 시청 창 HTML에서 핵심 메타데이터 추출 */
export function parseEcampusLessonStudyWindowHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonStudyWindow {
  const $ = cheerio.load(html);
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const contentUrl = extractFirstValue(html, /var\s+cntsUrl\s*=\s*"([^*]*)"/);
  const crsCreCd = options.crsCreCd ?? extractFirstValue(html, /"crsCreCd"\s*:\s*"([^"]+)"/) ?? "";
  const lessonCntsId = extractFirstValue(html, /"lessonCntsId"\s*:\s*"([^"]+)"/) ?? "";

  return {
    crsCreCd,
    lessonCntsId,
    contentUrl,
    contentKind: classifyContentUrl(contentUrl),
    studyDetailId:
      $("#studyDetailId").attr("value") ||
      extractFirstValue(html, /studyDetailId["']?\s*:\s*["']([^"']+)/)
  };
}

/** SAZ 패킷에서 강의 재생 창과 학습 기록 요청 정보를 추출 */
export function parseEcampusLessonStudyWindowsFromSaz(
  saz: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonStudyWindow[] {
  const sessions = parseSazHttpSessions(saz);
  const recordRequests = sessions
    .filter((session) => session.request.url.includes(ADD_STUDY_RECORD_PATH))
    .map((session) => ({
      method: "GET" as const,
      url: stripQuery(session.request.url),
      query: readQuery(session.request.url)
    }));

  return sessions
    .filter((session) => {
      const html = session.responseBody;
      return (
        html.includes("lessonCntsId") &&
        (html.includes("cntsUrl") || html.includes("studyDetailId"))
      );
    })
    .map((session) => {
      const window = parseEcampusLessonStudyWindowHtml(session.responseBody, options);
      const recordRequest = recordRequests.find(
        (request) => request.query.lessonCntsId === window.lessonCntsId
      );

      if (recordRequest) {
        window.recordRequest = recordRequest;
        window.stdNo = recordRequest.query.stdNo;
        window.studyDetailId = window.studyDetailId ?? recordRequest.query.studyDetailId;
        window.currentStudyStatusCd = recordRequest.query.studyStatusCd;
      }

      return window;
    })
    .filter((window) => window.lessonCntsId);
}

/** 학습 창 정보에서 재사용 가능한 학습 기록 스냅샷 생성 */
export function parseStudyRecordSnapshot(
  input: EcampusLessonStudyWindow | EcampusStudyRecordSnapshotInput
): EcampusStudyRecordSnapshot {
  const snapshotInput = input as EcampusStudyRecordSnapshotInput &
    Partial<EcampusLessonStudyWindow>;
  const baseUrl = snapshotInput.baseUrl ?? DEFAULT_BASE_URL;
  const lessonCntsId = input.lessonCntsId ?? "";
  const crsCreCd = input.crsCreCd ?? "";
  const stdNo = input.stdNo;
  const studyDetailId = input.studyDetailId;
  const studyStatusCd =
    "currentStudyStatusCd" in input ? input.currentStudyStatusCd : snapshotInput.studyStatusCd;

  const recordRequest =
    "recordRequest" in input && input.recordRequest
      ? input.recordRequest
      : stdNo
        ? createStudyRecordRequest(baseUrl, {
            crsCreCd,
            lessonCntsId,
            stdNo,
            studyDetailId,
            studyStatusCd,
            studyTotalTm: snapshotInput.studyTotalTm,
            studyAfterTm: snapshotInput.studyAfterTm,
            studySessionLoc: snapshotInput.studySessionLoc,
            studyMaxLoc: snapshotInput.studyMaxLoc,
            playerTm: snapshotInput.playerTm,
            progressTm: snapshotInput.progressTm
          })
        : undefined;

  return {
    baseUrl,
    lessonScheduleId: snapshotInput.lessonScheduleId,
    lessonCntsId,
    crsCreCd,
    stdNo,
    studyDetailId,
    currentStudyStatusCd: studyStatusCd,
    contentUrl: input.contentUrl,
    contentKind: input.contentKind ?? "unknown",
    recordRequest
  };
}

/** lesson 객체 하나로 진입, 재생 창, 학습 기록 요청을 묶는다 */
export function createEcampusLessonRequestBundle(
  lesson: EcampusLessonItem,
  options: EcampusLessonRequestBundleOptions = {}
): EcampusLessonRequestBundle {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const crsCreCd = options.crsCreCd ?? "";
  const snapshot = parseStudyRecordSnapshot({
    ...options,
    baseUrl,
    crsCreCd,
    lessonScheduleId: lesson.lessonScheduleId,
    lessonCntsId: lesson.lessonCntsId
  });

  return {
    viewRequest: createLessonViewRequest(
      baseUrl,
      crsCreCd,
      lesson.lessonScheduleId,
      lesson.lessonCntsId
    ),
    studyWindowRequest: createLessonStudyWindowRequest(baseUrl, crsCreCd, lesson.lessonCntsId),
    recordRequest: snapshot.recordRequest,
    snapshot
  };
}

/** 강의 정보를 JSON으로 직렬화 */
export function stringifyEcampusLessons(
  lessons: EcampusLessonItem[] | EcampusLessonSchedule[]
): string {
  return JSON.stringify(lessons, null, 2);
}

/** 강의 진입용 POST 객체 생성 */
export function createLessonViewRequest(
  baseUrl: string,
  crsCreCd: string,
  lessonScheduleId: string,
  lessonCntsId: string
): EcampusLessonPostRequest {
  return {
    method: "POST",
    url: absoluteUrl(LESSON_VIEW_PATH, baseUrl),
    body: {
      crsCreCd,
      lessonScheduleId,
      crsOperTypeCd: "",
      progressTypeCd: DEFAULT_PROGRESS_TYPE_CD,
      lessonCntsId,
      goUrl: "",
      subParam: ""
    }
  };
}

/** 재생 창 로드용 POST 객체 생성 */
export function createLessonStudyWindowRequest(
  baseUrl: string,
  crsCreCd: string,
  lessonCntsId: string
): EcampusLessonPostRequest {
  return {
    method: "POST",
    url: absoluteUrl(`${LESSON_WINDOW_PATH}?crsCreCd=${encodeURIComponent(crsCreCd)}`, baseUrl),
    body: { lessonCntsId, seekFile: "", downloadYn: "", progressTypeCd: DEFAULT_PROGRESS_TYPE_CD }
  };
}

/** 학습 기록용 GET 객체 생성 */
export function createStudyRecordRequest(
  baseUrl: string,
  options: EcampusLessonRecordOptions
): EcampusLessonGetRequest {
  const query = {
    lessonCntsId: options.lessonCntsId,
    stdNo: options.stdNo,
    studyDetailId: options.studyDetailId || "",
    studyTotalTm: String(options.studyTotalTm ?? 0),
    studyAfterTm: String(options.studyAfterTm ?? 0),
    studyStatusCd: options.studyStatusCd ?? "STUDY",
    crsCreCd: options.crsCreCd
  };
  return { method: "GET", url: absoluteUrl(ADD_STUDY_RECORD_PATH, baseUrl), query };
}

/** 학습 이력 확인용 GET 객체 생성 */
export function createViewLessonStudyDetailRequest(
  baseUrl: string,
  lessonCntsId: string,
  crsCreCd: string
): EcampusLessonGetRequest {
  return {
    method: "GET",
    url: absoluteUrl(VIEW_STUDY_DETAIL_PATH, baseUrl),
    query: { lessonCntsId, crsCreCd }
  };
}

/** 콘텐츠 URL을 분석하여 미디어 타입 분류 */
function classifyContentUrl(
  contentUrl: string | undefined
): EcampusLessonStudyWindow["contentKind"] {
  if (!contentUrl) return "unknown";
  const lower = contentUrl.toLowerCase();
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".m3u8")) return "hls";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("ted.com")) return "ted";
  if (lower.includes("doczoom")) return "doczoom";
  return "url";
}

/** 텍스트 정규식 도우미 */
function extractFirstValue(source: string, pattern: RegExp): string | undefined {
  return source.match(pattern)?.[1];
}

function parseSazHttpSessions(saz: Buffer | Uint8Array): RawHttpSession[] {
  const zip = new AdmZip(Buffer.from(saz));
  const parts = new Map<string, { request?: string; response?: string }>();

  for (const entry of zip.getEntries()) {
    const match = entry.entryName.match(/raw[/\\](\d+)_(c|s)\.txt$/i);
    if (!match?.[1] || !match[2]) continue;

    const part = parts.get(match[1]) ?? {};
    if (match[2].toLowerCase() === "c") part.request = entry.getData().toString("utf8");
    else part.response = entry.getData().toString("utf8");
    parts.set(match[1], part);
  }

  return [...parts.values()].flatMap((part) => {
    if (!part.request || !part.response) return [];

    const [requestHead, requestBody] = splitHttpMessage(part.request);
    const [, responseBody] = splitHttpMessage(part.response);
    const request = parseRawHttpRequest(requestHead, requestBody);
    if (!request) return [];

    return [{ request, responseBody }];
  });
}

function parseRawHttpRequest(head: string, body: string): RawHttpSession["request"] | undefined {
  const lines = head.split(/\r?\n/);
  const requestLine = lines[0];
  if (!requestLine) return undefined;

  const [method = "GET", target = ""] = requestLine.split(/\s+/);
  const headers = new Map<string, string>();

  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    headers.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }

  const host = headers.get("host") ?? new URL(DEFAULT_BASE_URL).host;
  const url = target.startsWith("http") ? target : `https://${host}${target}`;
  const parsedBody = method.toUpperCase() === "POST" ? parseFormBody(body) : {};

  return { method, url, body: parsedBody };
}

function stripQuery(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
}

function readQuery(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(url).searchParams) {
    result[key] = value;
  }
  return result;
}

/** 라벨 기반 텍스트 추출 */
function extractLabeledText(text: string, label: string): string | undefined {
  const norm = normalizeSpace(text);
  const labels = ["기간 외 학습기간", "기간", "수업내용", "강의시간", "출결상태"];
  const other = labels
    .filter((c) => c !== label)
    .map(escapeRegExp)
    .join("|");
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*(.*?)(?=\\s*(?:${other})\\s*|$)`);
  return norm.match(pattern)?.[1]?.trim() || undefined;
}

/** 강의 시간 텍스트 추출 */
function extractDurationText(text: string): string | undefined {
  return text
    .match(/강의시간\s*([0-9]+\s*분(?:\s*[0-9]+\s*초)?|[0-9]+\s*초)/)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
}

/** 시간 변환 도우미 */
function parseDurationSeconds(durationText: string | undefined): number | undefined {
  if (!durationText) return undefined;
  const m = Number(durationText.match(/(\d+)\s*분/)?.[1] ?? 0);
  const s = Number(durationText.match(/(\d+)\s*초/)?.[1] ?? 0);
  return m * 60 + s;
}

/** CSS 이스케이프 */
function escapeCssId(value: string): string {
  return value.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
}

/** 고도의 미디어 분석 엔진: 실제 스트리밍 주소 도출 */
export async function getElearningMp4Url(
  http: AxiosInstance,
  contentUrl: string | undefined,
  context: { crsCreCd: string; lessonCntsId: string }
): Promise<ElearningMp4UrlResult> {
  const { crsCreCd, lessonCntsId } = context;
  if (!contentUrl)
    return { success: false, message: "URL 유실", debugInfo: { crsCreCd, lessonCntsId } };

  try {
    const res = await http.get<string>(contentUrl);
    const html = res.data;
    const $ = cheerio.load(html);

    // 1. 소스 태그 우선
    let mp4Url =
      $('source[type="video/mp4"]').first()?.attr("src") || $("source#lessonVodSrc")?.attr("src");

    // 2. 내부 스토리지 정규식 패턴
    if (!mp4Url) {
      const match = html.match(
        /https:\/\/eplus\.seowon\.ac\.kr\/WebContentStorage\/[^"\s]+\.mp4\?tsdata=[^"\s]+/
      );
      if (match?.[0]) mp4Url = match[0];
    }

    // 3. Base64 설정값 파싱 Fallback
    const viewModel = html.match(/new VideoPlayerWidgetViewModel\('([^']+)'/);
    if (!mp4Url && viewModel?.[1]) {
      try {
        const json = Buffer.from(viewModel[1], "base64").toString("utf8");
        const parsed = JSON.parse(json);
        if (parsed?.videoUrl) mp4Url = parsed.videoUrl;
      } catch {}
    }

    if (mp4Url) return { success: true, mp4Url };
    return { success: false, message: "MP4 주소 도출 실패", debugInfo: { crsCreCd, lessonCntsId } };
  } catch (err: any) {
    return { success: false, message: err.message, debugInfo: { crsCreCd, lessonCntsId } };
  }
}

/** 고속 스트리밍 다운로드 구현 */
export async function downloadElearningMp4(
  http: AxiosInstance,
  mp4Url: string,
  courseTitle: string,
  lessonTitle: string,
  baseDir: string = "./downloads",
  progressCallback?: (p: { percent: number; loaded: number }) => void
): Promise<ElearningDownloadResult> {
  try {
    const sanitizedCourse = sanitizeFilename(courseTitle);
    const sanitizedLesson = sanitizeFilename(lessonTitle);
    const downloadPath = path.resolve(baseDir, sanitizedCourse);
    const filePath = path.resolve(downloadPath, `${sanitizedLesson}.mp4`);

    fs.mkdirSync(downloadPath, { recursive: true });

    // .env에서 I/O 튜닝을 위한 하이워터마크 확보
    const hwmConfig = process.env.DOWNLOAD_HIGH_WATER_MARK
      ? parseInt(process.env.DOWNLOAD_HIGH_WATER_MARK)
      : 1024;
    const hwmBytes = (isNaN(hwmConfig) ? 1024 : hwmConfig) * 1024;

    const res = await http.get(mp4Url, {
      responseType: "stream",
      onDownloadProgress: (ev) => {
        if (progressCallback && ev.total) {
          progressCallback({
            loaded: ev.loaded,
            percent: Math.round((ev.loaded / ev.total) * 100)
          });
        }
      }
    });

    const writer = fs.createWriteStream(filePath, { highWaterMark: hwmBytes });
    res.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve({ success: true, filePath }));
      writer.on("error", (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });
    });
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : util.inspect(err) };
  }
}

/** 파일 시스템 호환성을 위한 파일명 정제 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100);
}
