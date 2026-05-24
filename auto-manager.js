import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { pathToFileURL } from "node:url";

// UI 공통 모듈 임포트
import {
  ANSI,
  color,
  printSection,
  printInfo,
  printSuccess,
  printWarning,
  printErrorMessage,
  ask,
  pickFromList
} from "./src/cli-ui.js";

const SOURCE_ENTRY = path.resolve(process.cwd(), "src/index.ts");
const DEFAULT_COOKIE_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");

/**
 * 실전용 자동화 스크립트: auto-manager.js
 * 1. 다중 영상 일괄 다운로드
 * 2. 다중 영상 순차 자동 시청
 * 3. 전 과목 미제출 과제 전수 조사
 */
async function run() {
  const api = await import(pathToFileURL(SOURCE_ENTRY).href);
  const rl = readline.createInterface({ input, output });
  
  console.log(color("\n--- 🚀 서원대 e-campus 실전 자동화 매니저 ---", ANSI.bold, ANSI.cyan));

  try {
    const client = await initializeSession(api, rl);
    
    while (true) {
      console.log(color("\n[메인 메뉴]", ANSI.bold));
      console.log("1. 📥 이러닝 일괄 다운로드 (여러 개 선택)");
      console.log("2. 📺 이러닝 순차 자동 시청 (여러 개 선택)");
      console.log("3. 📝 전체 교과목 미제출 과제 전수 조사");
      console.log("0. 종료");

      const menu = await rl.question("\n메뉴 선택: ");
      if (menu === "0") break;

      switch (menu) {
        case "1": await batchDownload(api, client, rl); break;
        case "2": await batchWatch(api, client, rl); break;
        case "3": await checkAllAssignments(client); break;
        default: printErrorMessage("올바른 메뉴를 선택하세요.");
      }
    }
  } catch (err) {
    printErrorMessage(`\n❌ 오류 발생: ${err.message}`);
  } finally {
    rl.close();
  }
}

/** 세션 초기화 (로그인 또는 쿠키 로드) */
async function initializeSession(api, rl) {
  const client = api.createEcampusClient({ cookieFilePath: DEFAULT_COOKIE_FILE });
  
  if (fs.existsSync(DEFAULT_COOKIE_FILE) && api.isCookieJarUsable(client.cookieJar)) {
    printSuccess("✅ 기존 세션을 불러왔습니다.");
    return client;
  }

  printWarning("🔑 세션이 없거나 만료되었습니다. 로그인이 필요합니다.");
  const userId = await ask(rl, "아이디", process.env.SEOWON_ID);
  const password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD);
  
  await client.login({ userId, password });
  printSuccess("✅ 로그인 성공 및 세션 저장 완료.");
  return client;
}

/** 1. 이러닝 일괄 다운로드 */
async function batchDownload(api, client, rl) {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);
  
  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(rl, "다운로드할 강의", lessons, (l) => `${l.title} [${l.durationText || "시간미정"}]`);
  
  printInfo(`\n총 ${selectedLessons.length}개의 파일 다운로드를 시작합니다...`);
  
  for (let i = 0; i < selectedLessons.length; i++) {
    const lesson = selectedLessons[i];
    printWarning(`\n[${i + 1}/${selectedLessons.length}] ${lesson.title} 다운로드 중...`);
    const res = await client.downloadElearningMp4(
      course.crsCreCd, lesson.lessonCntsId, course.title, lesson.title, "./downloads",
      (p) => process.stdout.write(`\r진행률: ${p.percent}% (${(p.loaded / 1024 / 1024).toFixed(2)} MB)`)
    );
    if (res.success) printSuccess(`\n✅ 완료: ${res.filePath}`);
    else printErrorMessage(`\n❌ 실패: ${res.message}`);
  }
}

/** 2. 이러닝 순차 자동 시청 */
async function batchWatch(api, client, rl) {
  const courses = await client.getCourseList();
  const course = await pickFromList(rl, "과목", courses, (c) => c.title);
  
  const lessons = await client.getElearningLessonList({ crsCreCd: course.crsCreCd });
  const selectedLessons = await pickMultipleFromList(rl, "자동 시청할 강의", lessons, (l) => `${l.title} [${l.durationText || "시간미정"}]`);
  
  const stdNo = await ask(rl, "학번 (stdNo 확인용)", `${course.crsCreCd}_${process.env.SEOWON_ID}`);

  printSection(`\n🚀 총 ${selectedLessons.length}개의 강의를 순차적으로 시청합니다.`);

  for (const lesson of selectedLessons) {
    const durationMin = lesson.durationSeconds ? Math.ceil(lesson.durationSeconds / 60) : 60;
    printWarning(`\n▶️ 현재 시청 중: ${lesson.title} (목표: ${durationMin}분)`);
    
    const session = await api.watchLesson(client.http, client.baseUrl, lesson.lessonCntsId, course.crsCreCd, stdNo);
    
    // 자동 종료 대기
    await new Promise((resolve) => {
      setTimeout(async () => {
        await session.stopWatchingLesson();
        resolve(null);
      }, durationMin * 60 * 1000);
      printInfo("기다리는 중... (지정된 시간이 지나면 다음 영상으로 넘어갑니다)");
    });
  }
  printSuccess("\n✅ 선택한 모든 강의 시청이 완료되었습니다.");
}

/** 3. 미제출 과제 전수 조사 */
async function checkAllAssignments(client) {
  printInfo("\n🔍 전체 교과목에서 미제출 과제를 찾고 있습니다...");
  
  const groups = await client.getCourseGroups();
  const curricular = groups.curricular;
  const userNo = process.env.SEOWON_ID;

  let totalMissing = 0;

  for (const course of curricular) {
    process.stdout.write(`\r조회 중: ${course.title}...                    `);
    const assignments = await client.getAssignmentList({ crsCreCd: course.crsCreCd, userNo });
    const missing = assignments.filter(a => a.status === "미제출" || a.status?.includes("진행중"));
    
    if (missing.length > 0) {
      console.log(color(`\n[${course.title}]`, ANSI.bold, ANSI.yellow));
      missing.forEach(a => {
        console.log(`  - 📝 ${a.title} (기한: ${a.period || "미정"})`);
        totalMissing++;
      });
    }
  }

  const finalColor = totalMissing > 0 ? ANSI.red : ANSI.green;
  console.log(color(`\n\n✅ 조사 완료! 총 ${totalMissing}개의 미제출/진행중 과제가 발견되었습니다.`, finalColor));
}

/** 다중 선택 헬퍼 */
async function pickMultipleFromList(rl, title, items, labelMapper) {
  console.log("");
  printSection(`${title} 목록:`);
  items.forEach((item, i) => console.log(`${color(String(i + 1), ANSI.yellow)}. ${labelMapper(item)}`));
  
  const answer = await rl.question(`\n${title} 번호들을 쉼표로 구분하여 입력 (예: 1,2,5): `);
  return answer.split(",")
    .map(s => parseInt(s.trim()) - 1)
    .filter(n => n >= 0 && n < items.length)
    .map(n => items[n]);
}

run();
