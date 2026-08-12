import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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
} from "../src/cli-ui.js";
import {
  COURSE_DB_ENV_PATH,
  formatCourseDbRef,
  listCourseDbFiles,
  loadCourseDbFile,
  loadLatestCourseDb,
  searchLocalCourses,
  type LocalCourseRecord
} from "../src/course-catalog/local-db.js";

async function runViewer() {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🗄️ 서원대 강의 목록 DB 뷰어 ---");
  printInfo(
    `파일명 자동 감지: ${COURSE_DB_ENV_PATH} → latest.json 포인터 → output 최신 mtime`
  );

  try {
    let courses: LocalCourseRecord[] = [];
    let selectedLabel = "";

    try {
      const listed = await listCourseDbFiles();
      if (listed.length === 0) {
        printErrorMessage(
          "저장된 DB 파일이 없습니다. 먼저 npm run generate:db 로 생성해 주세요."
        );
        return;
      }

      // 기본: 자동 감지(최신). 여러 개면 선택 가능
      let filePath: string;
      if (listed.length === 1) {
        const loaded = await loadLatestCourseDb();
        courses = loaded.courses;
        selectedLabel = formatCourseDbRef(loaded.ref);
        filePath = loaded.ref.filePath;
      } else {
        printInfo("\n감지된 카탈로그 파일 (최신이 1번):");
        const auto = await loadLatestCourseDb().catch(() => null);
        if (auto) {
          printSuccess(`자동 선택 후보: ${formatCourseDbRef(auto.ref)}`);
        }

        const useAuto =
          (
            await ask(rl, "자동 감지된 최신 DB를 쓸까요? (y=자동 / n=목록에서 선택)", "y")
          )
            .trim()
            .toLowerCase() !== "n";

        if (useAuto && auto) {
          courses = auto.courses;
          selectedLabel = formatCourseDbRef(auto.ref);
          filePath = auto.ref.filePath;
        } else {
          const picked = await pickFromList(
            rl,
            "열람할 DB 파일",
            listed,
            (item) =>
              `${item.fileName} (${new Date(item.mtimeMs).toLocaleString()}, ${(item.sizeBytes / 1024 / 1024).toFixed(1)}MB)`
          );
          filePath = picked.filePath;
          courses = await loadCourseDbFile(filePath);
          selectedLabel = `${picked.fileName} [수동]`;
        }
      }

      printInfo(`\n[DB 로드] ${selectedLabel}`);
      printInfo(`경로: ${filePath!}`);
      printSuccess(`✅ 총 ${courses.length}개의 강의를 불러왔습니다.`);
    } catch (err) {
      printErrorMessage(err instanceof Error ? err.message : String(err));
      return;
    }

    while (true) {
      printSection("\n[DB 조회 메뉴]");
      console.log(`${color("1", ANSI.yellow)}. 전체 강의 수 및 요약 보기`);
      console.log(`${color("2", ANSI.yellow)}. 키워드로 검색 (과목명, 교수명, 과목코드)`);
      console.log(`${color("3", ANSI.yellow)}. 학과/영역(category) 별로 필터링`);
      console.log(`${color("4", ANSI.yellow)}. e러닝/플립러닝 과목만 모아보기`);
      console.log(`${color("0", ANSI.yellow)}. 종료`);

      const menu = (await ask(rl, "메뉴 선택")).trim();
      if (menu === "0") break;

      switch (menu) {
        case "1": {
          printSection(`\n[요약 정보]`);
          printInfo(`총 강의 수: ${courses.length}개`);
          const categories = [
            ...new Set(courses.map((d) => d._category).filter(Boolean))
          ];
          printInfo(`포함된 구분/카테고리 수: ${categories.length}개`);

          const eLearnings = courses.filter(
            (d) => d.slesLessnItem && String(d.slesLessnItem).includes("러닝")
          );
          printInfo(`이러닝/플립러닝 관련 과목 수: ${eLearnings.length}개`);
          break;
        }
        case "2": {
          const keyword = (await ask(rl, "검색어 (과목명/교수명/코드)")).trim();
          if (!keyword) break;
          const matched = searchLocalCourses(courses, keyword);
          await printResults(matched, rl);
          break;
        }
        case "3": {
          const categories = [
            ...new Set(
              courses.map((d) => d._category).filter((c): c is string => Boolean(c))
            )
          ].sort();

          try {
            const pickedCat = await pickFromList(rl, "학과/영역", categories, (c) => c);
            const matched = courses.filter((d) => d._category === pickedCat);
            await printResults(matched, rl);
          } catch (e: unknown) {
            printErrorMessage(e instanceof Error ? e.message : String(e));
          }
          break;
        }
        case "4": {
          const matched = courses.filter(
            (d) => d.slesLessnItem && String(d.slesLessnItem).includes("러닝")
          );
          await printResults(matched, rl);
          break;
        }
        default:
          printErrorMessage("올바른 메뉴를 선택하세요.");
      }
    }
  } finally {
    rl.close();
    printInfo("DB 뷰어를 종료합니다.");
  }
}

async function printResults(results: LocalCourseRecord[], rl: readline.Interface) {
  printSection(`\n검색 결과: ${results.length}건`);
  if (results.length === 0) {
    printWarning("조건에 맞는 강의가 없습니다.");
    return;
  }

  const displayLimit = 50;
  let offset = 0;

  while (offset < results.length) {
    const chunk = results.slice(offset, offset + displayLimit);
    for (let i = 0; i < chunk.length; i++) {
      const item = chunk[i]!;
      const index = offset + i + 1;
      const prof = item.chrgInstrEmpnm || "교수미정";
      const credit = item.cmpsjCdt ? `${item.cmpsjCdt}학점` : "";
      const time = item.timtbNm ? String(item.timtbNm).replace(/\s+/g, " ") : "시간미정";
      const attr = item.slesLessnItem
        ? color(` [${item.slesLessnItem}]`, ANSI.cyan)
        : "";
      const cat = item._category ? color(` <${item._category}>`, ANSI.gray) : "";

      console.log(
        `${color(String(index), ANSI.yellow)}. [${item.subjtCd}-${item.corseDvclsNo}] ${color(String(item.subjtNm || ""), ANSI.bold)}${attr} | ${credit} | ${prof} | ${time}${cat}`
      );
    }

    offset += displayLimit;
    if (offset < results.length) {
      const remaining = results.length - offset;
      printWarning(`\n... 외 ${remaining}건의 결과가 더 있습니다.`);
      const answer = (await ask(rl, "더 보시겠습니까? (Y/n)")).trim().toLowerCase();
      if (answer === "n" || answer === "no") {
        break;
      }
    }
  }
}

runViewer().catch((err) => {
  console.error("오류 발생:", err);
  process.exit(1);
});
