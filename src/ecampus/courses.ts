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

export function parseEcampusCourseList(html: string): EcampusCourseListItem[] {
  return parseEcampusCourses(html).map(({ title, crsCreCd, crsTypeCd }) => ({
    title,
    crsCreCd,
    crsTypeCd
  }));
}

export function parseEcampusCourseListJson(html: string): string {
  return JSON.stringify(parseEcampusCourseList(html), null, 2);
}

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

export function parseEcampusCourseNames(html: string): EcampusCourseListItem[] {
  return parseEcampusCourseList(html);
}

export function parseEcampusCourseNamesJson(html: string): string {
  return parseEcampusCourseListJson(html);
}

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

function resolveCourseCategory(typeCode: string, label: string): EcampusCourseCategory {
  if (typeCode === "CO" || label.includes("비교과")) {
    return "extracurricular";
  }

  return "curricular";
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
