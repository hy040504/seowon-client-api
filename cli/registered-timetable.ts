/**
 * 본신청 확정 과목 시간표 HTML/PNG 저장 (희망바구니 렌더러 재사용)
 */

import path from "node:path";

import {
  openLocalFile,
  printErrorMessage,
  printInfo,
  printSection,
  printSuccess,
  printWarning
} from "../src/cli-ui.js";
import {
  formatHopeBasketTimetableGrid,
  stringifyCourseRegSubjects,
  type CourseRegistrationClient
} from "../src/index.js";

/**
 * 서버 내 실제 수강신청 목록으로 시간표 이미지를 저장하고 뷰어를 연다
 * @param {CourseRegistrationClient} client - 본신청 클라이언트
 * @returns {Promise<boolean>} 파일을 만들었으면 true
 */
export async function exportRegisteredTimetableFromClient(
  client: CourseRegistrationClient
): Promise<boolean> {
  printInfo("내 수강신청(확정) 목록으로 시간표 이미지를 생성합니다.");
  printInfo("희망바구니 담기 목록이 아니라 findAppcsDtlsList 결과만 사용합니다.");
  printInfo("HTML/PNG 저장 (학교 공식 ClipReport 이미지와 다를 수 있음).");

  let exported;
  try {
    exported = await client.exportMyRegisteredTimetableImage({
      outputDir: path.resolve(process.cwd(), "output"),
      tryPng: true
    });
  } catch (err) {
    printErrorMessage(`시간표 생성 실패: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }

  const { timetable, htmlPath, pngPath } = exported;
  if (!timetable.courseCount) {
    printWarning("신청된 과목이 없어 시간표를 그릴 수 없습니다.");
    return false;
  }

  printSection("\n[내 수강신청 시간표 이미지]");
  printSuccess(`HTML: ${htmlPath}`);
  if (pngPath) {
    printSuccess(`PNG: ${pngPath}`);
  } else {
    printWarning("PNG 변환 실패 또는 브라우저 없음 → HTML로 확인하세요.");
  }

  printSection("\n[텍스트 요약]");
  console.log(formatHopeBasketTimetableGrid(timetable));
  printSection("\n[확정 과목 목록]");
  console.log(stringifyCourseRegSubjects(timetable.subjects));

  const openTarget = pngPath || htmlPath;
  try {
    await openLocalFile(openTarget);
    printInfo(`뷰어로 열기: ${openTarget}`);
  } catch (err) {
    printWarning(`자동 열기 실패: ${err instanceof Error ? err.message : String(err)}`);
    printInfo(`직접 열어보세요: ${openTarget}`);
  }

  return true;
}
