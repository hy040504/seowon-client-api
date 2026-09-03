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
  filterLocalCoursesByFacet,
  filterLocalCoursesByFacets,
  formatCourseDbRef,
  listCourseDbFiles,
  listLocalCourseColleges,
  listLocalCourseDepartments,
  listLocalCourseDomains,
  loadCourseDbFile,
  loadLatestCourseDb,
  matchLocalCourseFacets,
  searchLocalCourses,
  type LocalCourseFacet,
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
      console.log(`${color("3", ANSI.yellow)}. 학과/단과대/교양영역으로 필터링`);
      console.log(`${color("4", ANSI.yellow)}. e러닝/플립러닝 과목만 모아보기`);
      console.log(`${color("0", ANSI.yellow)}. 종료`);

      const menu = (await ask(rl, "메뉴 선택")).trim();
      if (menu === "0") break;

      switch (menu) {
        case "1": {
          printSection(`\n[요약 정보]`);
          printInfo(`총 강의 수: ${courses.length}개`);
          const colleges = listLocalCourseColleges(courses);
          const departments = listLocalCourseDepartments(courses);
          const domains = listLocalCourseDomains(courses);
          printInfo(`단과대: ${colleges.length}개 / 개설학과: ${departments.length}개`);
          for (const college of colleges) {
            printInfo(`  - ${college.name}: ${college.count}건`);
          }
          if (domains.length) {
            printInfo(`교양 영역: ${domains.length}개`);
            for (const domain of domains) {
              printInfo(`  - ${domain.name}: ${domain.count}건`);
            }
          } else {
            printInfo("교양 영역: 없음 (npm run generate:db 로 다시 수집하면 붙습니다)");
          }

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
          try {
            const matched = await filterByDepartmentOrCollege(rl, courses);
            if (matched) await printResults(matched, rl);
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

/** 학과/단과대/교양영역 목록에 표시할 라벨 (이름 + 종류 + 건수). */
function formatFacetLabel(facet: LocalCourseFacet): string {
  const kind =
    facet.kind === "college" ? "단과대" : facet.kind === "domain" ? "교양영역" : "개설학과";
  return `${facet.name} ${color(`(${kind}, ${facet.count}건)`, ANSI.gray)}`;
}

/**
 * 개설학과/단과대/교양영역 실명으로 필터한다.
 * `_category`(구분-0 등 수집 태그)는 쓰지 않는다.
 * @returns 필터된 과목. 취소/빈 입력이면 null
 */
async function filterByDepartmentOrCollege(
  rl: readline.Interface,
  courses: LocalCourseRecord[]
): Promise<LocalCourseRecord[] | null> {
  const departments = listLocalCourseDepartments(courses);
  const colleges = listLocalCourseColleges(courses);
  const domains = listLocalCourseDomains(courses);
  if (departments.length === 0 && colleges.length === 0 && domains.length === 0) {
    printWarning("개설학과/단과대/교양영역 정보가 없는 DB입니다.");
    return null;
  }

  printSection("\n[학과/단과대/교양영역 필터]");
  printInfo("수집 태그(구분-0)가 아니라 개설학과·단과대·교양영역 실명으로 고릅니다.");
  printInfo("이름을 입력하거나, 빈 값이면 목록에서 선택합니다. 예: 컴퓨터, 사범, 의사소통");
  if (domains.length === 0) {
    printWarning("이 DB에는 교양 영역이 없습니다. npm run generate:db 로 다시 수집하면 붙습니다.");
  }

  const query = (await ask(rl, "학과/단과대/영역명 (빈 값=목록)")).trim();
  if (query) {
    return pickFromFacetMatches(rl, courses, matchLocalCourseFacets(courses, query), query);
  }

  printSection("목록 기준");
  console.log(`${color("1", ANSI.yellow)}. 단과대 (${colleges.length}개)`);
  console.log(`${color("2", ANSI.yellow)}. 개설학과 (${departments.length}개)`);
  console.log(`${color("3", ANSI.yellow)}. 교양 영역 (${domains.length}개)`);
  const mode = (await ask(rl, "기준 선택", "2")).trim();

  const pool = mode === "1" ? colleges : mode === "3" ? domains : departments;
  const title = mode === "1" ? "단과대" : mode === "3" ? "교양 영역" : "개설학과";
  if (pool.length === 0) {
    printWarning(`${title} 목록이 비어 있습니다.`);
    if (mode === "3") {
      printInfo("영역 필터는 generate:db 를 다시 실행해야 채워집니다.");
    }
    return null;
  }

  const picked = await pickFromList(rl, title, pool, formatFacetLabel, {
    allowSearch: true,
    searcher: (facet, q) => facet.name.toLowerCase().includes(q.trim().toLowerCase())
  });
  printSuccess(`선택: ${picked.name} (${picked.count}건)`);
  return filterLocalCoursesByFacet(courses, picked);
}

/**
 * 이름 검색 결과에서 하나(또는 전부)를 고른다.
 */
async function pickFromFacetMatches(
  rl: readline.Interface,
  courses: LocalCourseRecord[],
  matches: LocalCourseFacet[],
  query: string
): Promise<LocalCourseRecord[] | null> {
  if (matches.length === 0) {
    printWarning(`'${query}'에 맞는 학과/단과대/교양영역이 없습니다.`);
    return null;
  }

  if (matches.length === 1) {
    const only = matches[0]!;
    printSuccess(`자동 선택: ${only.name} (${only.count}건)`);
    return filterLocalCoursesByFacet(courses, only);
  }

  printInfo(`'${query}' 검색 결과 ${matches.length}개. 번호를 고르거나 0이면 전부 봅니다.`);
  console.log("");
  printSection("검색된 학과/단과대/교양영역:");
  console.log(`${color("0", ANSI.yellow)}. 검색된 항목 모두`);
  matches.forEach((facet, i) => {
    console.log(`${color(String(i + 1), ANSI.yellow)}. ${formatFacetLabel(facet)}`);
  });

  const answer = (await ask(rl, "번호 선택", "0")).trim();
  if (answer === "0" || answer === "") {
    const union = filterLocalCoursesByFacets(courses, matches);
    printSuccess(`검색된 ${matches.length}개 항목 합계 ${union.length}건`);
    return union;
  }
  if (!/^\d+$/.test(answer)) {
    throw new Error("올바른 번호를 선택하세요.");
  }
  const picked = matches[Number(answer) - 1];
  if (!picked) {
    throw new Error("올바른 번호를 선택하세요.");
  }
  printSuccess(`선택: ${picked.name} (${picked.count}건)`);
  return filterLocalCoursesByFacet(courses, picked);
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
      const deptLabel = item.estblDeprtNm || item.univNm || item._category;
      const tag = [deptLabel, item.cltrDomnNm].filter(Boolean).join(" · ");
      const cat = tag ? color(` <${tag}>`, ANSI.gray) : "";

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
