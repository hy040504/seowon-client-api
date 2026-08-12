import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  COURSE_DB_LATEST_POINTER,
  listCourseDbFiles,
  loadLatestCourseDb,
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
});
