import fs from "node:fs";
import path from "node:path";

const roots = ["src", "test", "docs", "."];
const skipDirs = new Set(["node_modules", "dist", "files", ".git", "_expanded"]);

/**
 * @param {string} dir
 * @param {(filePath: string) => void} visit
 */
function walk(dir, visit) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (/\.(ts|js|md|json)$/.test(entry.name)) visit(full);
  }
}

const files = new Set();
for (const root of roots) {
  if (root === ".") {
    for (const name of fs.readdirSync(".")) {
      if (/\.(ts|js|md|json)$/.test(name)) files.add(name);
    }
  } else if (fs.existsSync(root)) {
    walk(root, (filePath) => files.add(filePath));
  }
}

let updated = 0;
for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;
  text = text.split("./sugang/").join("./hope-basket/");
  text = text.split("../sugang/").join("../hope-basket/");
  text = text.split("src/sugang/").join("src/hope-basket/");
  text = text.split("createSugangClient").join("createHopeBasketClient");
  text = text.split("SugangClientOptions").join("HopeBasketClientOptions");
  text = text.replace(/\bSugangClient\b/g, "HopeBasketClient");
  text = text.split("sugang:manager").join("hope-basket:manager");
  text = text.split("sugang-manager.ts").join("hope-basket-manager.ts");
  text = text.split(".seowon-sugang.cookies.json").join(".seowon-hope-basket.cookies.json");
  text = text.split("test/sugang-basket.test.ts").join("test/hope-basket.test.ts");
  if (text !== original) {
    fs.writeFileSync(file, text);
    updated += 1;
    console.log("updated", file);
  }
}

if (fs.existsSync("test/sugang-basket.test.ts")) {
  fs.renameSync("test/sugang-basket.test.ts", "test/hope-basket.test.ts");
  console.log("renamed test file");
}

console.log("done, files updated:", updated);
