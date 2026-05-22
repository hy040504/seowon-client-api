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

export type EcampusLessonStudyStatus = "STUDY" | "COMPLETE" | string;

export interface EcampusLessonPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

export interface EcampusLessonGetRequest {
  method: "GET";
  url: string;
  query: Record<string, string>;
}

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

export interface EcampusLessonSchedule {
  lessonScheduleId: string;
  title: string;
  period?: string;
  summary?: string;
  lessons: EcampusLessonItem[];
}

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

export interface EcampusLessonParseOptions {
  baseUrl?: string;
  crsCreCd?: string;
  progressTypeCd?: string;
}

export interface EcampusLessonRequestBundleOptions extends EcampusStudyRecordSnapshotInput {
  baseUrl?: string;
  progressTypeCd?: string;
}

export interface EcampusLessonRequestBundle {
  viewRequest: EcampusLessonPostRequest;
  studyWindowRequest: EcampusLessonPostRequest;
  recordRequest?: EcampusLessonGetRequest;
  snapshot: EcampusStudyRecordSnapshot;
}

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

export interface ElearningDownloadResult {
  success: boolean;
  filePath?: string;
  message?: string;
}

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
 * 실제 사람이 강의를 보는 시나리오를 관리하는 세션 클래스
 */
export class ElearningSession {
  private studyDetailId: string | null = null;
  private totalStudyTime: number = 0;
  private progressPercent: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isWatching = false;

  constructor(
    private readonly http: AxiosInstance,
    private readonly baseUrl: string,
    private readonly lessonCntsId: string,
    private readonly crsCreCd: string,
    private readonly stdNo: string
  ) {}

  /**
   * 자연스러운 학습 인증을 시작한다 (lessonNewWindow -> viewLessonCmnt -> addStudyRecord)
   */
  async startWatchingLesson(): Promise<void> {
    if (this.isWatching) return;
    console.log(`[ElearningSession] 🎬 ${this.lessonCntsId} 자연스러운 학습 시작`);

    // 1. 동영상 재생 창 열기
    await this.openLessonWindow();

    // 2. 콘텐츠 진입 (Fiddler 로그 기반 추가 단계)
    await this.enterLessonContent();

    // 3. 최초 학습 기록 생성 (studyDetailId 확보)
    await this.initializeStudyRecord();

    // 4. 주기적 학습 기록 전송 시작
    this.startPeriodicStudyRecord();

    this.isWatching = true;
  }

  private async openLessonWindow() {
    await this.http.get(LESSON_WINDOW_PATH, {
      params: { crsCreCd: this.crsCreCd }
    });
    console.log("[ElearningSession] ✅ lessonNewWindow 호출 완료");
  }

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

  private async initializeStudyRecord() {
    const initialTm = 60;
    const res = await this.callAddStudyRecord(initialTm);
    // 서버 응답 구조가 { returnVO: { studyDetailId: "...", prgrRatio: 11 } } 형태인 것을 가정
    const data = res as any;
    if (data?.returnVO?.studyDetailId) {
      this.studyDetailId = data.returnVO.studyDetailId;
      this.totalStudyTime = initialTm;
      console.log(`[ElearningSession] ✅ studyDetailId 생성: ${this.studyDetailId}`);
    } else {
      console.warn("[ElearningSession] ⚠️ studyDetailId를 확보하지 못했습니다.");
    }
  }

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

    // 학습 진행률(prgrRatio) 파싱 및 저장
    const data = response.data as any;
    if (data?.returnVO?.prgrRatio !== undefined) {
      this.progressPercent = Number(data.returnVO.prgrRatio);
    }

    return data;
  }

  private startPeriodicStudyRecord() {
    const sendNext = async () => {
      if (!this.isWatching) return;

      // 45~75초 사이의 랜덤 딜레이
      const randomDelay = 45000 + Math.random() * 30000;
      this.totalStudyTime += 60;

      console.log(`[ElearningSession] ⏰ addStudyRecord 호출 → 누적 ${this.totalStudyTime}초`);
      await this.callAddStudyRecord(this.totalStudyTime);

      // 학습 이력 확인 (실제 사람이 확인하는 패턴 모사)
      await this.verifyStudyDetail();

      this.intervalId = setTimeout(sendNext, randomDelay);
    };

    // 첫 호출 지연 (25~35초 후)
    this.intervalId = setTimeout(sendNext, 25000 + Math.random() * 10000);
  }

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
   * 학습을 중단하고 세션을 종료한다 (exitStudy 호출)
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
      // 반드시 /lesson/lessonPop/Form/exitStudy 패킷 전송
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

  getStudyDetailId() {
    return this.studyDetailId;
  }

  getProgressPercent() {
    return this.progressPercent;
  }
}

/**
 * 새로운 학습 세션을 생성하고 시작한다
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
 * e-learning 강의 목록 HTML에서 주차와 차시 목록을 추출한다
 * @param {string} html - 온라인 강의 목록 HTML
 * @param {EcampusLessonParseOptions} options - 기본 URL, 강의실 코드, 진도 방식 옵션
 * @returns {EcampusLessonSchedule[]} 주차별 강의 목록
 */
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
  const progressTypeCd =
    options.progressTypeCd ??
    extractFirstValue(html, /progressTypeCd["']?\s*(?:value=|:)\s*["']([^"']+)/) ??
    DEFAULT_PROGRESS_TYPE_CD;
  const schedules: EcampusLessonSchedule[] = [];

  $(".title.header[id^='dropdown_']").each((_, element) => {
    const header = $(element);
    const lessonScheduleId = (header.attr("id") ?? "").replace(/^dropdown_/, "");
    const content = $(`#${escapeCssId(lessonScheduleId)}`);

    if (!lessonScheduleId || content.length === 0) {
      return;
    }

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

      if (!lessonCntsId) {
        return;
      }

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
        viewRequest: createLessonViewRequest(
          baseUrl,
          crsCreCd,
          lessonScheduleId,
          lessonCntsId,
          progressTypeCd
        ),
        studyWindowRequest: createLessonStudyWindowRequest(
          baseUrl,
          crsCreCd,
          lessonCntsId,
          progressTypeCd
        )
      };

      schedule.lessons.push(removeUndefinedValues(item));
    });

    schedules.push(schedule);
  });

  return schedules;
}

/**
 * e-learning 강의 목록 HTML에서 차시 목록만 평탄화해서 반환한다
 * @param {string} html - 온라인 강의 목록 HTML
 * @param {EcampusLessonParseOptions} options - 기본 URL, 강의실 코드, 진도 방식 옵션
 * @returns {EcampusLessonItem[]} 모든 주차의 차시 목록
 */
export function parseEcampusLessonListHtml(
  html: string,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesHtml(html, options).flatMap((schedule) => schedule.lessons);
}

/**
 * 강의 재생 창 HTML에서 콘텐츠 URL과 학습기록 요청 정보를 추출한다
 * @param {string} html - lessonNewWindow 응답 HTML
 * @param {EcampusLessonParseOptions} options - 기본 URL과 강의실 코드 옵션
 * @returns {EcampusLessonStudyWindow} 강의 창 메타데이터
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
  const studyDetailId =
    $("#studyDetailId").attr("value") ||
    extractFirstValue(html, /studyDetailId["']?\s*:\s*["']([^"']+)/);
  const currentStudyStatusCd = extractFirstValue(html, /curStudyStatusCd\s*=\s*"([^"]+)"/);
  const contentUrl = extractFirstValue(html, /var\s+cntsUrl\s*=\s*"([^"]*)"/);
  const recordRequest =
    crsCreCd && lessonCntsId && stdNo
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
 * 학습기록 요청에 필요한 핵심 값만 읽기 전용으로 정리한다
 * @param {EcampusStudyRecordSnapshotInput | EcampusLessonStudyWindow} input - 학습기록 원본 값
 * @returns {EcampusStudyRecordSnapshot} 학습기록 스냅샷
 */
export function parseStudyRecordSnapshot(
  input: EcampusStudyRecordSnapshotInput | EcampusLessonStudyWindow
): EcampusStudyRecordSnapshot {
  const baseUrl = "baseUrl" in input && input.baseUrl ? input.baseUrl : DEFAULT_BASE_URL;
  const currentStudyStatusCd =
    "currentStudyStatusCd" in input
      ? input.currentStudyStatusCd
      : "studyStatusCd" in input
        ? input.studyStatusCd
        : undefined;
  const contentUrl = "contentUrl" in input ? input.contentUrl : undefined;
  const contentKind =
    ("contentKind" in input && input.contentKind) || classifyContentUrl(contentUrl);
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
 * 차시 객체 하나만 넣어서 화면 진입, 재생 창, 학습기록 요청을 한 번에 묶는다
 * @param {EcampusLessonItem} lesson - 주차와 차시가 이미 파싱된 레슨 객체
 * @param {EcampusLessonRequestBundleOptions} options - 학습기록 스냅샷에 필요한 값
 * @returns {EcampusLessonRequestBundle} 세 종류의 요청과 스냅샷
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
 * SAZ 패킷에서 e-learning 주차와 차시 목록을 추출한다
 * @param {Uint8Array} sazFile - Fiddler SAZ 파일 바이트
 * @param {EcampusLessonParseOptions} options - 기본 URL, 강의실 코드, 진도 방식 옵션
 * @returns {EcampusLessonSchedule[]} 주차별 강의 목록
 */
export function parseEcampusLessonSchedulesFromSaz(
  sazFile: Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  const merged = new Map<string, EcampusLessonSchedule>();

  for (const session of parseFiddlerSazSessions(sazFile)) {
    if (!isLessonListResponse(session)) {
      continue;
    }

    const crsCreCd = options.crsCreCd ?? session.request.body.crsCreCd;
    const schedules = parseEcampusLessonSchedulesHtml(session.responseBody, {
      ...options,
      crsCreCd
    });

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
 * SAZ 패킷에서 e-learning 차시 목록만 평탄화해서 추출한다
 * @param {Uint8Array} sazFile - Fiddler SAZ 파일 바이트
 * @param {EcampusLessonParseOptions} options - 기본 URL, 강의실 코드, 진도 방식 옵션
 * @returns {EcampusLessonItem[]} 모든 주차의 차시 목록
 */
export function parseEcampusLessonListFromSaz(
  sazFile: Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesFromSaz(sazFile, options).flatMap(
    (schedule) => schedule.lessons
  );
}

/**
 * SAZ 패킷에서 강의 재생 창 정보를 추출한다
 * @param {Uint8Array} sazFile - Fiddler SAZ 파일 바이트
 * @param {EcampusLessonParseOptions} options - 기본 URL과 강의실 코드 옵션
 * @returns {EcampusLessonStudyWindow[]} 강의 재생 창 정보 목록
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
        crsCreCd:
          options.crsCreCd ?? new URL(session.request.url).searchParams.get("crsCreCd") ?? undefined
      })
    );
}

/**
 * 강의 목록을 JSON 문자열로 변환한다
 * @param {EcampusLessonItem[] | EcampusLessonSchedule[]} lessons - 강의 또는 주차 목록
 * @returns {string} 들여쓰기된 JSON 문자열
 */
export function stringifyEcampusLessons(
  lessons: EcampusLessonItem[] | EcampusLessonSchedule[]
): string {
  return JSON.stringify(lessons, null, 2);
}

/**
 * 강의 상세 화면 진입 요청 정보를 만든다
 * @param {string} baseUrl - e-campus 기본 URL
 * @param {string} crsCreCd - 강의실 코드
 * @param {string} lessonScheduleId - 주차 코드
 * @param {string} lessonCntsId - 차시 콘텐츠 코드
 * @param {string} progressTypeCd - 진도 방식 코드
 * @returns {EcampusLessonPostRequest} 상세 화면 POST 요청 정보
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
    body: {
      crsCreCd,
      lessonScheduleId,
      crsOperTypeCd: "",
      progressTypeCd,
      lessonCntsId,
      goUrl: "",
      subParam: ""
    }
  };
}

/**
 * 강의 재생 창 요청 정보를 만든다
 * @param {string} baseUrl - e-campus 기본 URL
 * @param {string} crsCreCd - 강의실 코드
 * @param {string} lessonCntsId - 차시 콘텐츠 코드
 * @param {string} progressTypeCd - 진도 방식 코드
 * @returns {EcampusLessonPostRequest} 강의 재생 창 POST 요청 정보
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
    body: {
      lessonCntsId,
      seekFile: "",
      downloadYn: "",
      progressTypeCd
    }
  };
}

/**
 * 학습기록 저장 요청 정보를 만든다
 * @param {string} baseUrl - e-campus 기본 URL
 * @param {EcampusLessonRecordOptions} options - 학습기록 저장에 필요한 값
 * @returns {EcampusLessonGetRequest} 학습기록 GET 요청 정보
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
  const query = Object.fromEntries(
    Object.entries(rawQuery).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );

  return {
    method: "GET",
    url: absoluteUrl(ADD_STUDY_RECORD_PATH, baseUrl),
    query
  };
}

/**
 * 학습 이력 상세 조회 요청 정보를 만든다
 * @param {string} baseUrl - e-campus 기본 URL
 * @param {string} lessonCntsId - 차시 콘텐츠 코드
 * @param {string} crsCreCd - 강의실 코드
 * @returns {EcampusLessonGetRequest} 학습 이력 상세 조회 GET 요청 정보
 */
export function createViewLessonStudyDetailRequest(
  baseUrl: string,
  lessonCntsId: string,
  crsCreCd: string
): EcampusLessonGetRequest {
  return {
    method: "GET",
    url: absoluteUrl(VIEW_STUDY_DETAIL_PATH, baseUrl),
    query: {
      lessonCntsId,
      crsCreCd
    }
  };
}

/**
 * 콘텐츠 URL 종류를 분류한다
 * @param {string | undefined} contentUrl - 강의 콘텐츠 URL
 * @returns {EcampusLessonStudyWindow["contentKind"]} 콘텐츠 종류
 */
function classifyContentUrl(
  contentUrl: string | undefined
): EcampusLessonStudyWindow["contentKind"] {
  if (!contentUrl) {
    return "unknown";
  }

  const lower = contentUrl.toLowerCase();
  if (lower.endsWith(".mp4")) {
    return "mp4";
  }

  if (lower.endsWith(".m3u8")) {
    return "hls";
  }

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }

  if (lower.includes("ted.com")) {
    return "ted";
  }

  if (lower.includes("doczoomsharehub")) {
    return "doczoom";
  }

  return "url";
}

/**
 * SAZ 파일을 HTTP 세션 배열로 변환한다
 * @param {Uint8Array} sazFile - Fiddler SAZ 파일 바이트
 * @returns {RawHttpSession[]} 요청과 응답 본문 목록
 */
function parseFiddlerSazSessions(sazFile: Uint8Array): RawHttpSession[] {
  const zip = new AdmZip(Buffer.from(sazFile));
  const decoder = new TextDecoder("utf-8");
  const entries = new Map(
    zip.getEntries().map((entry) => [entry.entryName.replace(/\\/g, "/"), entry])
  );
  const numbers = Array.from(entries.keys())
    .map((name) => name.match(/^raw\/(\d+)_c\.txt$/)?.[1])
    .filter((number): number is string => Boolean(number))
    .sort((a, b) => Number(a) - Number(b));

  return numbers
    .map((number) => {
      const requestEntry = entries.get(`raw/${number}_c.txt`);
      const responseEntry = entries.get(`raw/${number}_s.txt`);

      if (!requestEntry || !responseEntry) {
        return undefined;
      }

      const requestRaw = decoder.decode(requestEntry.getData());
      const responseRaw = decoder.decode(responseEntry.getData());
      const [requestHeader, requestBody] = splitHttpMessage(requestRaw);
      const [, responseBody] = splitHttpMessage(responseRaw);
      const requestLine = requestHeader.split(/\r?\n/)[0] ?? "";
      const [method = "", url = ""] = requestLine.split(" ");

      if (!url.startsWith("http")) {
        return undefined;
      }

      return {
        request: {
          method,
          url,
          body: parseFormBody(requestBody)
        },
        responseBody
      };
    })
    .filter((session): session is RawHttpSession => Boolean(session));
}

/**
 * 세션이 강의 목록 응답인지 확인한다
 * @param {RawHttpSession} session - SAZ에서 복원한 HTTP 세션
 * @returns {boolean} 강의 목록 응답이면 true
 */
function isLessonListResponse(session: RawHttpSession): boolean {
  const path = new URL(session.request.url).pathname;
  return (
    path === "/lesson/lessonLect/Form/lessonListForm" ||
    path === "/lesson/lessonLect/lessonList" ||
    path === "/lesson/lessonOpen/lessonList"
  );
}

/**
 * 정규식 첫 번째 캡처 값을 추출한다
 * @param {string} source - 검색할 문자열
 * @param {RegExp} pattern - 첫 번째 캡처가 있는 정규식
 * @returns {string | undefined} 찾은 값
 */
function extractFirstValue(source: string, pattern: RegExp): string | undefined {
  return source.match(pattern)?.[1];
}

/**
 * 라벨 뒤에 붙은 화면 텍스트를 짧게 추출한다
 * @param {string} text - 카드나 헤더 전체 텍스트
 * @param {string} label - 찾을 라벨명
 * @returns {string | undefined} 라벨에 해당하는 값
 */
function extractLabeledText(text: string, label: string): string | undefined {
  const normalized = normalizeSpace(text);
  const labels = [
    "기간 외 학습기간",
    "기간",
    "수업내용",
    "강의시간",
    "출결상태",
    "온라인 강의",
    "강의보기"
  ];
  const otherLabels = labels
    .filter((candidate) => candidate !== label)
    .map(escapeRegExp)
    .join("|");
  const pattern = new RegExp(`${escapeRegExp(label)}\\s*(.*?)(?=\\s*(?:${otherLabels})\\s*|$)`);
  const value = normalized.match(pattern)?.[1]?.trim();
  return value || undefined;
}

/**
 * 강의시간 텍스트를 추출한다
 * @param {string} text - 카드 전체 텍스트
 * @returns {string | undefined} 강의시간 텍스트
 */
function extractDurationText(text: string): string | undefined {
  return text
    .match(/강의시간\s*([0-9]+\s*분(?:\s*[0-9]+\s*초)?|[0-9]+\s*초)/)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
}

/**
 * 강의시간 텍스트를 초 단위로 변환한다
 * @param {string | undefined} durationText - 강의시간 텍스트
 * @returns {number | undefined} 초 단위 시간
 */
function parseDurationSeconds(durationText: string | undefined): number | undefined {
  if (!durationText) {
    return undefined;
  }

  const minutes = Number(durationText.match(/(\d+)\s*분/)?.[1] ?? 0);
  const seconds = Number(durationText.match(/(\d+)\s*초/)?.[1] ?? 0);
  return minutes * 60 + seconds;
}

/**
 * CSS id 선택자에 들어갈 값을 이스케이프한다
 * @param {string} value - id 값
 * @returns {string} 이스케이프된 id 값
 */
function escapeCssId(value: string): string {
  return value.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, "\\$1");
}

/**
 * 값을 문자열로 변환하되 비어 있는 값은 제외한다
 * @param {number | string | undefined} value - 변환할 값
 * @returns {string | undefined} 문자열 값
 */
function stringifyOptional(value: number | string | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/**
 * undefined 값을 가진 속성을 제거한다
 * @param {T} value - 정리할 객체
 * @returns {T} undefined 속성이 제거된 객체
 */
function removeUndefinedValues<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

/**
 * 특정 e-learning 강의의 실제 MP4 URL을 추출한다
 * @param {AxiosInstance} http - axios 인스턴스
 * @param {string} contentUrl - 분석할 콘텐츠 페이지 URL
 * @returns {Promise<ElearningMp4UrlResult>} 추출 결과
 */
export async function getElearningMp4Url(
  http: AxiosInstance,
  contentUrl: string | undefined,
  context: { crsCreCd: string; lessonCntsId: string }
): Promise<ElearningMp4UrlResult> {
  const { crsCreCd, lessonCntsId } = context;

  if (!contentUrl) {
    return {
      success: false,
      message: "contentUrl이 없습니다.",
      debugInfo: { crsCreCd, lessonCntsId }
    };
  }

  try {
    const response = await http.get<string>(contentUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const html = response.data as string;
    const $ = cheerio.load(html);

    // 1순위: 명시적 <source> 태그 추출 (TypeScript 안전하게 접근)
    let mp4Url =
      $('source[type="video/mp4"]').first()?.attr("src") ||
      $("source#lessonVodSrc")?.attr("src");

    // 2순위: regex 검색 (eplus.seowon.ac.kr 전용)
    if (!mp4Url) {
      const regexMatch = html.match(
        /https:\/\/eplus\.seowon\.ac\.kr\/WebContentStorage\/[^"\s]+\.mp4\?tsdata=[^"\s]+/
      );
      if (regexMatch?.[0]) {
        mp4Url = regexMatch[0];
      }
    }

    // 3순위: base64 JSON fallback (VideoPlayerWidgetViewModel)
    const viewModelMatch = html.match(/new VideoPlayerWidgetViewModel\('([^']+)'/);
    if (!mp4Url && viewModelMatch?.[1]) {
      try {
        const jsonStr = Buffer.from(viewModelMatch[1], "base64").toString("utf8");
        const parsed = JSON.parse(jsonStr);
        if (parsed?.videoUrl) {
          mp4Url = parsed.videoUrl;
        }
      } catch (e) {
        // 디코딩 실패 시 무시
      }
    }

    if (mp4Url) {
      // 상대 경로 보정
      if (false && contentUrl) {
        const origin = new URL(contentUrl!).origin;
        mp4Url = new URL(mp4Url!, origin).toString();
      }
      return { success: true, mp4Url };
    }

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
        bodySnippet: html.substring(0, 6000),
        foundBase64: viewModelMatch?.[1] ? viewModelMatch[1].substring(0, 100) + "..." : undefined
      }
    };
  } catch (error: any) {
    const axiosError = error.response;
    const errorData = axiosError?.data ? String(axiosError.data) : "";
    return {
      success: false,
      message: error.message || util.inspect(error),
      debugInfo: {
        crsCreCd,
        lessonCntsId,
        contentUrl,
        status: axiosError?.status,
        statusText: axiosError?.statusText,
        contentType: axiosError?.headers?.["content-type"],
        bodyLength: errorData.length,
        bodySnippet: errorData.substring(0, 6000)
      }
    };
  }
}

/**
 * 특정 e-learning 강의 MP4를 다운로드한다
 * @param {AxiosInstance} http - axios 인스턴스
 * @param {string} mp4Url - 다운로드할 실제 MP4 URL
 * @param {string} fileName - 저장할 파일명
 * @param {string} downloadDir - 저장할 폴더 경로
 * @param {Function} onProgress - 진행 상황 콜백
 * @returns {Promise<ElearningDownloadResult>} 다운로드 결과
 */
export async function downloadElearningMp4(
  http: AxiosInstance,
  mp4Url: string,
  courseTitle: string,
  lessonTitle: string,
  baseDir: string = "./downloads",
  progressCallback?: (progress: { percent: number; loaded: number }) => void
): Promise<ElearningDownloadResult> {
  try {
    const sanitizedCourseTitle = sanitizeFilename(courseTitle);
    const sanitizedLessonTitle = sanitizeFilename(lessonTitle);
    const downloadDir = path.resolve(baseDir, sanitizedCourseTitle);
    const filePath = path.resolve(downloadDir, `${sanitizedLessonTitle}.mp4`);

    fs.mkdirSync(downloadDir, { recursive: true });

    const response = await http.get(mp4Url, {
      responseType: "stream",
      onDownloadProgress: (progressEvent) => {
        if (progressCallback) {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : 0;

          progressCallback({
            loaded: progressEvent.loaded,
            percent
          });
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
    return {
      success: false,
      message: error instanceof Error ? error.message : util.inspect(error)
    };
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().substring(0, 100);
}
