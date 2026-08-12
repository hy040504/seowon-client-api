import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import util from "node:util";
import * as cheerio from "cheerio";

import {
  ANSI,
  color,
  printSection,
  printInfo,
  printSuccess,
  printWarning,
  printErrorMessage,
  ask,
  pickFromList,
  getProgressBar,
  formatTime
} from "../src/cli-ui.js";

import {
  createEcampusClient,
  isCookieJarUsable,
  watchLesson,
  type EcampusClient,
  type EcampusClassroomAttachment,
  type EcampusClassroomItem,
  type EcampusCourseListItem,
  type EcampusLessonItem
} from "../src/index.js";
import type {
  AvailableAssignmentItem,
  CurricularScoreResult,
  MaterialDownloadState,
  WatchQueueItem
} from "../src/types/auto-manager.js";

const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");
const WATCH_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴"];
const STUDY_DETAIL_CONFIRM_MESSAGE = "[ElearningSession] ✅ viewLessonStudyDetail (학습 이력 확인)";
const STUDY_DETAIL_WAITING_MESSAGE = "[ElearningSession] 학습 이력 갱신 대기 중";
const STUDY_DETAIL_FADE_MS = 5000;

const LECTURE_MATERIALS_DIR = "강의자료들";

/**
 * 제목이나 주차 라벨에서 주차 번호를 추출한다.
 * @param {string | undefined} text - 주차 정보가 포함될 수 있는 텍스트
 * @returns {number | undefined} 추출된 주차 번호
 */
function extractWeekNumber(text: string | undefined): number | undefined {
  const match = text?.match(/(\d+)\s*주차/);
  return match?.[1] ? Number(match[1]) : undefined;
}

/**
 * 제목 앞의 중복 주차 표기를 제거한다.
 * @param {string} title - 정리할 원본 제목
 * @returns {string} 주차 접두어가 제거된 제목
 */
function stripLeadingWeekMarker(title: string): string {
  return title
    .replace(/^\s*\[\s*\d+\s*주차\s*\]\s*/, "")
    .replace(/^\s*\d+\s*주차\s*[:.)-]?\s*/, "")
    .trim();
}

/**
 * 목록에서 주차를 먼저 볼 수 있도록 제목을 표준 라벨로 보정한다.
 * @param {string} title - 원본 제목
 * @param {string} [weekSource] - 주차 정보를 우선 추출할 텍스트
 * @returns {string} 주차 라벨이 붙은 제목
 */
function formatTitleWithWeek(title: string, weekSource?: string): string {
  const weekNumber = extractWeekNumber(weekSource) ?? extractWeekNumber(title);
  if (!weekNumber) return title;

  const displayTitle = stripLeadingWeekMarker(title) || title.trim();
  return `[${weekNumber} 주차] ${displayTitle}`;
}

/**
 * 강의 차시 제목을 주차 기준으로 표시한다.
 * @param {EcampusLessonItem} lesson - 표시할 강의 차시
 * @returns {string} 주차 라벨이 포함된 차시 제목
 */
function formatLessonTitleWithWeek(lesson: EcampusLessonItem): string {
  return formatTitleWithWeek(lesson.title, lesson.scheduleTitle);
}

/**
 * 다운로드 선택 목록에 표시할 강의 라벨을 만든다.
 * @param {EcampusLessonItem} lesson - 표시할 강의 차시
 * @returns {string} 제목과 강의 시간이 포함된 라벨
 */
function formatDownloadLessonLabel(lesson: EcampusLessonItem): string {
  return `${formatLessonTitleWithWeek(lesson)} [${lesson.durationText || "시간미정"}]`;
}

/**
 * 과제 제목을 주차 기준으로 표시한다.
 * @param {EcampusClassroomItem} assignment - 표시할 과제 항목
 * @returns {string} 주차 라벨이 포함된 과제 제목
 */
function formatAssignmentTitleWithWeek(assignment: EcampusClassroomItem): string {
  return formatTitleWithWeek(assignment.title);
}

/**
 * 강의자료 선택 목록에 표시할 라벨을 생성한다.
 * 주차 정보 + 날짜 + 첨부 여부 표시 (기존 8번/9번 공통 사용)
 * @param {EcampusClassroomItem} material - 표시할 강의자료 항목
 * @returns {string} 선택 목록용 강의자료 라벨
 */
function formatMaterialSelectionLabel(material: EcampusClassroomItem): string {
  const title = formatTitleWithWeek(material.title);
  const date = material.date ? ` / ${material.date}` : "";
  const attachment = material.hasAttachment ? " / 첨부 있음" : "";
  return `${title}${date}${attachment}`;
}

/**
 * 파일 시스템에서 안전하게 사용할 수 있는 이름으로 정제한다.
 * @param {string} name - 원본 파일 또는 폴더 이름
 * @returns {string} 저장 가능한 파일명
 */
function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100)
    .replace(/[. ]+$/g, "");

  return sanitized || "untitled";
}

/**
 * 기존 파일을 덮어쓰지 않도록 고유한 저장 경로를 만든다.
 * @param {string} filePath - 저장하려는 원본 경로
 * @returns {string} 충돌이 없는 저장 경로
 */
function ensureUniqueFilePath(filePath: string): string {
  if (!fs.existsSync(filePath)) return filePath;

  const parsed = path.parse(filePath);
  for (let i = 1; i < 1000; i++) {
    const candidate = path.resolve(parsed.dir, `${parsed.name} (${i})${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }

  return path.resolve(parsed.dir, `${parsed.name} (${Date.now()})${parsed.ext}`);
}

const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*m/g;

/**
 * 터미널 제어 문자를 제외한 실제 표시 텍스트를 얻는다.
 * @param {string} value - ANSI 코드가 포함될 수 있는 문자열
 * @returns {string} ANSI 코드가 제거된 문자열
 */
function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

/**
 * 터미널 자동 줄바꿈을 피하기 위한 실제 사용 가능 폭을 계산한다.
 * @returns {number} 최소 폭이 보장된 터미널 콘텐츠 너비
 */
function getTerminalContentWidth(): number {
  const columns = process.stdout.columns || 100;
  return Math.max(40, columns - 1);
}

/**
 * 한글과 emoji처럼 폭이 2칸인 문자를 고려해 표시 폭을 계산한다.
 * @param {string} char - 폭을 계산할 단일 문자
 * @returns {number} 터미널 표시 폭
 */
function getCharDisplayWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0 || (code >= 0x0300 && code <= 0x036f) || (code >= 0xfe00 && code <= 0xfe0f)) {
    return 0;
  }

  if (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x2600 && code <= 0x27bf) ||
      (code >= 0x1f300 && code <= 0x1faff))
  ) {
    return 2;
  }

  return 1;
}

/**
 * ANSI 코드가 섞인 문자열의 터미널 표시 폭을 계산한다.
 * @param {string} value - 폭을 계산할 문자열
 * @returns {number} 터미널 표시 폭
 */
function getDisplayWidth(value: string): number {
  let width = 0;
  for (const char of stripAnsi(value)) {
    width += getCharDisplayWidth(char);
  }
  return width;
}

/**
 * 한글 폭을 고려해 터미널 한 줄에 맞도록 문자열을 줄인다.
 * @param {string} value - 원본 문자열
 * @param {number} maxWidth - 허용할 최대 표시 폭
 * @returns {string} 필요한 경우 말줄임 처리된 문자열
 */
function truncateDisplay(value: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  if (getDisplayWidth(value) <= maxWidth) return value;
  if (maxWidth <= 3) return ".".repeat(maxWidth);

  let width = 0;
  let output = "";
  for (const char of value) {
    const charWidth = getCharDisplayWidth(char);
    if (width + charWidth > maxWidth - 3) break;
    output += char;
    width += charWidth;
  }

  return `${output}...`;
}

/**
 * 다운로드 상태를 진행바 또는 상태 라벨로 변환한다.
 * @param {MaterialDownloadState} item - 다운로드 상태 항목
 * @returns {string} 터미널에 표시할 상태 텍스트
 */
function getDownloadStatusText(item: MaterialDownloadState): string {
  switch (item.status) {
    case "downloading":
      return getProgressBar(item.percent, 100, 15);
    case "completed":
      return color("✅ 완료", ANSI.green);
    case "failed":
      return color("❌ 실패", ANSI.red);
    default:
      return color("⏳ 대기", ANSI.gray);
  }
}

/**
 * 다운로드 상태별 강조 색상을 결정한다.
 * @param {MaterialDownloadState["status"]} status - 다운로드 상태 값
 * @returns {string | undefined} 적용할 ANSI 색상 코드
 */
function getDownloadStatusLabelColor(status: MaterialDownloadState["status"]): string | undefined {
  switch (status) {
    case "downloading":
      return ANSI.yellow;
    case "completed":
      return ANSI.green;
    case "failed":
      return ANSI.red;
    default:
      return undefined;
  }
}

/**
 * 다운로드 대기열의 한 줄 표시 문자열을 생성한다.
 * @param {MaterialDownloadState} item - 다운로드 상태 항목
 * @param {number} index - 현재 항목 인덱스
 * @param {number} total - 전체 항목 수
 * @returns {string} 터미널 한 줄 상태 문자열
 */
function formatDownloadStatusLine(
  item: MaterialDownloadState,
  index: number,
  total: number
): string {
  const prefix = `[${index + 1}/${total}]`;
  const statusText = getDownloadStatusText(item);
  const fixedPart = `${prefix} ${statusText} `;
  const availableWidth = Math.max(0, getTerminalContentWidth() - getDisplayWidth(fixedPart));
  const detail = item.detail ? ` (${item.detail})` : "";
  const label = truncateDisplay(`${item.title}${detail}`, availableWidth);
  const labelColor = getDownloadStatusLabelColor(item.status);

  return `${fixedPart}${labelColor ? color(label, labelColor) : label}`;
}

/**
 * 여러 다운로드 항목을 고정 위치에서 갱신하는 렌더러를 만든다.
 * @param {MaterialDownloadState[]} itemStatuses - 렌더링할 다운로드 상태 배열
 * @returns {{ start: () => void; render: (force?: boolean) => void; stop: () => void }} 대기열 렌더러
 */
function createDownloadQueueRenderer(itemStatuses: MaterialDownloadState[]) {
  let isStarted = false;
  let renderTimer: NodeJS.Timeout | undefined;
  let lastRenderTime = 0;
  const RENDER_THROTTLE_MS = 60;

  /**
   * 현재 상태 배열을 터미널에 다시 그린다.
   * @returns {void} 반환값 없음
   */
  const draw = () => {
    if (!isStarted) return;
    lastRenderTime = Date.now();

    let output = `\r\u001b[${itemStatuses.length}A`;
    itemStatuses.forEach((item, i) => {
      output += `\u001b[K${formatDownloadStatusLine(item, i, itemStatuses.length)}\n`;
    });

    process.stdout.write(output);
  };

  /**
   * 과도한 stdout 갱신을 줄이기 위해 렌더링을 throttle한다.
   * @param {boolean} [force=false] - 대기 중인 렌더링을 무시하고 즉시 갱신할지 여부
   * @returns {void} 반환값 없음
   */
  const render = (force = false) => {
    if (!isStarted) return;
    if (force && renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = undefined;
    }

    const now = Date.now();
    if (!force && now - lastRenderTime < RENDER_THROTTLE_MS) {
      if (!renderTimer) {
        renderTimer = setTimeout(
          () => {
            renderTimer = undefined;
            draw();
          },
          RENDER_THROTTLE_MS - (now - lastRenderTime)
        );
      }
      return;
    }

    draw();
  };

  return {
    /**
     * 대기열 렌더링을 시작한다.
     * @returns {void} 반환값 없음
     */
    start() {
      isStarted = true;
      render(true);
    },
    render,
    /**
     * 대기 중인 렌더링을 정리하고 마지막 상태를 출력한다.
     * @returns {void} 반환값 없음
     */
    stop() {
      if (renderTimer) {
        clearTimeout(renderTimer);
        renderTimer = undefined;
      }
      render(true);
      isStarted = false;
    }
  };
}

/**
 * URL 메타데이터에서 첨부파일 이름을 추정한다.
 * @param {string} url - 파일명을 추정할 URL
 * @returns {string} 추정된 파일명
 */
function guessFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const queryKeys = ["fileName", "filename", "fileNm", "oriFileNm", "saveFileNm", "name"];
    for (const key of queryKeys) {
      const value = parsed.searchParams.get(key);
      if (value) return decodeURIComponent(value);
    }

    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) return decodeURIComponent(lastSegment);
  } catch {}

  return "attachment";
}

/**
 * 실전 자동화 매니저 (TS)
 * 대량의 영상 다운로드 및 시청 작업을 순차적/병렬적으로 처리하는 고성능 자동화 도구.
 * @returns {Promise<void>} CLI 종료 시 resolve
 */
async function run() {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🚀 서원대 e-campus 실전 자동화 매니저 (TS) ---");

  // .env에서 버퍼 설정 최적화 정보를 읽어 표시
  const hwm = process.env.DOWNLOAD_HIGH_WATER_MARK || "1024 (기본값)";
  printInfo(`⚙️  다운로드 엔진 최적화: Buffer ${hwm}KB 적용됨\n`);

  try {
    const client = await initializeSession(rl);

    while (true) {
      printSection("\n[메인 메뉴]");
      console.log(
        `${color("1", ANSI.yellow)}. ${color("🔑 로그인 / 로그인 정보 갱신", ANSI.bold)}`
      );
      console.log(
        `${color("2", ANSI.yellow)}. ${color("📥 이러닝 일괄 다운로드 (전체 대기열 시각화)", ANSI.bold)}`
      );
      console.log(
        `${color("3", ANSI.yellow)}. ${color("📺 이러닝 순차 자동 시청 (고급 로그 제어)", ANSI.bold)}`
      );
      console.log(
        `${color("4", ANSI.yellow)}. ${color("📝 전체 교과목 미제출 과제 전수 조사", ANSI.bold)}`
      );
      console.log(
        `${color("5", ANSI.yellow)}. ${color("📡 전 과목 기간 내 미완료 이러닝 자동 시청", ANSI.bold)}`
      );
      console.log(
        `${color("6", ANSI.yellow)}. ${color("현재 수행 가능한 전 과목 미제출 과제 목록", ANSI.bold)}`
      );
      console.log(
        `${color("7", ANSI.yellow)}. ${color("현재 수행 가능한 과제 선택 및 상세내용 보기", ANSI.bold)}`
      );
      console.log(
        `${color("8", ANSI.yellow)}. ${color("강의자료 다운로드 (일괄 + 첨부 분석/미리보기)", ANSI.bold)}`
      );
      console.log(
        `${color("9", ANSI.yellow)}. ${color("교과 과목 전체 성적(등급) 조회", ANSI.bold)}`
      );
      console.log(`${color("0", ANSI.yellow)}. ${color("종료", ANSI.bold)}`);
      printInfo("수강희망바구니는 `npm run hope-basket:manager` (정식 수강신청 본신청 아님).");

      const menu = (await rl.question("\n메뉴 선택: ")).trim();
      if (menu === "0") break;

      switch (menu) {
        case "1":
          await loginManual(client, rl);
          break;
        case "2":
          await withAuthRetry(client, rl, () => batchDownload(client, rl));
          break;
        case "3":
          await withAuthRetry(client, rl, () => batchWatch(client, rl));
          break;
        case "4":
          await withAuthRetry(client, rl, () => checkAllAssignments(client));
          break;
        case "5":
          await withAuthRetry(client, rl, () => watchAvailableUnwatchedLessons(client, rl));
          break;
        case "6":
          await withAuthRetry(client, rl, () => listAvailableAssignments(client));
          break;
        case "7":
          await withAuthRetry(client, rl, () => viewAvailableAssignmentDetail(client, rl));
          break;
        case "8":
          // 첨부 분석과 다운로드를 한 흐름으로 묶어 같은 자료를 두 번 선택하지 않게 한다.
          await withAuthRetry(client, rl, () => batchDownloadMaterials(client, rl));
          break;
        case "9":
          await withAuthRetry(client, rl, () => viewAllCurricularScores(client));
          break;
        default:
          printErrorMessage("올바른 메뉴를 선택하세요.");
      }
    }
  } catch (err: any) {
    printErrorMessage(`\n❌ 오류 발생: ${err.message}`);
  } finally {
    rl.close();
  }
}

/**
 * 작업을 수행하다가 세션 만료가 발생하면 자동 로그인을 시도하고 재개한다.
 * @param {EcampusClient} client - 클라이언트 인스턴스
 * @param {readline.Interface} rl - 입출력 인터페이스
 * @param {Function} action - 재시도할 원본 작업
 * @returns {Promise<T>} 원본 작업의 실행 결과
 */
async function withAuthRetry<T>(
  client: EcampusClient,
  rl: readline.Interface,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (err: any) {
    // 서버 응답 분석 중 세션 만료 키워드가 발견된 경우
    if (err.message === "SESSION_EXPIRED" || err.message?.includes("로그인")) {
      printWarning("\n🔄 세션 만료가 감지되었습니다. 자동 재로그인을 시도합니다...");
      try {
        await refreshSession(client);
        printSuccess("✅ 세션 갱신 성공. 작업을 재개합니다.");
        return await action();
      } catch (authErr: any) {
        printErrorMessage(`\n❌ 자동 재로그인 실패: ${authErr.message}`);
        throw authErr;
      }
    }
    throw err;
  }
}

/**
 * 저장된 계정 정보를 이용해 백그라운드에서 로그인을 갱신한다.
 * @param {EcampusClient} client - 세션을 갱신할 클라이언트
 * @returns {Promise<void>} 로그인 갱신 완료 시 resolve
 * @throws {Error} 자동 로그인에 필요한 계정 정보가 없을 때 발생
 */
async function refreshSession(client: EcampusClient): Promise<void> {
  const creds = client.getCredentials() || {
    userId: process.env.SEOWON_ID || "",
    password: process.env.SEOWON_PASSWORD || ""
  };
  if (!creds.userId || !creds.password || creds.userId === "비어있음") {
    throw new Error("자동 로그인을 위한 계정 정보가 없습니다.");
  }
  await client.login(creds);
}

/**
 * 앱 시작 시 기존 세션 유무를 확인하고 없으면 로그인을 진행한다.
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<EcampusClient>} 인증 가능한 e-campus 클라이언트
 */
async function initializeSession(rl: readline.Interface): Promise<EcampusClient> {
  const client = createEcampusClient({ cookieFilePath: DEFAULT_COOKIE_FILE });

  if (process.env.SEOWON_ID && process.env.SEOWON_PASSWORD) {
    client.setCredentials({ userId: process.env.SEOWON_ID, password: process.env.SEOWON_PASSWORD });
  }

  if (fs.existsSync(DEFAULT_COOKIE_FILE) && isCookieJarUsable(client.cookieJar)) {
    printSuccess("✅ 기존 세션을 불러왔습니다.");
    return client;
  }

  return await loginManual(client, rl);
}

/**
 * 사용자로부터 계정 정보를 직접 입력받아 로그인을 수행한다.
 * @param {EcampusClient} client - 로그인할 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<EcampusClient>} 로그인 완료된 클라이언트
 * @throws {Error} 유효한 계정 정보가 입력되지 않았을 때 발생
 */
async function loginManual(client: EcampusClient, rl: readline.Interface): Promise<EcampusClient> {
  printWarning("\n🔑 로그인을 수행합니다.");
  const userId = await ask(rl, "아이디", process.env.SEOWON_ID || "비어있음");
  const password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD || "비어있음");
  if (userId === "비어있음" || password === "비어있음")
    throw new Error("유효한 계정 정보가 필요합니다.");
  await client.login({ userId, password });
  printSuccess("✅ 로그인 성공 및 세션 저장 완료.");
  return client;
}

/**
 * 선택한 이러닝 강의를 다중 워커로 일괄 다운로드한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<void>} 다운로드 작업 완료 시 resolve
 */
async function batchDownload(client: EcampusClient, rl: readline.Interface): Promise<void> {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);

  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(
    rl,
    "다운로드할 강의",
    lessons,
    formatDownloadLessonLabel
  );

  if (selectedLessons.length === 0) {
    printWarning("다운로드할 강의가 선택되지 않았습니다.");
    return;
  }

  const concurrencyInput = await ask(rl, "동시 다운로드 수", "3");
  const concurrency = Math.min(Math.max(parseInt(concurrencyInput) || 1, 1), 5);

  const itemStatuses: MaterialDownloadState[] = selectedLessons.map((l) => ({
    title: formatLessonTitleWithWeek(l),
    percent: 0,
    status: "pending"
  }));
  const renderer = createDownloadQueueRenderer(itemStatuses);

  printInfo(
    `\n🚀 총 ${selectedLessons.length}개의 파일을 다운로드합니다. (동시 작업: ${concurrency}개)\n`
  );
  selectedLessons.forEach(() => console.log(""));
  renderer.start();

  const queueIdxs = Array.from({ length: selectedLessons.length }, (_, i) => i);
  /**
   * 공유 큐에서 다음 강의를 꺼내 다운로드한다.
   * @returns {Promise<void>} 할당된 큐 작업 완료 시 resolve
   */
  const downloadWorker = async () => {
    while (queueIdxs.length > 0) {
      const idx = queueIdxs.shift();
      if (idx === undefined) break;
      const lesson = selectedLessons[idx]!;
      const state = itemStatuses[idx]!;
      state.status = "downloading";
      renderer.render(true);
      const res = await client.downloadElearningMp4(
        course.crsCreCd,
        lesson.lessonCntsId,
        sanitizeFilename(course.title),
        sanitizeFilename(lesson.title),
        "./downloads",
        (p) => {
          state.percent = p.percent;
          renderer.render();
        }
      );
      state.status = res.success ? "completed" : "failed";
      state.percent = res.success ? 100 : state.percent;
      state.detail = res.success ? "저장 완료" : res.message;
      renderer.render(true);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => downloadWorker()));
  renderer.stop();
  process.stdout.write("\n");
  console.log(color("\n✅ 모든 영상 다운로드가 성공적으로 완료되었습니다!", ANSI.bold, ANSI.green));
}

/**
 * 강의자료 첨부파일을 미리 분석한 뒤 일괄 다운로드한다.
 * 첨부 분석 결과를 캐시해 상세 HTML을 중복 요청하지 않는다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<void>} 다운로드 작업 완료 시 resolve
 */
async function batchDownloadMaterials(
  client: EcampusClient,
  rl: readline.Interface
): Promise<void> {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);

  const materials = await client.getMaterialList({ crsCreCd: course.crsCreCd, listScale: 1000 });
  const selectedMaterials = await pickMultipleFromList(
    rl,
    "다운로드할 강의자료",
    materials,
    formatMaterialSelectionLabel
  );

  if (selectedMaterials.length === 0) {
    printWarning("다운로드할 강의자료가 선택되지 않았습니다.");
    return;
  }

  // 다운로드 시작 전 분석해 사용자가 빈 첨부 자료를 큐에 넣는 일을 줄인다.
  const preloadedAttachments = new Map<string, EcampusClassroomAttachment[]>();
  printInfo(`\n선택한 ${selectedMaterials.length}개 자료의 첨부파일을 request 객체로 분석 중...`);
  for (const material of selectedMaterials) {
    try {
      const atts = await client.getMaterialAttachments(material);
      preloadedAttachments.set(material.id, atts);
      const names =
        atts
          .slice(0, 3)
          .map((a) => a.title)
          .join(", ") + (atts.length > 3 ? "..." : "");
      console.log(
        `  ${color("•", ANSI.gray)} ${formatMaterialSelectionLabel(material)} — ${color(String(atts.length), ANSI.cyan)}개${names ? " (" + names + ")" : ""}`
      );
    } catch (err: any) {
      console.log(
        `  ${color("•", ANSI.gray)} ${formatMaterialSelectionLabel(material)} — ${color("분석 실패", ANSI.red)}: ${err.message}`
      );
      preloadedAttachments.set(material.id, []);
    }
  }

  // 첨부가 없는 항목은 사용자가 이미 preview에서 확인했으므로 큐에서 제외한다.
  const downloadMaterials = selectedMaterials.filter((material) => {
    const atts = preloadedAttachments.get(material.id) || [];
    return atts.length > 0;
  });

  if (downloadMaterials.length === 0) {
    printWarning("선택한 자료 중 첨부파일이 있는 항목이 없습니다.");
    return;
  }

  const concurrencyInput = await ask(rl, "동시 다운로드 수", "3");
  const concurrency = Math.min(Math.max(parseInt(concurrencyInput) || 1, 1), 5);

  const itemStatuses: MaterialDownloadState[] = downloadMaterials.map((material) => ({
    title: formatMaterialSelectionLabel(material),
    percent: 0,
    status: "pending"
  }));
  const renderer = createDownloadQueueRenderer(itemStatuses);

  printInfo(
    `\n📚 총 ${downloadMaterials.length}개의 강의자료 첨부파일을 다운로드합니다. (동시 작업: ${concurrency}개)\n`
  );
  // render가 같은 줄을 덮어쓸 수 있도록 항목 수만큼 공간을 확보한다.
  downloadMaterials.forEach(() => console.log(""));
  renderer.start();

  const queueIdxs = Array.from({ length: downloadMaterials.length }, (_, i) => i);

  /**
   * 미리 분석한 첨부 목록을 사용해 공유 큐의 다음 자료를 다운로드한다.
   * @returns {Promise<void>} 할당된 큐 작업 완료 시 resolve
   */
  const downloadWorker = async () => {
    while (queueIdxs.length > 0) {
      const idx = queueIdxs.shift();
      if (idx === undefined) break;

      const material = downloadMaterials[idx]!;
      const state = itemStatuses[idx]!;
      state.status = "downloading";
      state.detail = preloadedAttachments.get(material.id)?.length
        ? "다운로드 중 (분석 완료)"
        : "첨부 분석 중";
      renderer.render(true);

      const preloaded = preloadedAttachments.get(material.id) ?? [];
      const res = await downloadMaterialAttachmentBundle(
        client,
        course,
        material,
        (progress) => {
          state.percent = progress.percent;
          state.detail = progress.detail;
          renderer.render();
        },
        preloaded.length > 0 ? preloaded : undefined
      );

      state.status = res.success ? "completed" : "failed";
      state.percent = res.success ? 100 : state.percent;
      state.detail = res.message;
      renderer.render(true);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => downloadWorker()));
  renderer.stop();

  // 진행률 블록과 다음 메뉴 출력이 겹치지 않도록 커서를 한 줄 내린다.
  process.stdout.write("\n");

  console.log(
    color("\n✅ 모든 강의자료 다운로드가 성공적으로 완료되었습니다!", ANSI.bold, ANSI.green)
  );
}

/**
 * 단일 강의자료의 첨부파일들을 다운로드한다.
 * 미리 분석된 첨부 목록이 있으면 재사용해 상세 HTML 중복 요청을 피한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {EcampusCourseListItem} course - 저장 경로에 사용할 과목 정보
 * @param {EcampusClassroomItem} material - 다운로드할 강의자료 항목
 * @param {(progress: { percent: number; detail?: string }) => void} [progressCallback] - 번들 진행률 콜백
 * @param {EcampusClassroomAttachment[]} [preloadedAttachments] - 미리 분석한 첨부파일 목록
 * @returns {Promise<{ success: boolean; message: string }>} 번들 다운로드 결과
 */
async function downloadMaterialAttachmentBundle(
  client: EcampusClient,
  course: EcampusCourseListItem,
  material: EcampusClassroomItem,
  progressCallback?: (progress: { percent: number; detail?: string }) => void,
  preloadedAttachments?: EcampusClassroomAttachment[]
): Promise<{ success: boolean; message: string }> {
  try {
    let attachments: EcampusClassroomAttachment[] = preloadedAttachments ?? [];
    if (attachments.length === 0) {
      attachments = await client.getMaterialAttachments(material);
    }
    if (attachments.length === 0) {
      return { success: false, message: "첨부파일을 찾지 못했습니다." };
    }

    const materialDir = path.resolve(
      "./downloads",
      sanitizeFilename(course.title),
      LECTURE_MATERIALS_DIR,
      sanitizeFilename(formatTitleWithWeek(material.title))
    );
    fs.mkdirSync(materialDir, { recursive: true });

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i]!;
      const fileName = sanitizeFilename(attachment.title || guessFileNameFromUrl(attachment.url));
      const filePath = ensureUniqueFilePath(path.resolve(materialDir, fileName));

      progressCallback?.({
        percent: Math.round((i / attachments.length) * 100),
        detail: `${i + 1}/${attachments.length} ${fileName}`
      });

      const result = await downloadRemoteFile(
        client,
        attachment.url,
        filePath,
        material.url,
        (p) => {
          // 여러 첨부파일을 하나의 자료 진행률로 보여주기 위해 파일별 진행률을 환산한다.
          const overallPercent = Math.max(
            0,
            Math.min(99, Math.round(((i + p.percent / 100) / attachments.length) * 100))
          );
          progressCallback?.({
            percent: overallPercent,
            detail: `${i + 1}/${attachments.length} ${fileName}`
          });
        }
      );

      if (!result.success) {
        // 부분 성공을 성공으로 보이면 누락 파일을 놓치기 쉬워 번들 단위로 실패 처리한다.
        return { success: false, message: result.message || "첨부파일 다운로드 실패" };
      }
    }

    return { success: true, message: `${attachments.length}개 첨부파일 다운로드 완료` };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : util.inspect(err)
    };
  }
}

/**
 * 원격 첨부파일을 스트림으로 다운로드하고 로컬에 저장한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {string} url - 다운로드할 파일 URL
 * @param {string} filePath - 저장할 로컬 파일 경로
 * @param {string} refererUrl - 서버 검증을 통과하기 위한 Referer URL
 * @param {(progress: { percent: number; loaded: number }) => void} [progressCallback] - 파일 진행률 콜백
 * @returns {Promise<{ success: boolean; filePath?: string; message?: string }>} 파일 다운로드 결과
 */
async function downloadRemoteFile(
  client: EcampusClient,
  url: string,
  filePath: string,
  refererUrl: string,
  progressCallback?: (progress: { percent: number; loaded: number }) => void
): Promise<{ success: boolean; filePath?: string; message?: string }> {
  const hwmConfig = process.env.DOWNLOAD_HIGH_WATER_MARK
    ? parseInt(process.env.DOWNLOAD_HIGH_WATER_MARK)
    : 1024;
  const hwmBytes = (isNaN(hwmConfig) ? 1024 : hwmConfig) * 1024;
  const finalPath = ensureUniqueFilePath(filePath);

  try {
    const res = await client.http.get(url, {
      responseType: "stream",
      headers: {
        Accept: "*/*",
        Origin: client.baseUrl.replace(/\/$/, ""),
        Referer: refererUrl,
        "X-Requested-With": "XMLHttpRequest"
      },
      onDownloadProgress: (ev) => {
        if (progressCallback && ev.total) {
          progressCallback({
            loaded: ev.loaded,
            percent: Math.round((ev.loaded / ev.total) * 100)
          });
        }
      }
    });

    const writer = fs.createWriteStream(finalPath, { highWaterMark: hwmBytes });
    res.data.pipe(writer);

    return await new Promise((resolve, reject) => {
      res.data.on("error", (err: Error) => {
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        reject(err);
      });
      writer.on("finish", () => resolve({ success: true, filePath: finalPath }));
      writer.on("error", (err) => {
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        reject(err);
      });
    });
  } catch (err) {
    if (fs.existsSync(finalPath)) {
      try {
        fs.unlinkSync(finalPath);
      } catch {}
    }

    return {
      success: false,
      message: err instanceof Error ? err.message : util.inspect(err)
    };
  }
}

/**
 * 선택한 이러닝 차시를 순차 자동 시청 큐로 실행한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<void>} 시청 큐 완료 시 resolve
 */
async function batchWatch(client: EcampusClient, rl: readline.Interface): Promise<void> {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);
  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(
    rl,
    "자동 시청할 강의",
    lessons,
    formatDownloadLessonLabel
  );
  const stdNo = await ask(rl, "학번 (stdNo 확인용)", `${course.crsCreCd}_${process.env.SEOWON_ID}`);
  const queue = selectedLessons.map((lesson) => ({ course, lesson }));

  await watchLessonQueue(client, queue, stdNo);
}

/**
 * 전 과목에서 현재 수강 기간에 속한 미학습/학습중 이러닝을 자동 시청한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<void>} 대상 강의 시청 완료 시 resolve
 */
async function watchAvailableUnwatchedLessons(
  client: EcampusClient,
  rl: readline.Interface
): Promise<void> {
  printInfo("\n🔍 전 과목에서 현재 기간 내 미학습/학습중 이러닝을 찾고 있습니다...");
  const courses = await client.getCourseList();
  const now = new Date();
  const queue: WatchQueueItem[] = [];

  for (const course of courses) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    try {
      const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
      const periodMatches = lessons.filter((lesson) => isLessonPeriodActive(lesson, now));
      const statusMatches = lessons.filter(isLessonUnwatched);
      const targets = lessons.filter(
        (lesson) => isLessonPeriodActive(lesson, now) && isLessonUnwatched(lesson)
      );

      if (targets.length === 0 && (periodMatches.length > 0 || statusMatches.length > 0)) {
        process.stdout.write("\r\u001b[K");
        printWarning(
          `[진단] ${course.title}: 전체 ${lessons.length}개 / 기간 내 ${periodMatches.length}개 / 학습중·미학습 ${statusMatches.length}개 / 대상 0개`
        );
      }

      if (targets.length > 0) {
        process.stdout.write("\r\u001b[K");
        console.log(color(`\n[${course.title}]`, ANSI.bold, ANSI.yellow));
        targets.forEach((lesson) => {
          console.log(
            `  - ${formatLessonTitleWithWeek(lesson)} (${lesson.period || lesson.extraPeriod || "기간 미정"} / ${lesson.attendanceStatus || "상태 미정"})`
          );
          queue.push({ course, lesson });
        });
      }
    } catch (err) {
      process.stdout.write("\r\u001b[K");
      printWarning(
        `[SKIP] ${course.title}: ${err instanceof Error ? err.message : util.inspect(err)}`
      );
    }
  }

  process.stdout.write("\r\u001b[K");
  if (queue.length === 0) {
    printSuccess("\n✅ 현재 날짜 기준으로 기간 내 미학습/학습중 이러닝이 없습니다.");
    return;
  }

  const answer = await ask(rl, `총 ${queue.length}개 차시를 자동 시청할까요? (Y/n)`, "Y");
  if (!["y", "yes", "예", "네"].includes(answer.trim().toLowerCase())) {
    printWarning("자동 시청을 취소했습니다.");
    return;
  }

  const stdNoFallback = `${queue[0]!.course.crsCreCd}_${process.env.SEOWON_ID}`;
  const stdNo = await ask(rl, "학번 (stdNo 확인용)", stdNoFallback);

  await watchLessonQueue(client, queue, stdNo);
}

/**
 * 시청 대상 큐를 순차 처리하며 진행률과 세션 로그를 고정 영역에 표시한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {WatchQueueItem[]} queue - 시청할 강의 큐
 * @param {string} stdNo - 학습 기록 요청에 사용할 학생-강의실 식별값
 * @returns {Promise<void>} 모든 큐 처리 완료 시 resolve
 */
async function watchLessonQueue(
  client: EcampusClient,
  queue: WatchQueueItem[],
  stdNo: string
): Promise<void> {
  printSection(`\n🚀 총 ${queue.length}개의 강의를 순차적으로 시청합니다.`);

  for (let i = 0; i < queue.length; i++) {
    const { course, lesson } = queue[i]!;
    const totalSeconds = lesson.durationSeconds || 3600;
    printWarning(
      `\n[${i + 1}/${queue.length}] 시청 대기: [${course.title}] ${formatLessonTitleWithWeek(lesson)}`
    );

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    let elapsed = 0;
    let latestStudyRecordLog = "[ElearningSession] 학습 중... (서버 학습 률: 0%, 누적 0초)";
    let studyDetailConfirmedAt: number | undefined;
    let spinnerIndex = 0;
    let progressInterval: NodeJS.Timeout | undefined;
    let spinnerInterval: NodeJS.Timeout | undefined;
    let liveBlockActive = false;
    let hasRenderedLiveBlock = false;
    const useFixedLiveBlock = Boolean(process.stdout.isTTY);

    /**
     * 학습 상세 확인 전 대기 메시지를 상태 영역용 문자열로 만든다.
     * @returns {string} 점 애니메이션이 포함된 대기 메시지
     */
    const formatStudyDetailWaitingStatus = () => {
      const dots = ".".repeat((Math.floor(Date.now() / 500) % 3) + 1);
      return `${STUDY_DETAIL_WAITING_MESSAGE}${dots}`;
    };

    /**
     * 최근 학습 상세 확인 상태를 fade 효과가 적용된 문자열로 만든다.
     * @returns {string} 상태 영역에 표시할 학습 상세 확인 메시지
     */
    const formatStudyDetailStatus = () => {
      if (studyDetailConfirmedAt === undefined) return formatStudyDetailWaitingStatus();

      const fadeRatio = Math.min((Date.now() - studyDetailConfirmedAt) / STUDY_DETAIL_FADE_MS, 1);
      if (fadeRatio >= 1) return formatStudyDetailWaitingStatus();
      if (process.env.NO_COLOR) return STUDY_DETAIL_CONFIRM_MESSAGE;

      const green = [34, 197, 94];
      const white = [255, 255, 255];
      const rgb = green.map((channel, index) =>
        Math.round(channel + (white[index]! - channel) * fadeRatio)
      );
      return `\u001b[38;2;${rgb.join(";")}m${STUDY_DETAIL_CONFIRM_MESSAGE}${ANSI.reset}`;
    };

    /**
     * 반복 로그와 진행바를 터미널 고정 영역에 렌더링한다.
     * @returns {void} 반환값 없음
     */
    const renderLiveBlock = () => {
      if (!liveBlockActive) return;

      const bar = getProgressBar(elapsed, totalSeconds, 40);
      const elapsedText = color(`${formatTime(elapsed)} / ${formatTime(totalSeconds)}`, ANSI.gray);
      const spinner = WATCH_SPINNER_FRAMES[spinnerIndex]!;
      const progressLine = `${bar} ${elapsedText}`;

      if (!useFixedLiveBlock) {
        process.stdout.write(`\r\u001b[K${progressLine}`);
        hasRenderedLiveBlock = true;
        return;
      }

      if (hasRenderedLiveBlock) {
        process.stdout.write("\u001b[2A");
      }
      process.stdout.write(
        [
          `${latestStudyRecordLog} ${color(spinner, ANSI.cyan)}`,
          formatStudyDetailStatus(),
          progressLine
        ]
          .map((line) => `\r\u001b[2K${line}`)
          .join("\n")
      );
      hasRenderedLiveBlock = true;
    };

    /**
     * 다음 일반 로그가 겹치지 않도록 고정 상태 영역을 지운다.
     * @returns {void} 반환값 없음
     */
    const clearLiveBlock = () => {
      if (!hasRenderedLiveBlock) return;

      if (!useFixedLiveBlock) {
        process.stdout.write("\r\u001b[K");
        hasRenderedLiveBlock = false;
        return;
      }

      process.stdout.write("\u001b[2A");
      process.stdout.write(["", "", ""].map(() => "\r\u001b[2K").join("\n"));
      process.stdout.write("\r");
      hasRenderedLiveBlock = false;
    };

    /**
     * 반복 갱신 로그는 고정된 상태 영역에 흡수하고, 나머지 로그만 별도 줄에 출력한다.
     * @param {(...args: any[]) => void} logger - 원본 console 메서드
     * @returns {(...args: any[]) => void} 상태 영역과 충돌하지 않는 logger
     */
    const createSafeLogger =
      (logger: (...args: any[]) => void) =>
      (...args: any[]) => {
        const message = typeof args[0] === "string" ? args[0] : "";

        if (
          message.startsWith("[ElearningSession] ⏰ addStudyRecord 호출") ||
          message.startsWith("[ElearningSession] 학습 중...")
        ) {
          latestStudyRecordLog = message;
          renderLiveBlock();
          return;
        }

        if (message === STUDY_DETAIL_CONFIRM_MESSAGE) {
          studyDetailConfirmedAt = Date.now();
          renderLiveBlock();
          return;
        }

        clearLiveBlock();
        logger(...args);
        renderLiveBlock();
      };

    console.log = createSafeLogger(originalLog);
    console.warn = createSafeLogger(originalWarn);
    console.error = createSafeLogger(originalError);
    try {
      const session = await watchLesson(
        client.http,
        client.baseUrl,
        lesson.lessonCntsId,
        course.crsCreCd,
        stdNo
      );

      await new Promise<void>((resolve) => {
        liveBlockActive = true;
        renderLiveBlock();

        if (useFixedLiveBlock) {
          spinnerInterval = setInterval(() => {
            spinnerIndex = (spinnerIndex + 1) % WATCH_SPINNER_FRAMES.length;
            renderLiveBlock();
          }, 120);
        }

        progressInterval = setInterval(() => {
          elapsed += 1;
          renderLiveBlock();
          if (elapsed >= totalSeconds) {
            clearInterval(progressInterval);
            clearInterval(spinnerInterval);
            progressInterval = undefined;
            spinnerInterval = undefined;
            liveBlockActive = false;
            clearLiveBlock();
            session
              .stopWatchingLesson()
              .catch((err) => {
                printErrorMessage(
                  `종료 패킷 전송 실패: ${err instanceof Error ? err.message : util.inspect(err)}`
                );
              })
              .finally(() => resolve());
          }
        }, 1000);
      });
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      if (spinnerInterval) clearInterval(spinnerInterval);
      liveBlockActive = false;
      clearLiveBlock();
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    }
  }
  printSuccess("\n✅ 선택한 모든 강의 시청이 완료되었습니다.");
}

/**
 * 전체 교과목을 탐색해 미제출 또는 진행 중인 과제를 출력한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @returns {Promise<void>} 조사 완료 시 resolve
 */
async function checkAllAssignments(client: EcampusClient): Promise<void> {
  printInfo("\n🔍 전체 교과목에서 미제출 과제를 찾고 있습니다...");
  const groups = await client.getCourseGroups();
  const userNo = process.env.SEOWON_ID!;
  let totalMissing = 0;

  for (const course of groups.curricular) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    try {
      const assignments = await client.getAssignmentList({ crsCreCd: course.crsCreCd, userNo });
      const missing = assignments.filter(
        (a) => a.status === "미제출" || a.status?.includes("진행중")
      );
      if (missing.length > 0) {
        console.log(color(`\n[${course.title}]`, ANSI.bold, ANSI.yellow));
        missing.forEach((a) => {
          console.log(`  - 📝 ${formatAssignmentTitleWithWeek(a)} (기한: ${a.period || "미정"})`);
          totalMissing++;
        });
      }
    } catch {
      // 한 과목 조회 실패가 전체 전수 조사를 중단하지 않도록 건너뛴다.
    }
  }
  const finalColor = totalMissing > 0 ? ANSI.red : ANSI.green;
  console.log(
    color(
      `\n\n✅ 조사 완료! 총 ${totalMissing}개의 미제출/진행중 과제가 발견되었습니다.`,
      finalColor
    )
  );
}

/**
 * 전체 교과 과목을 순회하며 공개된 성적 요약과 등급을 조회한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @returns {Promise<void>} 성적 조회 출력 완료 시 resolve
 */
async function viewAllCurricularScores(client: EcampusClient): Promise<void> {
  printInfo("\n📊 전체 교과 과목 성적(등급)을 조회하고 있습니다...");
  const groups = await client.getCourseGroups();
  const courses = groups.curricular;

  if (courses.length === 0) {
    printWarning("조회할 교과 과목이 없습니다.");
    return;
  }

  const results: CurricularScoreResult[] = [];

  for (const course of courses) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    try {
      const summary = await client.getScoreSummary({ crsCreCd: course.crsCreCd });
      results.push({ course, status: "available", summary });
    } catch (err) {
      results.push({
        course,
        status: "unavailable",
        message: err instanceof Error ? err.message : util.inspect(err)
      });
    }
  }

  process.stdout.write("\r\u001b[K");
  printSection("\n[교과 과목 성적(등급)]");

  let availableCount = 0;
  let gradeCount = 0;

  for (const result of results) {
    if (result.status !== "available" || !result.summary) {
      printWarning(
        `[SKIP] ${result.course.title}: ${result.message || "성적을 조회할 수 없습니다."}`
      );
      continue;
    }

    availableCount++;
    if (result.summary.grade) gradeCount++;

    const grade = result.summary.grade || "미표시";
    console.log(
      `${color(`[${result.course.title}]`, ANSI.bold, ANSI.yellow)} 등급: ${color(grade, ANSI.green)}`
    );
  }

  const summaryColor = gradeCount > 0 ? ANSI.green : ANSI.yellow;
  console.log(
    color(
      `\n조회 완료! 교과 ${courses.length}개 중 성적 조회 가능 ${availableCount}개, 등급 확인 ${gradeCount}개입니다.`,
      summaryColor
    )
  );
}

/**
 * 현재 날짜가 제출 기간 안에 있고 아직 제출 완료되지 않은 과제를 전 과목에서 조회한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @returns {Promise<void>} 과제 목록 출력 완료 시 resolve
 */
async function listAvailableAssignments(client: EcampusClient): Promise<void> {
  printInfo("\n현재 날짜 기준으로 수행 가능한 미제출 과제를 전 과목에서 찾고 있습니다...");
  const targets = await collectAvailableAssignments(client, true);

  process.stdout.write("\r\u001b[K");
  const totalAvailable = targets.length;
  const finalColor = totalAvailable > 0 ? ANSI.red : ANSI.green;
  console.log(
    color(
      `\n조사 완료! 현재 수행 가능한 미제출 과제 ${totalAvailable}개가 발견되었습니다.`,
      finalColor
    )
  );
}

/**
 * 현재 수행 가능한 과제 중 하나를 선택해 상세 내용을 조회한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @returns {Promise<void>} 상세 내용 출력 완료 시 resolve
 */
async function viewAvailableAssignmentDetail(
  client: EcampusClient,
  rl: readline.Interface
): Promise<void> {
  printInfo("\n현재 수행 가능한 미제출 과제를 불러오고 있습니다...");
  const targets = await collectAvailableAssignments(client, false);
  process.stdout.write("\r\u001b[K");

  if (targets.length === 0) {
    printSuccess("\n현재 선택 가능한 미제출 과제가 없습니다.");
    return;
  }

  const selected = await pickFromList(
    rl,
    "상세내용을 확인할 과제",
    targets,
    ({ course, assignment }) =>
      `[${course.title}] ${formatAssignmentTitleWithWeek(assignment)} (기한: ${assignment.period || "미정"} / 상태: ${assignment.status || "미정"})`
  );

  printInfo(`\n과제 상세내용을 조회합니다: ${formatAssignmentTitleWithWeek(selected.assignment)}`);
  const html = await fetchAssignmentDetailHtml(client, selected.assignment);
  printAssignmentDetail(html);
}

/**
 * 기간 내 미제출 과제를 전 과목에서 수집한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {boolean} printMatches - 발견한 과제를 즉시 출력할지 여부
 * @returns {Promise<AvailableAssignmentItem[]>} 현재 수행 가능한 과제 배열
 */
async function collectAvailableAssignments(
  client: EcampusClient,
  printMatches: boolean
): Promise<AvailableAssignmentItem[]> {
  const courses = await client.getCourseList();
  const userNo = process.env.SEOWON_ID!;
  const now = new Date();
  const results: AvailableAssignmentItem[] = [];

  for (const course of courses) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    try {
      const assignments = await client.getAssignmentList({ crsCreCd: course.crsCreCd, userNo });
      const periodMatches = assignments.filter((assignment) =>
        isAssignmentPeriodActive(assignment, now)
      );
      const notSubmittedMatches = assignments.filter(isAssignmentNotSubmitted);
      const targets = assignments.filter(
        (assignment) =>
          isAssignmentPeriodActive(assignment, now) && isAssignmentNotSubmitted(assignment)
      );

      if (targets.length === 0 && (periodMatches.length > 0 || notSubmittedMatches.length > 0)) {
        process.stdout.write("\r\u001b[K");
        printWarning(
          `[진단] ${course.title}: 전체 ${assignments.length}개 / 기간 내 ${periodMatches.length}개 / 미제출 ${notSubmittedMatches.length}개 / 표시 대상 0개`
        );
      }

      if (targets.length > 0) {
        process.stdout.write("\r\u001b[K");
        if (printMatches) {
          console.log(color(`\n[${course.title}]`, ANSI.bold, ANSI.yellow));
        }
        targets.forEach((assignment) => {
          if (printMatches) {
            console.log(
              `  - ${formatAssignmentTitleWithWeek(assignment)} (기한: ${assignment.period || "미정"} / 상태: ${assignment.status || "미정"})`
            );
          }
          results.push({ course, assignment });
        });
      }
    } catch (err) {
      process.stdout.write("\r\u001b[K");
      printWarning(
        `[SKIP] ${course.title}: ${err instanceof Error ? err.message : util.inspect(err)}`
      );
    }
  }

  return results;
}

/**
 * 과제 상세 화면 HTML을 조회한다.
 * @param {EcampusClient} client - 인증된 e-campus 클라이언트
 * @param {EcampusClassroomItem} assignment - 상세 조회할 과제 항목
 * @returns {Promise<string>} 과제 상세 HTML
 */
async function fetchAssignmentDetailHtml(
  client: EcampusClient,
  assignment: EcampusClassroomItem
): Promise<string> {
  await client.ensureAuthenticated();
  const requestUrl = new URL(assignment.request.url, client.baseUrl);
  const response = await client.http.post<string>(
    requestUrl.pathname + requestUrl.search,
    new URLSearchParams(assignment.request.body),
    {
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: client.baseUrl.replace(/\/$/, ""),
        Referer: client.baseUrl,
        "X-Requested-With": "XMLHttpRequest"
      }
    }
  );
  return response.data;
}

/**
 * 과제 상세 HTML에서 본문만 추출해 터미널에 출력한다.
 * @param {string} html - 과제 상세 HTML
 * @returns {void} 반환값 없음
 */
function printAssignmentDetail(html: string): void {
  const lines = extractAssignmentContentLines(html);

  printSection("\n[과제내용]");

  if (lines.length === 0) {
    printWarning("상세 화면에서 과제내용을 찾지 못했습니다.");
    return;
  }

  lines.forEach(printAssignmentContentLine);
}

/**
 * 과제 상세 화면에서 과제내용 영역의 의미 있는 줄만 추출한다.
 * @param {string} html - 과제 상세 HTML
 * @returns {string[]} 출력 가능한 본문 줄 배열
 */
function extractAssignmentContentLines(html: string): string[] {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();

  const contentField = $(".inline.field")
    .filter((_, field) => $(field).find("label.label-title").first().text().trim() === "과제내용")
    .first();
  const content = contentField.find(".note-editable").first();
  if (content.length === 0) return [];

  content.find("br").replaceWith("\n");
  content.find("p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre, tr").each((_, block) => {
    $(block).append("\n");
  });

  return content
    .text()
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * 과제 본문 줄의 간단한 마크업 패턴을 터미널 스타일로 출력한다.
 * @param {string} line - 출력할 과제 본문 한 줄
 * @returns {void} 반환값 없음
 */
function printAssignmentContentLine(line: string): void {
  const sectionMatch = line.match(/^<(.+)>$/);
  if (sectionMatch) {
    console.log(`\n${color(line, ANSI.bold, ANSI.cyan)}`);
    return;
  }

  const numberedMatch = line.match(/^(\d+\.)\s*(.*)$/);
  if (numberedMatch) {
    console.log(`${color(numberedMatch[1]!, ANSI.bold, ANSI.yellow)} ${numberedMatch[2]}`);
    return;
  }

  const bulletMatch = line.match(/^([*•-])\s*(.*)$/);
  if (bulletMatch) {
    console.log(`${color(bulletMatch[1]!, ANSI.bold, ANSI.green)} ${bulletMatch[2]}`);
    return;
  }

  console.log(line);
}

/**
 * 쉼표와 범위 문법으로 입력된 번호 목록을 배열 인덱스로 변환한다.
 * @param {string} answer - 사용자 입력 문자열
 * @param {number} itemCount - 선택 가능한 항목 수
 * @returns {number[]} 중복이 제거된 0 기반 인덱스 배열
 */
function parseSelectionIndexes(answer: string, itemCount: number): number[] {
  const indexes = new Set<number>();
  const tokens = answer
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      for (let value = from; value <= to; value++) {
        const index = value - 1;
        if (index >= 0 && index < itemCount) indexes.add(index);
      }
      continue;
    }

    if (/^\d+$/.test(token)) {
      const index = Number(token) - 1;
      if (index >= 0 && index < itemCount) indexes.add(index);
    }
  }

  return Array.from(indexes);
}

/**
 * 터미널 목록에서 여러 항목을 선택하게 한다.
 * @param {readline.Interface} rl - 사용자 입력 인터페이스
 * @param {string} title - 목록 제목
 * @param {T[]} items - 선택 가능한 항목 배열
 * @param {(item: T) => string} labelMapper - 항목 표시 라벨 생성 함수
 * @returns {Promise<T[]>} 선택된 항목 배열
 */
async function pickMultipleFromList<T>(
  rl: readline.Interface,
  title: string,
  items: T[],
  labelMapper: (item: T) => string
): Promise<T[]> {
  printSection(`\n${title} 목록:`);

  const displayLimit = 50;
  let offset = 0;
  while (offset < items.length) {
    const chunk = items.slice(offset, offset + displayLimit);
    chunk.forEach((item, i) =>
      console.log(`${color(String(offset + i + 1), ANSI.yellow)}. ${labelMapper(item)}`)
    );

    offset += displayLimit;
    if (offset < items.length) {
      const remaining = items.length - offset;
      printWarning(`\n... 외 ${remaining}건의 항목이 더 있습니다.`);
      const more = (await ask(rl, "더 보시겠습니까? (Y/n)")).trim().toLowerCase();
      if (more === 'n' || more === 'no') break;
    }
  }

  const answer = await rl.question(`\n번호들을 쉼표 또는 범위로 입력 (예: 1,2,3-5) (취소 시 빈 칸): `);
  return parseSelectionIndexes(answer, items.length).map((n) => items[n]!);
}

/**
 * 로컬 경로를 file URL 객체로 변환한다.
 * @param {string} p - 로컬 파일 경로
 * @returns {URL} file:// URL 객체
 */
function pathToFileURL(p: string): URL {
  return new URL(`file:///${p.replace(/\\/g, "/")}`);
}

/**
 * 강의 출결 상태가 미학습 또는 학습중인지 판별한다.
 * @param {EcampusLessonItem} lesson - 검사할 강의 항목
 * @returns {boolean} 자동 시청 대상 여부
 */
function isLessonUnwatched(lesson: EcampusLessonItem): boolean {
  const status = normalizeKoreanStatus(lesson.attendanceStatus);
  if (!status) return false;
  return status.includes("학습중(지각)") || status.includes("미학습(결석)");
}

/**
 * 강의 수강 기간이 현재 시각을 포함하는지 판별한다.
 * @param {EcampusLessonItem} lesson - 검사할 강의 항목
 * @param {Date} now - 기준 시각
 * @returns {boolean} 기간 내 여부
 */
function isLessonPeriodActive(lesson: EcampusLessonItem, now: Date): boolean {
  return isPeriodActive(lesson.period, now);
}

/**
 * 과제 제출 기간이 현재 시각을 포함하는지 판별한다.
 * @param {EcampusClassroomItem} assignment - 검사할 과제 항목
 * @param {Date} now - 기준 시각
 * @returns {boolean} 기간 내 여부
 */
function isAssignmentPeriodActive(assignment: EcampusClassroomItem, now: Date): boolean {
  return isPeriodActive(assignment.period, now);
}

/**
 * 과제가 제출 완료 상태가 아닌지 판별한다.
 * @param {EcampusClassroomItem} assignment - 검사할 과제 항목
 * @returns {boolean} 미제출 또는 상태 미확인 여부
 */
function isAssignmentNotSubmitted(assignment: EcampusClassroomItem): boolean {
  const status = normalizeKoreanStatus(assignment.status);
  if (!status) return true;
  return !(
    status.includes("\uacfc\uc81c\ub97c\uc81c\ucd9c") || status.includes("\uc81c\ucd9c\ud558")
  );
}

/**
 * 기간 문자열이 기준 시각을 포함하는지 판별한다.
 * @param {string | undefined} period - e-campus 기간 문자열
 * @param {Date} now - 기준 시각
 * @returns {boolean} 기간 내 여부
 */
function isPeriodActive(period: string | undefined, now: Date): boolean {
  const range = parseDateRange(period);
  if (!range) return false;
  const current = now.getTime();
  return range.start.getTime() <= current && current <= range.end.getTime();
}

/**
 * e-campus 기간 문자열에서 시작/종료 시각을 추출한다.
 * @param {string | undefined} period - 화면에 표시된 기간 문자열
 * @returns {{ start: Date; end: Date } | undefined} 파싱된 기간 범위
 */
function parseDateRange(period: string | undefined): { start: Date; end: Date } | undefined {
  if (!period) return undefined;
  const cleaned = period.replace(/\([^)]*\)/g, " ");
  const matches = [
    ...cleaned.matchAll(
      /(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})일?(?:\s+(\d{1,2}):(\d{2}))?/g
    )
  ];

  if (matches.length < 2) return undefined;

  const start = dateFromMatch(matches[0]!);
  const end = dateFromMatch(matches[1]!, true);
  if (!start || !end) return undefined;
  return { start, end };
}

/**
 * 정규식 날짜 매치 결과를 Date 객체로 변환한다.
 * @param {RegExpMatchArray} match - 날짜 정규식 매치 결과
 * @param {boolean} [endOfDay=false] - 시간이 없을 때 하루 끝으로 보정할지 여부
 * @returns {Date | undefined} 변환된 Date 객체
 */
function dateFromMatch(match: RegExpMatchArray, endOfDay = false): Date | undefined {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? (endOfDay ? 23 : 0) : Number(match[4]);
  const minute = match[5] === undefined ? (endOfDay ? 59 : 0) : Number(match[5]);

  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, hour, minute, endOfDay ? 59 : 0);
}

/**
 * 상태 비교를 위해 한글 상태 문자열의 공백과 대소문자를 정규화한다.
 * @param {string | undefined} status - 원본 상태 문자열
 * @returns {string} 비교용 상태 문자열
 */
function normalizeKoreanStatus(status: string | undefined): string {
  return (status ?? "").replace(/\s+/g, "").toLowerCase();
}

run().catch((err) => {
  process.stderr.write("\n❌ [FATAL] 스크립트 실행 실패\n");
  console.error(err);
  process.exit(1);
});
