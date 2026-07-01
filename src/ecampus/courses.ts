import type {
  EcampusCourse,
  EcampusCourseCategory,
  EcampusCourseGroups,
  EcampusCourseListItem
} from "./types/courses.js";

export type {
  EcampusCourse,
  EcampusCourseCategory,
  EcampusCourseGroups,
  EcampusCourseListItem,
  EcampusCourseNamesJson,
  EcampusCourseTypeCode
} from "./types/courses.js";

import * as cheerio from "cheerio";
import { normalizeSpace } from "./utils.js";

/** 강의실 메인 진입을 담당하는 내부 스크립트 호출 패턴 */
const CLASS_ROOM_ONCLICK_PATTERN =
  /classRoomMain\(\s*['"](?<crsCreCd>[^'"]+)['"]\s*,\s*['"](?<crsTypeCd>[^'"]+)['"]\s*\)/;

/**
 * e-campus 대시보드 HTML에서 현재 활성화된 과목 목록을 추출한다.
 * @param {string} html - 응답 본문
 * @returns {EcampusCourseListItem[]} 과목 정보 배열
 */
export function parseEcampusCourseList(html: string): EcampusCourseListItem[] {
  return parseEcampusCourses(html).map(({ title, crsCreCd, crsTypeCd }) => ({
    title,
    crsCreCd,
    crsTypeCd
  }));
}

/**
 * 과목 목록을 CLI 출력에 적합한 JSON 문자열로 직렬화한다.
 * @param {string} html - e-campus 대시보드 HTML 응답 본문
 * @returns {string} 들여쓰기된 과목 목록 JSON 문자열
 */
export function parseEcampusCourseListJson(html: string): string {
  return JSON.stringify(parseEcampusCourseList(html), null, 2);
}

/**
 * 수강 중인 과목들을 학사 카테고리별로 분류하여 반환한다.
 * @param {string} html - 응답 본문
 * @returns {EcampusCourseGroups} 분류된 결과 객체
 */
export function parseEcampusCourseGroups(html: string): EcampusCourseGroups {
  const courses = parseEcampusCourses(html);
  const curricular = courses.filter((c) => c.category === "curricular");
  const extracurricular = courses.filter((c) => c.category === "extracurricular");

  return {
    curricular,
    extracurricular,
    curricularCourseNames: curricular.map((c) => c.title),
    extracurricularCourseNames: extracurricular.map((c) => c.title)
  };
}

/**
 * 구 API 이름으로 과목 목록을 조회한다.
 * @param {string} html - e-campus 대시보드 HTML 응답 본문
 * @returns {EcampusCourseListItem[]} 과목 정보 배열
 * @deprecated parseEcampusCourseList를 사용한다.
 */
export function parseEcampusCourseNames(html: string): EcampusCourseListItem[] {
  return parseEcampusCourseList(html);
}

/**
 * 구 API 이름으로 과목 목록 JSON을 생성한다.
 * @param {string} html - e-campus 대시보드 HTML 응답 본문
 * @returns {string} 들여쓰기된 과목 목록 JSON 문자열
 * @deprecated parseEcampusCourseListJson을 사용한다.
 */
export function parseEcampusCourseNamesJson(html: string): string {
  return parseEcampusCourseListJson(html);
}

/**
 * 드롭다운 메뉴 아이템을 탐색하여 메타데이터와 학사 정보를 정밀 추출한다.
 * @param {string} html - e-campus 대시보드 HTML 응답 본문
 * @returns {EcampusCourse[]} 과목 메타데이터 배열
 * @throws {Error} 세션 만료로 판단되는 로그인 화면 응답일 때 발생
 */
function parseEcampusCourses(html: string): EcampusCourse[] {
  const $ = cheerio.load(html);
  const courses: EcampusCourse[] = [];

  // 강의실 선택 드롭다운 내의 실제 동작하는 아이템들만 타겟팅
  $(".ui.search.selection.dropdown .menu .item[onclick^='classRoomMain']").each((_, element) => {
    const item = $(element);
    const onclick = item.attr("onclick") ?? "";
    const match = CLASS_ROOM_ONCLICK_PATTERN.exec(onclick);

    if (!match?.groups) return;

    const { crsCreCd, crsTypeCd } = match.groups;
    const title = normalizeSpace(item.find("span").first().text());

    if (!title || !crsCreCd || !crsTypeCd) return;

    const label = normalizeSpace(item.find("label.ui.mini.basic.label.mr5").first().text());
    const category = resolveCourseCategory(crsTypeCd, label);
    const course: EcampusCourse = {
      id: crsCreCd,
      title,
      crsCreCd,
      crsTypeCd,
      category,
      label,
      rawTypeCode: crsTypeCd
    };

    // 분반 정보 등 부가 라벨이 존재하는 경우 추가
    const section = normalizeSpace(item.find("label.c-miniLabel").first().text());
    if (section) course.section = section;

    courses.push(course);
  });

  // 파싱 결과가 전무할 경우, 실제 데이터가 없는 것인지 세션이 만료된 것인지 정밀 판별
  if (courses.length === 0) {
    const content = html.toLowerCase();
    // 로그인 유도 키워드가 발견되면 세션 만료 에러 투척
    if (
      content.includes("login") ||
      content.includes("encryptdata") ||
      content.includes("userhome")
    ) {
      throw new Error("SESSION_EXPIRED");
    }
  }

  return courses;
}

/**
 * 시스템 코드 및 텍스트 라벨을 기반으로 과목의 성격을 결정한다.
 * @param {string} typeCode - e-campus 과목 유형 코드
 * @param {string} label - 화면에 노출된 과목 유형 라벨
 * @returns {EcampusCourseCategory} 정규/비교과 분류
 */
function resolveCourseCategory(typeCode: string, label: string): EcampusCourseCategory {
  // 'CO' 코드는 일반적으로 비교과(Co-curricular) 센터 과목을 의미
  if (typeCode === "CO" || label.includes("비교과")) return "extracurricular";
  return "curricular";
}
