import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { createHopeBasketClient } from "../src/index.js";

async function main() {
  config();

  const id = process.env.SEOWON_ID;
  const password = process.env.SEOWON_PASSWORD;

  if (!id || !password) {
    console.error("SEOWON_ID and SEOWON_PASSWORD must be set in .env");
    process.exit(1);
  }

  const client = createHopeBasketClient({
    cookieFilePath: "./.seowon-hope-basket.cookies.json",
    onProgress: (msg) => console.log(`[PROGRESS] ${msg}`),
  });

  console.log("로그인 중...");
  const loginResult = await client.login({ stuno: id, password });
  if (!loginResult.success) {
    console.error("로그인 실패:", loginResult.message);
    process.exit(1);
  }

  const allSubjects = [];
  const fetchedKeys = new Set();
  const timetableProps = new Map(); // "과목코드-분반" => slesLessnItem 저장

  const addSubjects = (subjects, category) => {
    for (const sub of subjects) {
      const key = `${sub.subjtCd}-${sub.corseDvclsNo}`;
      
      // 학과별 시간표에서 가져온 slesLessnItem이 있다면 주입 (이러닝/플립러닝 속성 등)
      if (timetableProps.has(key)) {
        sub.slesLessnItem = timetableProps.get(key);
      } else if (!sub.slesLessnItem) {
        sub.slesLessnItem = "";
      }

      if (!fetchedKeys.has(key)) {
        fetchedKeys.add(key);
        allSubjects.push({ ...sub, _category: category });
      }
    }
  };

  try {
    console.log("\n[1/3] 수업 속성(e러닝 등) 교차 조회를 위해 전체 학과별 시간표 정보 추출 중...");
    const timetableDepts = await client.getTimetableDepartments();
    console.log(`총 ${timetableDepts.length}개 시간표 학과 발견`);
    
    for (let i = 0; i < timetableDepts.length; i++) {
      const tDept = timetableDepts[i];
      try {
        const tSubjects = await client.getTimetableSubjects({ asignDeprtCd: tDept.asignDeprtCd });
        for (const ts of tSubjects) {
          if (ts.slesLessnItem) {
            const key = `${ts.subjtCd}-${ts.corseDvclsNo}`;
            timetableProps.set(key, ts.slesLessnItem);
          }
        }
      } catch (err) {
        // 일부 학과는 시간표 조회가 실패할 수 있으므로 무시
      }
    }
    console.log(`수업 속성 교차 조회용 DB 구축 완료 (총 ${timetableProps.size}개 과목 매핑 확보)`);

    // 2. 전체 학과 조회
    console.log("\n[2/3] 전체 학과별 개설 강의 조회 중...");
    const departments = await client.getDepartments();
    console.log(`총 ${departments.length}개 학과 발견`);

    for (let i = 0; i < departments.length; i++) {
      const dept = departments[i];
      console.log(`[학과 ${i + 1}/${departments.length}] ${dept.deptNm} 과목 조회 중...`);
      const subjects = await client.searchSubjects({ asignDeprtCd: dept.asignDeprtCd });
      addSubjects(subjects, `전공-${dept.deptNm}`);
    }

    // 3. 전체 교양 영역 조회
    console.log("\n[3/3] 전체 교양 영역 강의 조회 중...");
    const domains = await client.getCultureDomains();
    console.log(`총 ${domains.length}개 교양 영역 발견`);

    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      console.log(`[교양 ${i + 1}/${domains.length}] ${domain.codeNm} 과목 조회 중...`);
      const subjects = await client.searchSubjects({ cltrDomnCd: domain.code });
      addSubjects(subjects, `교양-${domain.codeNm}`);
    }

    // JSON 파일로 저장
    const outPath = path.resolve(process.cwd(), "all-courses-enriched.json");
    await fs.writeFile(outPath, JSON.stringify(allSubjects, null, 2), "utf-8");
    console.log(`\n🎉 성공적으로 속성 교차 반영하여 저장되었습니다! 총 ${allSubjects.length}개 과목 -> ${outPath}`);

  } catch (error) {
    console.error("데이터 수집 중 오류 발생:", error);
  }
}

main();
