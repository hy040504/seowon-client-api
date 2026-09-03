import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COURSE_DB_LATEST_POINTER,
  filterLocalCoursesByFacet,
  filterLocalCoursesByFacets,
  listCourseDbFiles,
  listLocalCourseColleges,
  listLocalCourseDepartments,
  listLocalCourseDomains,
  loadLatestCourseDb,
  matchLocalCourseFacets,
  splitCultureDomainNames,
  resolveLatestCourseDb,
  searchLocalCourses,
  writeCourseDbPointer
} from "../src/course-catalog/local-db.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  for (const dir of tmpDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makeDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "seowon-coursedb-"));
  tmpDirs.push(dir);
  return dir;
}

describe("local course catalog detection", () => {
  it("follows latest.json even when catalog filenames differ", async () => {
    const dir = await makeDir();
    const older = "2026학년도 2학기 전체 강의 목록 DB (2026-07-31).json";
    const newer = "2026학년도 2학기 전체 강의 목록 DB (2026-08-12).json";
    await fs.writeFile(path.join(dir, older), JSON.stringify([{ subjtCd: "1", corseDvclsNo: "01" }]));
    await fs.writeFile(
      path.join(dir, newer),
      JSON.stringify([{ subjtCd: "527087", corseDvclsNo: "02", subjtNm: "자료구조" }])
    );
    await writeCourseDbPointer(dir, {
      fileName: newer,
      generatedAt: "2026-08-12T00:00:00.000Z",
      count: 1,
      syy: "2026",
      smtName: "2"
    });

    const ref = await resolveLatestCourseDb({ outputDir: dir, useEnv: false });
    expect(ref.source).toBe("pointer");
    expect(ref.fileName).toBe(newer);

    const loaded = await loadLatestCourseDb({ outputDir: dir, useEnv: false });
    expect(loaded.courses[0]?.subjtCd).toBe("527087");
  });

  it("falls back to newest catalog file when pointer is missing", async () => {
    const dir = await makeDir();
    const a = path.join(dir, "2026학년도 2학기 전체 강의 목록 DB (2026-07-31).json");
    const b = path.join(dir, "2026학년도 2학기 전체 강의 목록 DB (2026-08-12).json");
    await fs.writeFile(a, "[]");
    await new Promise((r) => setTimeout(r, 20));
    await fs.writeFile(b, "[]");

    const listed = await listCourseDbFiles(dir);
    expect(listed.some((f) => f.fileName.includes("latest"))).toBe(false);
    const ref = await resolveLatestCourseDb({ outputDir: dir, useEnv: false });
    expect(ref.source).toBe("mtime");
    expect(ref.fileName).toContain("2026-08-12");
  });

  it("ignores latest.json itself when listing catalogs", async () => {
    const dir = await makeDir();
    await fs.writeFile(
      path.join(dir, "2026학년도 2학기 전체 강의 목록 DB (2026-08-12).json"),
      "[]"
    );
    await fs.writeFile(path.join(dir, COURSE_DB_LATEST_POINTER), "{}");
    const listed = await listCourseDbFiles(dir);
    expect(listed).toHaveLength(1);
  });

  it("searches by code-section and name", () => {
    const rows = [
      { subjtCd: "527087", corseDvclsNo: "02", subjtNm: "자료구조", chrgInstrEmpnm: "홍길동" },
      { subjtCd: "111111", corseDvclsNo: "01", subjtNm: "영어회화" }
    ];
    expect(searchLocalCourses(rows, "527087-02")).toHaveLength(1);
    expect(searchLocalCourses(rows, "자료").map((r) => r.subjtCd)).toEqual(["527087"]);
    expect(searchLocalCourses(rows, "홍길동")).toHaveLength(1);
  });

  it("lists departments/colleges and filters by real names", () => {
    const rows = [
      {
        subjtCd: "1",
        corseDvclsNo: "01",
        estblDeprtNm: "역사교육과",
        univNm: "사범대학",
        _category: "구분-0"
      },
      {
        subjtCd: "2",
        corseDvclsNo: "01",
        estblDeprtNm: "컴퓨터공학과",
        univNm: "IT문화예술대학",
        _category: "구분-0"
      },
      {
        subjtCd: "3",
        corseDvclsNo: "01",
        estblDeprtNm: "역사교육과",
        univNm: "사범대학",
        _category: "구분-1"
      },
      {
        subjtCd: "4",
        corseDvclsNo: "01",
        estblDeprtNm: "휴머니티교양대학",
        univNm: "휴머니티교양대학",
        _category: "구분-1"
      }
    ];

    expect(listLocalCourseDepartments(rows).map((f) => `${f.name}:${f.count}`)).toEqual([
      "역사교육과:2",
      "컴퓨터공학과:1",
      "휴머니티교양대학:1"
    ]);
    expect(listLocalCourseColleges(rows)).toHaveLength(3);

    expect(matchLocalCourseFacets(rows, "역사").map((f) => f.name)).toEqual(["역사교육과"]);
    expect(matchLocalCourseFacets(rows, "사범").map((f) => f.kind)).toEqual(["college"]);
    // 단과대·학과 이름이 같으면 학과를 우선해 한 줄
    expect(matchLocalCourseFacets(rows, "휴머니티")).toEqual([
      { kind: "department", name: "휴머니티교양대학", count: 1 }
    ]);

    expect(
      filterLocalCoursesByFacet(rows, {
        kind: "department",
        name: "역사교육과",
        count: 2
      }).map((r) => r.subjtCd)
    ).toEqual(["1", "3"]);
    expect(
      filterLocalCoursesByFacet(rows, { kind: "college", name: "사범대학", count: 2 })
    ).toHaveLength(2);

    const union = filterLocalCoursesByFacets(rows, [
      { kind: "department", name: "컴퓨터공학과", count: 1 },
      { kind: "department", name: "휴머니티교양대학", count: 1 }
    ]);
    expect(union.map((r) => r.subjtCd).sort()).toEqual(["2", "4"]);
    expect(searchLocalCourses(rows, "사범대학")).toHaveLength(2);
  });

  it("lists and filters culture domains from cltrDomnNm", () => {
    const rows = [
      {
        subjtCd: "1",
        corseDvclsNo: "01",
        estblDeprtNm: "휴머니티교양대학",
        univNm: "휴머니티교양대학",
        cltrDomnNm: "의사소통",
        cltrDomnCd: "A01"
      },
      {
        subjtCd: "2",
        corseDvclsNo: "01",
        estblDeprtNm: "휴머니티교양대학",
        univNm: "휴머니티교양대학",
        cltrDomnNm: "의사소통 / 인성",
        cltrDomnCd: "A01,A02"
      },
      {
        subjtCd: "3",
        corseDvclsNo: "01",
        estblDeprtNm: "역사교육과",
        univNm: "사범대학"
      }
    ];

    expect(splitCultureDomainNames("의사소통 / 인성")).toEqual(["의사소통", "인성"]);
    expect(listLocalCourseDomains(rows).map((f) => `${f.name}:${f.count}`).sort()).toEqual(
      ["인성:1", "의사소통:2"].sort()
    );
    expect(matchLocalCourseFacets(rows, "의사").map((f) => f.kind)).toEqual(["domain"]);
    expect(
      filterLocalCoursesByFacet(rows, { kind: "domain", name: "의사소통", count: 2 }).map(
        (r) => r.subjtCd
      )
    ).toEqual(["1", "2"]);
    expect(searchLocalCourses(rows, "인성")).toHaveLength(1);
  });
});
