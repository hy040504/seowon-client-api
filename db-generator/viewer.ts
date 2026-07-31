import fs from "fs/promises";
import path from "path";
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

async function runViewer() {
  const rl = readline.createInterface({ input, output });
  printSection("\n--- 🗄️ 서원대 강의 목록 DB 뷰어 ---");
  
  try {
    const outputDir = path.resolve(process.cwd(), "db-generator", "output");
    let files: string[] = [];
    try {
      files = await fs.readdir(outputDir);
    } catch {
      printErrorMessage("output 폴더를 찾을 수 없습니다. 먼저 DB를 생성해주세요.");
      return;
    }

    const jsonFiles = files.filter(f => f.endsWith(".json"));
    if (jsonFiles.length === 0) {
      printErrorMessage("저장된 DB 파일이 없습니다. 먼저 DB를 생성해주세요.");
      return;
    }

    // 파일 선택 (가장 최근 파일이 기본적으로 1번이 되도록 정렬)
    const fileStats = await Promise.all(
      jsonFiles.map(async f => ({
        name: f,
        mtime: (await fs.stat(path.join(outputDir, f))).mtimeMs
      }))
    );
    fileStats.sort((a, b) => b.mtime - a.mtime);

    let selectedFile = fileStats[0].name;
    if (fileStats.length > 1) {
      const picked = await pickFromList(rl, "열람할 DB 파일", fileStats, item => item.name);
      selectedFile = picked.name;
    }

    printInfo(`\n[DB 로드 중] ${selectedFile}...`);
    const filePath = path.join(outputDir, selectedFile);
    const content = await fs.readFile(filePath, "utf-8");
    const db = JSON.parse(content);
    printSuccess(`✅ 총 ${db.length}개의 강의를 불러왔습니다.`);

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
          printInfo(`총 강의 수: ${db.length}개`);
          const categories = [...new Set(db.map((d: any) => d._category))];
          printInfo(`포함된 학과/교양 영역 수: ${categories.length}개`);
          
          const eLearnings = db.filter((d: any) => d.slesLessnItem && d.slesLessnItem.includes("러닝"));
          printInfo(`이러닝/플립러닝 관련 과목 수: ${eLearnings.length}개`);
          break;
        }
        case "2": {
          const keyword = (await ask(rl, "검색어 (과목명/교수명/코드)")).toLowerCase();
          if (!keyword) break;
          const matched = db.filter((d: any) => 
            (d.subjtNm && d.subjtNm.toLowerCase().includes(keyword)) ||
            (d.chrgInstrEmpnm && d.chrgInstrEmpnm.toLowerCase().includes(keyword)) ||
            (d.subjtCd && d.subjtCd.toLowerCase().includes(keyword))
          );
          await printResults(matched, rl);
          break;
        }
        case "3": {
          const categories = [...new Set(db.map((d: any) => d._category))] as string[];
          categories.sort();
          
          try {
            const pickedCat = await pickFromList(rl, "학과/영역", categories, c => c);
            const matched = db.filter((d: any) => d._category === pickedCat);
            await printResults(matched, rl);
          } catch (e: any) {
            printErrorMessage(e.message);
          }
          break;
        }
        case "4": {
          const matched = db.filter((d: any) => d.slesLessnItem && d.slesLessnItem.includes("러닝"));
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

async function printResults(results: any[], rl: readline.Interface) {
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
      const item = chunk[i];
      const index = offset + i + 1;
      const prof = item.chrgInstrEmpnm || "교수미정";
      const credit = item.cmpsjCdt ? `${item.cmpsjCdt}학점` : "";
      const time = item.timtbNm ? item.timtbNm.replace(/\s+/g, " ") : "시간미정";
      const attr = item.slesLessnItem ? color(` [${item.slesLessnItem}]`, ANSI.cyan) : "";
      const cat = item._category ? color(` <${item._category}>`, ANSI.gray) : "";

      console.log(
        `${color(String(index), ANSI.yellow)}. [${item.subjtCd}-${item.corseDvclsNo}] ${color(item.subjtNm, ANSI.bold)}${attr} | ${credit} | ${prof} | ${time}${cat}`
      );
    }

    offset += displayLimit;
    if (offset < results.length) {
      const remaining = results.length - offset;
      printWarning(`\n... 외 ${remaining}건의 결과가 더 있습니다.`);
      const answer = (await ask(rl, "더 보시겠습니까? (Y/n)")).trim().toLowerCase();
      if (answer === 'n' || answer === 'no') {
        break;
      }
    }
  }
}

runViewer().catch(err => {
  console.error("오류 발생:", err);
  process.exit(1);
});
