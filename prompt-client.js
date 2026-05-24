import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";
import util from "node:util";

/** 라이브러리 엔트리 포인트 경로 */
const SOURCE_ENTRY = path.resolve(process.cwd(), "src/index.ts");
/** 세션 유지용 쿠키 파일 저장소 경로 */
const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");
/** 로그인 결과 메타데이터 저장소 경로 */
const DEFAULT_SESSION_FILE = path.resolve(process.cwd(), ".seowon-ecampus.session.json");

const COLOR_ENABLED = process.stdout.isTTY && !process.env.NO_COLOR;
const ANSI = {
  reset: "\u001b[0m", bold: "\u001b[1m", dim: "\u001b[2m",
  red: "\u001b[31m", green: "\u001b[32m", yellow: "\u001b[33m",
  blue: "\u001b[34m", magenta: "\u001b[35m", cyan: "\u001b[36m", gray: "\u001b[90m"
};

/** 사용자의 편의를 위한 한글/영문 명령어 매핑 테이블 */
const COMMAND_ALIASES = {
  login: "login", 로그인: "login",
  courses: "courses", 과목: "courses",
  notices: "notices", 공지: "notices",
  materials: "materials", 자료: "materials",
  assignments: "assignments", 과제: "assignments",
  "classroom-resources": "classroom-resources", 강의실자료: "classroom-resources",
  "elearning-lessons": "elearning-lessons", 이러닝목록: "elearning-lessons",
  "elearning-open": "elearning-open", 이러닝열기: "elearning-open",
  "elearning-mp4": "elearning-mp4", 이러닝URL추출: "elearning-mp4",
  "elearning-download": "elearning-download", 이러닝다운로드: "elearning-download",
  "elearning-watch": "elearning-watch", 이러닝듣기: "elearning-watch", 이러닝자동시청: "elearning-watch",
  help: "help", 도움말: "help"
};

/** 인터랙티브 메뉴 구성 정보 */
const INTERACTIVE_COMMANDS = [
  { key: "login", label: "로그인" },
  { key: "courses", label: "과목" },
  { key: "notices", label: "공지" },
  { key: "materials", label: "자료" },
  { key: "assignments", label: "과제" },
  { key: "classroom-resources", label: "강의실자료" },
  { key: "elearning-lessons", label: "이러닝목록" },
  { key: "elearning-open", label: "이러닝열기" },
  { key: "elearning-mp4", label: "이러닝URL 추출" },
  { key: "elearning-download", label: "이러닝다운로드" },
  { key: "elearning-watch", label: "e러닝 자동 시청 (학습 인증)" },
  { key: "exit", label: "종료" }
];

/**
 * 런타임에 TypeScript 코드를 동적으로 로드한다
 * @returns {Promise<any>} 로드된 API 모듈
 */
async function loadClientApi() {
  if (!fs.existsSync(SOURCE_ENTRY)) throw new Error("src/index.ts 파일을 찾을 수 없습니다.");
  return import(pathToFileURL(SOURCE_ENTRY).href);
}

/**
 * 명령행 인자(argv)를 파싱하여 명령어와 옵션 객체로 분리한다
 */
function parseArgs(argv) {
  const command = COMMAND_ALIASES[argv[0] ?? ""] ?? (argv[0] ?? "");
  const options = {};
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) { options[key] = "true"; continue; }
    options[key] = next; i++;
  }
  return { command, options };
}

/** JSON 데이터를 예쁘게 출력한다 */
function prettyPrint(value) {
  if (typeof value === "string") {
    try { console.log(colorizeJson(JSON.stringify(JSON.parse(value), null, 2))); return; }
    catch { console.log(value); return; }
  }
  console.log(colorizeJson(JSON.stringify(value, null, 2)));
}

/** ANSI 색상 코드를 텍스트에 입힌다 */
function color(text, ...codes) {
  if (!COLOR_ENABLED) return text;
  return `${codes.join("")}${text}${ANSI.reset}`;
}

/** JSON 문자열에 구문 강조를 적용한다 */
function colorizeJson(text) {
  if (!COLOR_ENABLED) return text;
  return text
    .replace(/^( *)"([^"]+)":/gm, (_, indent, key) => `${indent}${color(`"${key}"`, ANSI.cyan)}:`)
    .replace(/: "([^"]*)"/g, (_, v) => `: ${color(`"${v}"`, ANSI.green)}`)
    .replace(/: (-?\d+(?:\.\d+)?)/g, (_, v) => `: ${color(v, ANSI.yellow)}`)
    .replace(/: (true|false|null)/g, (_, v) => `: ${color(v, ANSI.magenta)}`);
}

function printSection(title) { console.log(color(title, ANSI.bold, ANSI.blue)); }
function printInfo(message) { console.log(color(message, ANSI.gray)); }
function printSuccess(message) { console.log(color(message, ANSI.green)); }
function printWarning(message) { console.log(color(message, ANSI.yellow)); }
function printErrorMessage(message) { console.error(color(message, ANSI.red)); }

function required(options, key) {
  const v = options[key];
  if (!v) throw new Error(`필수 옵션이 없습니다: --${key}`);
  return v;
}

function resolveCookieFilePath(options) { return options.cookieFilePath || process.env.SEOWON_COOKIE_FILE || DEFAULT_COOKIE_FILE; }
function resolveSessionFilePath(options) { return options.sessionFilePath || process.env.SEOWON_SESSION_FILE || DEFAULT_SESSION_FILE; }

function loadSavedSession(options) {
  const path = resolveSessionFilePath(options);
  try { return { sessionFilePath: path, data: JSON.parse(fs.readFileSync(path, "utf8")) }; }
  catch { return { sessionFilePath: path, data: {} }; }
}

function saveSession(options, data) {
  const path = resolveSessionFilePath(options);
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  return path;
}

function createClientFromSavedSession(api, options) {
  const session = createStoredSessionOptions(options);
  return { client: api.createEcampusClient({ cookieFilePath: session.cookieFilePath }), session };
}

function getSavedUserNo(session, options) { return options.userNo || session.sessionData.userNo || session.sessionData.userId; }

async function chooseCommand(rl) {
  printSection("사용 가능한 명령:");
  INTERACTIVE_COMMANDS.forEach((item, i) => {
    const num = item.key === "exit" ? "0" : String(i + 1);
    console.log(`${color(num, ANSI.yellow)}. ${color(item.label, ANSI.bold)} ${color(`(${item.key})`, ANSI.gray)}`);
  });
  const answer = (await rl.question("명령을 선택하세요: ")).trim();
  const num = Number(answer);
  if (answer === "0") return "exit";
  if (Number.isInteger(num) && num >= 1 && num <= INTERACTIVE_COMMANDS.length) return INTERACTIVE_COMMANDS[num - 1].key;
  return COMMAND_ALIASES[answer] ?? answer;
}

async function ask(rl, label, fallback = "") {
  const suffix = fallback ? color(` [기본값: ${fallback}]`, ANSI.gray) : "";
  return (await rl.question(`${color(label, ANSI.cyan)}${suffix}: `)).trim() || fallback;
}

/** 현재 수강 중인 과목 목록을 보여주고 하나를 선택하게 한다 */
async function chooseCourseFromMenu(api, rl, options) {
  const { client } = createClientFromSavedSession(api, options);
  try {
    const courses = await client.getCourseList();
    if (!courses.length) {
      printInfo("현재 수강 중인 과목이 하나도 없습니다.");
      throw new Error("NO_COURSES_AVAILABLE");
    }
    console.log(""); printSection("과목 목록:");
    courses.forEach((c, i) => console.log(`${color(String(i + 1), ANSI.yellow)}. ${c.title} ${color(`(${c.crsCreCd})`, ANSI.gray)}`));
    const num = Number(await rl.question("과목 번호를 선택하세요: "));
    if (!courses[num - 1]) throw new Error("올바른 과목 번호를 선택하세요.");
    return courses[num - 1];
  } catch (err) {
    if (err.message === "SESSION_EXPIRED") {
      printWarning("\n⚠️ 로그인 정보가 만료되었습니다. 1번 메뉴를 통해 다시 로그인해 주세요.");
      throw new Error("AUTH_REQUIRED_BY_USER");
    }
    throw err;
  }
}

/** 특정 과목의 e-러닝 차시 목록을 보여주고 하나를 선택하게 한다 */
async function chooseLessonFromMenu(api, rl, options) {
  const { client } = createClientFromSavedSession(api, options);
  const lessons = await client.getElearningLessonList({ crsCreCd: options.crsCreCd });
  if (!lessons.length) throw new Error("선택한 과목에 조회 가능한 차시가 없습니다.");
  console.log(""); printSection("이러닝 목록:");
  lessons.forEach((l, i) => {
    const dur = l.durationText ? ` [${l.durationText}]` : "";
    console.log(`${color(String(i + 1), ANSI.yellow)}. ${l.title}${color(dur, ANSI.cyan)} ${color(`(${l.lessonCntsId})`, ANSI.gray)}`);
  });
  const num = Number(await rl.question("이러닝 번호를 선택하세요: "));
  if (!lessons[num - 1]) throw new Error("올바른 이러닝 번호를 선택하세요.");
  return lessons[num - 1];
}

/** 인터랙티브 모드에서 명령어 실행 전 필요한 옵션들을 사용자에게 직접 물어본다 */
async function collectInteractiveOptions(api, rl, command, baseOptions = {}) {
  const options = { ...baseOptions };
  switch (command) {
    case "login":
      options.userId = await ask(rl, "아이디", process.env.SEOWON_ID || "비어있음");
      options.password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD || "비어있음");
      break;
    case "notices":
    case "materials":
    case "assignments":
    case "classroom-resources": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd; options.courseTitle = course.title;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      if (command === "assignments" || command === "classroom-resources") {
        options.userNo = await ask(rl, "학번(userNo, 비우면 저장 세션 사용)", options.userNo || "");
        options.userName = await ask(rl, "이름(userName, 비우면 저장 세션 사용)", options.userName || "");
      }
      break;
    }
    case "elearning-watch":
    case "elearning-download":
    case "elearning-mp4":
    case "elearning-lessons":
    case "elearning-open": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd; options.courseTitle = course.title;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      if (command === "elearning-lessons") break;
      const lesson = await chooseLessonFromMenu(api, rl, options);
      options.lessonCntsId = lesson.lessonCntsId; options.lessonTitle = lesson.title;
      printSuccess(`선택 이러닝: ${lesson.title} (${lesson.lessonCntsId})`);
      if (command === "elearning-watch") {
        options.userNo = await ask(rl, "학번 (stdNo)", "2026_1_008620_01_202311420");
        const defaultMin = lesson.durationSeconds ? Math.ceil(lesson.durationSeconds / 60) : "60";
        options.watchMinutes = await ask(rl, "시청할 시간 (분)", String(defaultMin));
      }
      break;
    }
  }
  return options;
}

/** 명령어를 실제로 실행하고 결과를 출력한다 */
async function executeCommand(api, command, options, rl) {
  switch (command) {
    case "login": {
      const userId = options.userId || process.env.SEOWON_ID;
      const password = options.password || process.env.SEOWON_PASSWORD;
      const client = api.createEcampusClient({ cookieFilePath: resolveCookieFilePath(options) });
      const res = await client.login({ userId, password });
      saveSession(options, { userId: res?.data?.userId || userId, userNo: res?.data?.userNo || userId, savedAt: new Date().toISOString() });
      printSuccess("로그인 성공 및 세션 저장 완료.");
      prettyPrint(res);
      return;
    }
    case "courses": {
      const { client } = createClientFromSavedSession(api, options);
      prettyPrint(await client.getCourseList());
      return;
    }
    case "notices": {
      const { client } = createClientFromSavedSession(api, options);
      prettyPrint(await client.getNoticeList({ crsCreCd: required(options, "crsCreCd") }));
      return;
    }
    case "materials": {
      const { client } = createClientFromSavedSession(api, options);
      prettyPrint(await client.getMaterialList({ crsCreCd: required(options, "crsCreCd") }));
      return;
    }
    case "assignments": {
      const { client, session } = createClientFromSavedSession(api, options);
      const userNo = getSavedUserNo(session, options);
      prettyPrint(await client.getAssignmentList({ crsCreCd: required(options, "crsCreCd"), userNo }));
      return;
    }
    case "classroom-resources": {
      const { client, session } = createClientFromSavedSession(api, options);
      const userNo = getSavedUserNo(session, options);
      prettyPrint(await client.getClassroomResources({ crsCreCd: required(options, "crsCreCd"), userNo }));
      return;
    }
    case "elearning-lessons": {
      const { client } = createClientFromSavedSession(api, options);
      prettyPrint(await client.getElearningLessonList({ crsCreCd: required(options, "crsCreCd") }));
      return;
    }
    case "elearning-open": {
      const { client } = createClientFromSavedSession(api, options);
      prettyPrint(await client.openLessonWindow({ crsCreCd: required(options, "crsCreCd"), lessonCntsId: required(options, "lessonCntsId") }));
      return;
    }
    case "elearning-mp4": {
      const { client } = createClientFromSavedSession(api, options);
      const result = await client.getElearningMp4Url(required(options, "crsCreCd"), required(options, "lessonCntsId"));
      prettyPrint(result);
      return;
    }
    case "elearning-watch": {
      const { client, session: savedSession } = createClientFromSavedSession(api, options);
      const userNo = options.userNo || getSavedUserNo(savedSession, options);
      const watchMinutes = Number(options.watchMinutes || 60);
      printInfo(`\n[Elearning] 학습 세션을 시작합니다... (목표: ${watchMinutes}분)`);
      
      const originalLog = console.log;
      const safeLog = (...args) => {
        if (rl && rl.line !== undefined) {
          process.stdout.write("\r\u001b[K");
          originalLog(...args);
          rl.prompt(true);
        } else originalLog(...args);
      };
      console.log = console.warn = console.error = safeLog;

      let session;
      let statusInterval;
      let lastPercent = -1;
      const milestones = [5, 10, 25, 50, 75, 100];

      try {
        session = await api.watchLesson(client.http, client.baseUrl, required(options, "lessonCntsId"), required(options, "crsCreCd"), userNo);
        printSuccess(`🎬 학습 인증 세션 활성화 완료.`);
        
        statusInterval = setInterval(() => {
          const progress = session.getProgressPercent();
          console.log(color("학습 중... ('stop'으로 종료, 'clear'로 화면 정리, 'status'로 확인)", ANSI.gray));
          const milestone = milestones.find(m => progress >= m && lastPercent < m);
          if (milestone !== undefined) {
            console.log(color(`[알림] 학습 진행률이 ${progress}%에 도달했습니다!`, ANSI.bold, ANSI.blue));
            lastPercent = progress;
          }
        }, 60000);

        rl.setPrompt(color("> ", ANSI.cyan)); rl.prompt();
        const autoStopTimer = setTimeout(async () => {
          console.log(color(`\n[Elearning] ⏰ 목표 시간(${watchMinutes}분) 도달로 자동 종료합니다.`, ANSI.yellow));
          if (session) await session.stopWatchingLesson();
          clearInterval(statusInterval);
        }, watchMinutes * 60 * 1000);

        while (true) {
          const cmd = (await rl.question("")).trim().toLowerCase();
          if (cmd === "stop" || cmd === "") {
            clearTimeout(autoStopTimer); clearInterval(statusInterval);
            if (session) await session.stopWatchingLesson();
            printSuccess("학습 세션을 안전하게 종료했습니다."); break;
          } else if (cmd === "clear") { console.clear(); rl.prompt(); }
          else if (cmd === "status") { console.log(color(`[상태] 현재 학습 진행률: ${session.getProgressPercent()}%`, ANSI.bold, ANSI.blue)); }
        }
      } finally {
        if (statusInterval) clearInterval(statusInterval);
        console.log = console.warn = console.error = originalLog;
      }
      return;
    }
    case "elearning-download": {
      const { client } = createClientFromSavedSession(api, options);
      const res = await client.downloadElearningMp4(required(options, "crsCreCd"), required(options, "lessonCntsId"), options.courseTitle || "Course", options.lessonTitle || "Lesson", "./downloads", (p) => process.stdout.write(`\r다운로드 중: ${p.percent}% (${(p.loaded / 1024 / 1024).toFixed(2)} MB)`));
      console.log("");
      if (res.success) printSuccess(`다운로드 완료: ${res.filePath}`);
      else printErrorMessage(`실패: ${res.message}`);
      return;
    }
  }
}

/** 메인 인터랙티브 루프 실행기 */
async function runInteractive(api) {
  const rl = readline.createInterface({ input, output });
  try {
    while (true) {
      console.log("");
      const command = await chooseCommand(rl);
      if (!command || command === "exit") break;
      try {
        const options = await collectInteractiveOptions(api, rl, command);
        console.log(""); await executeCommand(api, command, options, rl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage === "AUTH_REQUIRED_BY_USER") {
          printErrorMessage(`Error: ${errorMessage}`);
        } else {
          printErrorMessage(err?.stack || `Error: ${errorMessage}`);
        }
      }
      console.log(""); if (input.isTTY) await rl.question(color("엔터를 누르면 메뉴로 돌아갑니다.", ANSI.gray) + " ");
    }
  } finally { rl.close(); }
}

/** 프로그램 엔트리 포인트 */
async function run() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const api = await loadClientApi();
  if (!command) await runInteractive(api);
  else await executeCommand(api, command, options, null);
}

run().catch((e) => {
  printErrorMessage(e?.stack || e?.message || util.inspect(e));
  process.exit(1);
});

function createStoredSessionOptions(options) {
  const path = resolveCookieFilePath(options);
  if (!fs.existsSync(path)) throw new Error(`저장된 쿠키가 없습니다. 로그인을 먼저 수행하세요.`);
  return { cookieFilePath: path, sessionData: loadSavedSession(options).data };
}
