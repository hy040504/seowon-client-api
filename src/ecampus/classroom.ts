import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import {
  absoluteUrl,
  normalizeSpace,
  parseFormBody,
  parseFunctionArguments,
  splitHttpMessage
} from "./utils";

/** 강의실 리소스 섹션 타입 */
export type EcampusClassroomSection = "notices" | "assignments" | "materials";

/** e-campus POST 요청 표준 포맷 */
export interface EcampusPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

/** 개별 게시물(공지, 자료, 과제 등) 항목 데이터 */
export interface EcampusClassroomItem {
  /** 항목 고유 식별자 (atclId 또는 asmntCd) */
  id: string;
  /** 제목 */
  title: string;
  /** 상세 보기 URL */
  url: string;
  /** 상세 보기를 위해 필요한 POST 요청 정보 */
  request: EcampusPostRequest;
  /** 작성일 또는 등록일 */
  date?: string;
  /** 제출/학습 기간 */
  period?: string;
  /** 진행 상태 (제출완료, 미제출 등) */
  status?: string;
  /** 첨부파일 존재 여부 */
  hasAttachment?: boolean;
}

/** 강의실 통합 리소스 패키지 */
export interface EcampusClassroomResources {
  notices: EcampusClassroomItem[];
  assignments: EcampusClassroomItem[];
  materials: EcampusClassroomItem[];
}

/** 리소스 파싱 옵션 */
export interface EcampusClassroomResourceOptions {
  baseUrl?: string;
  crsCreCd?: string;
}

/** 네트워크 패킷 분석용 원시 데이터 구조 */
interface RawHttpSession {
  number: number;
  request: {
    method: string;
    url: string;
    body: Record<string, string>;
  };
  responseBody: string;
}

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const VIEW_ATCL_PATH = "/bbs/bbsLect/Form/viewAtclForm";
const VIEW_ASMNT_PATH = "/asmnt/asmntLect/Form/asmntStuMain";

/**
 * 리소스 수집을 위한 빈 컨테이너를 생성한다
 * @returns {EcampusClassroomResources} 초기화된 빈 리소스 객체
 */
export function createEmptyEcampusClassroomResources(): EcampusClassroomResources {
  return { notices: [], assignments: [], materials: [] };
}

/**
 * 공지사항 게시판 HTML 소스에서 항목 목록을 파싱한다
 * @param {string} html - 응답 HTML
 * @param {EcampusClassroomResourceOptions} options - 컨텍스트 옵션
 * @returns {EcampusClassroomItem[]} 파싱된 공지사항 목록
 */
export function parseEcampusNoticeListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "notices", options);
}

/**
 * 강의자료실 게시판 HTML 소스에서 항목 목록을 파싱한다
 * @param {string} html - 응답 HTML
 * @param {EcampusClassroomResourceOptions} options - 컨텍스트 옵션
 * @returns {EcampusClassroomItem[]} 파싱된 자료 목록
 */
export function parseEcampusMaterialListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "materials", options);
}

/**
 * 과제함 HTML 소스에서 과제 목록 및 제출 상태를 파싱한다.
 * 과제는 일반 게시판과 폼 구조가 다르므로 전용 로직을 사용한다.
 * @param {string} html - 응답 HTML
 * @param {EcampusClassroomResourceOptions} options - 컨텍스트 옵션
 * @returns {EcampusClassroomItem[]} 파싱된 과제 목록
 */
export function parseEcampusAssignmentListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);
  
  // 상세 조회를 위해 부모 폼의 hidden 필드들을 베이스로 사용
  const formValues = getFormValues($, "form#asmntListForm");
  const crsCreCd = options.crsCreCd ?? formValues.crsCreCd ?? "";

  return $("a[href^='javascript:asmntView']")
    .toArray()
    .map((link) => {
      const $link = $(link);
      // "javascript:asmntView('ID')" 형태에서 ID 추출
      const asmntCd = parseFunctionArguments($link.attr("href") ?? "")[0] ?? "";
      const card = $link.closest(".card");
      const text = normalizeSpace(card.text());
      const title = normalizeSpace($link.text());
      
      const period = text.match(/제출기간\s*([0-9.() :~]+)/)?.[1]?.trim();
      const status = text.match(/(과제를 제출하였습니다|미제출|종료|진행중)/)?.[1];
      
      const body = { ...formValues, crsCreCd, asmntCd };

      return {
        id: asmntCd,
        title,
        url: absoluteUrl(VIEW_ASMNT_PATH, baseUrl),
        request: {
          method: "POST" as const,
          url: absoluteUrl(VIEW_ASMNT_PATH, baseUrl),
          body
        },
        period,
        status
      };
    })
    .filter((item) => item.id && item.title);
}

/**
 * Fiddler SAZ 파일에 기록된 모든 네트워크 세션을 분석하여 강의실 전체 리소스를 복원한다.
 * 중복된 항목은 병합하여 누락된 정보를 보완한다.
 * @param {Uint8Array} sazFile - SAZ 파일 바이너리
 * @param {EcampusClassroomResourceOptions} options - 옵션
 * @returns {EcampusClassroomResources} 복원된 전체 리소스
 */
export function parseEcampusClassroomResourcesFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomResources {
  const sessions = parseFiddlerSazSessions(sazFile);
  const resources = createEmptyEcampusClassroomResources();
  const seen = new Map<EcampusClassroomSection, Map<string, EcampusClassroomItem>>();

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    seen.set(section, new Map());
  }

  for (const session of sessions) {
    const section = classifySession(session);
    if (!section) continue;

    const crsCreCd = options.crsCreCd ?? session.request.body.crsCreCd;
    const list = section === "assignments"
      ? parseEcampusAssignmentListHtml(session.responseBody, { ...options, crsCreCd })
      : parseBbsListHtml(session.responseBody, section, { ...options, crsCreCd });

    for (const item of list) {
      const bucket = seen.get(section);
      if (!bucket) continue;

      const current = bucket.get(item.id);
      // 동일 ID 항목이 발견되면 필드 병합을 통해 정보 완성도 향상
      bucket.set(item.id, current ? mergeItem(current, item) : item);
    }
  }

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    resources[section] = Array.from(seen.get(section)?.values() ?? []);
  }

  return resources;
}

/** SAZ 분석을 통한 공지사항 목록 복원 */
export function parseEcampusNoticeListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).notices;
}

/** SAZ 분석을 통한 과제 목록 복원 */
export function parseEcampusAssignmentListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).assignments;
}

/** SAZ 분석을 통한 자료실 목록 복원 */
export function parseEcampusMaterialListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).materials;
}

/** 리소스 통합 객체를 JSON 문자열로 변환 */
export function stringifyEcampusClassroomResources(resources: EcampusClassroomResources): string {
  return JSON.stringify(resources, null, 2);
}

/** 항목 배열을 JSON 문자열로 변환 */
export function stringifyEcampusClassroomItems(items: EcampusClassroomItem[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * 공지사항/자료실 공통 파싱 로직.
 * @private
 */
function parseBbsListHtml(html: string, section: Exclude<EcampusClassroomSection, "assignments">, options: EcampusClassroomResourceOptions): EcampusClassroomItem[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);

  return $("a[href^='javascript:viewAtcl']")
    .toArray()
    .map((link) => {
      const $link = $(link);
      const args = parseFunctionArguments($link.attr("href") ?? "");
      const bbsId = args[0] ?? "";
      const atclId = args[1] ?? "";
      const li = $link.closest("li");
      const title = normalizeSpace($link.find("span").first().text() || $link.text());
      const date = extractDate(li.text());
      const crsCreCd = options.crsCreCd ?? extractCrsCreCdFromBbsId(bbsId);
      const body = { bbsId, atclId, crsCreCd };

      return {
        id: atclId,
        title,
        url: absoluteUrl(VIEW_ATCL_PATH, baseUrl),
        request: { method: "POST" as const, url: absoluteUrl(VIEW_ATCL_PATH, baseUrl), body },
        date,
        hasAttachment: li.find(".paperclip").length > 0 || /paperclip/.test(li.html() ?? "")
      };
    })
    .filter((item) => item.id && item.title);
}

/**
 * Fiddler SAZ 패킷 내부의 HTTP 세션들을 순차적으로 파싱한다.
 * @private
 */
function parseFiddlerSazSessions(sazFile: Uint8Array): RawHttpSession[] {
  const zip = new AdmZip(Buffer.from(sazFile));
  const decoder = new TextDecoder("utf-8");
  const entries = new Map(zip.getEntries().map((e) => [e.entryName.replace(/\\/g, "/"), e]));
  const nums = Array.from(entries.keys()).map((name) => name.match(/^raw\/(\d+)_c\.txt$/)?.[1]).filter((n): n is string => !!n).sort((a, b) => Number(a) - Number(b));

  return nums.map((n) => {
    const reqEntry = entries.get(`raw/${n}_c.txt`);
    const resEntry = entries.get(`raw/${n}_s.txt`);
    if (!reqEntry || !resEntry) return undefined;

    const reqRaw = decoder.decode(reqEntry.getData());
    const resRaw = decoder.decode(resEntry.getData());
    const [reqHeader, reqBody] = splitHttpMessage(reqRaw);
    const [resHeader, resBody] = splitHttpMessage(resRaw);
    const [method = "", url = ""] = (reqHeader.split(/\r?\n/)[0] ?? "").split(" ");

    if (!resHeader.startsWith("HTTP/")) return undefined;

    return { number: Number(n), request: { method, url, body: parseFormBody(reqBody) }, responseBody: resBody };
  }).filter((s): s is RawHttpSession => !!s);
}

/**
 * 세션의 URL 및 본문 속성을 기반으로 어떤 게시판 영역인지 분류한다.
 * @private
 */
function classifySession(session: RawHttpSession): EcampusClassroomSection | undefined {
  const path = new URL(session.request.url).pathname;
  const body = session.request.body;

  if (path === "/asmnt/asmntHome/stuAsmntGridList") return "assignments";
  if (["/bbs/bbsLect/classRoomAtclList", "/bbs/bbsLect/atclList"].includes(path)) {
    if (body.bbsCd === "NOTICE" || body.bbsId?.endsWith("_N")) return "notices";
    if (body.bbsCd === "PDS" || body.bbsId?.endsWith("_P")) return "materials";
  }
  return undefined;
}

/** 폼 내부의 모든 input 값을 수집한다 */
function getFormValues($: cheerio.CheerioAPI, selector: string): Record<string, string> {
  const values: Record<string, string> = {};
  $(`${selector} input[name]`).each((_, input) => {
    const name = $(input).attr("name");
    if (name) values[name] = $(input).attr("value") ?? "";
  });
  return values;
}

/** BBS ID 포맷(BBS_CODE_N)에서 순수 과목 코드 추출 */
function extractCrsCreCdFromBbsId(bbsId: string): string {
  return bbsId.match(/^BBS_(.+)_[A-Z]$/)?.[1] ?? "";
}

/** 텍스트 내에서 날짜(YYYY.MM.DD) 패턴 추출 */
function extractDate(text: string): string | undefined {
  return text.match(/\b20\d{2}\.\d{2}\.\d{2}\b/)?.[0];
}

/** 데이터 보완을 위한 항목 병합 로직 */
function mergeItem(current: EcampusClassroomItem, next: EcampusClassroomItem): EcampusClassroomItem {
  return {
    ...current, ...next,
    date: next.date ?? current.date,
    period: next.period ?? current.period,
    status: next.status ?? current.status,
    hasAttachment: next.hasAttachment ?? current.hasAttachment
  };
}
