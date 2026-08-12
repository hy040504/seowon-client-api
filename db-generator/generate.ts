import path from "path";
import { config } from "dotenv";
import { generateCourseDb } from "../src/course-catalog/generate-db.js";

async function main() {
  config({ path: path.resolve(process.cwd(), ".env") });

  const id = process.env.SEOWON_ID;
  const password = process.env.SEOWON_PASSWORD;

  if (!id || !password) {
    console.error("SEOWON_ID and SEOWON_PASSWORD must be set in .env");
    process.exit(1);
  }

  try {
    const result = await generateCourseDb({
      stuno: id,
      password,
      onProgress: (msg) => console.log(`[PROGRESS] ${msg}`)
    });
    console.log(`\n🎉 성공적으로 DB가 생성되었습니다!`);
    console.log(`📍 카탈로그: ${result.filePath}`);
    console.log(`📍 포인터:   ${result.pointerPath}`);
    console.log(`   (다른 도구는 latest.json → ${result.fileName} 을 자동 감지합니다)`);
    console.log(`총 ${result.count}개 과목 수집 완료.`);
  } catch (error) {
    console.error("데이터 수집 중 오류 발생:", error);
    process.exitCode = 1;
  }
}

main();
