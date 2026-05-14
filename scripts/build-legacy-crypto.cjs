const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const sourceDir = path.join(root, "files", "ecam", "ecamjs");
const target = path.join(root, "src", "ecampus", "legacy", "login-crypto.cjs");

const cryptoSource = readSource("nice.nuguya.oivs.crypto.js");
const utilSource = readSource("nice.nuguya.oivs.util.js");
const msgSource = readSource("nice.nuguya.oivs.msg.js");

const output = [
  "// 이 파일은 files/ecam/ecamjs의 NICE 원본 스크립트 3개에서 로그인 암호화에 필요한 코드만 복사해 만든 레거시 모듈입니다.",
  "// 직접 수정하지 말고 scripts/build-legacy-crypto.cjs를 수정한 뒤 다시 생성하세요.",
  "",
  extractBetween(cryptoSource, "var cryptoObject = new Object();", "cryptoObject.md5 = function"),
  extractBetween(cryptoSource, "cryptoObject.des = function", "//\r\n//\tPrint Hex Array"),
  extractBetween(cryptoSource, "cryptoObject.getRandomKey = function", null),
  "",
  'var CRNDSIZE = "24";',
  'var strDelimeter = "!#!";',
  "",
  buildGetCheckMessage(msgSource, "S96"),
  "",
  extractFunction(utilSource, "encode"),
  "",
  extractFunction(utilSource, "makeEncryptInfo"),
  "",
  extractFunction(utilSource, "makeSendInfo"),
  "",
  "module.exports = {",
  "  makeSendInfo: makeSendInfo",
  "};",
  ""
].join("\n");

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, output, "utf8");

function readSource(fileName) {
  return fs.readFileSync(path.join(sourceDir, fileName), "utf8");
}

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) {
    throw new Error(`시작 마커를 찾을 수 없습니다: ${startMarker}`);
  }

  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (end < 0) {
    throw new Error(`종료 마커를 찾을 수 없습니다: ${endMarker}`);
  }

  return source.slice(start, end).trim();
}

function extractFunction(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`함수를 찾을 수 없습니다: ${functionName}`);
  }

  const openBrace = source.indexOf("{", start);
  if (openBrace < 0) {
    throw new Error(`함수 본문을 찾을 수 없습니다: ${functionName}`);
  }

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1).trim();
      }
    }
  }

  throw new Error(`함수 끝을 찾을 수 없습니다: ${functionName}`);
}

function buildGetCheckMessage(source, code) {
  const caseMarker = `case "${code}"`;
  const caseStart = source.indexOf(caseMarker);
  if (caseStart < 0) {
    throw new Error(`메시지 코드를 찾을 수 없습니다: ${code}`);
  }

  const assignmentStart = source.indexOf("strMessage =", caseStart);
  const assignmentEnd = source.indexOf(";", assignmentStart);
  if (assignmentStart < 0 || assignmentEnd < 0) {
    throw new Error(`메시지 값을 찾을 수 없습니다: ${code}`);
  }

  const assignment = source.slice(assignmentStart, assignmentEnd + 1).trim();

  return [
    "function getCheckMessage(msgCode)",
    "{",
    '\tif (msgCode == "S96")',
    "\t{",
    '\t\tvar strMessage = "";',
    `\t\t${assignment}`,
    "\t\treturn strMessage;",
    "\t}",
    "",
    '\treturn "알 수 없는 오류가 발생했습니다.";',
    "}"
  ].join("\n");
}
