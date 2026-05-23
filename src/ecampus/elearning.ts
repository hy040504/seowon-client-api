import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import {
  absoluteUrl,
  escapeRegExp,
  normalizeSpace,
  parseFormBody,
  parseFunctionArguments,
  splitHttpMessage
} from "./utils";

import util from "node:util";
import fs from "node:fs";
import path from "node:path";
import type { AxiosInstance } from "axios";

/** 학습 진행 상태 코드 */
export type EcampusLessonStudyStatus = "STUDY" | "COMPLETE" | string;

/** e-campus API용 POST 요청 구조체 */
export interface EcampusLessonPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

/** e-campus API용 GET 요청 구조체 */
export interface EcampusLessonGetRequest {
  method: "GET";
  url: string;
  query: Record<string, string>;
}

/** 개별 강의(차시) 항목 정보 */
export interface EcampusLessonItem {
  lessonScheduleId: string;
  lessonCntsId: string;
  title: string;
  typeLabel?: string;
  period?: string;
  extraPeriod?: string;
  durationText?: string;
  durationSeconds?: number;
  attendanceStatus?: string;
  lessonStartDttm?: string;
  viewRequest: EcampusLessonPostRequest;
  studyWindowRequest: EcampusLessonPostRequest;
}

/** 주차별 강의 묶음 정보 */
export interface EcampusLessonSchedule {
  lessonScheduleId: string;
  title: string;
  period?: string;
  summary?: string;
  lessons: EcampusLessonItem[];
}

/** 강의 재생 창 메타데이터 */
export interface EcampusLessonStudyWindow {
  crsCreCd: string;
  lessonCntsId: string;
  stdNo?: string;
  studyDetailId?: string;
  currentStudyStatusCd?: EcampusLessonStudyStatus;
  contentUrl?: string;
  contentKind: "mp4" | "hls" | "youtube" | "ted" | "doczoom" | "url" | "unknown";
  recordRequest?: EcampusLessonGetRequest;
}

/** 학습 기록 생성을 위한 입력 스냅샷 */
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

/** 학습 기록 상태 보존용 스냅샷 */
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

/** 학습 기록 API 호출 옵션 */
export interface EcampusLessonRecordOptions {
  crsCreCd: string;
  lessonCntsId: string;
  stdNo: string;
  studyDetailId?: string;
  studyTotalTm?: number | string;
  studyAfterTm?: number | string;
  studyStatusCd?: EcampusLessonStudyStatus;
  studySessionLoc?: number | string;
  studyMaxLoc?: number | string;
  playerTm?: number | string;
  progressTm?: number | string;
}

/** 파싱 처리를 위한 컨텍스트 옵션 */
export interface EcampusLessonParseOptions {
  baseUrl?: string;
  crsCreCd?: string;
  progressTypeCd?: string;
}

/** 요청 묶음(번들) 생성을 위한 옵션 */
export interface EcampusLessonRequestBundleOptions extends EcampusStudyRecordSnapshotInput {
  baseUrl?: string;
  progressTypeCd?: string;
}

/** 특정 레슨에 대한 모든 네트워크 요청 정보 집합 */
export interface EcampusLessonRequestBundle {
  viewRequest: EcampusLessonPostRequest;
  studyWindowRequest: EcampusLessonPostRequest;
  recordRequest?: EcampusLessonGetRequest;
  snapshot: EcampusStudyRecordSnapshot;
}

/** MP4 URL 추출 결과 */
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

/** 파일 다운로드 결과 */
export interface ElearningDownloadResult {
  success: boolean;
  filePath?: string;
  message?: string;
}

/** SAZ 분석을 위한 원시 세션 데이터 */
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
 * e-learning 학습 세션을 관리하는 클래스.
 * Fiddler 패킷 분석을 통해 도출된 인증 시퀀스를 자동화한다.
 */
export class ElearningSession {
  private studyDetailId: string | null = null;
  private totalStudyTime: number = 0;
  private progressPercent: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isWatching = false;

  /**
   * 새로운 학습 세션을 초기화한다
   * @param {AxiosInstance} http - 인증된 통신을 위한 Axios 인스턴스
   * @param {string} baseUrl - e-campus 기본 도메인
   * @param {string} lessonCntsId - 콘텐츠 식별자
   * @param {string} crsCreCd - 강의실 식별자
   * @param {string} stdNo - 학번 기반 사용자 식별자
   */
  constructor(
    private readonly http: AxiosInstance,
    private readonly baseUrl: string,
    private readonly lessonCntsId: string,
    private readonly crsCreCd: string,
    private readonly stdNo: string
  ) {}

  /**
   * 실제 사용자의 시청 흐름을 모사하여 학습 인증을 시작한다
   * 시퀀스: lessonNewWindow(열기) -> viewLessonCmnt(진입) -> addStudyRecord(시작) -> 반복 기록
   * @returns {Promise<void>}
   */
  async startWatchingLesson(): Promise<void> {
    if (this.isWatching) return;
    console.log(`[ElearningSession] 🎬 ${this.lessonCntsId} 자연스러운 학습 시작`);

    // 1. 서버 측 재생 로그 기록 활성화를 위한 창 열기 요청
    await this.openLessonWindow();

    // 2. 실제 콘텐츠 뷰어 로드 및 로그 초기화
    await this.enterLessonContent();

    // 3. 최초 학습 이력(studyDetailId) 생성 및 누적 시간 초기화
    await this.initializeStudyRecord();

    // 4. 인간적인 시청 패턴 모사를 위한 가변 딜레이 반복 작업 시작
    this.startPeriodicStudyRecord();

    this.isWatching = true;
  }

  /**
   * 동영상 재생 창 열기 요청을 보낸다
   * @private
   */
  private async openLessonWindow() {
    await this.http.get(LESSON_WINDOW_PATH, {
      params: { crsCreCd: this.crsCreCd }
    });
    console.log("[ElearningSession] ✅ lessonNewWindow 호출 완료");
  }

  /**
   * 콘텐츠 진입 및 상세 로그 초기화 요청을 보낸다
   * @private
   */
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

  /**
   * 최초 1분 학습 로그를 전송하여 세션 고유 ID(studyDetailId)를 확보한다
   * @private
   */
  private async initializeStudyRecord() {
    const initialTm = 60;
    const res = await this.callAddStudyRecord(initialTm);
    
    // 서버가 JSON 객체 또는 JSON 문자열로 응답할 수 있으므로 유연하게 대응
    let data = res;
    if (typeof data === "string" && data.trim().startsWith("{")) {
      try { data = JSON.parse(data); } catch {}
    }

    if (data?.returnVO?.studyDetailId) {
      this.studyDetailId = data.returnVO.studyDetailId;
      this.totalStudyTime = initialTm;
      console.log(`[ElearningSession] ✅ studyDetailId 생성: ${this.studyDetailId}`);
    } else {
      console.warn("[ElearningSession] ⚠️ studyDetailId를 확보하지 못했습니다. 기록 누락 가능성이 있습니다.");
    }
  }

  /**
   * 학습 기록(시간, 진행률)을 서버로 전송한다
   * @param {number} studyTotalTm - 현재까지의 누적 학습 시간(초)
   * @returns {Promise<any>} 서버 응답 데이터
   * @private
   */
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
      try { data = JSON.parse(data); } catch {}
    }

    // 서버 응답에서 학습 진행률(%) 필드를 추출하여 상태 동기화
    const rawRatio = data?.returnVO?.prgrRatio ?? data?.prgrRatio;
    if (rawRatio !== undefined && rawRatio !== null) {
      const parsedRatio = Number(rawRatio);
      if (!isNaN(parsedRatio)) {
        this.progressPercent = parsedRatio;
      }
    }

    return data;
  }

  /**
   * 45~75초 사이의 랜덤한 주기로 학습 기록 전송을 반복한다.
   * 고정된 주기를 피함으로써 봇 탐지를 회피하고 실제 시청 환경을 모사한다.
   * @private
   */
  private startPeriodicStudyRecord() {
    const sendNext = async () => {
      if (!this.isWatching) return;

      const randomDelay = 45000 + Math.random() * 30000;
      this.totalStudyTime += 60; // 1분 단위 누적

      console.log(`[ElearningSession] ⏰ addStudyRecord 호출 → 누적 ${this.totalStudyTime}초`);
      await this.callAddStudyRecord(this.totalStudyTime);

      // 학습 이력 테이블이 정상 갱신되는지 확인하는 추가 호출
      await this.verifyStudyDetail();

      this.intervalId = setTimeout(sendNext, randomDelay);
    };

    // 첫 전송은 학습 시작 직후 약 30초 내외로 발생하도록 설정
    this.intervalId = setTimeout(sendNext, 25000 + Math.random() * 10000);
  }

  /**
   * 학습 이력 상세 조회 API를 호출하여 세션 정합성을 유지한다
   * @private
   */
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

  /**
   * 진행 중인 학습 세션을 중단하고 종료 패킷을 전송한다
   * @returns {Promise<void>}
   */
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
      // 브라우저 창을 닫을 때 발생하는 최종 종료 이벤트를 모사
      await this.http.post(EXIT_STUDY_PATH, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      console.log(`[ElearningSession] 🛑 학습 종료 패킷(exitStudy) 전송 완료 (총 ${this.totalStudyTime}초)`);
    } catch (error) {
      console.error("[ElearningSession] ⚠️ 종료 패킷 전송 중 오류 발생:", error instanceof Error ? error.message : error);
    } finally {
      this.isWatching = false;
    }
  }

  /** @returns {string | null} 현재 세션의 고유 학습 상세 ID */
  getStudyDetailId() { return this.studyDetailId; }

  /** @returns {number} 현재까지 서버에 반영된 실시간 진행률(%) */
  getProgressPercent() { return this.progressPercent; }
}

/**
 * 학습 세션을 생성하고 즉시 시작한다
 * @param {AxiosInstance} http - Axios 인스턴스
 * @param {string} baseUrl - 기본 URL
 * @param {string} lessonCntsId - 콘텐츠 ID
 * @param {string} crsCreCd - 강의실 ID
 * @param {string} stdNo - 학번
 * @returns {Promise<ElearningSession>} 활성화된 학습 세션 객체
 */
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

/**
 * 강의 목록 HTML에서 주차와 차시 구조를 추출한다
 * @param {string} html - 파싱할 HTML 본문
 * @param {EcampusLessonParseOptions} options - 파싱 옵션
 * @returns {EcampusLessonSchedule[]} 구조화된 주차별 강의 목록
 */
export function parseEcampusLessonSchedulesHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  const $ = cheerio.load(html);
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const crsCreCd = options.crsCreCd ?? extractFirstValue(html, /crsCreCd["']?\s*(?:value=|:)\s*["']([^"']+)/) ?? "";
  const progressTypeCd = options.progressTypeCd ?? extractFirstValue(html, /progressTypeCd["']?\s*(?:value=|:)\s*["']([^"']+)/) ?? DEFAULT_PROGRESS_TYPE_CD;
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
        typeLabel: normalizeSpace(card.find(".title-box label").first().text()) || undefined,
        period: extractLabeledText(text, "기간"),
        extraPeriod: extractLabeledText(text, "기간 외 학습기간"),
        durationText,
        durationSeconds: parseDurationSeconds(durationText),
        attendanceStatus: extractLabeledText(text, "출결상태"),
        lessonStartDttm: buttonArgs[2],
        viewRequest: createLessonViewRequest(baseUrl, crsCreCd, lessonScheduleId, lessonCntsId, progressTypeCd),
        studyWindowRequest: createLessonStudyWindowRequest(baseUrl, crsCreCd, lessonCntsId, progressTypeCd)
      };

      schedule.lessons.push(removeUndefinedValues(item));
    });

    schedules.push(schedule);
  });

  return schedules;
}

/**
 * 강의 목록 HTML에서 평탄화된 모든 차시 배열을 추출한다
 * @param {string} html - HTML 본문
 * @param {EcampusLessonParseOptions} options - 옵션
 * @returns {EcampusLessonItem[]} 차시 객체 배열
 */
export function parseEcampusLessonListHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesHtml(html, options).flatMap((schedule) => schedule.lessons);
}

/**
 * 재생 창 HTML에서 학습 정보 및 콘텐츠 URL을 추출한다
 * @param {string} html - HTML 본문
 * @param {EcampusLessonParseOptions} options - 옵션
 * @returns {EcampusLessonStudyWindow} 추출된 재생 창 메타데이터
 */
export function parseEcampusLessonStudyWindowHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonStudyWindow {
  const $ = cheerio.load(html);
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const crsCreCd = options.crsCreCd ?? extractFirstValue(html, /"crsCreCd"\s*:\s*"([^"]+)"/) ?? "";
  const lessonCntsId = extractFirstValue(html, /"lessonCntsId"\s*:\s*"([^"]+)"/) ?? "";
  const stdNo = extractFirstValue(html, /"stdNo"\s*:\s*"([^"]+)"/);
  const studyDetailId = $("#studyDetailId").attr("value") || extractFirstValue(html, /studyDetailId["']?\s*:\s*["']([^"']+)/);
  const currentStudyStatusCd = extractFirstValue(html, /curStudyStatusCd\s*=\s*"([^"]+)"/);
  const contentUrl = extractFirstValue(html, /var\s+cntsUrl\s*=\s*"([^*]*)"/);
  
  const recordRequest = crsCreCd && lessonCntsId && stdNo
    ? createStudyRecordRequest(baseUrl, {
        crsCreCd,
        lessonCntsId,
        stdNo,
        studyDetailId,
        studyTotalTm: extractFirstValue(html, /"studyTotalTm"\s*:\s*"([^"]*)"/) ?? "0",
        studyAfterTm: extractFirstValue(html, /"studyAfterTm"\s*:\s*"([^"]*)"/) ?? "0",
        studyStatusCd: currentStudyStatusCd ?? "STUDY"
      })
    : undefined;

  return removeUndefinedValues({
    crsCreCd,
    lessonCntsId,
    stdNo,
    studyDetailId,
    currentStudyStatusCd,
    contentUrl,
    contentKind: classifyContentUrl(contentUrl),
    recordRequest
  });
}

/**
 * 입력된 데이터로부터 학습 기록을 위한 표준 스냅샷을 생성한다
 * @param {EcampusStudyRecordSnapshotInput | EcampusLessonStudyWindow} input - 원본 데이터
 * @returns {EcampusStudyRecordSnapshot} 정규화된 스냅샷
 */
export function parseStudyRecordSnapshot(
  input: EcampusStudyRecordSnapshotInput | EcampusLessonStudyWindow
): EcampusStudyRecordSnapshot {
  const baseUrl = "baseUrl" in input && input.baseUrl ? input.baseUrl : DEFAULT_BASE_URL;
  const currentStudyStatusCd = "currentStudyStatusCd" in input ? input.currentStudyStatusCd : ("studyStatusCd" in input ? input.studyStatusCd : undefined);
  const contentUrl = "contentUrl" in input ? input.contentUrl : undefined;
  const contentKind = ("contentKind" in input && input.contentKind) || classifyContentUrl(contentUrl);
  
  const snapshot: EcampusStudyRecordSnapshot = {
    baseUrl,
    lessonScheduleId: "lessonScheduleId" in input ? input.lessonScheduleId : undefined,
    lessonCntsId: input.lessonCntsId ?? "",
    crsCreCd: input.crsCreCd ?? "",
    stdNo: input.stdNo,
    studyDetailId: input.studyDetailId,
    currentStudyStatusCd,
    contentUrl,
    contentKind
  };

  if (snapshot.crsCreCd && snapshot.lessonCntsId && snapshot.stdNo) {
    snapshot.recordRequest = createStudyRecordRequest(baseUrl, {
      crsCreCd: snapshot.crsCreCd,
      lessonCntsId: snapshot.lessonCntsId,
      stdNo: snapshot.stdNo,
      studyDetailId: snapshot.studyDetailId,
      studyTotalTm: "studyTotalTm" in input ? input.studyTotalTm : "0",
      studyAfterTm: "studyAfterTm" in input ? input.studyAfterTm : "0",
      studyStatusCd: currentStudyStatusCd ?? "STUDY",
      studySessionLoc: "studySessionLoc" in input ? input.studySessionLoc : undefined,
      studyMaxLoc: "studyMaxLoc" in input ? input.studyMaxLoc : undefined,
      playerTm: "playerTm" in input ? input.playerTm : undefined,
      progressTm: "progressTm" in input ? input.progressTm : undefined
    });
  }

  return snapshot;
}

/**
 * 레슨 정보와 사용자 컨텍스트를 결합하여 필요한 모든 요청 번들을 생성한다
 * @param {EcampusLessonItem} lesson - 파싱된 레슨 객체
 * @param {EcampusLessonRequestBundleOptions} options - 사용자 요청 옵션
 * @returns {EcampusLessonRequestBundle} 요청 번들 객체
 */
export function createEcampusLessonRequestBundle(
  lesson: EcampusLessonItem,
  options: EcampusLessonRequestBundleOptions
): EcampusLessonRequestBundle {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const snapshot = parseStudyRecordSnapshot({
    baseUrl,
    lessonScheduleId: lesson.lessonScheduleId,
    lessonCntsId: lesson.lessonCntsId,
    crsCreCd: options.crsCreCd,
    stdNo: options.stdNo,
    studyDetailId: options.studyDetailId,
    studyStatusCd: options.studyStatusCd,
    studyTotalTm: options.studyTotalTm,
    studyAfterTm: options.studyAfterTm,
    studySessionLoc: options.studySessionLoc,
    studyMaxLoc: options.studyMaxLoc,
    playerTm: options.playerTm,
    progressTm: options.progressTm,
    contentUrl: options.contentUrl,
    contentKind: options.contentKind
  });

  return {
    viewRequest: lesson.viewRequest,
    studyWindowRequest: lesson.studyWindowRequest,
    recordRequest: snapshot.recordRequest,
    snapshot
  };
}

/**
 * Fiddler SAZ 파일에서 주차별 강의 목록을 복원한다
 * @param {Uint8Array} sazFile - SAZ 파일 바이너리
 * @param {EcampusLessonParseOptions} options - 파싱 옵션
 * @returns {EcampusLessonSchedule[]} 복원된 강의 목록
 */
export function parseEcampusLessonSchedulesFromSaz(
  sazFile: Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  const merged = new Map<string, EcampusLessonSchedule>();

  for (const session of parseFiddlerSazSessions(sazFile)) {
    if (!isLessonListResponse(session)) continue;

    const crsCreCd = options.crsCreCd ?? session.request.body.crsCreCd;
    const schedules = parseEcampusLessonSchedulesHtml(session.responseBody, { ...options, crsCreCd });

    for (const schedule of schedules) {
      const current = merged.get(schedule.lessonScheduleId);
      if (!current) {
        merged.set(schedule.lessonScheduleId, schedule);
        continue;
      }
      const seen = new Set(current.lessons.map((lesson) => lesson.lessonCntsId));
      current.lessons.push(...schedule.lessons.filter((lesson) => !seen.has(lesson.lessonCntsId)));
    }
  }

  return Array.from(merged.values());
}

/**
 * Fiddler SAZ 파일에서 모든 레슨 목록을 평탄화하여 복원한다
 * @param {Uint8Array} sazFile - SAZ 파일 바이너리
 * @param {EcampusLessonParseOptions} options - 옵션
 * @returns {EcampusLessonItem[]} 복원된 레슨 배열
 */
export function parseEcampusLessonListFromSaz(
  sazFile: Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesFromSaz(sazFile, options).flatMap((schedule) => schedule.lessons);
}

/**
 * Fiddler SAZ 파일에서 강의 재생 창 정보들을 추출한다
 * @param {Uint8Array} sazFile - SAZ 파일 바이너리
 * @param {EcampusLessonParseOptions} options - 옵션
 * @returns {EcampusLessonStudyWindow[]} 추출된 메타데이터 목록
 */
export function parseEcampusLessonStudyWindowsFromSaz(
  sazFile: Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonStudyWindow[] {
  return parseFiddlerSazSessions(sazFile)
    .filter((session) => new URL(session.request.url).pathname === LESSON_WINDOW_PATH)
    .map((session) =>
      parseEcampusLessonStudyWindowHtml(session.responseBody, {
        ...options,
        crsCreCd: options.crsCreCd ?? new URL(session.request.url).searchParams.get("crsCreCd") ?? undefined
      })
    );
}

/**
 * 강의 정보를 가독성 좋은 JSON 문자열로 변환한다
 * @param {EcampusLessonItem[] | EcampusLessonSchedule[]} lessons - 원본 데이터
 * @returns {string} 포맷팅된 JSON 문자열
 */
export function stringifyEcampusLessons(lessons: EcampusLessonItem[] | EcampusLessonSchedule[]): string {
  return JSON.stringify(lessons, null, 2);
}

/**
 * 강의 상세 페이지 진입을 위한 POST 요청 객체를 생성한다
 * @param {string} baseUrl - 도메인
 * @param {string} crsCreCd - 강의실 ID
 * @param {string} lessonScheduleId - 주차 ID
 * @param {string} lessonCntsId - 콘텐츠 ID
 * @param {string} progressTypeCd - 진도 타입
 * @returns {EcampusLessonPostRequest} 요청 객체
 */
export function createLessonViewRequest(
  baseUrl: string,
  crsCreCd: string,
  lessonScheduleId: string,
  lessonCntsId: string,
  progressTypeCd: string = DEFAULT_PROGRESS_TYPE_CD
): EcampusLessonPostRequest {
  return {
    method: "POST",
    url: absoluteUrl(LESSON_VIEW_PATH, baseUrl),
    body: { crsCreCd, lessonScheduleId, crsOperTypeCd: "", progressTypeCd, lessonCntsId, goUrl: "", subParam: "" }
  };
}

/**
 * 재생 창 로드를 위한 POST 요청 객체를 생성한다
 * @param {string} baseUrl - 도메인
 * @param {string} crsCreCd - 강의실 ID
 * @param {string} lessonCntsId - 콘텐츠 ID
 * @param {string} progressTypeCd - 진도 타입
 * @returns {EcampusLessonPostRequest} 요청 객체
 */
export function createLessonStudyWindowRequest(
  baseUrl: string,
  crsCreCd: string,
  lessonCntsId: string,
  progressTypeCd: string = DEFAULT_PROGRESS_TYPE_CD
): EcampusLessonPostRequest {
  return {
    method: "POST",
    url: absoluteUrl(`${LESSON_WINDOW_PATH}?crsCreCd=${encodeURIComponent(crsCreCd)}`, baseUrl),
    body: { lessonCntsId, seekFile: "", downloadYn: "", progressTypeCd }
  };
}

/**
 * 학습 기록 저장을 위한 GET 요청 객체를 생성한다
 * @param {string} baseUrl - 도메인
 * @param {EcampusLessonRecordOptions} options - 기록 정보
 * @returns {EcampusLessonGetRequest} 요청 객체
 */
export function createStudyRecordRequest(
  baseUrl: string,
  options: EcampusLessonRecordOptions
): EcampusLessonGetRequest {
  const rawQuery: Record<string, string | undefined> = {
    lessonCntsId: options.lessonCntsId,
    stdNo: options.stdNo,
    studyDetailId: options.studyDetailId,
    studySessionLoc: stringifyOptional(options.studySessionLoc),
    studyMaxLoc: stringifyOptional(options.studyMaxLoc),
    studyTotalTm: stringifyOptional(options.studyTotalTm ?? 0),
    studyAfterTm: stringifyOptional(options.studyAfterTm ?? 0),
    playerTm: stringifyOptional(options.playerTm),
    studyStatusCd: options.studyStatusCd ?? "STUDY",
    progressTm: stringifyOptional(options.progressTm),
    crsCreCd: options.crsCreCd
  };
  const query = Object.fromEntries(Object.entries(rawQuery).filter((entry): entry is [string, string] => entry[1] !== undefined));
  return { method: "GET", url: absoluteUrl(ADD_STUDY_RECORD_PATH, baseUrl), query };
}

/**
 * 학습 상세 정보 조회를 위한 GET 요청 객체를 생성한다
 * @param {string} baseUrl - 도메인
 * @param {string} lessonCntsId - 콘텐츠 ID
 * @param {string} crsCreCd - 강의실 ID
 * @returns {EcampusLessonGetRequest} 요청 객체
 */
export function createViewLessonStudyDetailRequest(baseUrl: string, lessonCntsId: string, crsCreCd: string): EcampusLessonGetRequest {
  return { method: "GET", url: absoluteUrl(VIEW_STUDY_DETAIL_PATH, baseUrl), query: { lessonCntsId, crsCreCd } };
}

/**
 * URL 패턴을 분석하여 콘텐츠의 종류(mp4, 유튜브 등)를 분류한다
 * @param {string | undefined} contentUrl - 분석할 URL
 * @returns {EcampusLessonStudyWindow["contentKind"]} 콘텐츠 종류 문자열
 * @private
 */
function classifyContentUrl(contentUrl: string | undefined): EcampusLessonStudyWindow["contentKind"] {
  if (!contentUrl) return "unknown";
  const lower = contentUrl.toLowerCase();
  if (lower.endsWith(".mp4")) return "mp4";
  if (lower.endsWith(".m3u8")) return "hls";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("ted.com")) return "ted";
  if (lower.includes("doczoomsharehub")) return "doczoom";
  return "url";
}

/**
 * SAZ 파일 내의 바이너리 데이터들을 파싱하여 HTTP 세션 객체로 변환한다
 * @param {Uint8Array} sazFile - 원본 바이너리
 * @returns {RawHttpSession[]} 파싱된 세션 목록
 * @private
 */
function parseFiddlerSazSessions(sazFile: Uint8Array): RawHttpSession[] {
  const zip = new AdmZip(Buffer.from(sazFile));
  const decoder = new TextDecoder("utf-8");
  const entries = new Map(zip.getEntries().map((entry) => [entry.entryName.replace(/\\/g, "/"), entry]));
  const numbers = Array.from(entries.keys()).map((name) => name.match(/^raw\/(\d+)_c\.txt$/)?.[1]).filter((n): n is string => !!n).sort((a, b) => Number(a) - Number(b));

  return numbers.map((n) => {
    const req = entries.get(`raw/${n}_c.txt`);
    const res = entries.get(`raw/${n}_s.txt`);
    if (!req || !res) return undefined;
    const [header, body] = splitHttpMessage(decoder.decode(req.getData()));
    const [, resBody] = splitHttpMessage(decoder.decode(res.getData()));
    const [method = "", url = ""] = (header.split(/\r?\n/)[0] ?? "").split(" ");
    if (!url.startsWith("http")) return undefined;
    return { request: { method, url, body: parseFormBody(body) }, responseBody: resBody };
  }).filter((s): s is RawHttpSession => !!s);
}

/**
 * 해당 세션이 강의 목록 정보를 담고 있는지 여부를 확인한다
 * @private
 */
function isLessonListResponse(session: RawHttpSession): boolean {
  const path = new URL(session.request.url).pathname;
  return ["/lesson/lessonLect/Form/lessonListForm", "/lesson/lessonLect/lessonList", "/lesson/lessonOpen/lessonList"].includes(path);
}

/** @private 정규식 첫 번째 캡처 값 도우미 */
function extractFirstValue(source: string, pattern: RegExp): string | undefined { return source.match(pattern)?.[1]; }

/** @private 특정 라벨 뒤의 텍스트 추출 도우미 */
function extractLabeledText(text: string, label: string): string | undefined {
  const norm = normalizeSpace(text);
  const labels = ["기간 외 학습기간", "기간", "수업내용", "강의시간", "출결상태", "온라인 강의", "강의보기"];
  const other = labels.filter((c) => c !== label).map(escapeRegExp).join("|");
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*(.*?)(?=\\s*(?:${other})\\s*|$)`);
  return norm.match(pattern)?.[1]?.trim() || undefined;
}

/** @private 강의 시간 텍스트 추출 도우미 */
function extractDurationText(text: string): string | undefined {
  return text.match(/강의시간\s*([0-9]+\s*분(?:\s*[0-9]+\s*초)?|[0-9]+\s*초)/)?.[1]?.replace(/\s+/g, " ").trim();
}

/** @private 시간 문자열 -> 초 단위 변환 도우미 */
function parseDurationSeconds(durationText: string | undefined): number | undefined {
  if (!durationText) return undefined;
  const m = Number(durationText.match(/(\d+)\s*분/)?.[1] ?? 0);
  const s = Number(durationText.match(/(\d+)\s*초/)?.[1] ?? 0);
  return m * 60 + s;
}

/** @private CSS ID 선택자 이스케이프 도우미 */
function escapeCssId(value: string): string { return value.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1"); }

/** @private 문자열 변환 도우미 */
function stringifyOptional(v: number | string | undefined): string | undefined { return v === undefined ? undefined : String(v); }

/** @private undefined 필드 제거 도우미 */
function removeUndefinedValues<T extends object>(v: T): T { return Object.fromEntries(Object.entries(v).filter(([, item]) => item !== undefined)) as T; }

/**
 * 콘텐츠 페이지를 분석하여 실제 스트리밍 MP4 URL을 도출한다.
 * 단순 <source> 태그뿐 아니라 정규식 검색, Base64 Fallback 등 다양한 추출 전략을 구사한다.
 * @param {AxiosInstance} http - 인증된 통신 인스턴스
 * @param {string | undefined} contentUrl - 분석할 페이지 URL
 * @param {Object} context - 식별 정보 (로깅용)
 * @returns {Promise<ElearningMp4UrlResult>} 추출 결과
 */
export async function getElearningMp4Url(
  http: AxiosInstance,
  contentUrl: string | undefined,
  context: { crsCreCd: string; lessonCntsId: string }
): Promise<ElearningMp4UrlResult> {
  const { crsCreCd, lessonCntsId } = context;
  if (!contentUrl) return { success: false, message: "contentUrl이 없습니다.", debugInfo: { crsCreCd, lessonCntsId } };

  try {
    const response = await http.get<string>(contentUrl, { headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" } });
    const html = response.data;
    const $ = cheerio.load(html);

    // 우선순위 1: 명시적인 비디오 소스 태그
    let mp4Url = $('source[type="video/mp4"]').first()?.attr("src") || $("source#lessonVodSrc")?.attr("src");

    // 우선순위 2: eplus 스토리지 전용 정규식 패턴 매칭
    if (!mp4Url) {
      const regexMatch = html.match(/https:\/\/eplus\.seowon\.ac\.kr\/WebContentStorage\/[^"\s]+\.mp4\?tsdata=[^"\s]+/);
      if (regexMatch?.[0]) mp4Url = regexMatch[0];
    }

    // 우선순위 3: VideoPlayer 뷰모델 내 Base64 인코딩된 설정값 파싱
    const viewModelMatch = html.match(/new VideoPlayerWidgetViewModel\('([^']+)'/);
    if (!mp4Url && viewModelMatch?.[1]) {
      try {
        const jsonStr = Buffer.from(viewModelMatch[1], "base64").toString("utf8");
        const parsed = JSON.parse(jsonStr);
        if (parsed?.videoUrl) mp4Url = parsed.videoUrl;
      } catch {}
    }

    if (mp4Url) return { success: true, mp4Url };

    return {
      success: false,
      message: "실제 MP4 URL을 찾지 못했습니다.",
      debugInfo: { crsCreCd, lessonCntsId, status: response.status, statusText: response.statusText, bodyLength: html.length, bodySnippet: html.substring(0, 6000) }
    };
  } catch (error: any) {
    return { success: false, message: error.message || util.inspect(error), debugInfo: { crsCreCd, lessonCntsId, contentUrl, status: error.response?.status } };
  }
}

/**
 * 원본 강의 영상을 로컬 파일 시스템으로 스트리밍 다운로드한다.
 * @param {AxiosInstance} http - Axios 인스턴스
 * @param {string} mp4Url - 다운로드 대상 URL
 * @param {string} courseTitle - 저장 폴더명으로 사용할 과목명
 * @param {string} lessonTitle - 파일명으로 사용할 강의명
 * @param {string} [baseDir="./downloads"] - 기본 다운로드 경로
 * @param {Function} [progressCallback] - 진행률 콜백
 * @returns {Promise<ElearningDownloadResult>} 다운로드 완료 정보
 */
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

    const response = await http.get(mp4Url, {
      responseType: "stream",
      onDownloadProgress: (ev) => {
        if (progressCallback) {
          const percent = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          progressCallback({ loaded: ev.loaded, percent });
        }
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve({ success: true, filePath }));
      writer.on("error", (err) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        reject(err);
      });
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : util.inspect(error) };
  }
}

/** 파일 시스템에서 안전하게 사용 가능한 파일명으로 치환한다 */
function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().substring(0, 100);
}
