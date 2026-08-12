/**
 * 희망바구니 클라이언트로 전체 개설 과목을 긁어 로컬 JSON 카탈로그를 만든다.
 * db-generator/generate.ts 와 예약 매크로 메뉴가 같은 구현을 사용한다.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createHopeBasketClient } from "../hope-basket/client.js";
import type { SugangSubject } from "../hope-basket/types/basket.js";
import {
  defaultCourseDbOutputDir,
  writeCourseDbPointer,
  type CourseDbPointer
} from "./local-db.js";

const SEMESTER_MAP: Record<string, string> = {
  "10": "1",
  "11": "여름",
  "20": "2",
  "21": "겨울"
};

const SEARCH_DIVS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export const HOPE_BASKET_COOKIE_FILE = ".seowon-hope-basket.cookies.json";

export interface GenerateCourseDbOptions {
  stuno: string;
  password: string;
  cookieFilePath?: string;
  outputDir?: string;
  cwd?: string;
  /** true면 학과 시간표 속성(e러닝 등) 교차 조회 생략 */
  skipTimetable?: boolean;
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}

export interface GenerateCourseDbResult {
  fileName: string;
  filePath: string;
  pointerPath: string;
  count: number;
  syy: string;
  smtCd: string;
  smtName: string;
  generatedAt: string;
}

/**
 * 희망바구니 로그인 후 전체 개설 과목을 수집해 JSON + latest.json 을 기록한다.
 */
export async function generateCourseDb(
  options: GenerateCourseDbOptions
): Promise<GenerateCourseDbResult> {
  const stuno = options.stuno.trim();
  const password = options.password.trim();
  if (!stuno || !password) {
    throw new Error("학번과 비밀번호가 필요합니다.");
  }

  const cwd = options.cwd ?? process.cwd();
  const outputDir = options.outputDir ?? defaultCourseDbOutputDir(cwd);
  const cookieFilePath =
    options.cookieFilePath ?? path.resolve(cwd, HOPE_BASKET_COOKIE_FILE);
  const emit = options.onProgress ?? (() => undefined);

  const client = createHopeBasketClient({
    cookieFilePath,
    onProgress: emit
  });

  emit("희망바구니 로그인 중…");
  const loginResult = await client.login({ stuno, password });
  if (!loginResult.success) {
    throw new Error(`희망바구니 로그인 실패: ${loginResult.message}`);
  }

  if (options.shouldStop?.()) {
    throw new Error("중단됨");
  }

  const term = client.getTermContext();
  const syy = term.syy || "";
  const smtCd = term.smtCd || "";
  const smtName = SEMESTER_MAP[smtCd] || smtCd || "?";

  const today = new Date();
  const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const fileName = `${syy}학년도 ${smtName}학기 전체 강의 목록 DB (${dateString}).json`;
  const filePath = path.join(outputDir, fileName);

  const allSubjects: Array<SugangSubject & { _category: string }> = [];
  const fetchedKeys = new Set<string>();
  const timetableProps = new Map<string, string>();

  const addSubjects = (subjects: SugangSubject[], category: string) => {
    for (const sub of subjects) {
      const key = `${sub.subjtCd}-${sub.corseDvclsNo}`;
      if (timetableProps.has(key)) {
        sub.slesLessnItem = timetableProps.get(key);
      } else if (!sub.slesLessnItem) {
        sub.slesLessnItem = "";
      }
      if (!fetchedKeys.has(key)) {
        fetchedKeys.add(key);
        allSubjects.push({ ...sub, _category: category });
      }
    }
  };

  emit(`[목표 파일] ${fileName}`);
  emit(`[출력 폴더] ${outputDir}`);

  if (!options.skipTimetable) {
    emit("[1/3] 학과별 시간표에서 수업 속성(e러닝 등) 수집 중…");
    const timetableDepts = await client.getTimetableDepartments();
    emit(`시간표 학과 ${timetableDepts.length}개`);
    let deptIndex = 0;
    for (const tDept of timetableDepts) {
      if (options.shouldStop?.()) throw new Error("중단됨");
      deptIndex += 1;
      if (deptIndex % 20 === 0 || deptIndex === timetableDepts.length) {
        emit(`시간표 속성 ${deptIndex}/${timetableDepts.length}…`);
      }
      try {
        const tSubjects = await client.getTimetableSubjects({
          asignDeprtCd: tDept.asignDeprtCd
        });
        for (const ts of tSubjects) {
          if (ts.slesLessnItem) {
            timetableProps.set(`${ts.subjtCd}-${ts.corseDvclsNo}`, ts.slesLessnItem);
          }
        }
      } catch {
        // 개별 학과 실패는 무시
      }
    }
    emit(`수업 속성 매핑 ${timetableProps.size}건`);
  } else {
    emit("[1/3] 시간표 속성 수집 생략");
  }

  emit("[2/3] 개설 과목 전체 조회 (구분 0~6)…");
  for (const d of SEARCH_DIVS) {
    if (options.shouldStop?.()) throw new Error("중단됨");
    emit(`구분 ${d} 조회 중…`);
    try {
      const subjects = await client.searchSubjects({ serchDiv: d });
      addSubjects(subjects, `구분-${d}`);
      emit(`구분 ${d}: ${subjects.length}건 (누적 ${allSubjects.length})`);
    } catch {
      emit(`구분 ${d}: 실패 또는 없음`);
    }
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(allSubjects, null, 2), "utf-8");

  emit("[3/3] latest.json 포인터 갱신…");
  const generatedAt = new Date().toISOString();
  const pointer: CourseDbPointer = {
    version: 1,
    fileName,
    absolutePath: filePath,
    generatedAt,
    count: allSubjects.length,
    syy,
    smtCd,
    smtName
  };
  const pointerPath = await writeCourseDbPointer(outputDir, pointer);

  emit(`완료: ${allSubjects.length}과목 → ${fileName}`);

  return {
    fileName,
    filePath,
    pointerPath,
    count: allSubjects.length,
    syy,
    smtCd,
    smtName,
    generatedAt
  };
}
