import type {
  EcampusClassroomItem,
  EcampusClassroomResourceOptions,
  EcampusClassroomResources,
  EcampusClassroomSection
} from "./types/classroom.js";
import type {
  EcampusLessonItem,
  EcampusLessonParseOptions,
  EcampusLessonSchedule,
  EcampusLessonStudyWindow
} from "./types/elearning.js";
import type {
  EcampusScoreOpenInfo,
  EcampusScoreOpenJsonResponse,
  EcampusScorePage,
  EcampusScorePageCapture,
  EcampusScoreParseOptions,
  EcampusScorePostRequest,
  EcampusScoreSummary,
  EcampusScoreSummaryCapture,
  EcampusScoreSurveyCapture,
  EcampusScoreSurveyJsonResponse
} from "./types/score.js";

import AdmZip from "adm-zip";
import {
  createEmptyEcampusClassroomResources,
  parseEcampusAssignmentListHtml,
  parseEcampusMaterialListHtml,
  parseEcampusNoticeListHtml
} from "./classroom.js";
import { parseEcampusLessonSchedulesHtml, parseEcampusLessonStudyWindowHtml } from "./elearning.js";
import {
  parseEcampusScoreOpenResponse,
  parseEcampusScorePageHtml,
  parseEcampusScoreSummaryHtml,
  parseEcampusScoreSurveyResponse
} from "./score.js";
import { normalizeSpace, parseFormBody, splitHttpMessage } from "./utils.js";

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const ADD_STUDY_RECORD_PATH = "/lesson/lessonHome/addStudyRecord";
const SCORE_OPEN_PATH = "/crs/scoreLect/scoreOpenJson";
const SCORE_SURVEY_CHECK_PATH = "/crs/scoreLect/cheeckStdReshJoin";
const SCORE_PAGE_PATH = "/crs/scoreLect/Form/viewStdScore";
const SCORE_SUMMARY_PATH = "/crs/scoreHome/viewStdScoreSumm";

export interface SazHttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  form: Record<string, string>;
}

export interface SazHttpResponse {
  statusLine: string;
  headers: Record<string, string>;
  body: string;
}

export interface SazHttpSession {
  number: number;
  request: SazHttpRequest;
  response: SazHttpResponse;
  responseHead: string;
  responseBody: string;
}

/**
 * Fiddler SAZ 파일의 raw HTTP 세션을 공통 구조로 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @returns {SazHttpSession[]} 요청/응답이 모두 존재하는 HTTP 세션 목록
 */
export function parseFiddlerSazSessions(sazFile: Buffer | Uint8Array): SazHttpSession[] {
  const zip = new AdmZip(Buffer.from(sazFile));
  const decoder = new TextDecoder("utf-8");
  const entries = new Map(
    zip.getEntries().map((entry) => [normalizeEntryName(entry.entryName), entry])
  );
  const numbers = Array.from(entries.keys())
    .map((name) => name.match(/^raw\/(\d+)_c\.txt$/)?.[1])
    .filter((number): number is string => !!number)
    .sort((a, b) => Number(a) - Number(b));

  return numbers
    .map((number) => {
      const requestEntry = entries.get(`raw/${number}_c.txt`);
      const responseEntry = entries.get(`raw/${number}_s.txt`);
      if (!requestEntry || !responseEntry) return undefined;

      const [requestHead, requestBody] = splitHttpMessage(decoder.decode(requestEntry.getData()));
      const [responseHead, responseBody] = splitHttpMessage(
        decoder.decode(responseEntry.getData())
      );
      const request = parseRawHttpRequest(requestHead, requestBody);
      const response = parseRawHttpResponse(responseHead, responseBody);

      if (!request || !response) return undefined;

      return {
        number: Number(number),
        request,
        response,
        responseHead,
        responseBody
      };
    })
    .filter((session): session is SazHttpSession => !!session);
}

/**
 * SAZ 데이터에서 공지/과제/강의자료 리소스를 통합 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @param {EcampusClassroomResourceOptions} options - 파싱 옵션
 * @returns {EcampusClassroomResources} 복원된 통합 리소스 객체
 */
export function parseEcampusClassroomResourcesFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomResources {
  const resources = createEmptyEcampusClassroomResources();
  const seenMap = new Map<EcampusClassroomSection, Map<string, EcampusClassroomItem>>();

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    seenMap.set(section, new Map());
  }

  for (const session of parseFiddlerSazSessions(sazFile)) {
    const section = classifyClassroomSession(session);
    if (!section) continue;

    const crsCreCd = options.crsCreCd ?? session.request.form.crsCreCd;
    const list =
      section === "assignments"
        ? parseEcampusAssignmentListHtml(session.response.body, { ...options, crsCreCd })
        : parseClassroomBoardList(session.response.body, section, {
            ...options,
            crsCreCd,
            bbsId: session.request.form.bbsId
          });

    for (const item of list) {
      const bucket = seenMap.get(section)!;
      const existing = bucket.get(item.id);
      bucket.set(item.id, existing ? mergeClassroomItem(existing, item) : item);
    }
  }

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    resources[section] = Array.from(seenMap.get(section)?.values() ?? []);
  }

  return resources;
}

/** SAZ 데이터에서 공지사항만 선별 추출 */
export function parseEcampusNoticeListFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).notices;
}

/** SAZ 데이터에서 과제 목록만 선별 추출 */
export function parseEcampusAssignmentListFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).assignments;
}

/** SAZ 데이터에서 강의자료실 항목만 선별 추출 */
export function parseEcampusMaterialListFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).materials;
}

/** SAZ 패킷에서 주차별 강의 구조를 복원 */
export function parseEcampusLessonSchedulesFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonSchedule[] {
  for (const session of parseFiddlerSazSessions(sazFile)) {
    const html = session.response.body;
    if (!html.includes("dropdown_") || !html.includes("lessonCntsId")) continue;

    const schedules = parseEcampusLessonSchedulesHtml(html, options);
    if (schedules.length > 0) return schedules;
  }

  return [];
}

/** SAZ 패킷에서 평탄화된 강의 목록을 복원 */
export function parseEcampusLessonListFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonItem[] {
  return parseEcampusLessonSchedulesFromSaz(sazFile, options).flatMap(
    (schedule) => schedule.lessons
  );
}

/** SAZ 패킷에서 강의 재생 창과 학습 기록 요청 정보를 추출 */
export function parseEcampusLessonStudyWindowsFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusLessonParseOptions = {}
): EcampusLessonStudyWindow[] {
  const sessions = parseFiddlerSazSessions(sazFile);
  const recordRequests = sessions
    .filter((session) => new URL(session.request.url).pathname === ADD_STUDY_RECORD_PATH)
    .map((session) => ({
      method: "GET" as const,
      url: stripSazQuery(session.request.url),
      query: readSazQuery(session.request.url)
    }));

  return sessions
    .filter((session) => {
      const html = session.response.body;
      return (
        html.includes("lessonCntsId") &&
        (html.includes("cntsUrl") || html.includes("studyDetailId"))
      );
    })
    .map((session) => {
      const window = parseEcampusLessonStudyWindowHtml(session.response.body, options);
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

/**
 * 실패/성공 패킷에서 scoreOpenJson 호출 결과를 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @param {EcampusScoreParseOptions} options - 특정 강의실만 추출하기 위한 옵션
 * @returns {EcampusScoreOpenInfo[]} 패킷에 포함된 성적 공개 상태 목록
 */
export function parseEcampusScoreOpenInfoFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusScoreParseOptions = {}
): EcampusScoreOpenInfo[] {
  const result: EcampusScoreOpenInfo[] = [];

  for (const session of parseFiddlerSazSessions(sazFile)) {
    const url = new URL(session.request.url);
    if (url.pathname !== SCORE_OPEN_PATH) continue;

    const crsCreCd = url.searchParams.get("crsCreCd") ?? "";
    if (options.crsCreCd && options.crsCreCd !== crsCreCd) continue;

    try {
      const data = JSON.parse(session.response.body) as EcampusScoreOpenJsonResponse;
      result.push(parseEcampusScoreOpenResponse(data, { crsCreCd }));
    } catch {
      // SAZ에는 미완성 세션이 섞일 수 있어 JSON이 아닌 응답은 건너뛴다.
    }
  }

  return result;
}

/**
 * 성공 패킷에서 설문 확인 API 호출 결과를 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @param {EcampusScoreParseOptions} options - 특정 강의실만 추출하기 위한 옵션
 * @returns {EcampusScoreSurveyCapture[]} 패킷에 포함된 설문 확인 상태 목록
 */
export function parseEcampusScoreSurveyInfoFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusScoreParseOptions = {}
): EcampusScoreSurveyCapture[] {
  const result: EcampusScoreSurveyCapture[] = [];

  for (const session of parseFiddlerSazSessions(sazFile)) {
    const url = new URL(session.request.url);
    if (url.pathname !== SCORE_SURVEY_CHECK_PATH) continue;

    const crsCreCd = url.searchParams.get("crsCreCd") ?? "";
    if (options.crsCreCd && options.crsCreCd !== crsCreCd) continue;

    const scoreViewReschCd = url.searchParams.get("scoreViewReschCd") ?? "";
    try {
      const data = JSON.parse(session.response.body) as EcampusScoreSurveyJsonResponse;
      result.push({
        ...parseEcampusScoreSurveyResponse(data, scoreViewReschCd),
        crsCreCd,
        url: session.request.url
      });
    } catch {
      // SAZ에는 미완성 세션이 섞일 수 있어 JSON이 아닌 응답은 건너뛴다.
    }
  }

  return result;
}

/**
 * 성공 패킷에서 실제 성적 페이지 응답을 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @param {EcampusScoreParseOptions} options - 특정 강의실만 추출하기 위한 옵션
 * @returns {EcampusScorePageCapture[]} 패킷에 포함된 성적 페이지 응답 목록
 */
export function parseEcampusScorePageFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusScoreParseOptions = {}
): EcampusScorePageCapture[] {
  const result: EcampusScorePageCapture[] = [];

  for (const session of parseFiddlerSazSessions(sazFile)) {
    const url = new URL(session.request.url);
    if (url.pathname !== SCORE_PAGE_PATH) continue;

    const crsCreCd = url.searchParams.get("crsCreCd") ?? "";
    if (options.crsCreCd && options.crsCreCd !== crsCreCd) continue;

    const contentType = getSazHeaderValue(session.response.headers, "content-type");
    result.push({
      ...parseScorePageResponse(session.response.body, contentType, { crsCreCd }),
      url: session.request.url,
      contentType
    });
  }

  return result;
}

/**
 * 성공 패킷에서 성적 요약 영역 응답을 복원한다
 * @param {Buffer | Uint8Array} sazFile - Fiddler SAZ 파일 바이너리
 * @param {EcampusScoreParseOptions} options - 특정 강의실만 추출하기 위한 옵션
 * @returns {EcampusScoreSummaryCapture[]} 패킷에 포함된 성적 요약 목록
 */
export function parseEcampusScoreSummariesFromSaz(
  sazFile: Buffer | Uint8Array,
  options: EcampusScoreParseOptions = {}
): EcampusScoreSummaryCapture[] {
  const result: EcampusScoreSummaryCapture[] = [];

  for (const session of parseFiddlerSazSessions(sazFile)) {
    const url = new URL(session.request.url);
    if (url.pathname !== SCORE_SUMMARY_PATH) continue;

    const crsCreCd = session.request.form.crsCreCd ?? "";
    if (options.crsCreCd && options.crsCreCd !== crsCreCd) continue;

    const stdNo = options.stdNo ?? session.request.form.stdNo;
    const contentType = getSazHeaderValue(session.response.headers, "content-type");
    result.push({
      ...parseEcampusScoreSummaryHtml(session.response.body, { crsCreCd, stdNo }),
      url: session.request.url,
      contentType,
      request: createSazPostRequest(session)
    });
  }

  return result;
}

/**
 * 성적 페이지 응답 목록을 사람이 읽기 쉬운 JSON으로 직렬화한다
 * @param {EcampusScorePageCapture[]} items - 성적 페이지 응답 목록
 * @returns {string} 들여쓰기된 JSON 문자열
 */
export function stringifyEcampusScorePages(items: EcampusScorePageCapture[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * 성적 요약 목록을 사람이 읽기 쉬운 JSON으로 직렬화한다
 * @param {EcampusScoreSummary[]} items - 성적 요약 목록
 * @returns {string} 들여쓰기된 JSON 문자열
 */
export function stringifyEcampusScoreSummaries(items: EcampusScoreSummary[]): string {
  return JSON.stringify(items, null, 2);
}

/** URL에서 쿼리 문자열을 제거한다 */
export function stripSazQuery(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.toString();
}

/** URL 쿼리 문자열을 객체로 읽는다 */
export function readSazQuery(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(url).searchParams) {
    result[key] = value;
  }
  return result;
}

/** 대소문자 구분 없이 헤더 값을 찾는다 */
export function getSazHeaderValue(headers: Record<string, string>, name: string): string {
  return headers[name.toLowerCase()] ?? "";
}

function normalizeEntryName(name: string): string {
  return name.replace(/\\/g, "/");
}

function parseRawHttpRequest(head: string, body: string): SazHttpRequest | undefined {
  const lines = head.split(/\r?\n/);
  const requestLine = lines[0];
  if (!requestLine) return undefined;

  const [method = "GET", target = ""] = requestLine.split(/\s+/);
  const headers = parseRawHeaders(lines.slice(1));
  const host = getSazHeaderValue(headers, "host") || new URL(DEFAULT_BASE_URL).host;

  try {
    return {
      method,
      url: target.startsWith("http") ? target : new URL(target, `https://${host}`).toString(),
      headers,
      body,
      form: method.toUpperCase() === "POST" ? parseFormBody(body) : {}
    };
  } catch {
    return undefined;
  }
}

function parseRawHttpResponse(head: string, body: string): SazHttpResponse | undefined {
  const lines = head.split(/\r?\n/);
  const statusLine = lines[0] ?? "";
  if (!statusLine.startsWith("HTTP/")) return undefined;

  return {
    statusLine,
    headers: parseRawHeaders(lines.slice(1)),
    body
  };
}

function parseRawHeaders(lines: string[]): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }

  return headers;
}

function parseClassroomBoardList(
  html: string,
  section: Exclude<EcampusClassroomSection, "assignments">,
  options: EcampusClassroomResourceOptions
): EcampusClassroomItem[] {
  return section === "notices"
    ? parseEcampusNoticeListHtml(html, options)
    : parseEcampusMaterialListHtml(html, options);
}

function classifyClassroomSession(session: SazHttpSession): EcampusClassroomSection | undefined {
  const path = new URL(session.request.url).pathname;
  const body = session.request.form;

  if (path === "/asmnt/asmntHome/stuAsmntGridList") return "assignments";
  if (["/bbs/bbsLect/classRoomAtclList", "/bbs/bbsLect/atclList"].includes(path)) {
    if (body.bbsCd === "NOTICE" || body.bbsId?.endsWith("_N")) return "notices";
    if (body.bbsCd === "PDS" || body.bbsId?.endsWith("_P")) return "materials";
  }
  return undefined;
}

function mergeClassroomItem(
  current: EcampusClassroomItem,
  next: EcampusClassroomItem
): EcampusClassroomItem {
  return {
    ...current,
    ...next,
    date: next.date ?? current.date,
    period: next.period ?? current.period,
    status: next.status ?? current.status,
    hasAttachment: next.hasAttachment ?? current.hasAttachment
  };
}

function createSazPostRequest(session: SazHttpSession): EcampusScorePostRequest {
  return {
    method: "POST",
    url: stripSazQuery(session.request.url),
    body: session.request.form
  };
}

function parseScorePageResponse(
  body: string,
  contentType: string,
  options: EcampusScoreParseOptions
): EcampusScorePage {
  const trimmed = body.trim();
  const crsCreCd = options.crsCreCd ?? "";

  if (looksLikeJson(contentType, trimmed)) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return {
        crsCreCd,
        format: "json",
        text: normalizeSpace(JSON.stringify(json)),
        json,
        raw: body
      };
    } catch {
      // Content-Type만 JSON이고 본문은 깨진 경우 아래의 text/html 판별로 넘긴다.
    }
  }

  if (looksLikeHtml(contentType, trimmed)) {
    return parseEcampusScorePageHtml(body, { crsCreCd });
  }

  return {
    crsCreCd,
    format: "text",
    text: normalizeSpace(body),
    raw: body
  };
}

function looksLikeJson(contentType: string, body: string): boolean {
  return contentType.toLowerCase().includes("json") || /^[{[]/.test(body);
}

function looksLikeHtml(contentType: string, body: string): boolean {
  return (
    contentType.toLowerCase().includes("html") ||
    /<(?:!doctype|html|head|body|table|div|form)\b/i.test(body)
  );
}
