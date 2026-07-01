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

/** 신규 리소스 컨테이너 초기화 */
export function createEmptyEcampusClassroomResources(): EcampusClassroomResources {
  return { notices: [], assignments: [], materials: [] };
}

/** 공지사항 게시판 리스트 파싱 */
export function parseEcampusNoticeListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "notices", options);
}

/** 강의자료실 게시판 리스트 파싱 */
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

/** 통합 리소스 데이터를 가독성 있는 JSON으로 직렬화 */
export function stringifyEcampusClassroomResources(resources: EcampusClassroomResources): string {
  return JSON.stringify(resources, null, 2);
}

/** 항목 리스트를 가독성 있는 JSON으로 직렬화 */
export function stringifyEcampusClassroomItems(items: EcampusClassroomItem[]): string {
  return JSON.stringify(items, null, 2);
}

/** 강의실 상세 HTML에서 다운로드 가능한 첨부파일 링크를 추출한다 */
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
 * @private
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

  // 1) Direct <a href="javascript:viewAtcl(...)"> style (classRoomAtclList, older atclListForm pages, SAZ fixtures)
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

  // 2) li[onclick*="viewAtcl"] style from current /atclList ajax fragment responses (postBoardList)
  //    예: <li onclick="javascript:viewAtcl('ATCL_xxx', null, '10291');"> ... <a href="javascript:void(0)"><span>title</span><i class="paperclip"></i></a>
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

function looksLikeAttachmentCandidate(text: string): boolean {
  return /(첨부|첨부파일|파일|download|다운로드|down|attach|paperclip|자료|fileDown)/i.test(text);
}

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
