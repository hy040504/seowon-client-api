import readline from "node:readline/promises";

/** 터미널 출력 색상 정의 */
export const ANSI = {
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

const COLOR_ENABLED = process.stdout.isTTY && !process.env.NO_COLOR;

/** 명령어 별칭 맵 */
export const COMMAND_ALIASES: Record<string, string> = {
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

/** 메인 메뉴 항목 */
export const INTERACTIVE_COMMANDS = [
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

/** 텍스트에 ANSI 색상을 적용한다 */
export function color(text: string, ...codes: string[]): string {
  if (!COLOR_ENABLED) return text;
  return `${codes.join("")}${text}${ANSI.reset}`;
}

/** JSON 문자열에 구문 강조를 적용한다 */
export function colorizeJson(text: string): string {
  if (!COLOR_ENABLED) return text;
  return text
    .replace(/^( *)"([^"]+)":/gm, (_, indent, key) => `${indent}${color(`"${key}"`, ANSI.cyan)}:`)
    .replace(/: "([^"]*)"/g, (_, v) => `: ${color(`"${v}"`, ANSI.green)}`)
    .replace(/: (-?\d+(?:\.\d+)?)/g, (_, v) => `: ${color(v, ANSI.yellow)}`)
    .replace(/: (true|false|null)/g, (_, v) => `: ${color(v, ANSI.magenta)}`);
}

/** 데이터를 가독성 있게 출력한다 */
export function prettyPrint(value: any): void {
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

export function printSection(title: string): void { console.log(color(title, ANSI.bold, ANSI.blue)); }
export function printInfo(message: string): void { console.log(color(message, ANSI.gray)); }
export function printSuccess(message: string): void { console.log(color(message, ANSI.green)); }
export function printWarning(message: string): void { console.log(color(message, ANSI.yellow)); }
export function printErrorMessage(message: string): void { console.error(color(message, ANSI.red)); }

/** 사용자에게 직접 입력을 요청한다 */
export async function ask(rl: readline.Interface, label: string, fallback: string = ""): Promise<string> {
  const suffix = fallback ? color(` [기본값: ${fallback}]`, ANSI.gray) : "";
  return (await rl.question(`${color(label, ANSI.cyan)}${suffix}: `)).trim() || fallback;
}

/** 메인 메뉴에서 명령을 선택하게 한다 */
export async function chooseCommand(rl: readline.Interface): Promise<string> {
  printSection("사용 가능한 명령:");
  INTERACTIVE_COMMANDS.forEach((item, i) => {
    const num = item.key === "exit" ? "0" : String(i + 1);
    console.log(`${color(num, ANSI.yellow)}. ${color(item.label, ANSI.bold)} ${color(`(${item.key})`, ANSI.gray)}`);
  });
  const answer = (await rl.question("명령을 선택하세요: ")).trim();
  const num = Number(answer);
  if (answer === "0") return "exit";
  if (Number.isInteger(num) && num >= 1 && num <= INTERACTIVE_COMMANDS.length) {
    const found = INTERACTIVE_COMMANDS[num - 1];
    if (found) return found.key;
  }
  return COMMAND_ALIASES[answer] ?? answer;
}

/** 도움말 텍스트를 출력한다 */
export function printHelp(): void {
  printSection("도움말");
  console.log(`
명령어 가이드
  로그인         | login --userId <id> --password <pw>
  과목           | courses
  이러닝자동시청 | elearning-watch --crsCreCd <code> --lessonCntsId <id>
  이러닝다운로드 | elearning-download --crsCreCd <code> --lessonCntsId <id>
`);
}

/** 목록에서 항목 하나를 번호로 선택하게 한다 */
export async function pickFromList<T>(
  rl: readline.Interface,
  title: string,
  items: T[],
  labelMapper: (item: T) => string
): Promise<T> {
  console.log("");
  printSection(`${title}:`);
  items.forEach((item, i) => {
    console.log(`${color(String(i + 1), ANSI.yellow)}. ${labelMapper(item)}`);
  });

  const answer = await rl.question(`${title} 번호를 선택하세요: `);
  const index = parseInt(answer.trim()) - 1;
  const selected = items[index];
  if (!selected) {
    throw new Error(`올바른 ${title} 번호를 선택하세요.`);
  }
  return selected;
}

/**
 * 초 단위 숫자를 "X분 Y초" 형식의 문자열로 변환한다
 * @param {number} seconds - 변환할 초 단위 시간
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

/**
 * 텍스트 기반의 진행바(Progress Bar) 문자열을 생성한다
 * @param {number} current - 현재 값
 * @param {number} total - 최대 값
 * @param {number} [width=30] - 진행바 너비
 * @returns {string} 진행바 문자열
 */
export function getProgressBar(current: number, total: number, width: number = 30): string {
  const percent = Math.min(Math.max(current / total, 0), 1);
  const filledWidth = Math.floor(percent * width);
  const emptyWidth = width - filledWidth;
  
  const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
  const percentText = (percent * 100).toFixed(1).padStart(5) + "%";
  
  return `|${color(bar, ANSI.cyan)}| ${color(percentText, ANSI.bold)}`;
}
