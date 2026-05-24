import * as cheerio from "cheerio";
import { normalizeSpace } from "./utils.js";

/** 과목 대분류 타입 */
export type EcampusCourseCategory = "curricular" | "extracurricular";
/** 서버에서 사용하는 과목 구분 코드 */
export type EcampusCourseTypeCode = "UNI" | "CO" | string;

/** 기초 과목 정보 구조체 */
export interface EcampusCourseListItem {
  /** 과목 명칭 */
  title: string;
  /** 강의실 고유 코드 */
  crsCreCd: string;
  /** 과목 타입 코드 (교과/비교과 등) */
  crsTypeCd: EcampusCourseTypeCode;
}

/** 파싱된 상세 과목 정보 객체 */
export interface EcampusCourse extends EcampusCourseListItem {
  /** 유일 식별자 */
  id: string;
  /** 교과/비교과 카테고리 */
  category: EcampusCourseCategory;
  /** 화면상에 표시된 라벨 (예: "2026-1") */
  label: string;
  /** 분반 정보 */
  section?: string;
  /** 원본 타입 코드 */
  rawTypeCode: EcampusCourseTypeCode;
}

/** 과목 그룹화 결과물 */
export interface EcampusCourseGroups {
  curricular: EcampusCourse[];
  extracurricular: EcampusCourse[];
  curricularCourseNames: string[];
  extracurricularCourseNames: string[];
}

/** 하위 호환을 위한 이름 목록 전용 구조체 */
export interface EcampusCourseNamesJson {
  curricularCourseNames: string[];
  extracurricularCourseNames: string[];
}

/** 강의실 진입 링크에 걸린 JavaScript 함수 패턴 */
const CLASS_ROOM_ONCLICK_PATTERN = /classRoomMain\(\s*['"](?<crsCreCd>[^'"]+)['"]\s*,\s*['"](?<crsTypeCd>[^'"]+)['"]\s*\)/;

/**
 * 로그인 후 메인 대시보드 HTML에서 수강 중인 과목 목록을 추출한다
 * @param {string} html - 응답 HTML 본문
 * @returns {EcampusCourseListItem[]} 과목 정보 요약 배열
 */
export function parseEcampusCourseList(html: string): EcampusCourseListItem[] {
  return parseEcampusCourses(html).map(({ title, crsCreCd, crsTypeCd }) => ({ title, crsCreCd, crsTypeCd }));
}

/**
 * 과목 목록을 들여쓰기가 적용된 JSON 문자열로 변환한다
 * @param {string} html - 응답 HTML 본문
 * @returns {string} 포맷팅된 JSON 문자열
 */
export function parseEcampusCourseListJson(html: string): string {
  return JSON.stringify(parseEcampusCourseList(html), null, 2);
}

/**
 * 수강 중인 과목들을 교과와 비교과 그룹으로 분류하여 반환한다
 * @param {string} html - 응답 HTML 본문
 * @returns {EcampusCourseGroups} 분류된 과목 그룹 객체
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

/** 구 버전 API와의 호환성을 위한 래퍼 함수 */
export function parseEcampusCourseNames(html: string): EcampusCourseListItem[] {
  return parseEcampusCourseList(html);
}

/** 구 버전 API와의 호환성을 위한 JSON 래퍼 함수 */
export function parseEcampusCourseNamesJson(html: string): string {
  return parseEcampusCourseListJson(html);
}

/**
 * HTML 내의 드롭다운 아이템들을 순회하며 상세 과목 정보를 추출한다.
 * @param {string} html - 파싱 대상
 * @returns {EcampusCourse[]} 내부 모델 배열
 * @private
 */
function parseEcampusCourses(html: string): EcampusCourse[] {
  const $ = cheerio.load(html);
  const courses: EcampusCourse[] = [];

  // 과목 선택 드롭다운 내의 실제 클릭 가능한 아이템들을 탐색
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
      id: crsCreCd, title, crsCreCd, crsTypeCd, category, label, rawTypeCode: crsTypeCd
    };

    const section = normalizeSpace(item.find("label.c-miniLabel").first().text());
    if (section) course.section = section;

    courses.push(course);
  });

  // 과목 목록이 비어 있는 경우, 세션 만료 여부를 정밀 판별한다
  if (courses.length === 0) {
    const content = html.toLowerCase();
    // 로그인 입력 폼이나 관련 경로가 포함되어 있다면 세션이 끊겨 리다이렉트된 것으로 간주
    if (content.includes("login") || content.includes("encryptdata") || content.includes("userhome")) {
      throw new Error("SESSION_EXPIRED");
    }
  }

  return courses;
}

/**
 * 과목 타입 코드(CO) 또는 텍스트 라벨을 분석하여 카테고리를 결정한다.
 * @param {string} typeCode - 시스템 코드
 * @param {string} label - 화면 표시 텍스트
 * @returns {EcampusCourseCategory} 분류 결과
 * @private
 */
function resolveCourseCategory(typeCode: string, label: string): EcampusCourseCategory {
  // 'CO' 코드는 일반적으로 비교과(Co-curricular)를 의미함
  if (typeCode === "CO" || label.includes("비교과")) return "extracurricular";
  return "curricular";
}
