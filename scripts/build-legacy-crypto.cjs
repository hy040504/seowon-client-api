const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const sourceDir = path.join(root, "files", "ecam", "ecamjs");
const target = path.join(root, "src", "ecampus", "legacy", "login-crypto.cjs");

const cryptoSource = readSource("nice.nuguya.oivs.crypto.js");
const utilSource = readSource("nice.nuguya.oivs.util.js");
const msgSource = readSource("nice.nuguya.oivs.msg.js");

const output = [
  "// files/ecam/ecamjs의 NICE 원본 스크립트 3개에서 로그인 암호화에 필요한 코드만 추려 만든 모듈입니다.",
  "// 원본 파일은 건드리지 않고, 이 스크립트를 수정한 뒤 다시 생성해야 합니다.",
  "",
  "/**",
  " * 로그인 암호화에 필요한 레거시 crypto 객체를 묶는다",
  " */",
  extractBetween(cryptoSource, "var cryptoObject = new Object();", "cryptoObject.md5 = function"),
  extractBetween(cryptoSource, "cryptoObject.des = function", "//\r\n//\tPrint Hex Array"),
  extractBetween(cryptoSource, "cryptoObject.getRandomKey = function", null),
  "",
  'var CRNDSIZE = "24";',
  'var strDelimeter = "!#!";',
  "",
  "/**",
  " * 서버 메시지 코드 S96을 위한 메시지 분기 함수를 만든다",
  " */",
  buildGetCheckMessage(msgSource, "S96"),
  "",
  "/**",
  " * 문자열을 Base64 형태로 인코딩한다",
  " * @param {string} data - 인코딩할 문자열",
  " * @returns {string} 인코딩된 문자열",
  " */",
  extractFunction(utilSource, "encode"),
  "",
  "/**",
  " * 로그인 전송 정보를 만든다",
  " * @param {Array} dataValues - 암호화에 사용할 값 배열",
  " * @returns {string} 전송 정보 문자열",
  " */",
  extractFunction(utilSource, "makeEncryptInfo"),
  "",
  "/**",
  " * 최종 로그인 전송 문자열을 만든다",
  " * @param {string} strNm - 이름 또는 아이디",
  " * @param {string} strNo - 학번 또는 번호",
  " * @param {string} strRsn - 사유 값",
  " * @param {string} strForeigner - 외국인 여부",
  " * @returns {string} 로그인 전송 문자열",
  " */",
  extractFunction(utilSource, "makeSendInfo"),
  "",
  "module.exports = {",
  "  makeSendInfo: makeSendInfo",
  "};",
  ""
].join("\n");

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, output, "utf8");

/**
 * 원본 스크립트를 읽는다
 * @param {string} fileName - 읽을 파일명
 * @returns {string} 파일 내용
 */
function readSource(fileName) {
  return fs.readFileSync(path.join(sourceDir, fileName), "utf8");
}

/**
 * 원본 문자열에서 시작/종료 마커 사이를 잘라낸다
 * @param {string} source - 원본 문자열
 * @param {string} startMarker - 시작 마커
 * @param {string | null} endMarker - 종료 마커
 * @returns {string} 잘라낸 문자열
 * @throws {Error} 마커를 찾지 못한 경우
 */
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

/**
 * 함수 선언문 하나를 원본에서 잘라낸다
 * @param {string} source - 원본 문자열
 * @param {string} functionName - 함수 이름
 * @returns {string} 잘라낸 함수 선언문
 * @throws {Error} 함수를 찾지 못한 경우
 */
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

/**
 * 메시지 코드 분기에서 필요한 S96 메시지 함수를 만든다
 * @param {string} source - 메시지 원본 문자열
 * @param {string} code - 추출할 메시지 코드
 * @returns {string} 생성된 getCheckMessage 함수 문자열
 * @throws {Error} 메시지 코드를 찾지 못한 경우
 */
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
