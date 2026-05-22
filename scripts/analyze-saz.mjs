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
  "application/x-www-form-urlencoded",
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readEntryText(entry) {
  return entry ? entry.getData().toString("utf8") : "";
}

function splitHeadBody(text) {
  const match = text.match(/\r?\n\r?\n/);
  if (!match || match.index === undefined) {
    return { head: text, body: "" };
  }

  return {
    head: text.slice(0, match.index),
    body: text.slice(match.index + match[0].length),
  };
}

function parseHeaders(lines) {
  const headers = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    headers.push({
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim(),
    });
  }

  return headers;
}

function getHeaderValue(headers, name) {
  const lowerName = name.toLowerCase();
  return headers.find((header) => header.key.toLowerCase() === lowerName)?.value ?? "";
}

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
    body,
  };
}

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
    body,
  };
}

function parseMeta(xmlText) {
  const attribute = (name) =>
    xmlText.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1] ?? "";

  return {
    clientBegin: attribute("ClientBeginRequest"),
    clientDone: attribute("ClientDoneResponse"),
    gatewayTime: attribute("GatewayTime"),
    dnsTime: attribute("DNSTime"),
    tcpConnectTime: attribute("TCPConnectTime"),
  };
}

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
    const printable =
      code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    if (!printable) {
      suspicious += 1;
    }
  }

  return suspicious / Math.max(sample.length, 1) < 0.15;
}

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

function formatHeaders(headers) {
  if (headers.length === 0) {
    return "(none)";
  }

  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function sanitizeFileName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
}

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
    previewBody(
      session.request.body,
      getHeaderValue(session.request.headers, "content-type"),
    ),
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
    "",
  ].join("\n");
}

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
        `| ${item.count} | \`${item.method}\` | \`${item.path}\` | ${item.statusCodes.join(", ")} |`,
    )
    .join("\n");

  const largestRows = [...sessions]
    .sort((left, right) => right.responseBytes - left.responseBytes)
    .slice(0, 20)
    .map(
      (session) =>
        `| ${session.id} | \`${session.request.method}\` | \`${session.request.url}\` | ${session.responseBytes} | ${session.responseContentType || "-"} |`,
    )
    .join("\n");

  const sessionRows = sessions
    .map(
      (session) =>
        `| ${session.id} | ${session.meta.clientBegin || "-"} | \`${session.request.method}\` | \`${session.request.url}\` | ${session.response.statusCode || "-"} | ${session.responseBytes} | [open](./sessions/${session.id}.md) |`,
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
    "",
  ].join("\n");
}

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
      requestBytes: requestEntry?.header.size ?? 0,
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
      statusCodes: new Set(),
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
      statusCodes: [...endpoint.statusCodes].sort(),
    }))
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));

  const hostStats = [...hostMap.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort((left, right) => right.count - left.count || left.host.localeCompare(right.host));

  for (const session of sessions) {
    fs.writeFileSync(
      path.join(outputPath, "sessions", `${sanitizeFileName(session.id)}.md`),
      buildSessionMarkdown(session),
      "utf8",
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
      query: session.query,
    })),
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
      "responseBytes",
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
        session.responseBytes,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");

  fs.writeFileSync(
    path.join(outputPath, "index.md"),
    buildIndexMarkdown(inputPath, sessions, endpointStats, hostStats),
    "utf8",
  );
  fs.writeFileSync(
    path.join(outputPath, "summary.json"),
    JSON.stringify(summaryJson, null, 2),
    "utf8",
  );
  fs.writeFileSync(path.join(outputPath, "summary.csv"), summaryCsv, "utf8");
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  analyzeSaz(process.argv[2] ?? DEFAULT_INPUT, process.argv[3] ?? DEFAULT_OUTPUT);
}
