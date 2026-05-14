import * as cheerio from "cheerio";

export type EcampusCourseCategory = "curricular" | "extracurricular";
export type EcampusCourseTypeCode = "UNI" | "CO" | string;

export interface EcampusCourseListItem {
  title: string;
  crsCreCd: string;
  crsTypeCd: EcampusCourseTypeCode;
}

export interface EcampusCourse extends EcampusCourseListItem {
  id: string;
  category: EcampusCourseCategory;
  label: string;
  section?: string;
  rawTypeCode: EcampusCourseTypeCode;
}

export interface EcampusCourseGroups {
  curricular: EcampusCourse[];
  extracurricular: EcampusCourse[];
  curricularCourseNames: string[];
  extracurricularCourseNames: string[];
}

export interface EcampusCourseNamesJson {
  curricularCourseNames: string[];
  extracurricularCourseNames: string[];
}

const CLASS_ROOM_ONCLICK_PATTERN =
  /classRoomMain\(\s*['"](?<crsCreCd>[^'"]+)['"]\s*,\s*['"](?<crsTypeCd>[^'"]+)['"]\s*\)/;

/**
 * 메인 페이지 HTML에서 과목 목록을 단순 배열로 추출한다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {EcampusCourseListItem[]} 과목명, 강의실 코드, 과목 타입 배열
 */
export function parseEcampusCourseList(html: string): EcampusCourseListItem[] {
  return parseEcampusCourses(html).map(({ title, crsCreCd, crsTypeCd }) => ({
    title,
    crsCreCd,
    crsTypeCd
  }));
}

/**
 * 과목 목록을 JSON 문자열로 반환한다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {string} 과목 목록 JSON 문자열
 */
export function parseEcampusCourseListJson(html: string): string {
  return JSON.stringify(parseEcampusCourseList(html), null, 2);
}

/**
 * 메인 페이지 HTML에서 교과와 비교과 과목을 그룹으로 나눈다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {EcampusCourseGroups} 교과와 비교과 그룹 정보
 */
export function parseEcampusCourseGroups(html: string): EcampusCourseGroups {
  const courses = parseEcampusCourses(html);
  const curricular = courses.filter((course) => course.category === "curricular");
  const extracurricular = courses.filter((course) => course.category === "extracurricular");

  return {
    curricular,
    extracurricular,
    curricularCourseNames: curricular.map((course) => course.title),
    extracurricularCourseNames: extracurricular.map((course) => course.title)
  };
}

/**
 * 과목 목록을 기존 호환 이름으로 반환한다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {EcampusCourseListItem[]} 과목 목록 배열
 */
export function parseEcampusCourseNames(html: string): EcampusCourseListItem[] {
  return parseEcampusCourseList(html);
}

/**
 * 과목 목록을 기존 호환 이름의 JSON 문자열로 반환한다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {string} 과목 목록 JSON 문자열
 */
export function parseEcampusCourseNamesJson(html: string): string {
  return parseEcampusCourseListJson(html);
}

/**
 * 메인 페이지에서 실제 과목 카드들을 읽어 내부 모델로 변환한다
 * @param {string} html - 로그인 후 메인 페이지 HTML
 * @returns {EcampusCourse[]} 내부 파싱용 과목 배열
 */
function parseEcampusCourses(html: string): EcampusCourse[] {
  const $ = cheerio.load(html);
  const courses: EcampusCourse[] = [];

  $(".ui.search.selection.dropdown .menu .item[onclick^='classRoomMain']").each((_, element) => {
    const item = $(element);
    const onclick = item.attr("onclick") ?? "";
    const match = CLASS_ROOM_ONCLICK_PATTERN.exec(onclick);

    if (!match?.groups) {
      return;
    }

    const crsCreCd = match.groups.crsCreCd;
    const crsTypeCd = match.groups.crsTypeCd;
    const title = normalizeText(item.find("span").first().text());

    if (!title || !crsCreCd || !crsTypeCd) {
      return;
    }

    const label = normalizeText(item.find("label.ui.mini.basic.label.mr5").first().text());
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

    const section = normalizeText(item.find("label.c-miniLabel").first().text());
    if (section) {
      course.section = section;
    }

    courses.push(course);
  });

  return courses;
}

/**
 * 과목 타입과 라벨을 기준으로 교과/비교과를 구분한다
 * @param {string} typeCode - 프론트가 넘긴 과목 타입 코드
 * @param {string} label - 화면에 표시된 보조 라벨
 * @returns {EcampusCourseCategory} 교과 또는 비교과 분류
 */
function resolveCourseCategory(typeCode: string, label: string): EcampusCourseCategory {
  if (typeCode === "CO" || label.includes("비교과")) {
    return "extracurricular";
  }

  return "curricular";
}

/**
 * 화면 텍스트의 공백을 정리한다
 * @param {string} value - 정리할 문자열
 * @returns {string} 공백이 정리된 문자열
 */
function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
