import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";
import util from "node:util";

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
  "elearning-mp4": "elearning-mp4",
  이러닝MP4: "elearning-mp4",
  "elearning-download": "elearning-download",
  이러닝다운로드: "elearning-download",
  "elearning-watch": "elearning-watch",
  "이러닝듣기": "elearning-watch",
  "이러닝자동시청": "elearning-watch",
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
  { key: "elearning-mp4", label: "이러닝URL 추출" },
  { key: "elearning-download", label: "이러닝다운로드" },
  { key: "elearning-watch", label: "e러닝 자동 시청 (학습 인증)" },
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
    const menuNumber = item.key === "exit" ? "0" : String(index + 1);
    console.log(
      `${color(menuNumber, ANSI.yellow)}. ${color(item.label, ANSI.bold)} ${color(`(${item.key})`, ANSI.gray)}`
    );
  });

  const answer = (await rl.question("명령을 선택하세요: ")).trim();
  const numeric = Number(answer);

  if (answer === "0") {
    return "exit";
  }

  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= INTERACTIVE_COMMANDS.length) {
    return INTERACTIVE_COMMANDS[numeric - 1].key;
  }

  if (answer === "0" || answer.toLowerCase() === "exit" || answer === "종료") {
    return "exit";
  }

  return COMMAND_ALIASES[answer] ?? answer;
}

async function chooseCommandWithZeroExit(rl) {
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

  if (answer === "0") {
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
  이러닝MP4 | elearning-mp4 --crsCreCd <code> --lessonCntsId <id> [--cookieFilePath <path>]
  이러닝다운로드 | elearning-download --crsCreCd <code> --lessonCntsId <id> [--cookieFilePath <path>]
  이러닝자동시청 | elearning-watch --crsCreCd <code> --lessonCntsId <id> [--userNo <no>] [--watchMinutes <min>]

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
    const duration = lesson.durationText ? ` [${lesson.durationText}]` : "";
    const schedule = lesson.lessonScheduleId ? ` (${lesson.lessonScheduleId})` : "";
    console.log(
      `${color(String(index + 1), ANSI.yellow)}. ${lesson.title}${schedule}${color(duration, ANSI.cyan)} ${color(`(${lesson.lessonCntsId})`, ANSI.gray)}`
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
      options.courseTitle = course.title;
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
    case "elearning-open":
    case "elearning-mp4":
    case "elearning-download":
    case "elearning-watch": {
      const course = await chooseCourseFromMenu(api, rl, options);
      options.crsCreCd = course.crsCreCd;
      printSuccess(`선택 과목: ${course.title} (${course.crsCreCd})`);
      options.courseTitle = course.title;

      const lesson = await chooseLessonFromMenu(api, rl, options);
      options.lessonCntsId = lesson.lessonCntsId;
      options.lessonTitle = lesson.title;
      printSuccess(`선택 이러닝: ${lesson.title} (${lesson.lessonCntsId})`);

      if (command === "elearning-watch") {
        options.userNo = await ask(rl, "학번 (stdNo)", "2026_1_008620_01_202311420");
        const defaultMinutes = lesson.durationSeconds ? Math.ceil(lesson.durationSeconds / 60) : "60";
        options.watchMinutes = await ask(rl, "시청할 시간 (분)", String(defaultMinutes));
      }
      break;
    }
    case "help":
      break;
    default:
      break;
  }

  return options;
}

async function executeCommand(api, command, options, rl) {
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
        data: await client.openLessonWindow({
          crsCreCd: required(options, "crsCreCd"),
          lessonCntsId: required(options, "lessonCntsId")
        })
      });
      return;
    }

    case "elearning-mp4": {
      const { client, session } = createClientFromSavedSession(api, options);
      printInfo("MP4 URL 추출 중...");
      const result = await client.getElearningMp4Url(
        required(options, "crsCreCd"),
        required(options, "lessonCntsId")
      );

      if (result.success) {
        printSection("\nMP4 URL 추출 성공:");
        console.log(color(result.mp4Url, ANSI.green, ANSI.bold));
      } else {
        printErrorMessage(`\n실패: MP4 URL을 찾지 못했습니다. ContentViewer 페이지를 분석했습니다.`);
        if (result.debugInfo) {
          printSection("\n디버그 정보:");
          prettyPrint(result.debugInfo);
        }
      }
      return;
    }

    case "elearning-download": {
      const { client } = createClientFromSavedSession(api, options);
      printInfo("MP4 URL 추출 및 다운로드 준비 중...");
      
      const urlResult = await client.getElearningMp4Url(
        required(options, "crsCreCd"),
        required(options, "lessonCntsId")
      );

      if (urlResult.success && urlResult.mp4Url) {
        printSection("\n추출된 MP4 URL:");
        console.log(color(urlResult.mp4Url, ANSI.cyan));
        console.log("");
      } else {
        printErrorMessage(`\n추출 실패: ${urlResult.message}`);
        return;
      }

      const result = await client.downloadElearningMp4(
        required(options, "crsCreCd"),
        required(options, "lessonCntsId"),
        options.courseTitle || required(options, "crsCreCd"),
        options.lessonTitle || required(options, "lessonCntsId"),
        "./downloads",
        (progress) => {
          process.stdout.write(`\r다운로드 진행 중: ${progress.percent}% (${(progress.loaded / 1024 / 1024).toFixed(2)} MB)`);
        }
      );

      console.log("");
      if (result.success) {
        printSuccess(`다운로드 완료: ${result.filePath}`);
      } else {
        printErrorMessage(`\n다운로드 실패: ${result.message}`);
      }
      return;
    }

    case "elearning-watch": {
      const { client, session: savedSession } = createClientFromSavedSession(api, options);
      const userNo = options.userNo || getSavedUserNo(savedSession, options);
      if (!userNo) {
        throw new Error("stdNo(userNo)를 찾을 수 없습니다. 다시 로그인하거나 --userNo를 직접 넘기세요.");
      }

      const crsCreCd = required(options, "crsCreCd");
      const lessonCntsId = required(options, "lessonCntsId");
      const watchMinutes = Number(options.watchMinutes || 60);

      printInfo(`\n학습 자동화 세션을 시작합니다... (목표 시간: ${watchMinutes}분)`);
      
      // 로그 출력 제어 로직 (프롬프트 상단 유지)
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      const safeLog = (...args) => {
        if (rl && rl.line !== undefined) {
          process.stdout.write("\r\u001b[K"); // 현재 라인(프롬프트) 지우기
          originalLog(...args);
          rl.prompt(true); // 프롬프트 다시 표시 (최하단 유지)
        } else {
          originalLog(...args);
        }
      };

      console.log = safeLog;
      console.warn = safeLog;
      console.error = safeLog;

      let session;
      let statusInterval;
      let lastNotifiedPercent = -1;
      const progressMilestones = [5, 10, 25, 50, 75, 100];

      try {
        session = await api.watchLesson(
          client.http,
          client.baseUrl,
          lessonCntsId,
          crsCreCd,
          userNo
        );

        printSuccess(`🎬 학습 시작 완료. (studyDetailId: ${session.getStudyDetailId()})`);
        
        // [상태 메시지 및 학습률 알림 로직]
        statusInterval = setInterval(() => {
          const progress = session.getProgressPercent();
          console.log(color("학습 중... ('stop'으로 종료, 'clear'로 화면 정리, Ctrl+C로 즉시 종료)", ANSI.gray));
          
          // 학습률 특정 지점 도달 시 푸른색 강조 로그
          const matchedMilestone = progressMilestones.find(m => progress >= m && lastNotifiedPercent < m);
          if (matchedMilestone !== undefined) {
            console.log(color(`[알림] 학습 진행률이 ${progress}%에 도달했습니다!`, ANSI.bold, ANSI.blue));
            lastNotifiedPercent = progress;
          }
        }, 60000); // 1분 주기

        rl.setPrompt(color("> ", ANSI.cyan));
        rl.prompt();

        // [자동 종료 처리]
        const autoStopTimer = setTimeout(async () => {
          console.log(`\n[Elearning] ⏰ 설정된 시청 시간(${watchMinutes}분)이 완료되어 자동 종료합니다.`);
          if (session) await session.stopWatchingLesson();
          clearInterval(statusInterval);
          console.log("학습 자동 종료 완료. 엔터를 눌러 메뉴로 돌아가세요.");
        }, watchMinutes * 60 * 1000);

        // Ctrl+C 처리
        const sigintHandler = async () => {
          clearTimeout(autoStopTimer);
          clearInterval(statusInterval);
          if (session) await session.stopWatchingLesson();
          process.exit(0);
        };
        process.once("SIGINT", sigintHandler);

        while (true) {
          const answer = (await rl.question("")).trim().toLowerCase();
          
          if (answer === "stop" || answer === "") {
            clearTimeout(autoStopTimer);
            clearInterval(statusInterval);
            process.removeListener("SIGINT", sigintHandler);
            if (session) await session.stopWatchingLesson();
            printSuccess("학습이 정상적으로 중단/종료되었습니다.");
            break;
          } else if (answer === "clear") {
            console.clear();
            rl.prompt();
          } else if (answer === "status") {
            const progress = session.getProgressPercent();
            console.log(color(`[상태] 현재 학습 진행률: ${progress}%`, ANSI.bold, ANSI.blue));
          }
        }
      } finally {
        if (statusInterval) clearInterval(statusInterval);
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      }
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
        printInfo("\n프로그램을 종료합니다. 이용해 주셔서 감사합니다.");
        break;
      }

      try {
        const options = await collectInteractiveOptions(api, rl, command);
        console.log("");
        await executeCommand(api, command, options, rl);
      } catch (error) {
        printErrorMessage(error?.stack || error?.message || util.inspect(error));
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

  await executeCommand(api, parsed.command, parsed.options, null);
}

try {
  await run();
} catch (error) {
  printErrorMessage(error?.stack || error?.message || util.inspect(error));
  process.exitCode = 1;
}
