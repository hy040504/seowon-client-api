import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { createHopeBasketClient } from "../src/index.js";

// 학기 코드를 한글로 변환하는 매핑 테이블
const SEMESTER_MAP = {
  "10": "1",
  "11": "여름",
  "20": "2",
  "21": "겨울"
};

async function main() {
  // 프로젝트 루트의 .env를 로드하기 위해 경로 지정
  config({ path: path.resolve(process.cwd(), ".env") });

  const id = process.env.SEOWON_ID;
  const password = process.env.SEOWON_PASSWORD;

  if (!id || !password) {
    console.error("SEOWON_ID and SEOWON_PASSWORD must be set in .env");
    process.exit(1);
  }

  const client = createHopeBasketClient({
    cookieFilePath: path.resolve(process.cwd(), ".seowon-hope-basket.cookies.json"),
    onProgress: (msg) => console.log(`[PROGRESS] ${msg}`),
  });

  console.log("로그인 중...");
  const loginResult = await client.login({ stuno: id, password });
  if (!loginResult.success) {
    console.error("로그인 실패:", loginResult.message);
    process.exit(1);
  }

  // 학년도 및 학기 정보 가져오기
  const term = client.getTermContext();
  const year = term.syy; // 예: 2026
  const smtName = SEMESTER_MAP[term.smtCd as keyof typeof SEMESTER_MAP] || term.smtCd;
  
  // 오늘 날짜 구하기 (YYYY-MM-DD)
  const today = new Date();
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // 파일명 동적 생성
  const fileName = `${year}학년도 ${smtName}학기 전체 강의 목록 DB (${dateString}).json`;
  const outPath = path.resolve(process.cwd(), "db-generator", "output", fileName);

  const allSubjects = [];
  const fetchedKeys = new Set();
  const timetableProps = new Map(); // "과목코드-분반" => slesLessnItem 저장

  const addSubjects = (subjects: any[], category: string) => {
    for (const sub of subjects) {
      const key = `${sub.subjtCd}-${sub.corseDvclsNo}`;
      
      // 학과별 시간표에서 가져온 slesLessnItem이 있다면 주입
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
    console.log(`\n[목표 파일명] ${fileName}`);
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
        // 무시
      }
    }
    console.log(`수업 속성 교차 조회용 DB 구축 완료 (총 ${timetableProps.size}개 과목 매핑 확보)`);

    // 2. 전체 과목 조회 (serchDiv 0 ~ 6)
    // 0: 전공, 1: 교양, 2: 교직, 3: 일반선택, 4: 연계전공, 5: 융합전공, 6: 기타
    console.log("\n[2/2] 전체 개설 강의 조회 중 (모든 조회 구분)...");
    const divs = ['0', '1', '2', '3', '4', '5', '6'];
    for (const d of divs) {
      console.log(`[구분 ${d}] 과목 조회 중...`);
      try {
        const subjects = await client.searchSubjects({ serchDiv: d });
        addSubjects(subjects, `구분-${d}`);
        console.log(` -> ${subjects.length}개 발견`);
      } catch (err) {
        console.log(` -> 실패 또는 없음`);
      }
    }

    // JSON 파일로 저장
    await fs.writeFile(outPath, JSON.stringify(allSubjects, null, 2), "utf-8");
    console.log(`\n🎉 성공적으로 DB가 생성되었습니다!\n📍 경로: ${outPath}\n총 ${allSubjects.length}개 과목 수집 완료.`);

  } catch (error) {
    console.error("데이터 수집 중 오류 발생:", error);
  }
}

main();
