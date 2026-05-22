import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";

const SOURCE_ENTRY = path.resolve(process.cwd(), "src/index.ts");
const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");
const DEFAULT_SESSION_FILE = path.resolve(process.cwd(), ".seowon-ecampus.session.json");
const COLOR_ENABLED = process.stdout.isTTY && !process.env.NO_COLOR;
const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m"
};

const COMMAND_ALIASES = {
  login: "login",
  로그인: "login",
  courses: "courses",
  과목: "courses",
  notices: "notices",
  공지: "notices",
  materials: "materials",
  자료: "materials",
  assignments: "assignments",
  과제: "assignments",
  "classroom-resources": "classroom-resources",
  강의실자료: "classroom-resources",
  "elearning-lessons": "elearning-lessons",
  이러닝목록: "elearning-lessons",
  "elearning-open": "elearning-open",
  이러닝열기: "elearning-open",
  help: "help",
  도움말: "help"
};

const INTERACTIVE_COMMANDS = [
  { key: "login", label: "로그인" },
  { key: "courses", label: "과목" },
  { key: "notices", label: "공지" },
  { key: "materials", label: "자료" },
  { key: "assignments", label: "과제" },
  { key: "classroom-resources", label: "강의실자료" },
  { key: "elearning-lessons", label: "이러닝목록" },
  { key: "elearning-open", label: "이러닝열기" },
  { key: "exit", label: "종료" }
];

async function loadClientApi() {
  if (!fs.existsSync(SOURCE_ENTRY)) {
    throw new Error("src/index.ts 파일을 찾을 수 없습니다.");
  }

  return import(pathToFileURL(SOURCE_ENTRY).href);
}

function parseArgs(argv) {
  const command = COMMAND_ALIASES[argv[0] ?? ""] ?? (argv[0] ?? "");
  const options = {};

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
}

function prettyPrint(value) {
  if (typeof value === "string") {
    try {
      console.log(colorizeJson(JSON.stringify(JSON.parse(value), null, 2)));
      return;
    } catch {
      console.log(value);
      return;
    }
  }

  console.log(colorizeJson(JSON.stringify(value, null, 2)));
}

function color(text, ...codes) {
  if (!COLOR_ENABLED) {
    return text;
  }

  return `${codes.join("")}${text}${ANSI.reset}`;
}

function colorizeJson(text) {
  if (!COLOR_ENABLED) {
    return text;
  }

  return text
    .replace(/^( *)"([^"]+)":/gm, (_, indent, key) => {
      return `${indent}${color(`"${key}"`, ANSI.cyan)}:`;
    })
    .replace(/: "([^"]*)"/g, (_, value) => `: ${color(`"${value}"`, ANSI.green)}`)
    .replace(/: (-?\d+(?:\.\d+)?)/g, (_, value) => `: ${color(value, ANSI.yellow)}`)
    .replace(/: (true|false|null)/g, (_, value) => `: ${color(value, ANSI.magenta)}`);
}

function printSection(title) {
  console.log(color(title, ANSI.bold, ANSI.blue));
}

function printInfo(message) {
  console.log(color(message, ANSI.gray));
}

function printSuccess(message) {
  console.log(color(message, ANSI.green));
}

function printWarning(message) {
  console.log(color(message, ANSI.yellow));
}

function printErrorMessage(message) {
  console.error(color(message, ANSI.red));
}

function required(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`필수 옵션이 없습니다: --${key}`);
  }

  return value;
}

function resolveCookieFilePath(options) {
  return options.cookieFilePath || process.env.SEOWON_COOKIE_FILE || DEFAULT_COOKIE_FILE;
}

function resolveSessionFilePath(options) {
  return options.sessionFilePath || process.env.SEOWON_SESSION_FILE || DEFAULT_SESSION_FILE;
}

function loadSavedSession(options) {
  const sessionFilePath = resolveSessionFilePath(options);

  try {
    const raw = fs.readFileSync(sessionFilePath, "utf8");
    return {
      sessionFilePath,
      data: JSON.parse(raw)
    };
  } catch {
    return {
      sessionFilePath,
      data: {}
    };
  }
}

function saveSession(options, sessionData) {
  const sessionFilePath = resolveSessionFilePath(options);
  fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2), "utf8");
  return sessionFilePath;
}

function createLoginOptions(options) {
  const userId = options.userId || process.env.SEOWON_ID;
  const password = options.password || process.env.SEOWON_PASSWORD;

  if (!userId || !password) {
    throw new Error(
      "로그인 정보가 없습니다. --userId/--password를 넘기거나 SEOWON_ID, SEOWON_PASSWORD를 설정하세요."
    );
  }

  return {
    cookieFilePath: resolveCookieFilePath(options),
    sessionFilePath: resolveSessionFilePath(options),
    loginCredentials: { userId, password }
  };
}

function createStoredSessionOptions(options) {
  const cookieFilePath = resolveCookieFilePath(options);
  if (!fs.existsSync(cookieFilePath)) {
    throw new Error(
      `저장된 쿠키가 없습니다: ${cookieFilePath}\n먼저 '로그인' 명령으로 로그인과 쿠키 저장을 완료하세요.`
    );
  }

  const savedSession = loadSavedSession(options);

  return {
    cookieFilePath,
    sessionFilePath: savedSession.sessionFilePath,
    sessionData: savedSession.data
  };
}

function createClientFromSavedSession(api, options) {
  const session = createStoredSessionOptions(options);
  return {
    client: api.createEcampusClient({ cookieFilePath: session.cookieFilePath }),
    session
  };
}

function getSavedUserNo(session, options) {
  return options.userNo || session.sessionData.userNo || session.sessionData.userId;
}

async function chooseCommand(rl) {
  printSection("사용 가능한 명령:");
  INTERACTIVE_COMMANDS.forEach((item, index) => {
    console.log(
      `${color(String(index + 1), ANSI.yellow)}. ${color(item.label, ANSI.bold)} ${color(`(${item.key})`, ANSI.gray)}`
    );
  });

  const answer = (await rl.question("명령을 선택하세요: ")).trim();
  const numeric = Number(answer);

  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= INTERACTIVE_COMMANDS.length) {
    return INTERACTIVE_COMMANDS[numeric - 1].key;
  }

  if (answer === "0" || answer.toLowerCase() === "exit" || answer === "종료") {
    return "exit";
  }

  return COMMAND_ALIASES[answer] ?? answer;
}

function printHelp() {
  printSection("도움말");
  console.log(`
명령어
  로그인 | login --userId <id> --password <pw> [--cookieFilePath <path>] [--sessionFilePath <path>]
  과목 | courses [--cookieFilePath <path>]
  공지 | notices --crsCreCd <code> [--cookieFilePath <path>]
  자료 | materials --crsCreCd <code> [--cookieFilePath <path>]
  과제 | assignments --crsCreCd <code> [--userNo <no>] [--userName <name>] [--cookieFilePath <path>]
  강의실자료 | classroom-resources --crsCreCd <code> [--userNo <no>] [--userName <name>] [--cookieFilePath <path>]
  이러닝목록 | elearning-lessons --crsCreCd <code> [--cookieFilePath <path>]
  이러닝열기 | elearning-open --crsCreCd <code> --lessonCntsId <id> [--cookieFilePath <path>]

저장 파일 기본값
  쿠키: ${DEFAULT_COOKIE_FILE}
  세션: ${DEFAULT_SESSION_FILE}

환경 변수
  SEOWON_ID
  SEOWON_PASSWORD
  SEOWON_COOKIE_FILE
  SEOWON_SESSION_FILE
`);
}

async function ask(rl, label, fallback = "") {
  const suffix = fallback ? color(` [${fallback}]`, ANSI.gray) : "";
  const prompt = `${color(label, ANSI.cyan)}${suffix}: `;
  const value = (await rl.question(prompt)).trim();
  return value || fallback;
}

async function chooseCourseFromMenu(api, rl, options) {
  const { client } = createClientFromSavedSession(api, options);
  const courses = await client.getCourseList();

  if (!courses.length) {
    throw new Error("선택 가능한 과목이 없습니다.");
  }

  console.log("");
  printSection("과목 목록:");
  courses.forEach((course, index) => {
    console.log(
      `${color(String(index + 1), ANSI.yellow)}. ${course.title} ${color(`(${course.crsCreCd})`, ANSI.gray)}`
    );
  });

  const answer = (await rl.question("과목 번호를 선택하세요: ")).trim();
  const numeric = Number(answer);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > courses.length) {
    throw new Error("올바른 과목 번호를 선택하세요.");
  }

  return courses[numeric - 1];
}

async function chooseLessonFromMenu(api, rl, options) {
  const { client } = createClientFromSavedSession(api, options);
  const lessons = await client.getElearningLessonList({
    crsCreCd: options.crsCreCd
  });

  if (!lessons.length) {
    throw new Error("선택한 과목에 조회 가능한 이러닝 차시가 없습니다.");
  }

  console.log("");
  printSection("이러닝 목록:");
  lessons.forEach((lesson, index) => {
    console.log(
      `${color(String(index + 1), ANSI.yellow)}. ${lesson.title} ${color(`(${lesson.lessonCntsId})`, ANSI.gray)}`
    );
  });

  const answer = (await rl.question("이러닝 번호를 선택하세요: ")).trim();
  const numeric = Number(answer);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > lessons.length) {
    throw new Error("올바른 이러닝 번호를 선택하세요.");
  }

  return lessons[numeric - 1];
}

async function collectInteractiveOptions(api, rl, command, baseOptions = {}) {
  const options = { ...baseOptions };

  switch (command) {
    case "login":
      options.userId = await ask(rl, "아이디", options.userId || process.env.SEOWON_ID || "");
      options.password = await ask(
        rl,
        "비밀번호",
        options.password || process.env.SEOWON_PASSWORD || ""
      );
      break;
    case "notices":
    case "materials":
    case "assignments":
    case "classroom-resources": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      if (command === "assignments" || command === "classroom-resources") {
        options.userNo = await ask(rl, "학번(userNo, 비우면 저장 세션 사용)", options.userNo || "");
        options.userName = await ask(
          rl,
          "이름(userName, 비우면 저장 세션 사용)",
          options.userName || ""
        );
      }
      break;
    }
    case "elearning-lessons": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      break;
    }
    case "elearning-open": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      const lesson = await chooseLessonFromMenu(api, rl, options);
      options.lessonCntsId = lesson.lessonCntsId;
      printSuccess(`선택 이러닝: ${lesson.title} (${lesson.lessonCntsId})`);
      break;
    }
    case "help":
      break;
    default:
      break;
  }

  return options;
}

async function executeCommand(api, command, options) {
  switch (command) {
    case "login": {
      const loginOptions = createLoginOptions(options);
      const client = api.createEcampusClient({
        cookieFilePath: loginOptions.cookieFilePath,
        loginCredentials: loginOptions.loginCredentials
      });
      const result = await client.login(loginOptions.loginCredentials);
      const sessionData = {
        userId: result?.data?.userId ?? loginOptions.loginCredentials.userId,
        userNo: result?.data?.userNo ?? loginOptions.loginCredentials.userId,
        redirectUrl: result?.data?.redirectUrl ?? "",
        savedAt: new Date().toISOString()
      };
      const sessionFilePath = saveSession(options, sessionData);

      printSuccess("로그인과 쿠키 저장이 완료되었습니다.");
      prettyPrint({
        result,
        cookieFilePath: loginOptions.cookieFilePath,
        sessionFilePath
      });
      return;
    }

    case "courses": {
      const { client, session } = createClientFromSavedSession(api, options);
      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        items: await client.getCourseList()
      });
      return;
    }

    case "notices": {
      const { client, session } = createClientFromSavedSession(api, options);
      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        items: await client.getNoticeList({
          crsCreCd: required(options, "crsCreCd")
        })
      });
      return;
    }

    case "materials": {
      const { client, session } = createClientFromSavedSession(api, options);
      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        items: await client.getMaterialList({
          crsCreCd: required(options, "crsCreCd")
        })
      });
      return;
    }

    case "assignments": {
      const { client, session } = createClientFromSavedSession(api, options);
      const userNo = getSavedUserNo(session, options);
      if (!userNo) {
        throw new Error("저장된 세션에서 userNo를 찾지 못했습니다. 다시 로그인하거나 --userNo를 직접 넘기세요.");
      }

      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        items: await client.getAssignmentList({
          crsCreCd: required(options, "crsCreCd"),
          userNo,
          userName: options.userName ?? session.sessionData.userName ?? ""
        })
      });
      return;
    }

    case "classroom-resources": {
      const { client, session } = createClientFromSavedSession(api, options);
      const userNo = getSavedUserNo(session, options);
      if (!userNo) {
        throw new Error("저장된 세션에서 userNo를 찾지 못했습니다. 다시 로그인하거나 --userNo를 직접 넘기세요.");
      }

      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        data: await client.getClassroomResources({
          crsCreCd: required(options, "crsCreCd"),
          userNo,
          userName: options.userName ?? session.sessionData.userName ?? ""
        })
      });
      return;
    }

    case "elearning-lessons": {
      const { client, session } = createClientFromSavedSession(api, options);
      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        items: await client.getElearningLessonList({
          crsCreCd: required(options, "crsCreCd")
        })
      });
      return;
    }

    case "elearning-open": {
      const { client, session } = createClientFromSavedSession(api, options);
      prettyPrint({
        cookieFilePath: session.cookieFilePath,
        data: await client.openElearningLesson({
          crsCreCd: required(options, "crsCreCd"),
          lessonCntsId: required(options, "lessonCntsId")
        })
      });
      return;
    }

    case "help": {
      printHelp();
      return;
    }

    default:
      throw new Error(`알 수 없는 명령입니다: ${command}`);
  }
}

async function runInteractive(api) {
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      console.log("");
      const command = await chooseCommand(rl);
      if (!command || command === "exit") {
        break;
      }

      try {
        const options = await collectInteractiveOptions(api, rl, command);
        console.log("");
        await executeCommand(api, command, options);
      } catch (error) {
        printErrorMessage(error?.stack || error?.message || String(error));
      }

      console.log("");
      if (!input.isTTY) {
        break;
      }
      await rl.question(color("엔터를 누르면 메뉴로 돌아갑니다.", ANSI.gray) + " ");
    }
  } finally {
    rl.close();
  }
}

async function run() {
  const parsed = parseArgs(process.argv.slice(2));
  const api = await loadClientApi();

  if (!parsed.command) {
    await runInteractive(api);
    return;
  }

  if (parsed.command === "exit") {
    return;
  }

  await executeCommand(api, parsed.command, parsed.options);
}

try {
  await run();
} catch (error) {
  printErrorMessage(error?.stack || error?.message || String(error));
  process.exitCode = 1;
}
