import readline from "node:readline/promises";

/**
 * 터미널 UI의 시각적 구분과 정보 전달력을 높이기 위한 표준 색상 셋.
 */
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

/** 사용자 인터랙션을 위한 한글/영문 명령어 별칭 맵 */
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

/** CLI 메인 대시보드 구성을 위한 인터랙티브 명령어 목록 */
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

/**
 * 텍스트에 ANSI 이스케이프 코드를 적용하여 색상을 입힌다.
 * @param {string} text - 색상을 입힐 문자열
 * @param {...string} codes - 적용할 ANSI 색상/스타일 코드
 * @returns {string} 색상이 적용된 문자열 (TTY가 아닐 경우 원본 반환)
 */
export function color(text: string, ...codes: string[]): string {
  if (!COLOR_ENABLED) return text;
  return `${codes.join("")}${text}${ANSI.reset}`;
}

/**
 * JSON 문자열에 구문 강조(Syntax Highlighting)를 적용하여 가독성을 높인다.
 * @param {string} text - 변환할 JSON 문자열
 * @returns {string} 색상이 입혀진 JSON 텍스트
 */
export function colorizeJson(text: string): string {
  if (!COLOR_ENABLED) return text;
  return text
    .replace(/^( *)"([^"]+)":/gm, (_, indent, key) => `${indent}${color(`"${key}"`, ANSI.cyan)}:`)
    .replace(/: "([^"]*)"/g, (_, v) => `: ${color(`"${v}"`, ANSI.green)}`)
    .replace(/: (-?\d+(?:\.\d+)?)/g, (_, v) => `: ${color(v, ANSI.yellow)}`)
    .replace(/: (true|false|null)/g, (_, v) => `: ${color(v, ANSI.magenta)}`);
}

/**
 * 객체 또는 JSON 문자열을 터미널에 미려한 형식으로 출력한다.
 * @param {any} value - 출력할 데이터
 */
export function prettyPrint(value: any): void {
  if (typeof value === "string") {
    try {
      console.log(colorizeJson(JSON.stringify(JSON.parse(value), null, 2)));
      return;
    } catch {
      console.log(value); // 일반 문자열은 그대로 출력
      return;
    }
  }
  console.log(colorizeJson(JSON.stringify(value, null, 2)));
}

/** 섹션 구분선을 포함한 제목을 출력한다 */
export function printSection(title: string): void { console.log(color(title, ANSI.bold, ANSI.blue)); }
/** 일반적인 안내 정보를 출력한다 */
export function printInfo(message: string): void { console.log(color(message, ANSI.gray)); }
/** 작업 성공 상태를 출력한다 */
export function printSuccess(message: string): void { console.log(color(message, ANSI.green)); }
/** 주의가 필요한 경고 메시지를 출력한다 */
export function printWarning(message: string): void { console.log(color(message, ANSI.yellow)); }
/** 치명적인 에러 메시지를 출력한다 */
export function printErrorMessage(message: string): void { console.error(color(message, ANSI.red)); }

/**
 * 사용자에게 텍스트 입력을 요청한다.
 * @param {readline.Interface} rl - 활성화된 readline 인터페이스
 * @param {string} label - 입력 프롬프트 라벨
 * @param {string} [fallback=""] - 입력값이 없을 경우 사용할 기본값
 * @returns {Promise<string>} 입력 완료된 문자열
 */
export async function ask(rl: readline.Interface, label: string, fallback: string = ""): Promise<string> {
  const suffix = fallback ? color(` [기본값: ${fallback}]`, ANSI.gray) : "";
  return (await rl.question(`${color(label, ANSI.cyan)}${suffix}: `)).trim() || fallback;
}

/**
 * 메인 대시보드 메뉴를 출력하고 사용자의 명령어 선택을 기다린다.
 * @param {readline.Interface} rl - 인터페이스 인스턴스
 * @returns {Promise<string>} 선택된 명령어 키
 */
export async function chooseCommand(rl: readline.Interface): Promise<string> {
  printSection("사용 가능한 명령:");
  INTERACTIVE_COMMANDS.forEach((item, i) => {
    // 0번 종료를 위한 특수 인덱싱 처리
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
  return COMMAND_ALIASES[answer] ?? answer; // 직접 키워드 입력 시 대응
}

/** CLI 도구 사용법에 대한 도움말 텍스트를 출력한다 */
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

/**
 * 제공된 배열 목록을 터미널에 출력하고 사용자가 번호로 하나를 선택하게 한다.
 * @param {readline.Interface} rl - 인터페이스 인스턴스
 * @param {string} title - 목록의 제목
 * @param {T[]} items - 선택할 항목 배열
 * @param {(item: T) => string} labelMapper - 각 항목을 문자열 라벨로 변환하는 함수
 * @returns {Promise<T>} 선택된 항목 객체
 * @throws {Error} 범위를 벗어난 번호 선택 시 발생
 */
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
 * 초 단위 숫자를 읽기 쉬운 "X분 Y초" 포맷으로 변환한다.
 * @param {number} seconds - 변환할 시간(초)
 * @returns {string} 포맷팅된 시간 문자열
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

/**
 * 시각적인 진행 상태 바(Progress Bar) 문자열을 생성한다.
 * @param {number} current - 현재 진행 수치
 * @param {number} total - 목표 전체 수치
 * @param {number} [width=30] - 터미널에 표시될 바의 너비
 * @returns {string} ASCII 진행바 문자열
 */
export function getProgressBar(current: number, total: number, width: number = 30): string {
  const percent = Math.min(Math.max(current / total, 0), 1);
  const filledWidth = Math.floor(percent * width);
  const emptyWidth = width - filledWidth;
  
  const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
  const percentText = (percent * 100).toFixed(1).padStart(5) + "%";
  
  return `|${color(bar, ANSI.cyan)}| ${color(percentText, ANSI.bold)}`;
}
