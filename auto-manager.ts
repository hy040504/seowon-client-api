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
} from "./src/cli-ui.js";

import {
  createEcampusClient,
  isCookieJarUsable,
  watchLesson,
  type EcampusClient,
  type EcampusClassroomAttachment,
  type EcampusClassroomItem,
  type EcampusCourseListItem,
  type EcampusLessonItem
} from "./src/index.js";

const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");
const WATCH_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴"];
const STUDY_DETAIL_CONFIRM_MESSAGE = "[ElearningSession] ✅ viewLessonStudyDetail (학습 이력 확인)";
const STUDY_DETAIL_WAITING_MESSAGE = "[ElearningSession] 학습 이력 갱신 대기 중";
const STUDY_DETAIL_FADE_MS = 5000;

const LECTURE_MATERIALS_DIR = "강의자료들";

interface WatchQueueItem {
  course: EcampusCourseListItem;
  lesson: EcampusLessonItem;
}

interface AvailableAssignmentItem {
  course: EcampusCourseListItem;
  assignment: EcampusClassroomItem;
}

/** 강의자료 다운로드 큐에서 각 항목의 실시간 상태를 추적하기 위한 내부 인터페이스 (renderQueue 용) */
interface MaterialDownloadState {
  title: string;
  percent: number;
  status: "pending" | "downloading" | "completed" | "failed";
  detail?: string;
}

function extractWeekNumber(text: string | undefined): number | undefined {
  const match = text?.match(/(\d+)\s*주차/);
  return match?.[1] ? Number(match[1]) : undefined;
}

function stripLeadingWeekMarker(title: string): string {
  return title
    .replace(/^\s*\[\s*\d+\s*주차\s*\]\s*/, "")
    .replace(/^\s*\d+\s*주차\s*[:.)-]?\s*/, "")
    .trim();
}

function formatTitleWithWeek(title: string, weekSource?: string): string {
  const weekNumber = extractWeekNumber(weekSource) ?? extractWeekNumber(title);
  if (!weekNumber) return title;

  const displayTitle = stripLeadingWeekMarker(title) || title.trim();
  return `[${weekNumber} 주차] ${displayTitle}`;
}

function formatLessonTitleWithWeek(lesson: EcampusLessonItem): string {
  return formatTitleWithWeek(lesson.title, lesson.scheduleTitle);
}

function formatDownloadLessonLabel(lesson: EcampusLessonItem): string {
  return `${formatLessonTitleWithWeek(lesson)} [${lesson.durationText || "시간미정"}]`;
}

function formatAssignmentTitleWithWeek(assignment: EcampusClassroomItem): string {
  return formatTitleWithWeek(assignment.title);
}

/**
 * 강의자료 선택 목록에 표시할 라벨을 생성한다.
 * 주차 정보 + 날짜 + 첨부 여부 표시 (기존 8번/9번 공통 사용)
 */
function formatMaterialSelectionLabel(material: EcampusClassroomItem): string {
  const title = formatTitleWithWeek(material.title);
  const date = material.date ? ` / ${material.date}` : "";
  const attachment = material.hasAttachment ? " / 첨부 있음" : "";
  return `${title}${date}${attachment}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100);
}

function ensureUniqueFilePath(filePath: string): string {
  if (!fs.existsSync(filePath)) return filePath;

  const parsed = path.parse(filePath);
  for (let i = 1; i < 1000; i++) {
    const candidate = path.resolve(parsed.dir, `${parsed.name} (${i})${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }

  return path.resolve(parsed.dir, `${parsed.name} (${Date.now()})${parsed.ext}`);
}

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
      console.log(`${color("0", ANSI.yellow)}. ${color("종료", ANSI.bold)}`);

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
          // 통합된 강의자료 다운로드 (이전 8번 일괄 + 9번 분석 기능)
          await withAuthRetry(client, rl, () => batchDownloadMaterials(client, rl));
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

/** 저장된 계정 정보를 이용해 백그라운드에서 로그인을 갱신한다 */
async function refreshSession(client: EcampusClient) {
  const creds = client.getCredentials() || {
    userId: process.env.SEOWON_ID || "",
    password: process.env.SEOWON_PASSWORD || ""
  };
  if (!creds.userId || !creds.password || creds.userId === "비어있음") {
    throw new Error("자동 로그인을 위한 계정 정보가 없습니다.");
  }
  await client.login(creds);
}

/** 앱 시작 시 기존 세션 유무를 확인하고 없으면 로그인을 진행한다 */
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

/** 사용자로부터 정보를 직접 입력받아 로그인을 수행한다 */
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

/** 1. 이러닝 일괄 다운로드: 다중 워커와 전체 대기열 가시화 UI 적용 */
async function batchDownload(client: EcampusClient, rl: readline.Interface) {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);

  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(
    rl,
    "다운로드할 강의",
    lessons,
    formatDownloadLessonLabel
  );

  const concurrencyInput = await ask(rl, "동시 다운로드 수", "3");
  const concurrency = Math.min(Math.max(parseInt(concurrencyInput) || 1, 1), 5);

  const itemStatuses = selectedLessons.map((l) => ({
    title: formatLessonTitleWithWeek(l),
    percent: 0,
    status: "pending" as any
  }));
  let isStarted = false;

  /** 전체 목록을 덮어쓰기 방식으로 실시간 렌더링 */
  const renderQueue = () => {
    if (!isStarted) return;
    process.stdout.write(`\u001b[${selectedLessons.length}A`);
    itemStatuses.forEach((item, i) => {
      process.stdout.write("\r\u001b[K");
      const prefix = `[${i + 1}/${selectedLessons.length}]`;
      if (item.status === "downloading") {
        console.log(
          `${prefix} ${getProgressBar(item.percent, 100, 15)} ${color(item.title.substring(0, 30), ANSI.yellow)}`
        );
      } else if (item.status === "completed") {
        console.log(
          `${prefix} ${color("✅ 완료", ANSI.green)}      ${color(item.title.substring(0, 30), ANSI.green)}`
        );
      } else if (item.status === "failed") {
        console.log(
          `${prefix} ${color("❌ 실패", ANSI.red)}      ${color(item.title.substring(0, 30), ANSI.red)}`
        );
      } else {
        console.log(`${prefix} ${color("⏳ 대기", ANSI.gray)}      ${item.title.substring(0, 30)}`);
      }
    });
  };

  printInfo(
    `\n🚀 총 ${selectedLessons.length}개의 파일을 다운로드합니다. (동시 작업: ${concurrency}개)\n`
  );
  selectedLessons.forEach(() => console.log(""));
  isStarted = true;

  const queueIdxs = Array.from({ length: selectedLessons.length }, (_, i) => i);
  const downloadWorker = async () => {
    while (queueIdxs.length > 0) {
      const idx = queueIdxs.shift();
      if (idx === undefined) break;
      const lesson = selectedLessons[idx]!;
      const state = itemStatuses[idx]!;
      state.status = "downloading";
      renderQueue();
      const res = await client.downloadElearningMp4(
        course.crsCreCd,
        lesson.lessonCntsId,
        course.title,
        lesson.title,
        "./downloads",
        (p) => {
          state.percent = p.percent;
          renderQueue();
        }
      );
      state.status = res.success ? "completed" : "failed";
      state.percent = 100;
      renderQueue();
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => downloadWorker()));
  console.log(color("\n✅ 모든 영상 다운로드가 성공적으로 완료되었습니다!", ANSI.bold, ANSI.green));
}

/**
 * 강의자료 일괄 다운로드 (메뉴 8, 이전 8번 일괄 + 9번 상세 분석 통합 버전).
 * - 과목 선택 후 listScale=1000으로 전체 자료 조회
 * - 다중 선택 지원 (pickMultipleFromList)
 * - 선택 자료에 대해 client.getMaterialAttachments 로 첨부 미리 분석/미리보기 (live 트래픽 기반 /viewAtcl + fileDown 파싱)
 * - 분석 결과 요약 출력 후 concurrency 워커로 다운로드 (preloadedAttachments로 중복 fetch 방지)
 * - renderQueue 로 실시간 진행률 표시 (기존 8번 UI 재사용)
 * - 저장 경로: downloads/<과목>/강의자료들/<자료 제목(주차)>/...
 */
async function batchDownloadMaterials(client: EcampusClient, rl: readline.Interface) {
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

  // 이전 메뉴 8+9 통합: 선택된 자료 각각에 대해 모듈의 getMaterialAttachments 호출로 첨부 미리보기 수행
  // (내부에서 fetchClassroomDetailHtml + parseEcampusClassroomAttachmentsHtml 사용)
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

  // 첨부가 0개인 항목은 다운로드 큐에서 제외 (실패 메시지 도배 방지 + 의미 없는 실패 방지)
  // preview에서 이미 "— 0개" 로 표시됐으므로 큐와 render 블록에서는 완전히 빼서
  // [N/M] 숫자와 render 라인 수가 실제 다운로드할 항목 수와 일치하게 함.
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
  let isStarted = false;
  let renderScheduled = false;
  let lastRenderTime = 0;
  const RENDER_THROTTLE_MS = 60; // progress 이벤트가 매우 자주 오므로 throttle로 도배 방지

  const renderQueue = (force = false) => {
    if (!isStarted) return;
    if (renderScheduled) return;

    const now = Date.now();
    if (!force && now - lastRenderTime < RENDER_THROTTLE_MS) {
      renderScheduled = true;
      setTimeout(() => {
        renderScheduled = false;
        renderQueue(true);
      }, RENDER_THROTTLE_MS);
      return;
    }

    lastRenderTime = now;
    renderScheduled = true;

    // nextTick 직렬화 + throttle
    // 전체 블록을 한 번에 atomic write로 그려서 각 항목의 라인이 고정된 위치에서만 업데이트되게 함.
    process.nextTick(() => {
      renderScheduled = false;
      if (!isStarted) return;

      let output = `\r\u001b[${downloadMaterials.length}A`;
      itemStatuses.forEach((item, i) => {
        const prefix = `[${i + 1}/${downloadMaterials.length}]`;
        const detail = item.detail ? ` ${color(`(${item.detail})`, ANSI.gray)}` : "";

        let line: string;
        if (item.status === "downloading") {
          line = `${prefix} ${getProgressBar(item.percent, 100, 15)} ${color(item.title, ANSI.yellow)}${detail}`;
        } else if (item.status === "completed") {
          line = `${prefix} ${color("✅ 완료", ANSI.green)}      ${color(item.title, ANSI.green)}${detail}`;
        } else if (item.status === "failed") {
          line = `${prefix} ${color("❌ 실패", ANSI.red)}      ${color(item.title, ANSI.red)}${detail}`;
        } else {
          line = `${prefix} ${color("⏳ 대기", ANSI.gray)}      ${item.title}${detail}`;
        }
        output += `\u001b[K${line}\n`;
      });

      process.stdout.write(output);
    });
  };

  printInfo(
    `\n📚 총 ${downloadMaterials.length}개의 강의자료 첨부파일을 다운로드합니다. (동시 작업: ${concurrency}개)\n`
  );
  // N줄의 공간을 미리 확보 (이후 render에서 위로 올라가서 덮어씀)
  downloadMaterials.forEach(() => console.log(""));
  isStarted = true;
  renderQueue(true); // 초기 대기 상태를 바로 그림 (throttle 무시)

  const queueIdxs = Array.from({ length: downloadMaterials.length }, (_, i) => i);

  // 동시 워커: preloadedAttachments 를 활용해 분석 없이 바로 다운로드 진행
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
      renderQueue(true); // 다운로드 시작 시 강제 redraw

      const preloaded = preloadedAttachments.get(material.id) ?? [];
      const res = await downloadMaterialAttachmentBundle(
        client,
        course,
        material,
        (progress) => {
          state.percent = progress.percent;
          state.detail = progress.detail;
          renderQueue();
        },
        preloaded.length > 0 ? preloaded : undefined
      );

      state.status = res.success ? "completed" : "failed";
      state.percent = res.success ? 100 : state.percent;
      state.detail = res.message;
      renderQueue(true); // 완료/실패 시 최종 상태 강제 redraw (throttle 무시)
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => downloadWorker()));

  isStarted = false; // 이후 늦은 콜백이 render를 호출해도 무시 (메뉴 출력과 겹치지 않게)
  renderQueue(true); // 마지막 최종 상태 한 번 더 확실히 그림

  // 진행률 블록 아래로 커서를 내려서 메뉴가 깔끔하게 시작되도록 함
  process.stdout.write("\n");

  console.log(
    color("\n✅ 모든 강의자료 다운로드가 성공적으로 완료되었습니다!", ANSI.bold, ANSI.green)
  );
}

/**
 * 단일 강의자료의 첨부파일들을 다운로드한다.
 * preloadedAttachments 가 있으면 재사용 (중복 분석 방지).
 * 없으면 내부에서 client.getMaterialAttachments 호출.
 * 다운로드 경로는 downloads/<과목>/강의자료들/<자료 제목(주차 포함)>/ 아래에 저장.
 */
async function downloadMaterialAttachmentBundle(
  client: EcampusClient,
  course: EcampusCourseListItem,
  material: EcampusClassroomItem,
  progressCallback?: (progress: { percent: number; detail?: string }) => void,
  preloadedAttachments?: EcampusClassroomAttachment[]
): Promise<{ success: boolean; message: string }> {
  try {
    // preloaded 가 있으면(미리 분석 완료) 바로 사용, 없으면 모듈 메서드로 분석 수행
    let attachments: EcampusClassroomAttachment[] = preloadedAttachments ?? [];
    if (attachments.length === 0) {
      attachments = await client.getMaterialAttachments(material);
    }
    if (attachments.length === 0) {
      return { success: false, message: "첨부파일을 찾지 못했습니다." };
    }

    // 다운로드 디렉토리: downloads/<과목명>/강의자료들/<강의자료 제목(주차 포함)>/
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

      // 개별 파일 진행률을 상위 전체 진행률에 반영
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
          // 서브 진행률(p)을 전체 첨부 개수 기준으로 환산하여 상위 콜백에 전달
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
        // 하나라도 실패하면 전체 번들 실패로 처리 (기존 동작 유지)
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

/** 원격 파일(첨부)을 스트림으로 다운로드하고 로컬에 저장한다.
 * highWaterMark 로 버퍼 제어, 고유 파일명 보장, 진행률 콜백 지원.
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

/** 2. 이러닝 순차 자동 시청: Safe Logging 시스템으로 진행바와 로그 간 충돌 방지 */
async function batchWatch(client: EcampusClient, rl: readline.Interface) {
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

/** 5. 전 과목에서 현재 수강 기간에 속한 미학습/학습중 이러닝을 자동 시청 */
async function watchAvailableUnwatchedLessons(client: EcampusClient, rl: readline.Interface) {
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

async function watchLessonQueue(client: EcampusClient, queue: WatchQueueItem[], stdNo: string) {
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

    const formatStudyDetailWaitingStatus = () => {
      const dots = ".".repeat((Math.floor(Date.now() / 500) % 3) + 1);
      return `${STUDY_DETAIL_WAITING_MESSAGE}${dots}`;
    };

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

    /** 반복 갱신 로그는 고정된 상태 영역에 흡수하고, 나머지 로그만 별도 줄에 출력한다. */
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

/** 3. 미제출 과제 전수 조사: 전체 교과목을 탐색하여 미완료 항목 리스팅 */
async function checkAllAssignments(client: EcampusClient) {
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
    } catch (e) {}
  }
  const finalColor = totalMissing > 0 ? ANSI.red : ANSI.green;
  console.log(
    color(
      `\n\n✅ 조사 완료! 총 ${totalMissing}개의 미제출/진행중 과제가 발견되었습니다.`,
      finalColor
    )
  );
}

/** 현재 날짜가 제출 기간 안에 있고 아직 제출 완료되지 않은 과제를 전 과목에서 조회한다. */
async function listAvailableAssignments(client: EcampusClient) {
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

/** 6번과 동일한 조건의 과제 목록에서 하나를 선택해 상세 화면 내용을 조회한다. */
async function viewAvailableAssignmentDetail(client: EcampusClient, rl: readline.Interface) {
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

function printAssignmentDetail(html: string) {
  const lines = extractAssignmentContentLines(html);

  printSection("\n[과제내용]");

  if (lines.length === 0) {
    printWarning("상세 화면에서 과제내용을 찾지 못했습니다.");
    return;
  }

  lines.forEach(printAssignmentContentLine);
}

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

function printAssignmentContentLine(line: string) {
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

/** 번호 기반 다중 선택 유틸리티 */
async function pickMultipleFromList<T>(
  rl: readline.Interface,
  title: string,
  items: T[],
  labelMapper: (item: T) => string
): Promise<T[]> {
  printSection(`\n${title} 목록:`);
  items.forEach((item, i) =>
    console.log(`${color(String(i + 1), ANSI.yellow)}. ${labelMapper(item)}`)
  );
  const answer = await rl.question(`\n번호들을 쉼표로 구분하여 입력 (예: 1,2,5): `);
  return answer
    .split(",")
    .map((s) => parseInt(s.trim()) - 1)
    .filter((n) => n >= 0 && n < items.length)
    .map((n) => items[n]!);
}

function pathToFileURL(p: string) {
  return new URL(`file:///${p.replace(/\\/g, "/")}`);
}

function isLessonUnwatched(lesson: EcampusLessonItem): boolean {
  const status = normalizeKoreanStatus(lesson.attendanceStatus);
  if (!status) return false;
  return status.includes("학습중(지각)") || status.includes("미학습(결석)");
}

function isLessonPeriodActive(lesson: EcampusLessonItem, now: Date): boolean {
  return isPeriodActive(lesson.period, now);
}

function isAssignmentPeriodActive(assignment: EcampusClassroomItem, now: Date): boolean {
  return isPeriodActive(assignment.period, now);
}

function isAssignmentNotSubmitted(assignment: EcampusClassroomItem): boolean {
  const status = normalizeKoreanStatus(assignment.status);
  if (!status) return true;
  return !(
    status.includes("\uacfc\uc81c\ub97c\uc81c\ucd9c") || status.includes("\uc81c\ucd9c\ud558")
  );
}

function isPeriodActive(period: string | undefined, now: Date): boolean {
  const range = parseDateRange(period);
  if (!range) return false;
  const current = now.getTime();
  return range.start.getTime() <= current && current <= range.end.getTime();
}

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

function dateFromMatch(match: RegExpMatchArray, endOfDay = false): Date | undefined {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] === undefined ? (endOfDay ? 23 : 0) : Number(match[4]);
  const minute = match[5] === undefined ? (endOfDay ? 59 : 0) : Number(match[5]);

  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day, hour, minute, endOfDay ? 59 : 0);
}

function normalizeKoreanStatus(status: string | undefined): string {
  return (status ?? "").replace(/\s+/g, "").toLowerCase();
}

run().catch((err) => {
  process.stderr.write("\n❌ [FATAL] 스크립트 실행 실패\n");
  console.error(err);
  process.exit(1);
});
