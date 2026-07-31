import AdmZip from "adm-zip";

function split(t) {
  const m = t.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return { h: t, b: "" };
  return { h: t.slice(0, m.index), b: t.slice(m.index + m[0].length) };
}

const zip = new AdmZip("files/수강신청바구니/수강신청바구니 로그인 패킷.saz");
for (const e of zip.getEntries()) {
  const name = e.entryName.replace(/\\/g, "/");
  if (!name.endsWith("_c.txt")) continue;
  const t = e.getData().toString("utf8");
  if (
    t.includes("findAppcsLogin.do") ||
    t.includes("saveHopeAppcsDtls.do") ||
    name.endsWith("/01_c.txt") ||
    name.endsWith("/09_c.txt")
  ) {
    const { h, b } = split(t);
    console.log("====", name);
    console.log(h);
    console.log("BODY_LEN", b.length, "starts", JSON.stringify(b.slice(0, 40)));
    console.log("");
  }
}
