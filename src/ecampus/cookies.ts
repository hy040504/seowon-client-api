import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";

/**
 * 로컬 파일 시스템에서 저장된 쿠키 데이터를 읽어와서 세션을 복원한다.
 * @param {string} filePath - 로드할 JSON 파일 경로
 * @returns {CookieJar | undefined} 복원된 저장소 객체 (실패 시 undefined)
 */
export function loadCookieJarFromFile(filePath: string): CookieJar | undefined {
  try {
    const raw = readFileSync(filePath, "utf8");
    const serialized = JSON.parse(raw) as SerializedCookieJar;
    return CookieJar.deserializeSync(serialized);
  } catch {
    // 파일 부재 또는 손상 시 무시하고 신규 세션을 유도하기 위해 undefined 반환
    return undefined;
  }
}

/**
 * 현재 메모리에 유지 중인 세션 쿠키를 파일로 영구 저장한다.
 * 동기 writeFileSync 대신 비동기 writeFile을 사용해 이벤트 루프 블로킹을 줄인다.
 * @param {string} filePath - 저장할 파일 경로
 * @param {CookieJar} cookieJar - 직렬화할 쿠키 저장소
 * @returns {Promise<void>} 저장 완료 시 resolve
 */
export async function saveCookieJarToFile(filePath: string, cookieJar: CookieJar): Promise<void> {
  const serialized = cookieJar.serializeSync();
  if (!serialized) return;

  // 디버깅 편의성을 위해 들여쓰기가 적용된 JSON 포맷으로 기록
  await writeFile(filePath, JSON.stringify(serialized, null, 2), "utf8");
}

/**
 * 쿠키 파일 저장을 디바운스한다.
 * 연속 API 호출마다 디스크 쓰기가 쌓이지 않도록 지연 후 1회 저장한다.
 * 로그인 직후 등 확정이 필요하면 `flush()`를 호출한다.
 * @param debounceMs - 지연 시간(ms), 기본 500
 */
export function createDebouncedCookieSaver(debounceMs = 500): {
  schedule: (filePath: string, cookieJar: CookieJar) => void;
  flush: (filePath?: string, cookieJar?: CookieJar) => Promise<void>;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { filePath: string; cookieJar: CookieJar } | null = null;
  let chain: Promise<void> = Promise.resolve();

  const runSave = (filePath: string, cookieJar: CookieJar): void => {
    chain = chain
      .then(() => saveCookieJarToFile(filePath, cookieJar))
      .catch(() => {
        // 디스크 오류는 세션 사용을 막지 않는다. 다음 저장에서 재시도한다.
      });
  };

  return {
    schedule(filePath: string, cookieJar: CookieJar): void {
      pending = { filePath, cookieJar };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const snap = pending;
        pending = null;
        if (snap) runSave(snap.filePath, snap.cookieJar);
      }, debounceMs);
    },

    async flush(filePath?: string, cookieJar?: CookieJar): Promise<void> {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const target =
        filePath && cookieJar
          ? { filePath, cookieJar }
          : pending
            ? { ...pending }
            : null;
      pending = null;
      if (target) {
        chain = chain.then(() => saveCookieJarToFile(target.filePath, target.cookieJar));
      }
      await chain;
    }
  };
}

/**
 * 세션 유지 여부를 판단하기 위해 유효한(만료되지 않은) 쿠키가 존재하는지 검사한다.
 * @param {SerializedCookieJar | undefined} serialized - 직렬화된 데이터
 * @param {number} [now=Date.now()] - 기준 시각
 * @returns {boolean} 즉시 사용 가능한 유효 쿠키 존재 여부
 */
export function isSerializedCookieJarUsable(
  serialized: SerializedCookieJar | undefined,
  now: number = Date.now()
): boolean {
  if (!serialized?.cookies?.length) return false;

  return serialized.cookies.some((cookie) => {
    const expires = cookie.expires;
    // 세션 쿠키(null/Infinity)이거나 아직 기한이 남은 영구 쿠키인지 확인
    if (typeof expires !== "string" || expires === "Infinity") return true;
    const expiresAt = Date.parse(expires);
    return !Number.isNaN(expiresAt) && expiresAt > now;
  });
}

/**
 * 현재 활성화된 세션 저장소 내에 유효한 쿠키가 있는지 확인한다.
 * @param {CookieJar} cookieJar - 검사 대상
 * @param {number} [now=Date.now()] - 기준 시각
 * @returns {boolean} 유효 세션 유지 여부
 */
export function isCookieJarUsable(cookieJar: CookieJar, now: number = Date.now()): boolean {
  return isSerializedCookieJarUsable(cookieJar.serializeSync(), now);
}
