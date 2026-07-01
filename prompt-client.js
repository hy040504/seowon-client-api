import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import util from "node:util";

import {
  ANSI,
  color,
  printSection,
  printInfo,
  printSuccess,
  printWarning,
  printErrorMessage,
  prettyPrint,
  ask,
  chooseCommand,
  printHelp,
  pickFromList
} from "./src/cli-ui.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_COOKIE_FILE = path.resolve(__dirname, ".seowon-ecampus.cookies.json");

/**
 * 단일 기능 수행용 인터랙티브 CLI 클라이언트 (JS/ESM)
 * 라이브러리의 개별 API 기능을 직접 테스트하고 확인하기 위한 도구.
 * @returns {Promise<void>} CLI 종료 시 resolve
 */
async function main() {
  // ESM 환경의 동적 타입 호환성을 유지하며 인덱스 모듈 로드
  const api = await import("./src/index.js");
  const rl = readline.createInterface({ input, output });

  printSection("\n--- 🎓 서원대 e-campus API 인터랙티브 클라이언트 ---");

  const client = api.createEcampusClient({ cookieFilePath: DEFAULT_COOKIE_FILE });
  const options = {};

  try {
    while (true) {
      const command = await chooseCommand(rl);
      if (command === "exit") break;

      try {
        switch (command) {
          case "help":
            printHelp();
            break;

          case "login":
            // 계정 정보는 .env 또는 실시간 입력을 통해 수집
            options.userId = await ask(rl, "아이디", process.env.SEOWON_ID);
            options.password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD);
            const result = await client.login({
              userId: options.userId,
              password: options.password
            });
            printSuccess(`로그인 결과: ${result.type}`);
            if (result.type === "error") printErrorMessage(result.message);
            break;

          case "courses":
            prettyPrint(await client.getCourseList());
            break;

          case "notices":
          case "materials":
          case "assignments":
          case "elearning-lessons":
          case "elearning-open":
          case "elearning-mp4":
          case "elearning-watch":
          case "elearning-download":
          case "classroom-resources":
            // 위 모든 기능은 먼저 대상 과목 선택이 선행되어야 함
            const courses = await client.getCourseList();
            const course = await pickFromList(rl, "과목", courses, (c) => c.title);
            options.crsCreCd = course.crsCreCd;

            if (command === "notices") prettyPrint(await client.getNoticeList(options));
            else if (command === "materials") prettyPrint(await client.getMaterialList(options));
            else if (command === "assignments") {
              options.userNo = await ask(rl, "사용자 번호 (userNo)", process.env.SEOWON_ID);
              prettyPrint(await client.getAssignmentList(options));
            } else if (command === "classroom-resources") {
              options.userNo = await ask(rl, "사용자 번호 (userNo)", process.env.SEOWON_ID);
              prettyPrint(await client.getClassroomResources(options));
            } else if (command === "elearning-lessons") {
              prettyPrint(await client.getElearningLessonList(options));
            } else {
              // 이러닝 시청 및 다운로드는 차시 선택까지 추가로 필요
              const lessons = await client.getElearningLessonList(options);
              const lesson = await pickFromList(
                rl,
                "강의 차시",
                lessons,
                (l) => `${l.title} [${l.durationText || "N/A"}]`
              );
              options.lessonCntsId = lesson.lessonCntsId;

              if (command === "elearning-open") {
                prettyPrint(
                  await client.openLessonWindow({
                    crsCreCd: options.crsCreCd,
                    lessonCntsId: lesson.lessonCntsId
                  })
                );
              } else if (command === "elearning-mp4") {
                const urlResult = await client.getElearningMp4Url(
                  options.crsCreCd,
                  lesson.lessonCntsId
                );
                prettyPrint(urlResult);
              } else if (command === "elearning-watch") {
                const stdNo = await ask(
                  rl,
                  "학번 (stdNo)",
                  `${options.crsCreCd}_${process.env.SEOWON_ID}`
                );
                const session = await api.watchLesson(
                  client.http,
                  client.baseUrl,
                  lesson.lessonCntsId,
                  options.crsCreCd,
                  stdNo
                );
                printInfo("학습 세션이 시작되었습니다. 1분 주기로 기록을 갱신합니다.");
                printWarning("중단하려면 Ctrl+C를 누르거나 창을 닫으세요.");
                // 개별 클라이언트에서는 단순 유지 모드로 진입
                await new Promise(() => {});
              } else if (command === "elearning-download") {
                printInfo("영상 분석 및 다운로드를 시작합니다...");
                const dlRes = await client.downloadElearningMp4(
                  options.crsCreCd,
                  lesson.lessonCntsId,
                  course.title,
                  lesson.title
                );
                if (dlRes.success) printSuccess(`저장 완료: ${dlRes.filePath}`);
                else printErrorMessage(`실패: ${dlRes.message}`);
              }
            }
            break;

          default:
            printErrorMessage(`알 수 없는 명령: ${command}`);
        }
      } catch (err) {
        // 복합 에러 객체의 경우 스택 추적을 포함하여 상세 출력
        printErrorMessage(`\n[ERROR] ${err.message}`);
        if (err.response?.data)
          console.error(util.inspect(err.response.data, { depth: null, colors: true }));
        else if (err.stack) printInfo(err.stack);
      }
    }
  } finally {
    rl.close();
    printInfo("프로그램을 종료합니다.");
  }
}

main().catch((err) => {
  console.error("치명적 오류 발생:");
  console.error(err);
  process.exit(1);
});
