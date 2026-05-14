import AdmZip from "adm-zip";
import * as cheerio from "cheerio";

export type EcampusClassroomSection = "notices" | "assignments" | "materials";

export interface EcampusPostRequest {
  method: "POST";
  url: string;
  body: Record<string, string>;
}

export interface EcampusClassroomItem {
  id: string;
  title: string;
  url: string;
  request: EcampusPostRequest;
  date?: string;
  period?: string;
  status?: string;
  hasAttachment?: boolean;
}

export interface EcampusClassroomResources {
  notices: EcampusClassroomItem[];
  assignments: EcampusClassroomItem[];
  materials: EcampusClassroomItem[];
}

export interface EcampusClassroomResourceOptions {
  baseUrl?: string;
  crsCreCd?: string;
}

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

export function createEmptyEcampusClassroomResources(): EcampusClassroomResources {
  return {
    notices: [],
    assignments: [],
    materials: []
  };
}

export function parseEcampusNoticeListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "notices", options);
}

export function parseEcampusMaterialListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseBbsListHtml(html, "materials", options);
}

export function parseEcampusAssignmentListHtml(
  html: string,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const $ = cheerio.load(html);
  const formValues = getFormValues($, "form#asmntListForm");
  const crsCreCd = options.crsCreCd ?? formValues.crsCreCd ?? "";

  return $("a[href^='javascript:asmntView']")
    .toArray()
    .map((link) => {
      const $link = $(link);
      const asmntCd = parseFunctionArguments($link.attr("href") ?? "")[0] ?? "";
      const card = $link.closest(".card");
      const text = normalizeSpace(card.text());
      const title = normalizeSpace($link.text());
      const period = text.match(/제출기간\s*([0-9.() :~]+)/)?.[1]?.trim();
      const status = text.match(/(과제를 제출하였습니다|미제출|종료|진행중)/)?.[1];
      const body = {
        ...formValues,
        crsCreCd,
        asmntCd
      };

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

export function parseEcampusClassroomResourcesFromSaz(
  sazFile: Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomResources {
  const sessions = parseFiddlerSazSessions(sazFile);
  const resources = createEmptyEcampusClassroomResources();
  const seen = new Map<EcampusClassroomSection, Map<string, EcampusClassroomItem>>();

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    seen.set(section, new Map());
  }

  for (const session of sessions) {
    const section = classifySession(session);
    if (!section) {
      continue;
    }

    const crsCreCd = options.crsCreCd ?? session.request.body.crsCreCd;
    const list =
      section === "assignments"
        ? parseEcampusAssignmentListHtml(session.responseBody, { ...options, crsCreCd })
        : parseBbsListHtml(session.responseBody, section, { ...options, crsCreCd });

    for (const item of list) {
      const bucket = seen.get(section);
      if (!bucket) {
        continue;
      }

      const current = bucket.get(item.id);
      bucket.set(item.id, current ? mergeItem(current, item) : item);
    }
  }

  for (const section of Object.keys(resources) as EcampusClassroomSection[]) {
    resources[section] = Array.from(seen.get(section)?.values() ?? []);
  }

  return resources;
}

export function parseEcampusNoticeListFromSaz(
  sazFile: Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).notices;
}

export function parseEcampusAssignmentListFromSaz(
  sazFile: Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).assignments;
}

export function parseEcampusMaterialListFromSaz(
  sazFile: Uint8Array,
  options: EcampusClassroomResourceOptions = {}
): EcampusClassroomItem[] {
  return parseEcampusClassroomResourcesFromSaz(sazFile, options).materials;
}

export function stringifyEcampusClassroomResources(resources: EcampusClassroomResources): string {
  return JSON.stringify(resources, null, 2);
}

export function stringifyEcampusClassroomItems(items: EcampusClassroomItem[]): string {
  return JSON.stringify(items, null, 2);
}

function parseBbsListHtml(
  html: string,
  section: Exclude<EcampusClassroomSection, "assignments">,
  options: EcampusClassroomResourceOptions
): EcampusClassroomItem[] {
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
      const body = {
        bbsId,
        atclId,
        crsCreCd
      };

      return {
        id: atclId,
        title,
        url: absoluteUrl(VIEW_ATCL_PATH, baseUrl),
        request: {
          method: "POST" as const,
          url: absoluteUrl(VIEW_ATCL_PATH, baseUrl),
          body
        },
        date,
        hasAttachment: li.find(".paperclip").length > 0 || /paperclip/.test(li.html() ?? "")
      };
    })
    .filter((item) => item.id && item.title);
}

function parseFiddlerSazSessions(sazFile: Uint8Array): RawHttpSession[] {
  const zip = new AdmZip(Buffer.from(sazFile));
  const decoder = new TextDecoder("utf-8");
  const entries = new Map(zip.getEntries().map((entry) => [entry.entryName.replace(/\\/g, "/"), entry]));
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
      const [responseHeader, responseBody] = splitHttpMessage(responseRaw);
      const requestLine = requestHeader.split(/\r?\n/)[0] ?? "";
      const [method = "", url = ""] = requestLine.split(" ");

      if (!responseHeader.startsWith("HTTP/")) {
        return undefined;
      }

      return {
        number: Number(number),
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

function classifySession(session: RawHttpSession): EcampusClassroomSection | undefined {
  const requestUrl = new URL(session.request.url);
  const path = requestUrl.pathname;
  const body = session.request.body;

  if (path === "/asmnt/asmntHome/stuAsmntGridList") {
    return "assignments";
  }

  if (path === "/bbs/bbsLect/classRoomAtclList" || path === "/bbs/bbsLect/atclList") {
    if (body.bbsCd === "NOTICE" || body.bbsId?.endsWith("_N")) {
      return "notices";
    }

    if (body.bbsCd === "PDS" || body.bbsId?.endsWith("_P")) {
      return "materials";
    }
  }

  return undefined;
}

function splitHttpMessage(message: string): [string, string] {
  const crlfIndex = message.indexOf("\r\n\r\n");
  if (crlfIndex >= 0) {
    return [message.slice(0, crlfIndex), message.slice(crlfIndex + 4)];
  }

  const lfIndex = message.indexOf("\n\n");
  if (lfIndex >= 0) {
    return [message.slice(0, lfIndex), message.slice(lfIndex + 2)];
  }

  return [message, ""];
}

function parseFormBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body.trim());
  const result: Record<string, string> = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
}

function getFormValues($: cheerio.CheerioAPI, selector: string): Record<string, string> {
  const values: Record<string, string> = {};

  $(`${selector} input[name]`).each((_, input) => {
    const name = $(input).attr("name");
    if (!name) {
      return;
    }

    values[name] = $(input).attr("value") ?? "";
  });

  return values;
}

function parseFunctionArguments(source: string): string[] {
  const match = source.match(/\((.*)\)/);
  if (!match?.[1]) {
    return [];
  }

  const args: string[] = [];
  const regex = /'([^']*)'|"([^"]*)"|([^,\s)]+)/g;
  let arg: RegExpExecArray | null;

  while ((arg = regex.exec(match[1]))) {
    args.push(arg[1] ?? arg[2] ?? arg[3] ?? "");
  }

  return args;
}

function extractCrsCreCdFromBbsId(bbsId: string): string {
  const match = bbsId.match(/^BBS_(.+)_[A-Z]$/);
  return match?.[1] ?? "";
}

function extractDate(text: string): string | undefined {
  return text.match(/\b20\d{2}\.\d{2}\.\d{2}\b/)?.[0];
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function absoluteUrl(pathOrUrl: string, baseUrl: string): string {
  return new URL(pathOrUrl, baseUrl).toString();
}

function mergeItem(current: EcampusClassroomItem, next: EcampusClassroomItem): EcampusClassroomItem {
  return {
    ...current,
    ...next,
    date: next.date ?? current.date,
    period: next.period ?? current.period,
    status: next.status ?? current.status,
    hasAttachment: next.hasAttachment ?? current.hasAttachment
  };
}
