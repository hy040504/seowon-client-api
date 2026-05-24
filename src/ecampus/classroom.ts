import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import {
  absoluteUrl,
  normalizeSpace,
  parseFormBody,
  parseFunctionArguments,
  splitHttpMessage
} from "./utils.js";

/** 강의실 리소스 식별 타입 */
export type EcampusClassroomSection = "notices" | "assignments" | "materials";

/** e-campus 전용 표준 POST 요청 규격 */
export interface EcampusPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

/** 공지사항, 과제, 강의자료실 등 게시판 형태의 항목 정보 */
export interface EcampusClassroomItem {
  /** 데이터베이스 식별자 (atclId 또는 asmntCd) */
  id: string;
  /** 항목 제목 */
  title: string;
  /** 상세 진입을 위한 전체 URL */
  url: string;
  /** 상세 데이터 조회를 위해 직접 사용 가능한 사전 구성 요청 정보 */
  request: EcampusPostRequest;
  /** 게시일 또는 작성일 */
  date?: string;
  /** 과제 마감 기한 또는 시청 기간 */
  period?: string;
  /** 현재 진행 또는 제출 상태 */
  status?: string;
  /** 물리적 첨부파일 포함 여부 */
  hasAttachment?: boolean;
}

/** 강의실 내부의 모든 리소스를 수집한 통합 데이터 구조 */
export interface EcampusClassroomResources {
  notices: EcampusClassroomItem[];
  assignments: EcampusClassroomItem[];
  materials: EcampusClassroomItem[];
}

/** 파싱 처리에 필요한 기본 정보 주입 옵션 */
export interface EcampusClassroomResourceOptions {
  baseUrl?: string;
  crsCreCd?: string;
}

/** 패킷 로그 분석을 위한 원시 세션 구조체 */
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

/** 신규 리소스 컨테이너 초기화 */
export function createEmptyEcampusClassroomResources(): EcampusClassroomResources {
  return { notices: [], assignments: [], materials: [] };
}

/** 공지사항 게시판 리스트 파싱 */
export function parseEcampusNoticeListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "notices", options);
}

/** 강의자료실 게시판 리스트 파싱 */
export function parseEcampusMaterialListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "materials", options);
}

/**
 * 과제함 HTML의 특수한 테이블 구조를 분석하여 목록과 제출 정보를 추출한다.
 * 일반 게시판과 달리 진행 상태(제출 여부)를 포함하는 복합 로직을 수행한다.
 * @param {string} html - 응답 소스
 * @param {EcampusClassroomResourceOptions} options - 설정
 * @returns {EcampusClassroomItem[]} 파싱된 과제 항목 배열
 */
export function parseEcampusAssignmentListHtml(html: string, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);
  
  // 제출 처리에 필요한 모든 기본 폼 데이터(token 등) 수집
  const formValues = getFormValues($, "form#asmntListForm");
  const crsCreCd = options.crsCreCd ?? formValues.crsCreCd ?? "";

  return $("a[href^='javascript:asmntView']")
    .toArray()
    .map((link) => {
      const $link = $(link);
      // "javascript:asmntView('CD')" 에서 고유 코드 추출
      const asmntCd = parseFunctionArguments($link.attr("href") ?? "")[0] ?? "";
      const card = $link.closest(".card");
      const text = normalizeSpace(card.text());
      const title = normalizeSpace($link.text());
      
      // 제출 기간 및 현재 상태(제출완료/미제출) 정규식 매칭
      const period = text.match(/제출기간\s*([0-9.() :~]+)/)?.[1]?.trim();
      const status = text.match(/(과제를 제출하였습니다|미제출|종료|진행중)/)?.[1];
      
      // 개별 과제 조회를 위한 맞춤형 요청 정보 구성
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
 * Fiddler SAZ 파일에서 캡처된 다수의 세션을 분석하여 전체 리소스를 정밀 복원한다.
 * 누락된 데이터가 있을 경우 세션 간 병합을 통해 완성도를 극대화한다.
 * @param {Uint8Array} sazFile - 바이너리 데이터
 * @param {EcampusClassroomResourceOptions} options - 옵션
 * @returns {EcampusClassroomResources} 복원된 통합 리소스 객체
 */
export function parseEcampusClassroomResourcesFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomResources {
  const sessions = parseFiddlerSazSessions(sazFile);
  const resources = createEmptyEcampusClassroomResources();
  const seenMap = new Map<EcampusClassroomSection, Map<string, EcampusClassroomItem>>();

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    seenMap.set(section, new Map());
  }

  for (const session of sessions) {
    const section = classifySession(session);
    if (!section) continue;

    const crsCreCd = options.crsCreCd ?? session.request.body.crsCreCd;
    const list = section === "assignments"
      ? parseEcampusAssignmentListHtml(session.responseBody, { ...options, crsCreCd })
      : parseBbsListHtml(session.responseBody, section, { ...options, crsCreCd });

    for (const item of list) {
      const bucket = seenMap.get(section)!;
      const existing = bucket.get(item.id);
      // 필드 병합(Field Merging)을 통해 정보 보완 처리
      bucket.set(item.id, existing ? mergeItem(existing, item) : item);
    }
  }

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    resources[section] = Array.from(seenMap.get(section)?.values() ?? []);
  }

  return resources;
}

/** SAZ 데이터에서 공지사항만 선별 추출 */
export function parseEcampusNoticeListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).notices;
}

/** SAZ 데이터에서 과제 목록만 선별 추출 */
export function parseEcampusAssignmentListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).assignments;
}

/** SAZ 데이터에서 강의자료실 항목만 선별 추출 */
export function parseEcampusMaterialListFromSaz(sazFile: Uint8Array, options: EcampusClassroomResourceOptions = {}): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).materials;
}

/** 통합 리소스 데이터를 가독성 있는 JSON으로 직렬화 */
export function stringifyEcampusClassroomResources(resources: EcampusClassroomResources): string {
  return JSON.stringify(resources, null, 2);
}

/** 항목 리스트를 가독성 있는 JSON으로 직렬화 */
export function stringifyEcampusClassroomItems(items: EcampusClassroomItem[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * 일반적인 게시판(NOTICE, PDS) 형태의 HTML 리스트를 공통 파싱한다.
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
 * SAZ 패킷 내부의 HTTP 전문에서 유효한 세션 데이터들을 정제하여 복원한다.
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

    const [reqHeader, reqBody] = splitHttpMessage(decoder.decode(reqEntry.getData()));
    const [resHeader, resBody] = splitHttpMessage(decoder.decode(resEntry.getData()));
    const [method = "", url = ""] = (reqHeader.split(/\r?\n/)[0] ?? "").split(" ");

    if (!resHeader.startsWith("HTTP/")) return undefined;

    return { number: Number(n), request: { method, url, body: parseFormBody(reqBody) }, responseBody: resBody };
  }).filter((s): s is RawHttpSession => !!s);
}

/** 세션의 목적지를 식별하여 게시판 종류를 분류한다 */
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

/** HTML 폼 내부의 모든 Hidden 및 데이터 필드를 수집한다 */
function getFormValues($: cheerio.CheerioAPI, selector: string): Record<string, string> {
  const values: Record<string, string> = {};
  $(`${selector} input[name]`).each((_, input) => {
    const name = $(input).attr("name");
    if (name) values[name] = $(input).attr("value") ?? "";
  });
  return values;
}

/** 게시판 식별 코드에서 과목 고유 ID를 분리한다 */
function extractCrsCreCdFromBbsId(bbsId: string): string {
  return bbsId.match(/^BBS_(.+)_[A-Z]$/)?.[1] ?? "";
}

/** 텍스트 내에서 날짜 리터럴을 탐색한다 */
function extractDate(text: string): string | undefined {
  return text.match(/\b20\d{2}\.\d{2}\.\d{2}\b/)?.[0];
}

/** 데이터 완성도를 위한 속성 단위 병합 */
function mergeItem(current: EcampusClassroomItem, next: EcampusClassroomItem): EcampusClassroomItem {
  return {
    ...current, ...next,
    date: next.date ?? current.date,
    period: next.period ?? current.period,
    status: next.status ?? current.status,
    hasAttachment: next.hasAttachment ?? current.hasAttachment
  };
}
