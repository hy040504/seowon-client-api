import type {
  EcampusClassroomAttachment,
  EcampusClassroomItem,
  EcampusClassroomResourceOptions,
  EcampusClassroomResources,
  EcampusClassroomSection
} from "./types/classroom.js";

export type {
  EcampusClassroomAttachment,
  EcampusClassroomItem,
  EcampusClassroomResourceOptions,
  EcampusClassroomResources,
  EcampusClassroomSection,
  EcampusPostRequest
} from "./types/classroom.js";

import * as cheerio from "cheerio";
import { absoluteUrl, normalizeSpace, parseFunctionArguments } from "./utils.js";

const DEFAULT_BASE_URL = "https://ecampus.seowon.ac.kr";
const VIEW_ATCL_PATH = "/bbs/bbsLect/Form/viewAtclForm";
const VIEW_ATCL_CONTENT_PATH = "/bbs/bbsLect/viewAtcl";
const VIEW_ASMNT_PATH = "/asmnt/asmntLect/Form/asmntStuMain";

/**
 * 강의실 리소스 수집 결과의 기본 컨테이너를 만든다.
 * @returns {EcampusClassroomResources} 빈 공지/과제/자료 배열을 가진 객체
 */
export function createEmptyEcampusClassroomResources(): EcampusClassroomResources {
  return { notices: [], assignments: [], materials: [] };
}

/**
 * 공지사항 게시판 HTML을 공통 항목 구조로 파싱한다.
 * @param {string} html - 게시판 목록 HTML
 * @param {EcampusClassroomResourceOptions} options - 파싱 옵션
 * @returns {EcampusClassroomItem[]} 공지사항 항목 배열
 */
export function parseEcampusNoticeListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "notices", options);
}

/**
 * 강의자료실 게시판 HTML을 공통 항목 구조로 파싱한다.
 * @param {string} html - 게시판 목록 HTML
 * @param {EcampusClassroomResourceOptions} options - 파싱 옵션
 * @returns {EcampusClassroomItem[]} 강의자료 항목 배열
 */
export function parseEcampusMaterialListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "materials", options);
}

/**
 * 과제함 HTML의 특수한 테이블 구조를 분석하여 목록과 제출 정보를 추출한다.
 * 일반 게시판과 달리 진행 상태(제출 여부)를 포함하는 복합 로직을 수행한다.
 * @param {string} html - 응답 소스
 * @param {EcampusClassroomResourceOptions} options - 설정
 * @returns {EcampusClassroomItem[]} 파싱된 과제 항목 배열
 */
export function parseEcampusAssignmentListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
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
 * 통합 리소스 데이터를 CLI 출력에 적합한 JSON으로 직렬화한다.
 * @param {EcampusClassroomResources} resources - 통합 리소스 데이터
 * @returns {string} 들여쓰기된 JSON 문자열
 */
export function stringifyEcampusClassroomResources(resources: EcampusClassroomResources): string {
  return JSON.stringify(resources, null, 2);
}

/**
 * 강의실 항목 배열을 CLI 출력에 적합한 JSON으로 직렬화한다.
 * @param {EcampusClassroomItem[]} items - 강의실 항목 배열
 * @returns {string} 들여쓰기된 JSON 문자열
 */
export function stringifyEcampusClassroomItems(items: EcampusClassroomItem[]): string {
  return JSON.stringify(items, null, 2);
}

/**
 * 강의실 상세 HTML에서 다운로드 가능한 첨부파일 링크를 추출한다.
 * @param {string} html - 상세 화면 HTML
 * @param {EcampusClassroomResourceOptions} options - URL 보정 옵션
 * @returns {EcampusClassroomAttachment[]} 첨부파일 제목과 URL 배열
 */
export function parseEcampusClassroomAttachmentsHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomAttachment[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);
  const attachments: EcampusClassroomAttachment[] = [];
  const seen = new Set<string>();

  $("script, style, noscript").remove();

  $("a[href], a[onclick], button[onclick], [data-url], [data-href]").each((_, element) => {
    const node = $(element);
    const url = extractAttachmentUrl(node, baseUrl);
    if (!url) return;

    const rawText = normalizeSpace(
      [
        node.text(),
        node.attr("href") ?? "",
        node.attr("onclick") ?? "",
        node.attr("data-url") ?? "",
        node.attr("data-href") ?? "",
        node
          .closest(
            ".inline.field, .file, .filebox, .attach, .attachment, .paperclip, li, tr, td, dd"
          )
          .text()
      ]
        .filter(Boolean)
        .join(" ")
    );

    if (!looksLikeAttachmentCandidate(rawText) && !looksLikeAttachmentUrl(url)) return;

    const title = extractAttachmentTitle(node, url);
    const key = `${title}::${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    attachments.push({ title, url });
  });

  if (attachments.length === 0) {
    $("a[href], button[onclick], [data-url], [data-href]").each((_, element) => {
      const node = $(element);
      const url = extractAttachmentUrl(node, baseUrl);
      if (!url || !looksLikeAttachmentUrl(url)) return;

      const title = extractAttachmentTitle(node, url);
      const key = `${title}::${url}`;
      if (seen.has(key)) return;
      seen.add(key);
      attachments.push({ title, url });
    });
  }

  return attachments;
}

/**
 * 일반적인 게시판(NOTICE, PDS) 형태의 HTML 리스트를 공통 파싱한다.
 * @param {string} html - 게시판 목록 HTML
 * @param {Exclude<EcampusClassroomSection, "assignments">} section - 공지 또는 강의자료 섹션
 * @param {EcampusClassroomResourceOptions} options - 파싱 옵션
 * @returns {EcampusClassroomItem[]} 게시판 항목 배열
 */
function parseBbsListHtml(
  html: string,
  section: Exclude<EcampusClassroomSection, "assignments">,
  options: EcampusClassroomResourceOptions
): EcampusClassroomItem[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);
  const items: EcampusClassroomItem[] = [];
  const seenIds = new Set<string>();

  // 구버전 화면과 SAZ fixture에는 링크 자체에 viewAtcl 호출이 들어간다.
  $("a[href^='javascript:viewAtcl']").each((_, link) => {
    const $link = $(link);
    const args = parseFunctionArguments($link.attr("href") ?? "");
    let bbsId = args[0] ?? "";
    let atclId = args[1] ?? "";
    // 방어: 첫 arg가 ATCL이면 순서가 반대인 경우 처리 (일부 onclick 변형)
    if (atclId && atclId.startsWith("ATCL_") && bbsId.startsWith("ATCL_")) {
      [bbsId, atclId] = [atclId, bbsId];
    }
    if (!atclId && bbsId.startsWith("ATCL_")) {
      atclId = bbsId;
      bbsId = "";
    }
    const li = $link.closest("li");
    const title = normalizeSpace($link.find("span").first().text() || $link.text());
    const date = extractDate(li.text() || $link.closest("li, tr, .item").text());
    const crsCreCd = options.crsCreCd ?? extractCrsCreCdFromBbsId(bbsId);
    const resolvedBbsId =
      bbsId ||
      options.bbsId ||
      (crsCreCd ? `BBS_${crsCreCd}_${section === "materials" ? "P" : "N"}` : "");
    const bbsCd = resolvedBbsId.endsWith("_P")
      ? "PDS"
      : resolvedBbsId.endsWith("_N")
        ? "NOTICE"
        : "";
    const body = {
      formType: "VIEW",
      bbsId: resolvedBbsId,
      atclId,
      bbsCd,
      crsCreCd: crsCreCd || ""
    };

    if (atclId && title && !seenIds.has(atclId)) {
      seenIds.add(atclId);
      items.push({
        id: atclId,
        title,
        url: absoluteUrl(VIEW_ATCL_PATH, baseUrl),
        request: {
          method: "POST" as const,
          url: absoluteUrl(VIEW_ATCL_CONTENT_PATH, baseUrl),
          body
        },
        date,
        hasAttachment: li.find(".paperclip").length > 0 || /paperclip/.test(li.html() ?? "")
      });
    }
  });

  // 현재 AJAX fragment는 li onclick에만 게시글 식별자를 담는다.
  $("li[onclick*='viewAtcl'], li[onclick*=\"viewAtcl\"]").each((_, li) => {
    const $li = $(li);
    const onclick = $li.attr("onclick") || $li.attr("onClick") || "";
    const args = parseFunctionArguments(onclick);
    let bbsIdFromArg = "";
    let atclId = "";
    if (args.length > 0) {
      if (args[0] && args[0].startsWith("BBS_")) {
        bbsIdFromArg = args[0];
        atclId = args[1] || "";
      } else if (args[0] && args[0].startsWith("ATCL_")) {
        atclId = args[0];
        bbsIdFromArg = args[1] && args[1].startsWith("BBS_") ? args[1] : "";
      } else {
        atclId = args.find((a) => a.startsWith("ATCL_")) || "";
        bbsIdFromArg = args.find((a) => a.startsWith("BBS_")) || "";
      }
    }
    const resolvedBbsId =
      bbsIdFromArg ||
      options.bbsId ||
      (options.crsCreCd ? `BBS_${options.crsCreCd}_${section === "materials" ? "P" : "N"}` : "");
    if (!atclId || !resolvedBbsId) return;
    const crsCreCd = options.crsCreCd ?? extractCrsCreCdFromBbsId(resolvedBbsId);
    const bbsCd = resolvedBbsId.endsWith("_P")
      ? "PDS"
      : resolvedBbsId.endsWith("_N")
        ? "NOTICE"
        : "";
    const body = {
      formType: "VIEW",
      bbsId: resolvedBbsId,
      atclId,
      bbsCd,
      crsCreCd: crsCreCd || ""
    };

    const title = normalizeSpace(
      $li.find("a span").first().text() || $li.find("span").last().text() || $li.text()
    );
    const date = extractDate($li.text());
    const hasAttachment = $li.find(".paperclip").length > 0 || /paperclip/.test($li.html() ?? "");

    if (title && !seenIds.has(atclId)) {
      seenIds.add(atclId);
      items.push({
        id: atclId,
        title,
        url: absoluteUrl(VIEW_ATCL_PATH, baseUrl),
        request: {
          method: "POST" as const,
          url: absoluteUrl(VIEW_ATCL_CONTENT_PATH, baseUrl),
          body
        },
        date,
        hasAttachment
      });
    }
  });

  return items.filter((item) => item.id && item.title);
}

/**
 * 링크 속성 후보에서 첨부파일 URL을 추출한다.
 * @param {cheerio.Cheerio<any>} node - URL 후보를 가진 DOM 노드
 * @param {string} baseUrl - 상대 경로 보정용 기준 URL
 * @returns {string | undefined} 다운로드 URL
 */
function extractAttachmentUrl(node: cheerio.Cheerio<any>, baseUrl: string): string | undefined {
  const attributes = [
    node.attr("data-url"),
    node.attr("data-href"),
    node.attr("href"),
    node.attr("onclick")
  ].filter((value): value is string => !!value);

  for (const attribute of attributes) {
    const url = extractUrlCandidate(attribute, baseUrl);
    if (url) return url;
  }

  return undefined;
}

/**
 * href, onclick, data 속성에서 실제 다운로드 후보 URL을 찾아낸다.
 * @param {string} source - URL 또는 JavaScript 호출 문자열
 * @param {string} baseUrl - 상대 경로 보정용 기준 URL
 * @returns {string | undefined} 절대 URL 문자열
 */
function extractUrlCandidate(source: string, baseUrl: string): string | undefined {
  const trimmed = source.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return absoluteUrl(trimmed, baseUrl);
  }

  // javascript:fileDown('TOKEN') 패턴 지원 (실제 브라우저 캡처에서 확인된 첨부 다운로드 트리거)
  const fileDownMatch = trimmed.match(/fileDown\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
  if (fileDownMatch?.[1]) {
    const token = fileDownMatch[1];
    return absoluteUrl(`/file/download/${token}`, baseUrl);
  }

  const directMatch = trimmed.match(/(?:https?:\/\/[^"'`\s<>]+|\/[^"'`\s<>]+(?:\?[^"'`\s<>]*)?)/i);
  if (directMatch?.[0]) {
    return absoluteUrl(directMatch[0], baseUrl);
  }

  const quotedMatches = Array.from(trimmed.matchAll(/["'`]([^"'`]+)["'`]/g)).map((m) => m[1]!);
  for (const quoted of quotedMatches) {
    if (/^(https?:\/\/|\/)/i.test(quoted)) {
      return absoluteUrl(quoted, baseUrl);
    }
    if (/\.(pdf|hwp|docx?|pptx?|xlsx?|zip|rar|txt|jpg|jpeg|png|gif)(\?|$)/i.test(quoted)) {
      return absoluteUrl(quoted, baseUrl);
    }
    if (
      /(download|down|file|attach|첨부|fileNo|fileId|fileSn|fileSeq|atch|attachNo|downFile|downloadFile)/i.test(
        quoted
      )
    ) {
      return absoluteUrl(quoted, baseUrl);
    }
  }

  return undefined;
}

/**
 * 화면 텍스트와 URL 메타데이터를 조합해 첨부파일 제목을 결정한다.
 * @param {cheerio.Cheerio<any>} node - 첨부파일 링크 DOM 노드
 * @param {string} url - 추출된 첨부파일 URL
 * @returns {string} 첨부파일 표시 제목
 */
function extractAttachmentTitle(node: cheerio.Cheerio<any>, url: string): string {
  const downloadAttr = node.attr("download");
  if (downloadAttr && downloadAttr.trim() !== "true") {
    return downloadAttr.trim();
  }

  const text = normalizeSpace(node.text());
  if (text && !/^(다운로드|download|첨부|보기|열기)$/i.test(text)) {
    return text;
  }

  try {
    const parsed = new URL(url);
    const fileNameKeys = ["fileName", "filename", "fileNm", "oriFileNm", "saveFileNm", "name"];
    for (const key of fileNameKeys) {
      const value = parsed.searchParams.get(key);
      if (value) return value;
    }

    const lastPath = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastPath) return decodeURIComponent(lastPath);
  } catch {}

  return "attachment";
}

/**
 * 링크 주변 텍스트가 첨부파일 UI인지 판별한다.
 * @param {string} text - 링크와 주변 영역에서 모은 텍스트
 * @returns {boolean} 첨부파일 후보 여부
 */
function looksLikeAttachmentCandidate(text: string): boolean {
  return /(첨부|첨부파일|파일|download|다운로드|down|attach|paperclip|자료|fileDown)/i.test(text);
}

/**
 * URL 패턴만으로 첨부파일 다운로드 가능성을 판별한다.
 * @param {string} url - 검사할 URL
 * @returns {boolean} 첨부파일 URL 후보 여부
 */
function looksLikeAttachmentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const query = parsed.searchParams;

    if (/\.(pdf|hwp|docx?|pptx?|xlsx?|zip|rar|txt|jpg|jpeg|png|gif)(\?|$)/i.test(pathname)) {
      return true;
    }

    if (/(download|down|file|attach|paperclip|자료)/i.test(pathname)) {
      return true;
    }
    if (/^\/file\/download\//i.test(pathname)) {
      return true;
    }

    const queryKeys = [
      "fileNo",
      "fileId",
      "fileSn",
      "fileSeq",
      "atchFileId",
      "atchFileNo",
      "attachNo",
      "attachId",
      "downFile",
      "downloadFile",
      "fileName",
      "filename",
      "oriFileNm",
      "saveFileNm"
    ];
    return queryKeys.some((key) => query.has(key));
  } catch {
    return false;
  }
}

/**
 * 상세 조회에 필요한 HTML 폼 필드를 수집한다.
 * @param {cheerio.CheerioAPI} $ - cheerio 파서 인스턴스
 * @param {string} selector - 폼 선택자
 * @returns {Record<string, string>} input name/value 맵
 */
function getFormValues($: cheerio.CheerioAPI, selector: string): Record<string, string> {
  const values: Record<string, string> = {};
  $(`${selector} input[name]`).each((_, input) => {
    const name = $(input).attr("name");
    if (name) values[name] = $(input).attr("value") ?? "";
  });
  return values;
}

/**
 * 게시판 식별 코드에서 과목 고유 ID를 분리한다.
 * @param {string} bbsId - BBS_로 시작하는 게시판 식별자
 * @returns {string} 과목 고유 ID 또는 빈 문자열
 */
function extractCrsCreCdFromBbsId(bbsId: string): string {
  return bbsId.match(/^BBS_(.+)_[A-Z]$/)?.[1] ?? "";
}

/**
 * 게시글 텍스트에서 e-campus 날짜 리터럴을 추출한다.
 * @param {string} text - 게시글 행 텍스트
 * @returns {string | undefined} yyyy.MM.dd 형식의 날짜 문자열
 */
function extractDate(text: string): string | undefined {
  return text.match(/\b20\d{2}\.\d{2}\.\d{2}\b/)?.[0];
}
