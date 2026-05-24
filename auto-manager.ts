import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import util from "node:util";

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
  type EcampusClient
} from "./src/index.js";

const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");

/**
 * 실전 자동화 매니저 (TS)
 */
async function run() {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🚀 서원대 e-campus 실전 자동화 매니저 (TS) ---");

  try {
    const client = await initializeSession(rl);
    
    while (true) {
      console.log(color("\n[메인 메뉴]", ANSI.bold));
      console.log("1. 🔑 로그인 / 로그인 정보 갱신");
      console.log("2. 📥 이러닝 일괄 다운로드 (다중 진행바)");
      console.log("3. 📺 이러닝 순차 자동 시청 (고급 로그 제어)");
      console.log("4. 📝 전체 교과목 미제출 과제 전수 조사");
      console.log("0. 종료");

      const menu = (await rl.question("\n메뉴 선택: ")).trim();
      if (menu === "0") break;

      switch (menu) {
        case "1": await loginManual(client, rl); break;
        case "2": await withAuthRetry(client, rl, () => batchDownload(client, rl)); break;
        case "3": await withAuthRetry(client, rl, () => batchWatch(client, rl)); break;
        case "4": await withAuthRetry(client, rl, () => checkAllAssignments(client)); break;
        default: printErrorMessage("올바른 메뉴를 선택하세요.");
      }
    }
  } catch (err: any) {
    printErrorMessage(`\n❌ 오류 발생: ${err.message}`);
  } finally {
    rl.close();
  }
}

/** 세션 만료 시 자동 재로그인을 지원하는 래퍼 함수 */
async function withAuthRetry<T>(client: EcampusClient, rl: readline.Interface, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (err: any) {
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

async function refreshSession(client: EcampusClient) {
  const creds = client.getCredentials() || {
    userId: process.env.SEOWON_ID || "",
    password: process.env.SEOWON_PASSWORD || ""
  };
  if (!creds.userId || !creds.password || creds.userId === "비어있음") {
    throw new Error("저장된 계정 정보가 없습니다.");
  }
  await client.login(creds);
}

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

async function loginManual(client: EcampusClient, rl: readline.Interface): Promise<EcampusClient> {
  printWarning("\n🔑 로그인을 수행합니다.");
  const userId = await ask(rl, "아이디", process.env.SEOWON_ID || "비어있음");
  const password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD || "비어있음");
  if (userId === "비어있음" || password === "비어있음") throw new Error("계정 정보가 필요합니다.");
  await client.login({ userId, password });
  printSuccess("✅ 로그인 성공 및 세션 저장 완료.");
  return client;
}

/** 1. 이러닝 일괄 다운로드 */
async function batchDownload(client: EcampusClient, rl: readline.Interface) {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);
  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(rl, "다운로드할 강의", lessons, (l) => `${l.title} [${l.durationText || "시간미정"}]`);
  
  const concurrencyInput = await ask(rl, "동시 다운로드 수", "3");
  const concurrency = Math.min(Math.max(parseInt(concurrencyInput) || 1, 1), 5);

  const queue = [...selectedLessons];
  const activeWorkers = new Array(concurrency).fill(null).map(() => ({ title: "대기 중...", percent: 0, status: "idle" }));
  let isStarted = false;

  const renderBars = () => {
    if (!isStarted) return;
    process.stdout.write(`\u001b[${concurrency}A`);
    activeWorkers.forEach((worker, i) => {
      process.stdout.write("\r\u001b[K");
      if (worker.status === "downloading") {
        console.log(`[Worker ${i + 1}] ${getProgressBar(worker.percent, 100, 20)} ${worker.title.substring(0, 30)}`);
      } else console.log(color(`[Worker ${i + 1}] 대기 중...`, ANSI.gray));
    });
  };

  console.log("\n".repeat(concurrency - 1));
  isStarted = true;

  const downloadWorker = async (workerId: number) => {
    while (queue.length > 0) {
      const lesson = queue.shift();
      if (!lesson) break;
      const workerState = activeWorkers[workerId]!;
      workerState.title = lesson.title; workerState.status = "downloading"; workerState.percent = 0;
      renderBars();
      const res = await client.downloadElearningMp4(course.crsCreCd, lesson.lessonCntsId, course.title, lesson.title, "./downloads", (p) => {
        workerState.percent = p.percent; renderBars();
      });
      workerState.status = "idle"; workerState.percent = 100; renderBars();
    }
  };
  await Promise.all(activeWorkers.map((_, i) => downloadWorker(i)));
  printSection("\n🎉 모든 다운로드 작업이 완료되었습니다.");
}

/** 2. 이러닝 순차 자동 시청 */
async function batchWatch(client: EcampusClient, rl: readline.Interface) {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);
  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(rl, "자동 시청할 강의", lessons, (l) => `${l.title} [${l.durationText || "시간미정"}]`);
  
  const stdNo = await ask(rl, "학번 (stdNo 확인용)", `${course.crsCreCd}_${process.env.SEOWON_ID}`);

  printSection(`\n🚀 총 ${selectedLessons.length}개의 강의를 순차적으로 시청합니다.`);

  for (let i = 0; i < selectedLessons.length; i++) {
    const lesson = selectedLessons[i]!;
    const durationMin = lesson.durationSeconds ? Math.ceil(lesson.durationSeconds / 60) : 60;
    const totalSeconds = durationMin * 60;
    
    printWarning(`\n[${i + 1}/${selectedLessons.length}] 시청 대기: ${lesson.title}`);
    
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    let currentBarLine = "";

    // UI 모듈의 기능을 활용하여 로그를 진행바 위로 안전하게 출력
    const safeLog = (...args: any[]) => {
      process.stdout.write("\r\u001b[K");
      originalLog(...args);
      process.stdout.write(currentBarLine);
    };

    console.log = safeLog;
    console.warn = safeLog;
    console.error = safeLog;

    const session = await watchLesson(client.http, client.baseUrl, lesson.lessonCntsId, course.crsCreCd, stdNo);
    
    await new Promise((resolve) => {
      let elapsed = 0;
      const interval = setInterval(() => {
        elapsed += 1;
        const bar = getProgressBar(elapsed, totalSeconds, 40);
        const timeInfo = `${formatTime(elapsed)} / ${formatTime(totalSeconds)}`;
        
        currentBarLine = `\r${bar} ${color(timeInfo, ANSI.gray)}`;
        process.stdout.write(currentBarLine);
        
        if (elapsed >= totalSeconds) {
          clearInterval(interval);
          process.stdout.write("\n");
          console.log = originalLog;
          console.warn = originalWarn;
          console.error = originalError;
          session.stopWatchingLesson().then(() => resolve(null));
        }
      }, 1000);
    });
  }
  printSuccess("\n✅ 선택한 모든 강의 시청이 완료되었습니다.");
}

/** 3. 미제출 과제 전수 조사 */
async function checkAllAssignments(client: EcampusClient) {
  printInfo("\n🔍 전체 교과목에서 미제출 과제를 찾고 있습니다...");
  const groups = await client.getCourseGroups();
  const userNo = process.env.SEOWON_ID!;
  let totalMissing = 0;

  for (const course of groups.curricular) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    try {
      const assignments = await client.getAssignmentList({ crsCreCd: course.crsCreCd, userNo });
      const missing = assignments.filter((a) => a.status === "미제출" || a.status?.includes("진행중"));
      if (missing.length > 0) {
        console.log(color(`\n[${course.title}]`, ANSI.bold, ANSI.yellow));
        missing.forEach((a) => {
          console.log(`  - 📝 ${a.title} (기한: ${a.period || "미정"})`);
          totalMissing++;
        });
      }
    } catch (e) {}
  }
  const finalColor = totalMissing > 0 ? ANSI.red : ANSI.green;
  console.log(color(`\n\n✅ 조사 완료! 총 ${totalMissing}개의 미제출/진행중 과제가 발견되었습니다.`, finalColor));
}

async function pickMultipleFromList<T>(rl: readline.Interface, title: string, items: T[], labelMapper: (item: T) => string): Promise<T[]> {
  printSection(`\n${title} 목록:`);
  items.forEach((item, i) => console.log(`${color(String(i + 1), ANSI.yellow)}. ${labelMapper(item)}`));
  const answer = await rl.question(`\n번호들을 쉼표로 구분하여 입력 (예: 1,2,5): `);
  return answer.split(",").map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < items.length).map(n => items[n]!);
}

function pathToFileURL(p: string) { return new URL(`file:///${p.replace(/\\/g, "/")}`); }

run().catch((err) => {
  process.stderr.write("\n❌ [FATAL] 스크립트 실행 실패\n");
  console.error(err);
  process.exit(1);
});
