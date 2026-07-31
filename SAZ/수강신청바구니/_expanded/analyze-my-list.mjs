import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const SAZ = "files/수강신청바구니/수강신청 바구니 내가 신청한 강의 목록과 시간표 조회.saz";
const OUT = "files/수강신청바구니/_expanded/my-list-timetable";
const RS = String.fromCharCode(0x1e);
const US = String.fromCharCode(0x1f);

function splitHeadBody(text) {
  const m = text.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return { head: text, body: "" };
  return { head: text.slice(0, m.index), body: text.slice(m.index + m[0].length) };
}

function parseSessions(sazPath) {
  const zip = new AdmZip(sazPath);
  const entries = new Map(zip.getEntries().map((e) => [e.entryName.replace(/\\/g, "/"), e]));
  const nums = [...entries.keys()]
    .map((n) => n.match(/^raw\/(\d+)_c\.txt$/)?.[1])
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));

  return nums.map((n) => {
    const reqE = entries.get(`raw/${n}_c.txt`);
    const resE = entries.get(`raw/${n}_s.txt`);
    const reqText = reqE?.getData().toString("utf8") ?? "";
    const resText = resE?.getData().toString("utf8") ?? "";
    const { head: reqHead, body: reqBody } = splitHeadBody(reqText);
    const { head: resHead, body: resBody } = splitHeadBody(resText);
    const first = reqHead.split(/\r?\n/)[0] || "";
    const [method = "", url = ""] = first.split(" ");
    let pathname = url;
    let host = "";
    try {
      if (url.startsWith("http")) {
        const u = new URL(url);
        pathname = u.pathname;
        host = u.host;
      } else {
        pathname = new URL(url, "http://x").pathname;
      }
    } catch {
      // keep raw
    }
    for (const line of reqHead.split(/\r?\n/).slice(1)) {
      if (/^host:/i.test(line)) host = line.split(":").slice(1).join(":").trim();
    }
    const status = (resHead.split(/\r?\n/)[0] || "").match(/\s(\d{3})\b/)?.[1] || "";
    const ct =
      resHead
        .split(/\r?\n/)
        .find((l) => /^content-type:/i.test(l))
        ?.split(":")
        .slice(1)
        .join(":")
        .trim() || "";
    return { n, method, url, host, pathname, status, ct, reqBody, resBody, resHead };
  });
}

const sessions = parseSessions(SAZ);
const interesting = sessions.filter((s) => {
  if (/CONNECT/i.test(s.method)) return false;
  if (/\.(png|jpg|jpeg|gif|ico|woff2?|ttf|map)(\?|$)/i.test(s.pathname)) return false;
  return true;
});

console.log("interesting sessions", interesting.length);
const byPath = new Map();
for (const s of interesting) {
  const key = `${s.method} ${s.pathname}`;
  if (!byPath.has(key)) byPath.set(key, []);
  byPath.get(key).push(s);
}

console.log("\n=== ALL INTERESTING PATHS ===");
for (const [k, arr] of [...byPath.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(String(arr.length).padStart(3), k, arr[0].ct.slice(0, 40));
}

// Dump key API bodies
const dumpKeys = [
  "findAppcs",
  "Hope",
  "hope",
  "saveHope",
  "findEstbl",
  "findMy",
  "callReport",
  "report_server",
  "xfdl",
  "Menu",
  "Code",
  "Sso",
  "sapl"
];

const apiDump = [];
for (const s of interesting) {
  if (!/\.do$|callReport|report_server|xfdl\.js|\.xjs\.js|portal|popup\.html/i.test(s.pathname)) {
    continue;
  }
  const sampleReq = s.reqBody.slice(0, 800).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "|");
  const sampleRes = s.resBody.slice(0, 1200).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "|");
  apiDump.push({
    n: s.n,
    method: s.method,
    path: s.pathname,
    status: s.status,
    ct: s.ct,
    reqLen: s.reqBody.length,
    resLen: s.resBody.length,
    reqPreview: sampleReq,
    resPreview: sampleRes
  });
}

fs.writeFileSync(path.join(OUT, "api-sessions.json"), JSON.stringify(apiDump, null, 2), "utf8");
console.log("\nwrote api-sessions.json", apiDump.length);

// Extract JS files that look relevant
const jsSessions = interesting.filter(
  (s) =>
    /\.js(\?|$)/i.test(s.pathname) &&
    /sapl|hope|appcs|timet|report|libSch|libComm|portal|saplap/i.test(s.pathname)
);
console.log("\n=== RELEVANT JS ===");
for (const s of jsSessions) {
  console.log(s.n, s.pathname, "bytes", s.resBody.length);
  const fileName = s.pathname.split("/").pop() || `session-${s.n}.js`;
  const safe = fileName.replace(/[^\w.-]+/g, "_");
  fs.writeFileSync(path.join(OUT, `js-${s.n}-${safe}`), s.resBody, "utf8");
}

// Search all JS response bodies for API path patterns
const apiHits = new Map();
for (const s of interesting) {
  if (!/\.js(\?|$)/i.test(s.pathname) && !/xfdl\.js/i.test(s.pathname)) continue;
  const body = s.resBody;
  const patterns = [
    /\/com\/[A-Za-z0-9_/]+\.do/g,
    /find[A-Za-z0-9_]+/g,
    /save[A-Za-z0-9_]+/g,
    /callReport[^"'\s]*/g,
    /report_server[^"'\s]*/g,
    /HopeAppcs[A-Za-z0-9_]*/g,
    /hopeAppcs[A-Za-z0-9_]*/g,
    /saplap[A-Za-z0-9_]*/g,
    /transaction\s*\(/gi,
    /gfn_[A-Za-z0-9_]+/g
  ];
  for (const re of patterns) {
    const matches = body.match(re) || [];
    for (const m of matches) {
      const key = `${s.pathname} :: ${m}`;
      apiHits.set(key, (apiHits.get(key) || 0) + 1);
    }
  }
}

const hitList = [...apiHits.entries()]
  .filter(([k]) =>
    /\/com\/|Hope|hope|callReport|report_server|findSapl|saveHope|findEstbl|findMy|Appcs/i.test(k)
  )
  .sort((a, b) => b[1] - a[1])
  .slice(0, 200);

fs.writeFileSync(path.join(OUT, "js-api-hits.json"), JSON.stringify(hitList, null, 2), "utf8");
console.log("\n=== TOP JS API HITS ===");
for (const [k, c] of hitList.slice(0, 80)) console.log(c, k);

// callReport details
console.log("\n=== callReport / report_server ===");
for (const s of interesting.filter((x) => /callReport|report_server/i.test(x.pathname))) {
  console.log("\n---", s.n, s.method, s.pathname, s.status);
  console.log("REQ", s.reqBody.slice(0, 500));
  if (/reportParams=/.test(s.reqBody)) {
    const m = s.reqBody.match(/reportParams=([^&]+)/);
    if (m) {
      try {
        const json = Buffer.from(decodeURIComponent(m[1]), "base64").toString("utf8");
        console.log("reportParams", json);
      } catch (e) {
        console.log("decode fail", e.message);
      }
    }
    const fp = s.reqBody.match(/filePath=([^&]+)/);
    if (fp) console.log("filePath", decodeURIComponent(fp[1]));
  }
  console.log("RES head", s.resBody.slice(0, 300).replace(/\s+/g, " "));
}
