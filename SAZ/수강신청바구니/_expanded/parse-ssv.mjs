import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const RS = String.fromCharCode(0x1e);
const US = String.fromCharCode(0x1f);
const EMPTY = String.fromCharCode(0x03);

function splitHeadBody(text) {
  const match = text.match(/\r?\n\r?\n/);
  if (!match || match.index === undefined) return { head: text, body: "" };
  return { head: text.slice(0, match.index), body: text.slice(match.index + match[0].length) };
}

function parseSsv(body) {
  if (!body || !body.startsWith("SSV:")) return { type: "other", raw: (body || "").slice(0, 120) };
  const parts = body.split(RS);
  const params = {};
  const datasets = [];
  let current = null;
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    if (p === undefined) continue;
    if (p.startsWith("Dataset:")) {
      current = { id: p.slice(8), columns: [], rows: [], sawCols: false };
      datasets.push(current);
      continue;
    }
    if (current) {
      if (
        !current.sawCols &&
        (p.startsWith("_RowType_") ||
          p.includes("STRING(") ||
          p.includes("string(") ||
          p.includes("bigdecimal") ||
          p.includes("datetime") ||
          p.includes("undefined") ||
          p.includes("int("))
      ) {
        const cols = p.split(US);
        current.columns = cols.slice(1).map((c) => {
          const m = c.match(/^([^:]+):/);
          return m ? m[1] : c;
        });
        current.sawCols = true;
        continue;
      }
      if (p === "") continue;
      const vals = p.split(US);
      const rowType = vals[0];
      const obj = { _rowType: rowType };
      current.columns.forEach((c, idx) => {
        let v = vals[idx + 1] ?? "";
        if (v === EMPTY) v = "";
        obj[c] = v;
      });
      current.rows.push(obj);
    } else {
      const m = p.match(/^([^=:]+)(?::[^=]+)?=(.*)$/s);
      if (m) params[m[1]] = m[2];
    }
  }
  return { type: "ssv", params, datasets };
}

function extract(file, pathIncludes) {
  const zip = new AdmZip(file);
  const entries = new Map(zip.getEntries().map((e) => [e.entryName.replace(/\\/g, "/"), e]));
  const nums = [...entries.keys()]
    .map((n) => n.match(/^raw\/(\d+)_c\.txt$/)?.[1])
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));
  const out = [];
  for (const n of nums) {
    const reqE = entries.get(`raw/${n}_c.txt`);
    const resE = entries.get(`raw/${n}_s.txt`);
    if (!reqE || !resE) continue;
    const { head, body } = splitHeadBody(reqE.getData().toString("utf8"));
    const first = head.split(/\r?\n/)[0] || "";
    const [method = "", url = ""] = first.split(" ");
    let pathname = url;
    try {
      pathname = url.startsWith("http") ? new URL(url).pathname : new URL(url, "http://x").pathname;
    } catch {
      // keep raw
    }
    if (!pathIncludes.some((p) => pathname.includes(p))) continue;
    const { body: resBody } = splitHeadBody(resE.getData().toString("utf8"));
    let ct = "";
    for (const line of head.split(/\r?\n/)) {
      if (/^content-type:/i.test(line)) ct = line.split(":").slice(1).join(":").trim();
    }
    out.push({
      n,
      method,
      pathname,
      ct,
      req: parseSsv(body),
      res: parseSsv(resBody),
      resBodyLen: resBody.length
    });
  }
  return out;
}

const targets = [
  "saveHopeAppcsDtls",
  "findSaplHopeAppcsChk",
  "findEstblSubjtShpbsList",
  "findEstblSubjtGnrlList",
  "findEstblCorseList",
  "findEstblCorseDtlList",
  "findAppcsLogin",
  "findStunoInfo",
  "findAppcsLoginChk",
  "saveHopeAppcsDtlsCancl",
  "findEstblDeprtList",
  "findCltrDomnList",
  "findAppcsSchdlList",
  "findScomUnvfrSchdlInfo"
];

const files = [
  "files/수강신청바구니/수강신청바구니 신청 및 검색 패킷.saz",
  "files/수강신청바구니/수강신청바구니 신청 및 검색 패킷 2.saz",
  "files/수강신청바구니/수강신청바구니 로그인 패킷.saz",
  "files/수강신청바구니/전공 강의시간표 조회.saz"
];

const result = {};
for (const f of files) {
  const items = extract(f, targets);
  console.log(path.basename(f), "matched", items.length);
  for (const it of items) {
    const key = it.pathname;
    if (!result[key]) result[key] = [];
    if (result[key].length >= 2) continue;
    const reqRows = it.req.datasets?.[0]?.rows?.map((r) => {
      const c = { ...r };
      if (c.password) c.password = "***";
      return c;
    });
    const resSummary = it.res.datasets?.map((d) => ({
      id: d.id,
      columns: d.columns,
      rowCount: d.rows.length,
      sample: d.rows.slice(0, 2).map((r) => {
        const o = {};
        for (const [k, v] of Object.entries(r)) {
          if (k === "password" || k === "encStr") o[k] = "***";
          else if (typeof v === "string" && v.length > 100) o[k] = `${v.slice(0, 100)}...`;
          else o[k] = v;
        }
        return o;
      })
    }));
    result[key].push({
      file: path.basename(f),
      n: it.n,
      ct: it.ct,
      reqParams: it.req.params,
      reqColumns: it.req.datasets?.[0]?.columns,
      reqRows,
      resParams: it.res.params,
      resSummary,
      resBodyLen: it.resBodyLen
    });
  }
}

const outPath = "files/수강신청바구니/_expanded/api-parsed.json";
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
console.log("keys", Object.keys(result));
for (const [k, samples] of Object.entries(result)) {
  console.log("\n##", k);
  for (const s of samples) {
    console.log(" session", s.n, s.file, "ct", s.ct);
    console.log(" reqCols", s.reqColumns);
    console.log(" reqRows", JSON.stringify(s.reqRows));
    console.log(" resParams", s.resParams);
    for (const d of s.resSummary || []) {
      console.log("  ds", d.id, "rows", d.rowCount);
      console.log("  cols", d.columns);
      console.log("  sample", JSON.stringify(d.sample));
    }
  }
}
