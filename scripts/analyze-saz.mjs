import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import AdmZip from "adm-zip";

const DEFAULT_INPUT = "FILES/e러닝.saz";
const DEFAULT_OUTPUT = "FILES/e러닝-expanded";
const BODY_PREVIEW_LIMIT = 4000;
const TEXT_CONTENT_TYPES = [
  "text/",
  "application/json",
  "application/javascript",
  "application/x-javascript",
  "application/xml",
  "application/xhtml+xml",
  "application/x-www-form-urlencoded"
];

/**
 * 출력 디렉터리를 재귀적으로 보장한다.
 * @param {string} dirPath - 생성할 디렉터리 경로
 * @returns {void} 반환값 없음
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * ZIP 엔트리의 내용을 UTF-8 텍스트로 읽는다.
 * @param {import("adm-zip").IZipEntry | null | undefined} entry - 읽을 ZIP 엔트리
 * @returns {string} 엔트리 텍스트 또는 빈 문자열
 */
function readEntryText(entry) {
  return entry ? entry.getData().toString("utf8") : "";
}

/**
 * 원시 HTTP 메시지를 헤더와 본문으로 분리한다.
 * @param {string} text - 원시 HTTP 메시지
 * @returns {{ head: string; body: string }} 헤더와 본문 분리 결과
 */
function splitHeadBody(text) {
  const match = text.match(/\r?\n\r?\n/);
  if (!match || match.index === undefined) {
    return { head: text, body: "" };
  }

  return {
    head: text.slice(0, match.index),
    body: text.slice(match.index + match[0].length)
  };
}

/**
 * 원시 헤더 라인을 키-값 배열로 파싱한다.
 * @param {string[]} lines - HTTP 헤더 라인 배열
 * @returns {{ key: string; value: string }[]} 파싱된 헤더 배열
 */
function parseHeaders(lines) {
  const headers = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    headers.push({
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim()
    });
  }

  return headers;
}

/**
 * 헤더 배열에서 이름이 일치하는 값을 대소문자 구분 없이 찾는다.
 * @param {{ key: string; value: string }[]} headers - 파싱된 헤더 배열
 * @param {string} name - 조회할 헤더 이름
 * @returns {string} 헤더 값 또는 빈 문자열
 */
function getHeaderValue(headers, name) {
  const lowerName = name.toLowerCase();
  return headers.find((header) => header.key.toLowerCase() === lowerName)?.value ?? "";
}

/**
 * 원시 HTTP 요청 텍스트를 분석용 객체로 변환한다.
 * @param {string} text - 원시 HTTP 요청 텍스트
 * @returns {{ requestLine: string; method: string; url: string; protocol: string; headers: { key: string; value: string }[]; body: string }} 파싱된 요청 정보
 */
function parseRequest(text) {
  const { head, body } = splitHeadBody(text);
  const lines = head.split(/\r?\n/).filter(Boolean);
  const requestLine = lines[0] ?? "";
  const [method = "", url = "", protocol = ""] = requestLine.split(" ");

  return {
    requestLine,
    method,
    url,
    protocol,
    headers: parseHeaders(lines.slice(1)),
    body
  };
}

/**
 * 원시 HTTP 응답 텍스트를 분석용 객체로 변환한다.
 * @param {string} text - 원시 HTTP 응답 텍스트
 * @returns {{ statusLine: string; protocol: string; statusCode: string; statusText: string; headers: { key: string; value: string }[]; body: string }} 파싱된 응답 정보
 */
function parseResponse(text) {
  const { head, body } = splitHeadBody(text);
  const lines = head.split(/\r?\n/).filter(Boolean);
  const statusLine = lines[0] ?? "";
  const statusMatch = statusLine.match(/^(\S+)\s+(\d{3})(?:\s+(.*))?$/);

  return {
    statusLine,
    protocol: statusMatch?.[1] ?? "",
    statusCode: statusMatch?.[2] ?? "",
    statusText: statusMatch?.[3] ?? "",
    headers: parseHeaders(lines.slice(1)),
    body
  };
}

/**
 * Fiddler 메타 XML에서 시간 관련 속성을 추출한다.
 * @param {string} xmlText - raw 메타 XML 텍스트
 * @returns {{ clientBegin: string; clientDone: string; gatewayTime: string; dnsTime: string; tcpConnectTime: string }} 파싱된 메타 정보
 */
function parseMeta(xmlText) {
  /**
   * XML 속성 값을 정규식으로 읽는다.
   * @param {string} name - 조회할 속성 이름
   * @returns {string} 속성 값 또는 빈 문자열
   */
  const attribute = (name) => xmlText.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] ?? "";

  return {
    clientBegin: attribute("ClientBeginRequest"),
    clientDone: attribute("ClientDoneResponse"),
    gatewayTime: attribute("GatewayTime"),
    dnsTime: attribute("DNSTime"),
    tcpConnectTime: attribute("TCPConnectTime")
  };
}

/**
 * 응답 본문을 텍스트 preview로 저장해도 되는지 판별한다.
 * @param {string} contentType - 응답 Content-Type
 * @param {string} body - 응답 본문
 * @returns {boolean} 텍스트성 본문 여부
 */
function isTextLike(contentType, body) {
  const lowerType = contentType.toLowerCase();
  if (TEXT_CONTENT_TYPES.some((prefix) => lowerType.startsWith(prefix))) {
    return true;
  }

  if (!body) {
    return true;
  }

  const sample = body.slice(0, 512);
  let suspicious = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    if (!printable) {
      suspicious += 1;
    }
  }

  return suspicious / Math.max(sample.length, 1) < 0.15;
}

/**
 * 분석 Markdown에 넣을 응답/요청 본문 preview를 만든다.
 * @param {string} body - 원본 본문
 * @param {string} contentType - 응답 또는 요청 Content-Type
 * @returns {string} 제한 길이가 적용된 preview 텍스트
 */
function previewBody(body, contentType) {
  if (!body) {
    return "(empty)";
  }

  if (!isTextLike(contentType, body)) {
    return "(binary content omitted)";
  }

  const cleaned = body.replace(/\0/g, "");
  if (cleaned.length <= BODY_PREVIEW_LIMIT) {
    return cleaned;
  }

  return `${cleaned.slice(0, BODY_PREVIEW_LIMIT)}\n\n... [truncated ${cleaned.length - BODY_PREVIEW_LIMIT} chars]`;
}

/**
 * 헤더 배열을 Markdown 코드 블록에 넣기 쉬운 문자열로 변환한다.
 * @param {{ key: string; value: string }[]} headers - 파싱된 헤더 배열
 * @returns {string} 줄 단위 헤더 문자열
 */
function formatHeaders(headers) {
  if (headers.length === 0) {
    return "(none)";
  }

  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}

/**
 * CSV 필드에 안전하도록 값을 이스케이프한다.
 * @param {unknown} value - CSV 셀 값
 * @returns {string} CSV 안전 문자열
 */
function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * 세션 파일명에 사용할 수 없는 문자를 치환한다.
 * @param {string} value - 원본 파일명
 * @returns {string} 파일 시스템에 안전한 이름
 */
function sanitizeFileName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

/**
 * 단일 HTTP 세션 상세 Markdown을 생성한다.
 * @param {object} session - 분석된 HTTP 세션 객체
 * @returns {string} 세션 상세 Markdown
 */
function buildSessionMarkdown(session) {
  return [
    `# Session ${session.id}`,
    "",
    "## Summary",
    `- Time: ${session.meta.clientBegin || "-"} -> ${session.meta.clientDone || "-"}`,
    `- Method: ${session.request.method || "-"}`,
    `- URL: ${session.request.url || "-"}`,
    `- Status: ${session.response.statusLine || "-"}`,
    `- Response bytes: ${session.responseBytes}`,
    `- Content-Type: ${session.responseContentType || "-"}`,
    "",
    "## Request Line",
    "```",
    session.request.requestLine || "",
    "```",
    "",
    "## Request Headers",
    "```",
    formatHeaders(session.request.headers),
    "```",
    "",
    "## Request Body Preview",
    "```",
    previewBody(session.request.body, getHeaderValue(session.request.headers, "content-type")),
    "```",
    "",
    "## Response Status",
    "```",
    session.response.statusLine || "",
    "```",
    "",
    "## Response Headers",
    "```",
    formatHeaders(session.response.headers),
    "```",
    "",
    "## Response Body Preview",
    "```",
    previewBody(session.response.body, session.responseContentType),
    "```",
    ""
  ].join("\n");
}

/**
 * 전체 SAZ 분석 인덱스 Markdown을 생성한다.
 * @param {string} sourcePath - 분석 대상 SAZ 파일 경로
 * @param {object[]} sessions - 분석된 세션 배열
 * @param {object[]} endpointStats - endpoint별 집계 배열
 * @param {object[]} hostStats - host별 집계 배열
 * @returns {string} 분석 인덱스 Markdown
 */
function buildIndexMarkdown(sourcePath, sessions, endpointStats, hostStats) {
  const hostRows = hostStats
    .slice(0, 20)
    .map((item) => `| ${item.count} | ${item.host} |`)
    .join("\n");

  const endpointRows = endpointStats
    .slice(0, 30)
    .map((item) => `| ${item.count} | \`${item.method}\` | \`${item.path}\` |`)
    .join("\n");

  const endpointStatusRows = endpointStats
    .slice(0, 30)
    .map(
      (item) =>
        `| ${item.count} | \`${item.method}\` | \`${item.path}\` | ${item.statusCodes.join(", ")} |`
    )
    .join("\n");

  const largestRows = [...sessions]
    .sort((left, right) => right.responseBytes - left.responseBytes)
    .slice(0, 20)
    .map(
      (session) =>
        `| ${session.id} | \`${session.request.method}\` | \`${session.request.url}\` | ${session.responseBytes} | ${session.responseContentType || "-"} |`
    )
    .join("\n");

  const sessionRows = sessions
    .map(
      (session) =>
        `| ${session.id} | ${session.meta.clientBegin || "-"} | \`${session.request.method}\` | \`${session.request.url}\` | ${session.response.statusCode || "-"} | ${session.responseBytes} | [open](./sessions/${session.id}.md) |`
    )
    .join("\n");

  return [
    "# SAZ Analysis",
    "",
    `- Source: \`${sourcePath}\``,
    `- Total sessions: ${sessions.length}`,
    `- Generated at: ${new Date().toISOString()}`,
    "",
    "## Host Summary",
    "| Count | Host |",
    "| --- | --- |",
    hostRows,
    "",
    "## Endpoint Summary",
    "| Count | Method | Path |",
    "| --- | --- | --- |",
    endpointRows,
    "",
    "## Endpoint Summary With Status",
    "| Count | Method | Path | Status codes |",
    "| --- | --- | --- | --- |",
    endpointStatusRows,
    "",
    "## Largest Responses",
    "| Session | Method | URL | Bytes | Content-Type |",
    "| --- | --- | --- | ---: | --- |",
    largestRows,
    "",
    "## All Sessions",
    "| Session | Start | Method | URL | Status | Bytes | Detail |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
    sessionRows,
    ""
  ].join("\n");
}

/**
 * Fiddler SAZ 파일을 Markdown, JSON, CSV 분석 결과로 펼친다.
 * @param {string} [inputArg=DEFAULT_INPUT] - 입력 SAZ 파일 경로
 * @param {string} [outputArg=DEFAULT_OUTPUT] - 결과를 저장할 디렉터리
 * @returns {void} 반환값 없음
 * @throws {Error} 입력 파일이 없을 때 발생
 */
export function analyzeSaz(inputArg = DEFAULT_INPUT, outputArg = DEFAULT_OUTPUT) {
  const inputPath = path.resolve(process.cwd(), inputArg);
  const outputPath = path.resolve(process.cwd(), outputArg);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  ensureDir(outputPath);
  ensureDir(path.join(outputPath, "sessions"));

  const zip = new AdmZip(inputPath);
  const entries = zip.getEntries();
  const sessionIds = entries
    .map((entry) => entry.entryName.match(/^raw\/(\d{3})_c\.txt$/)?.[1] ?? "")
    .filter(Boolean)
    .sort();

  const sessions = sessionIds.map((id) => {
    const requestEntry = zip.getEntry(`raw/${id}_c.txt`);
    const responseEntry = zip.getEntry(`raw/${id}_s.txt`);
    const metaEntry = zip.getEntry(`raw/${id}_m.xml`);

    const request = parseRequest(readEntryText(requestEntry));
    const response = parseResponse(readEntryText(responseEntry));
    const meta = parseMeta(readEntryText(metaEntry));
    const responseContentType = getHeaderValue(response.headers, "content-type");

    let parsedUrl = null;
    try {
      parsedUrl = request.url ? new URL(request.url) : null;
    } catch {
      parsedUrl = null;
    }

    return {
      id,
      request,
      response,
      meta,
      host: parsedUrl?.host ?? getHeaderValue(request.headers, "host") ?? "",
      path: parsedUrl?.pathname ?? request.url,
      query: parsedUrl?.search ?? "",
      responseContentType,
      responseBytes: responseEntry?.header.size ?? 0,
      requestBytes: requestEntry?.header.size ?? 0
    };
  });

  const endpointMap = new Map();
  const hostMap = new Map();

  for (const session of sessions) {
    const endpointKey = `${session.request.method} ${session.path}`;
    const endpoint = endpointMap.get(endpointKey) ?? {
      method: session.request.method,
      path: session.path,
      count: 0,
      statusCodes: new Set()
    };
    endpoint.count += 1;
    if (session.response.statusCode) {
      endpoint.statusCodes.add(session.response.statusCode);
    }
    endpointMap.set(endpointKey, endpoint);

    const hostKey = session.host || "(unknown)";
    hostMap.set(hostKey, (hostMap.get(hostKey) ?? 0) + 1);
  }

  const endpointStats = [...endpointMap.values()]
    .map((endpoint) => ({
      ...endpoint,
      statusCodes: [...endpoint.statusCodes].sort()
    }))
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));

  const hostStats = [...hostMap.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort((left, right) => right.count - left.count || left.host.localeCompare(right.host));

  for (const session of sessions) {
    fs.writeFileSync(
      path.join(outputPath, "sessions", `${sanitizeFileName(session.id)}.md`),
      buildSessionMarkdown(session),
      "utf8"
    );
  }

  const summaryJson = {
    source: inputPath,
    generatedAt: new Date().toISOString(),
    totalSessions: sessions.length,
    hosts: hostStats,
    endpoints: endpointStats,
    sessions: sessions.map((session) => ({
      id: session.id,
      start: session.meta.clientBegin,
      end: session.meta.clientDone,
      method: session.request.method,
      host: session.host,
      path: session.path,
      url: session.request.url,
      statusCode: session.response.statusCode,
      statusText: session.response.statusText,
      contentType: session.responseContentType,
      requestBytes: session.requestBytes,
      responseBytes: session.responseBytes,
      query: session.query
    }))
  };

  const summaryCsv = [
    [
      "id",
      "start",
      "end",
      "method",
      "host",
      "path",
      "url",
      "statusCode",
      "contentType",
      "requestBytes",
      "responseBytes"
    ].join(","),
    ...sessions.map((session) =>
      [
        session.id,
        session.meta.clientBegin,
        session.meta.clientDone,
        session.request.method,
        session.host,
        session.path,
        session.request.url,
        session.response.statusCode,
        session.responseContentType,
        session.requestBytes,
        session.responseBytes
      ]
        .map(csvEscape)
        .join(",")
    )
  ].join("\n");

  fs.writeFileSync(
    path.join(outputPath, "index.md"),
    buildIndexMarkdown(inputPath, sessions, endpointStats, hostStats),
    "utf8"
  );
  fs.writeFileSync(
    path.join(outputPath, "summary.json"),
    JSON.stringify(summaryJson, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(outputPath, "summary.csv"), summaryCsv, "utf8");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  analyzeSaz(process.argv[2] ?? DEFAULT_INPUT, process.argv[3] ?? DEFAULT_OUTPUT);
}
