import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AxiosInstance } from "axios";
import { describe, expect, it } from "vitest";
import {
  createEcampusClient,
  parseEcampusCourseGroups,
  parseEcampusCourseList,
  parseEcampusCourseListJson,
  parseEcampusCourseNamesJson
} from "../src/index";

const EXPECTED_COURSES = [
  { title: "논리회로", crsCreCd: "2026_1_736078_01", crsTypeCd: "UNI" },
  { title: "데이터구조", crsCreCd: "2026_1_736040_01", crsTypeCd: "UNI" },
  { title: "알고리즘", crsCreCd: "2026_1_736081_01", crsTypeCd: "UNI" },
  { title: "웹프로그래밍Ｉ", crsCreCd: "2026_1_736087_01", crsTypeCd: "UNI" },
  { title: "코딩기반사고력（파이썬）", crsCreCd: "2026_1_008620_01", crsTypeCd: "UNI" },
  { title: "ＩｏＴ기초실험", crsCreCd: "2026_1_736086_01", crsTypeCd: "UNI" },
  { title: "ＳＵ진로코칭Ⅱ", crsCreCd: "2026_1_008569_KO", crsTypeCd: "UNI" },
  { title: "2026년 교제폭력 예방교육", crsCreCd: "CE_260304T150804_e192529", crsTypeCd: "CO" },
  { title: "2026년 디지털 성범죄 예방교육", crsCreCd: "CE_260304T150917_e19254b", crsTypeCd: "CO" },
  { title: "2026년 폭력예방교육(학부생)", crsCreCd: "CE_260304T151041_e192573", crsTypeCd: "CO" },
  { title: "2026학년도 리턴 프로젝트", crsCreCd: "CE_260318T135047_06c2007", crsTypeCd: "CO" },
  {
    title: "2026학년도 비교과 교육과정 설명회",
    crsCreCd: "CE_260318T135212_06c202a",
    crsTypeCd: "CO"
  },
  { title: "사이버 도박중독 예방교육", crsCreCd: "CE_260316T092356_ac926ef", crsTypeCd: "CO" },
  { title: "연구실 안전교육(저위험)", crsCreCd: "CE_260312T174427_caf325a", crsTypeCd: "CO" },
  { title: "지능정보서비스과의존 예방교육", crsCreCd: "CE_260316T103621_5955ed2", crsTypeCd: "CO" }
];

describe("parseEcampusCourseList", () => {
  it("로그인 후 메인 HTML에서 과목명, 강의실 코드, 과목 타입을 배열 JSON으로 만든다", () => {
    const html = readFileSync(findSavedMainHtml(), "utf8");
    const courses = parseEcampusCourseList(html);
    const json = parseEcampusCourseListJson(html);

    console.log("과목 리스트 JSON:", json);

    expect(courses).toEqual(EXPECTED_COURSES);
    expect(JSON.parse(json)).toEqual(EXPECTED_COURSES);
  });

  it("기존 getCourseNamesJson도 같은 배열 JSON을 반환한다", () => {
    const html = readFileSync(findSavedMainHtml(), "utf8");
    const data = JSON.parse(parseEcampusCourseNamesJson(html));

    expect(data).toEqual(EXPECTED_COURSES);
  });
});

describe("parseEcampusCourseGroups", () => {
  it("교과와 비교과 그룹 정보도 유지한다", () => {
    const html = readFileSync(findSavedMainHtml(), "utf8");
    const groups = parseEcampusCourseGroups(html);

    expect(groups.curricular).toHaveLength(7);
    expect(groups.extracurricular).toHaveLength(8);
    expect(groups.curricular[0]).toMatchObject(EXPECTED_COURSES[0]!);
    expect(groups.extracurricular[0]).toMatchObject(EXPECTED_COURSES[7]!);
  });
});

describe("EcampusClient 과목 조회", () => {
  it("메인 HTML을 가져와 과목 리스트 JSON을 만든다", async () => {
    const html = readFileSync(findSavedMainHtml(), "utf8");
    const http = {
      get: async (path: string) => {
        expect(path).toBe("/home/mainHome/Form/main");
        return { data: html };
      }
    } as AxiosInstance;

    const client = createEcampusClient({ axios: http });
    const json = await client.getCourseListJson();
    const oldJson = await client.getCourseNamesJson();

    console.log("클라이언트 과목 리스트 JSON:", json);

    expect(JSON.parse(json)).toEqual(EXPECTED_COURSES);
    expect(JSON.parse(oldJson)).toEqual(EXPECTED_COURSES);
  });
});

/**
 * 저장된 로그인 후 메인 HTML 파일을 찾는다
 * @returns {string} 메인 HTML 파일 경로
 * @throws {Error} 파일을 찾지 못한 경우
 */
function findSavedMainHtml(): string {
  const filesRoot = join(process.cwd(), "files");
  const found = findFile(
    filesRoot,
    (fileName) => fileName.endsWith(".html") && fileName.includes("e-campus")
  );

  if (!found) {
    throw new Error("로그인 후 메인 홈페이지 HTML 파일을 찾을 수 없습니다.");
  }

  return found;
}

/**
 * 디렉터리 트리에서 조건에 맞는 파일을 찾는다
 * @param {string} directory - 탐색할 기준 디렉터리
 * @param {(fileName: string) => boolean} predicate - 파일 이름 판별 함수
 * @returns {string | undefined} 찾은 파일 경로
 */
function findFile(directory: string, predicate: (fileName: string) => boolean): string | undefined {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(entryPath, predicate);
      if (found) {
        return found;
      }
    } else if (predicate(entry.name)) {
      return entryPath;
    }
  }

  return undefined;
}
