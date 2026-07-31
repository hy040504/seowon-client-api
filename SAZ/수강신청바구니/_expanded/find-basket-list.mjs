import AdmZip from "adm-zip";
import path from "node:path";

function splitHeadBody(text) {
  const match = text.match(/\r?\n\r?\n/);
  if (!match || match.index === undefined) return { head: text, body: "" };
  return { head: text.slice(0, match.index), body: text.slice(match.index + match[0].length) };
}

const files = [
  "files/수강신청바구니/수강신청바구니 신청 및 검색 패킷.saz",
  "files/수강신청바구니/수강신청바구니 신청 및 검색 패킷 2.saz"
];

for (const f of files) {
  const zip = new AdmZip(f);
  const paths = new Set();
  console.log("\n====", path.basename(f));
  for (const e of zip.getEntries()) {
    const name = e.entryName.replace(/\\/g, "/");
    if (!name.endsWith("_c.txt") && !name.endsWith("_s.txt")) continue;
    const t = e.getData().toString("utf8");
    if (name.endsWith("_c.txt")) {
      const first = t.split(/\r?\n/)[0] || "";
      const m = first.match(/\s(\/[^?\s]+)/);
      if (m) paths.add(m[1]);
    }
    if (t.includes("008565") || /hopeAppcs|HopeAppcs|findHope|saveHope|AppcsDtls/i.test(t)) {
      const { head, body } = splitHeadBody(t);
      const first = head.split(/\r?\n/)[0] || "";
      const interesting =
        t.includes("008565") || /saveHope|findHope|HopeAppcs/i.test(first + body.slice(0, 200));
      if (interesting) {
        console.log(name, first.slice(0, 140));
        if (t.includes("008565")) {
          const idx = body.indexOf("008565");
          console.log(
            "  around 008565:",
            body.slice(Math.max(0, idx - 80), idx + 120).replace(/[\x00-\x1f]/g, "|")
          );
        }
      }
    }
  }
  console.log("paths:");
  for (const p of [...paths].sort()) {
    if (/sapl|Sso|hope|Hope|appcs|Appcs|subjt|Corse|Menu|Code/i.test(p)) console.log(" ", p);
  }
}
