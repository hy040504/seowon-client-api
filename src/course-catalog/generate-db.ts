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
  /** true면 교양 영역(cltrDomnNm) 교차 조회 생략 */
  skipCultureDomains?: boolean;
  shouldStop?: () => boolean;
  onProgress?: (message: string) => void;
}

/** generate 가 JSON에 쓰는 한 행 */
export type CourseCatalogRow = SugangSubject & {
  _category: string;
  cltrDomnCd?: string;
  cltrDomnNm?: string;
};

/** 과목코드-분반 키. 카탈로그 중복 제거·영역 태깅에 쓴다. */
export function catalogCourseKey(subjtCd: string, corseDvclsNo: string): string {
  return `${subjtCd}-${corseDvclsNo}`;
}

/** 구분자로 이어 붙이되 같은 토큰은 한 번만 남긴다. */
function appendUniqueToken(current: string | undefined, next: string, sep: string): string {
  const token = next.trim();
  if (!token) return (current ?? "").trim();
  const parts = (current ?? "")
    .split(sep)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.includes(token)) parts.push(token);
  return parts.join(sep);
}

/**
 * 교양 영역 검색 결과를 기존 카탈로그 행에 붙인다.
 * 이미 있는 과목은 cltrDomnCd/cltrDomnNm 만 갱신하고, 없는 과목만 추가한다.
 */
export function mergeCultureDomainIntoCatalog(
  courses: CourseCatalogRow[],
  fetchedKeys: Set<string>,
  domain: { code: string; codeNm: string },
  subjects: SugangSubject[],
  timetableProps?: Map<string, string>
): { tagged: number; added: number } {
  const code = domain.code.trim();
  const name = domain.codeNm.trim();
  const byKey = new Map(
    courses.map((row) => [catalogCourseKey(row.subjtCd, row.corseDvclsNo), row])
  );

  let tagged = 0;
  let added = 0;

  for (const sub of subjects) {
    const key = catalogCourseKey(sub.subjtCd, sub.corseDvclsNo);
    let row = byKey.get(key);
    if (!row) {
      const sles = timetableProps?.get(key) ?? sub.slesLessnItem ?? "";
      row = {
        ...sub,
        slesLessnItem: sles,
        _category: `교양-${name || code || "?"}`
      };
      courses.push(row);
      byKey.set(key, row);
      fetchedKeys.add(key);
      added += 1;
    }

    const nextCd = appendUniqueToken(row.cltrDomnCd, code, ",");
    const nextNm = appendUniqueToken(row.cltrDomnNm, name, " / ");
    if (row.cltrDomnCd === nextCd && row.cltrDomnNm === nextNm) continue;
    row.cltrDomnCd = nextCd || undefined;
    row.cltrDomnNm = nextNm || undefined;
    tagged += 1;
  }

  return { tagged, added };
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

  const allSubjects: CourseCatalogRow[] = [];
  const fetchedKeys = new Set<string>();
  const timetableProps = new Map<string, string>();

  const addSubjects = (subjects: SugangSubject[], category: string) => {
    for (const sub of subjects) {
      const key = catalogCourseKey(sub.subjtCd, sub.corseDvclsNo);
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
    emit("[1/4] 학과별 시간표에서 수업 속성(e러닝 등) 수집 중…");
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
            timetableProps.set(catalogCourseKey(ts.subjtCd, ts.corseDvclsNo), ts.slesLessnItem);
          }
        }
      } catch {
        // 개별 학과 실패는 무시
      }
    }
    emit(`수업 속성 매핑 ${timetableProps.size}건`);
  } else {
    emit("[1/4] 시간표 속성 수집 생략");
  }

  emit("[2/4] 개설 과목 전체 조회 (구분 0~6)…");
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

  if (!options.skipCultureDomains) {
    emit("[3/4] 교양 영역별 과목 태깅…");
    let domains: Awaited<ReturnType<typeof client.getCultureDomains>> = [];
    try {
      domains = await client.getCultureDomains();
    } catch {
      emit("교양 영역 목록 조회 실패 — 영역 태깅 생략");
    }
    emit(`교양 영역 ${domains.length}개`);
    let taggedTotal = 0;
    let addedTotal = 0;
    let domainIndex = 0;
    for (const domain of domains) {
      if (options.shouldStop?.()) throw new Error("중단됨");
      domainIndex += 1;
      const label = domain.codeNm || domain.code || "?";
      emit(`교양 영역 ${domainIndex}/${domains.length} ${label} 조회 중…`);
      try {
        // 화면 교양 탭은 serchDiv=1. 비면 기본 검색으로 한 번 더 시도한다.
        let subjects = await client.searchSubjects({
          serchDiv: "1",
          cltrDomnCd: domain.code
        });
        if (subjects.length === 0) {
          subjects = await client.searchSubjects({ cltrDomnCd: domain.code });
        }
        const { tagged, added } = mergeCultureDomainIntoCatalog(
          allSubjects,
          fetchedKeys,
          domain,
          subjects,
          timetableProps
        );
        taggedTotal += tagged;
        addedTotal += added;
        emit(`교양 ${label}: ${subjects.length}건 (태깅 ${tagged}, 신규 ${added})`);
      } catch {
        emit(`교양 ${label}: 실패 또는 없음`);
      }
    }
    emit(`교양 영역 태깅 완료 (태깅 ${taggedTotal}, 신규 ${addedTotal})`);
  } else {
    emit("[3/4] 교양 영역 태깅 생략");
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(allSubjects, null, 2), "utf-8");

  emit("[4/4] latest.json 포인터 갱신…");
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
