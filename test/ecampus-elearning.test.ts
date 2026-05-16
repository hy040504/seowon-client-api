import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AxiosInstance } from "axios";
import { describe, expect, it } from "vitest";
import {
  createEcampusClient,
  createEcampusLessonRequestBundle,
  parseEcampusLessonListFromSaz,
  parseEcampusLessonListHtml,
  parseEcampusLessonSchedulesHtml,
  parseEcampusLessonStudyWindowsFromSaz,
  parseStudyRecordSnapshot,
  stringifyEcampusLessons
} from "../src/index";

const FIXTURE_DIR = join(process.cwd(), "files", "e러닝 파이썬 비교과 창 프론트");
const COURSE_CODE = "2026_1_008620_01";

describe("e-learning 강의 목록", () => {
  it("온라인 강의 HTML에서 주차와 차시 목록 JSON을 만든다", () => {
    const html = readFileSync(join(FIXTURE_DIR, "온라인 강의 선택 후 들어간 창.html"), "utf8");
    const schedules = parseEcampusLessonSchedulesHtml(html, { crsCreCd: COURSE_CODE });
    const lessons = parseEcampusLessonListHtml(html, { crsCreCd: COURSE_CODE });
    const json = stringifyEcampusLessons(lessons);

    console.log("e-learning 강의 목록 JSON:", json);

    expect(schedules).toHaveLength(14);
    expect(lessons).toHaveLength(26);
    expect(lessons[0]).toMatchObject({
      lessonScheduleId: "LESN_260123T161939_1529573",
      lessonCntsId: "CNTS_260305T142059_e1951fc",
      title: "1차시",
      durationSeconds: 1740
    });
    expect(JSON.parse(json)).toHaveLength(26);
  });

  it("SAZ 패킷에서도 온라인 강의 목록을 복원한다", () => {
    const saz = readFileSync(
      join(FIXTURE_DIR, "비교과 e러닝 페이지 입장, 수강 및 동영상 감상 packet.saz")
    );
    const lessons = parseEcampusLessonListFromSaz(saz, { crsCreCd: COURSE_CODE });

    expect(lessons.length).toBeGreaterThanOrEqual(1);
    expect(lessons.some((lesson) => lesson.lessonCntsId === "CNTS_260305T142100_e19520c")).toBe(
      true
    );
  });
});

describe("e-learning 강의 창", () => {
  it("SAZ 패킷에서 강의 재생 창과 학습기록 요청을 추출한다", () => {
    const saz = readFileSync(
      join(FIXTURE_DIR, "비교과 e러닝 페이지 입장, 수강 및 동영상 감상 packet.saz")
    );
    const windows = parseEcampusLessonStudyWindowsFromSaz(saz, { crsCreCd: COURSE_CODE });

    console.log("e-learning 강의 창 JSON:", JSON.stringify(windows, null, 2));

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      crsCreCd: COURSE_CODE,
      lessonCntsId: "CNTS_260305T142100_e19520c",
      stdNo: "2026_1_008620_01_202311420",
      studyDetailId: "STUDY_260515T013943_7853233",
      contentKind: "doczoom"
    });
    expect(windows[0]?.recordRequest?.query.studyStatusCd).toBe("STUDY");
  });

  it("클라이언트에서 온라인 강의 목록 HTML을 가져와 JSON으로 반환한다", async () => {
    const html = readFileSync(join(FIXTURE_DIR, "온라인 강의 선택 후 들어간 창.html"), "utf8");
    const http = {
      get: async (path: string) => {
        expect(path).toBe(
          "/lesson/lessonLect/Form/lessonListForm?mcd=MH_210504T143020d03000a&crsCreCd=2026_1_008620_01"
        );
        return { data: html };
      }
    } as AxiosInstance;
    const client = createEcampusClient({ axios: http });
    const json = await client.getElearningLessonListJson({ crsCreCd: COURSE_CODE });

    expect(JSON.parse(json)).toHaveLength(26);
  });

  it("읽기 전용 스냅샷으로 학습기록 요청 구조를 만든다", () => {
    const saz = readFileSync(
      join(FIXTURE_DIR, "비교과 e러닝 페이지 입장, 수강 및 동영상 감상 packet.saz")
    );
    const windowSnapshot = parseEcampusLessonStudyWindowsFromSaz(saz, { crsCreCd: COURSE_CODE })[0];

    expect(windowSnapshot).toBeDefined();
    const snapshot = parseStudyRecordSnapshot(windowSnapshot!);

    expect(snapshot.recordRequest).toMatchObject({
      method: "GET",
      url: "https://ecampus.seowon.ac.kr/lesson/lessonHome/addStudyRecord"
    });
    expect(snapshot.recordRequest?.query).toMatchObject({
      lessonCntsId: "CNTS_260305T142100_e19520c",
      stdNo: "2026_1_008620_01_202311420",
      studyDetailId: "STUDY_260515T013943_7853233",
      studyStatusCd: "STUDY",
      crsCreCd: COURSE_CODE
    });
  });

  it("lesson 객체 하나로 세 요청을 묶는다", () => {
    const html = readFileSync(join(FIXTURE_DIR, "온라인 강의 선택 후 들어간 창.html"), "utf8");
    const lesson = parseEcampusLessonListHtml(html, { crsCreCd: COURSE_CODE })[0];

    expect(lesson).toBeDefined();
    const bundle = createEcampusLessonRequestBundle(lesson!, {
      crsCreCd: COURSE_CODE,
      stdNo: "2026_1_008620_01_202311420",
      studyDetailId: "STUDY_260515T013943_7853233",
      studyStatusCd: "STUDY"
    });

    expect(bundle.viewRequest).toMatchObject({
      method: "POST",
      url: "https://ecampus.seowon.ac.kr/lesson/lessonLect/Form/mainLesson"
    });
    expect(bundle.studyWindowRequest).toMatchObject({
      method: "POST",
      url: "https://ecampus.seowon.ac.kr/lesson/lessonOpen/lessonNewWindow?crsCreCd=2026_1_008620_01"
    });
    expect(bundle.recordRequest?.query.lessonCntsId).toBe("CNTS_260305T142059_e1951fc");
    expect(bundle.snapshot.lessonCntsId).toBe("CNTS_260305T142059_e1951fc");
  });
});
