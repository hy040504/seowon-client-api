import fs from "node:fs";
import path from "node:path";

const dir = "files/수강신청바구니/_expanded/my-list-timetable";
const files = fs.readdirSync(dir).filter((f) => f.startsWith("js-"));

function snippets(text, keyword, max = 5, radius = 180) {
  const out = [];
  let idx = 0;
  while ((idx = text.indexOf(keyword, idx)) >= 0 && out.length < max) {
    out.push(text.slice(Math.max(0, idx - radius), idx + radius).replace(/\s+/g, " "));
    idx += keyword.length;
  }
  return out;
}

const focus = [
  "js-082-saplap0130.xfdl.js",
  "js-140-saplap0130.xfdl.js",
  "js-021-libComm.xjs.js",
  "js-083-libSch.xjs.js"
];

for (const f of focus) {
  const full = path.join(dir, f);
  if (!fs.existsSync(full)) continue;
  const t = fs.readFileSync(full, "utf8");
  console.log("\n========", f, "len", t.length);
  const keys = [
    "saveHopeAppcsDtls",
    "saveHopeAppcsDtlsCancl",
    "findSaplHopeAppcsChk",
    "findEstblSubjtGnrlList",
    "findEstblSubjtShpbsList",
    "findHope",
    "HopeAppcs",
    "hopeAppcs",
    "callReport",
    "saplap044",
    "filePath",
    "reportParams",
    "strSvcId",
    "sController",
    "transaction",
    "dsHope",
    "dsSles",
    "내역",
    "시간표",
    "프린트",
    "print",
    "fn_print",
    "fn_search",
    "fn_save",
    "fn_delete"
  ];
  for (const k of keys) {
    const sn = snippets(t, k, 4, 220);
    if (!sn.length) continue;
    console.log(
      "\n--",
      k,
      "hits",
      (t.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    );
    for (const s of sn) console.log(" ", s);
  }

  const dos = [...t.matchAll(/["'`](\/com\/[A-Za-z0-9_/]+\.do)["'`]/g)].map((m) => m[1]);
  const unique = [...new Set(dos)];
  console.log("\n.do paths:", unique);
  const services = [...t.matchAll(/strSvcId\s*[:=]\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  console.log("strSvcId:", [...new Set(services)]);
  const controllers = [...t.matchAll(/sController\s*[:=]\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  console.log("sController:", [...new Set(controllers)]);
}

// callReport implementation in libComm
const lib = fs.readFileSync(path.join(dir, "js-021-libComm.xjs.js"), "utf8");
const idx = lib.indexOf("function callReport");
const idx2 = lib.indexOf("callReport = function");
const start = idx >= 0 ? idx : idx2;
console.log("\n======== callReport impl around", start);
if (start >= 0) console.log(lib.slice(start, start + 2500).replace(/\r/g, ""));
else {
  const i = lib.indexOf("callReport.jsp");
  console.log(lib.slice(Math.max(0, i - 500), i + 1500).replace(/\r/g, ""));
}
