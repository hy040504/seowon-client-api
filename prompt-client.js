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
const DEFAULT_SUGANG_COOKIE_FILE = path.resolve(__dirname, ".seowon-hope-basket.cookies.json");

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
  const basket = api.createHopeBasketClient({ cookieFilePath: DEFAULT_SUGANG_COOKIE_FILE });
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

          case "hope-basket-login": {
            await ensureHopeBasketLogin(basket, rl, true);
            break;
          }

          case "hope-basket-search": {
            await ensureHopeBasketLogin(basket, rl);
            const keyword = await ask(rl, "검색어(과목명/코드)", "");
            const asignDeprtCd = await ask(
              rl,
              "개설학과 코드(비우면 본인 학과)",
              basket.getStudentInfo()?.deptCd || ""
            );
            const subjects = await basket.searchSubjects({
              keyword,
              asignDeprtCd: asignDeprtCd || undefined,
              listType: "both"
            });
            printSuccess(`${subjects.length}건 검색`);
            console.log(api.stringifySugangSubjects(subjects));
            break;
          }

          case "hope-basket-add": {
            await ensureHopeBasketLogin(basket, rl);
            const keyword = await ask(rl, "담을 과목 검색어", "");
            const subjects = await basket.searchSubjects({
              keyword,
              asignDeprtCd: basket.getStudentInfo()?.deptCd,
              listType: "both"
            });
            if (!subjects.length) {
              printWarning("검색 결과가 없습니다.");
              break;
            }
            const subject = await pickFromList(
              rl,
              "담을 분반",
              subjects,
              (item) =>
                `[${item.subjtCd}-${item.corseDvclsNo}] ${item.subjtNm} | ${item.estblDeprtNm} | ${item.timtbNm.replace(/\s+/g, " ")}`
            );
            const addResult = await basket.addToBasket({
              subjtCd: subject.subjtCd,
              corseDvclsNo: subject.corseDvclsNo
            });
            if (addResult.success) printSuccess(addResult.message);
            else printErrorMessage(addResult.message);
            prettyPrint({
              success: addResult.success,
              message: addResult.message,
              errorCode: addResult.errorCode,
              errorMsg: addResult.errorMsg,
              subjtCd: addResult.subjtCd,
              corseDvclsNo: addResult.corseDvclsNo
            });
            break;
          }

          case "hope-basket-cancel": {
            const subjtCd = await ask(rl, "과목코드(subjtCd)", "");
            const corseDvclsNo = await ask(rl, "분반(corseDvclsNo)", "");
            const cancelResult = await basket.cancelFromBasket({ subjtCd, corseDvclsNo });
            if (cancelResult.success) printSuccess(cancelResult.message);
            else printErrorMessage(cancelResult.message);
            prettyPrint({
              success: cancelResult.success,
              message: cancelResult.message,
              errorCode: cancelResult.errorCode,
              errorMsg: cancelResult.errorMsg,
              subjtCd: cancelResult.subjtCd,
              corseDvclsNo: cancelResult.corseDvclsNo
            });
            break;
          }

          case "hope-basket-schedules": {
            await ensureHopeBasketLogin(basket, rl);
            const schedules = await basket.getAppcsSchedules();
            printSuccess(`${schedules.length}건`);
            prettyPrint(
              schedules.map((item) => ({
                appcsSchdlCd: item.appcsSchdlCd,
                appcsNm: item.appcsNm,
                appcsSchdlNm: item.appcsSchdlNm,
                endDate: item.endDate,
                isActive: item.isActive,
                aplyFlag: item.aplyFlag
              }))
            );
            break;
          }

          case "hope-basket-departments": {
            await ensureHopeBasketLogin(basket, rl);
            const departments = await basket.getDepartments();
            printSuccess(`${departments.length}건`);
            prettyPrint(
              departments.slice(0, 50).map((item) => ({
                asignDeprtCd: item.asignDeprtCd,
                deptNm: item.deptNm,
                cmpsjDivCd: item.cmpsjDivCd
              }))
            );
            if (departments.length > 50) printInfo(`... 외 ${departments.length - 50}건`);
            break;
          }

          case "hope-basket-domains": {
            await ensureHopeBasketLogin(basket, rl);
            const domains = await basket.getCultureDomains();
            printSuccess(`${domains.length}건`);
            prettyPrint(domains.map((item) => ({ code: item.code, codeNm: item.codeNm })));
            break;
          }

          case "hope-basket-timetable": {
            await ensureHopeBasketLogin(basket, rl);
            const departments = await basket.getTimetableDepartments();
            const department = await pickFromList(
              rl,
              "학과",
              departments,
              (item) => `${item.deptNm} (${item.asignDeprtCd})`
            );
            const timetable = await basket.getTimetableSubjects({
              asignDeprtCd: department.asignDeprtCd
            });
            printSuccess(`${timetable.length}건`);
            prettyPrint(
              timetable.map((item) => ({
                subjtCd: item.subjtCd,
                corseDvclsNo: item.corseDvclsNo,
                subjtNm: item.subjtNm,
                chrgInstrEmpnm: item.chrgInstrEmpnm,
                cmpsjCdt: item.cmpsjCdt,
                cmpsjDivNm: item.cmpsjDivNm,
                timtbNm: item.timtbNm
              }))
            );
            break;
          }

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

/**
 * 희망바구니 세션이 없으면 로그인을 유도한다.
 * 정식 수강신청(본신청)이 아니라 예비 담기 세션이다.
 * prompt-client는 API 응답 확인이 목적이므로 성공/실패 구조를 그대로 출력한다.
 * @param {any} basket - HopeBasketClient 인스턴스
 * @param {import("node:readline/promises").Interface} rl - 입력 인터페이스
 * @param {boolean} [force=false] - true면 항상 재로그인
 * @returns {Promise<void>} 로그인 확보 완료 시 resolve
 */
async function ensureHopeBasketLogin(basket, rl, force = false) {
  if (!force && basket.getStudentInfo()?.stuno) return;

  const stuno = await ask(rl, "학번", process.env.SEOWON_ID);
  const password = await ask(rl, "비밀번호", process.env.SEOWON_PASSWORD);
  const loginResult = await basket.login({ stuno, password });
  if (loginResult.success) printSuccess(loginResult.message);
  else printErrorMessage(loginResult.message);

  prettyPrint({
    success: loginResult.success,
    term: basket.getTermContext(),
    session: loginResult.session
      ? {
          userNm: loginResult.session.userNm,
          deptNm: loginResult.session.deptNm,
          persNo: loginResult.session.persNo
        }
      : undefined,
    student: loginResult.student
      ? {
          stuno: loginResult.student.stuno,
          stdntNm: loginResult.student.stdntNm,
          deprtNm: loginResult.student.deprtNm,
          hy: loginResult.student.hy,
          syy: loginResult.student.syy,
          smtCd: loginResult.student.smtCd,
          minCdtNum: loginResult.student.minCdtNum,
          maxCdtNum: loginResult.student.maxCdtNum
        }
      : undefined,
    scheduleChecks: loginResult.scheduleChecks?.map((item) => ({
      appcsSchdlCd: item.appcsSchdlCd,
      allowed: item.allowed,
      appcsSchdlSeqno: item.appcsSchdlSeqno
    }))
  });

  if (!loginResult.success) {
    throw new Error(loginResult.message || "희망바구니 로그인에 실패했습니다.");
  }
}

main().catch((err) => {
  console.error("치명적 오류 발생:");
  console.error(err);
  process.exit(1);
});
