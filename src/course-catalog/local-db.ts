/**
 * db-generator 가 만든 로컬 개설 과목 JSON 카탈로그 로더/검색.
 *
 * 파일명이 날짜마다 바뀌어도:
 * 1) SEOWON_COURSE_DB 환경변수
 * 2) output/latest.json 포인터
 * 3) output 내 카탈로그 JSON mtime 최신
 * 순으로 자동 감지한다.
 */

import fs from "node:fs/promises";
import path from "node:path";

/** 기본 출력 디렉터리 (프로젝트 루트 기준) */
export const COURSE_DB_OUTPUT_REL = path.join("db-generator", "output");

/** 최신 DB 가리키는 안정 포인터 파일명 */
export const COURSE_DB_LATEST_POINTER = "latest.json";

/** 전체 DB 경로를 직접 지정할 때 쓰는 환경변수 */
export const COURSE_DB_ENV_PATH = "SEOWON_COURSE_DB";

/**
 * 카탈로그로 취급할 파일명 휴리스틱.
 * generate.ts 기본 패턴: `{학년도}학년도 {학기}학기 전체 강의 목록 DB ({YYYY-MM-DD}).json`
 */
const CATALOG_NAME_HINT =
  /강의\s*목록\s*DB|전체\s*강의|all-courses|courses-db/i;

/** latest.json / 메타 전용 파일은 카탈로그 목록에서 제외 */
const POINTER_OR_META_NAMES = new Set([
  COURSE_DB_LATEST_POINTER.toLowerCase(),
  "manifest.json",
  "index.json"
]);

/** generate 가 쓰는 latest.json 스키마 */
export interface CourseDbPointer {
  /** 실제 카탈로그 파일명 (output 디렉터리 기준) */
  fileName: string;
  /** ISO 생성 시각 */
  generatedAt: string;
  /** 과목 건수 */
  count: number;
  /** 학년도 */
  syy?: string;
  /** 학기 코드 */
  smtCd?: string;
  /** 학기 표시명 (1, 2, 여름, 겨울) */
  smtName?: string;
  /** 선택: 절대 경로 스냅샷 (이동 시 무시하고 fileName 우선) */
  absolutePath?: string;
  /** 스키마 버전 */
  version?: number;
}

/** 디스크에서 고른 카탈로그 파일 참조 */
export interface CourseDbRef {
  filePath: string;
  fileName: string;
  mtimeMs: number;
  sizeBytes: number;
  source: "env" | "pointer" | "mtime" | "explicit";
  pointer?: CourseDbPointer;
}

/** 로컬 JSON 한 건 (SugangSubject 호환 + generate 부가 필드) */
export interface LocalCourseRecord {
  subjtCd: string;
  corseDvclsNo: string;
  subjtNm?: string;
  cmpsjDivCd?: string;
  cmpsjCdt?: string;
  timtbNm?: string;
  chrgInstrEmpnm?: string;
  estblDeprtNm?: string;
  slesLessnItem?: string;
  _category?: string;
  [key: string]: unknown;
}

export interface ResolveCourseDbOptions {
  /** 기본: cwd/db-generator/output */
  outputDir?: string;
  /** 명시 경로 (플랜/CLI 인자). 최우선 */
  explicitPath?: string;
  /** false 면 SEOWON_COURSE_DB 무시 */
  useEnv?: boolean;
  /** process.cwd() 대체 */
  cwd?: string;
}

export interface LoadCourseDbResult {
  ref: CourseDbRef;
  courses: LocalCourseRecord[];
}

/**
 * 기본 output 디렉터리 절대 경로
 */
export function defaultCourseDbOutputDir(cwd = process.cwd()): string {
  return path.resolve(cwd, COURSE_DB_OUTPUT_REL);
}

/**
 * latest.json 포인터를 기록한다 (generate 직후 호출)
 */
export async function writeCourseDbPointer(
  outputDir: string,
  pointer: CourseDbPointer
): Promise<string> {
  const payload: CourseDbPointer = {
    version: 1,
    ...pointer,
    generatedAt: pointer.generatedAt || new Date().toISOString()
  };
  const pointerPath = path.join(outputDir, COURSE_DB_LATEST_POINTER);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(pointerPath, JSON.stringify(payload, null, 2), "utf-8");
  return pointerPath;
}

/**
 * 포인터 파일 읽기. 없거나 깨지면 null
 */
export async function readCourseDbPointer(
  outputDir: string
): Promise<CourseDbPointer | null> {
  const pointerPath = path.join(outputDir, COURSE_DB_LATEST_POINTER);
  try {
    const raw = await fs.readFile(pointerPath, "utf-8");
    const data = JSON.parse(raw) as CourseDbPointer;
    if (!data?.fileName || typeof data.fileName !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * output 디렉터리 안 카탈로그 JSON 목록 (포인터 제외, mtime 내림차순)
 */
export async function listCourseDbFiles(
  outputDir?: string,
  cwd = process.cwd()
): Promise<CourseDbRef[]> {
  const dir = outputDir ?? defaultCourseDbOutputDir(cwd);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }

  const refs: CourseDbRef[] = [];
  for (const name of names) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    if (POINTER_OR_META_NAMES.has(name.toLowerCase())) continue;

    const filePath = path.join(dir, name);
    let st;
    try {
      st = await fs.stat(filePath);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    refs.push({
      filePath,
      fileName: name,
      mtimeMs: st.mtimeMs,
      sizeBytes: st.size,
      source: "mtime"
    });
  }

  // 이름 휴리스틱 매칭 파일을 앞에, 그다음 mtime
  refs.sort((a, b) => {
    const score = (r: CourseDbRef) =>
      (CATALOG_NAME_HINT.test(r.fileName) || r.fileName.includes("DB") ? 2 : 0) +
      (r.fileName.includes("전체") ? 1 : 0);
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return b.mtimeMs - a.mtimeMs;
  });

  return refs;
}

/**
 * 최신(또는 지정) 카탈로그 파일 경로를 해석한다.
 * @throws 파일을 하나도 못 찾으면 Error
 */
export async function resolveLatestCourseDb(
  options: ResolveCourseDbOptions = {}
): Promise<CourseDbRef> {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = options.outputDir ?? defaultCourseDbOutputDir(cwd);

  // 1) 명시 경로
  if (options.explicitPath?.trim()) {
    return refFromExistingFile(path.resolve(cwd, options.explicitPath.trim()), "explicit");
  }

  // 2) 환경변수
  if (options.useEnv !== false) {
    const envPath = process.env[COURSE_DB_ENV_PATH]?.trim();
    if (envPath) {
      return refFromExistingFile(path.resolve(cwd, envPath), "env");
    }
  }

  // 3) latest.json 포인터
  const pointer = await readCourseDbPointer(outputDir);
  if (pointer?.fileName) {
    const candidate = path.join(outputDir, pointer.fileName);
    try {
      const st = await fs.stat(candidate);
      if (st.isFile()) {
        return {
          filePath: candidate,
          fileName: pointer.fileName,
          mtimeMs: st.mtimeMs,
          sizeBytes: st.size,
          source: "pointer",
          pointer
        };
      }
    } catch {
      // 포인터가 깨졌으면 mtime 폴백
    }
    // absolutePath 백업
    if (pointer.absolutePath) {
      try {
        const st = await fs.stat(pointer.absolutePath);
        if (st.isFile()) {
          return {
            filePath: pointer.absolutePath,
            fileName: path.basename(pointer.absolutePath),
            mtimeMs: st.mtimeMs,
            sizeBytes: st.size,
            source: "pointer",
            pointer
          };
        }
      } catch {
        /* fall through */
      }
    }
  }

  // 4) 디렉터리 스캔 mtime
  const listed = await listCourseDbFiles(outputDir, cwd);
  if (listed.length) {
    return listed[0]!;
  }

  throw new Error(
    `로컬 과목 DB를 찾을 수 없습니다. 다음을 확인하세요:\n` +
      `  - npm run generate:db 로 ${COURSE_DB_OUTPUT_REL} 생성\n` +
      `  - 또는 ${COURSE_DB_ENV_PATH} 에 JSON 경로 지정\n` +
      `  - 검색 경로: ${outputDir}`
  );
}

/**
 * 카탈로그 JSON 로드
 */
export async function loadCourseDbFile(filePath: string): Promise<LocalCourseRecord[]> {
  const raw = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error(`카탈로그 JSON 형식이 배열이 아닙니다: ${filePath}`);
  }
  return data as LocalCourseRecord[];
}

/**
 * 최신 DB resolve + load
 */
export async function loadLatestCourseDb(
  options: ResolveCourseDbOptions = {}
): Promise<LoadCourseDbResult> {
  const ref = await resolveLatestCourseDb(options);
  const courses = await loadCourseDbFile(ref.filePath);
  return { ref, courses };
}

/**
 * 키워드 로컬 검색 (과목명/코드/분반/교수/학과/시간표)
 */
export function searchLocalCourses(
  courses: LocalCourseRecord[],
  keyword: string
): LocalCourseRecord[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return courses.slice();

  // 코드-분반 형태 (예: 527087-02, 527087 02)
  const codeDv = q.match(/^([a-z0-9]+)[\s\-_/]+([a-z0-9]+)$/i);

  return courses.filter((c) => {
    if (codeDv) {
      const cd = (c.subjtCd || "").toLowerCase();
      const dv = (c.corseDvclsNo || "").toLowerCase();
      if (cd === codeDv[1]!.toLowerCase() && dv === codeDv[2]!.toLowerCase()) {
        return true;
      }
    }
    const hay = [
      c.subjtCd,
      c.corseDvclsNo,
      c.subjtNm,
      c.chrgInstrEmpnm,
      c.estblDeprtNm,
      c.timtbNm,
      c.slesLessnItem,
      c._category,
      c.cmpsjDivCd
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

/**
 * 포인터/경로 해석 요약 문자열 (로그용)
 */
export function formatCourseDbRef(ref: CourseDbRef): string {
  const when = ref.pointer?.generatedAt
    ? ` · 생성 ${ref.pointer.generatedAt}`
    : ` · mtime ${new Date(ref.mtimeMs).toISOString()}`;
  const count =
    typeof ref.pointer?.count === "number" ? ` · ${ref.pointer.count}건` : "";
  const term =
    ref.pointer?.syy && ref.pointer?.smtName
      ? ` · ${ref.pointer.syy}-${ref.pointer.smtName}학기`
      : "";
  return `${ref.fileName} [${ref.source}]${term}${count}${when}`;
}

async function refFromExistingFile(
  filePath: string,
  source: CourseDbRef["source"]
): Promise<CourseDbRef> {
  try {
    const st = await fs.stat(filePath);
    if (!st.isFile()) {
      throw new Error(`파일이 아닙니다: ${filePath}`);
    }
    return {
      filePath,
      fileName: path.basename(filePath),
      mtimeMs: st.mtimeMs,
      sizeBytes: st.size,
      source
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`과목 DB 경로를 열 수 없습니다 (${source}): ${filePath} — ${msg}`, {
      cause: err
    });
  }
}
