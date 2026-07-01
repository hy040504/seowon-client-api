import { readFileSync, writeFileSync } from "node:fs";
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
 * @param {string} filePath - 저장할 파일 경로
 * @param {CookieJar} cookieJar - 직렬화할 쿠키 저장소
 * @returns {void} 반환값 없음
 */
export function saveCookieJarToFile(filePath: string, cookieJar: CookieJar): void {
  const serialized = cookieJar.serializeSync();
  if (!serialized) return;

  // 디버깅 편의성을 위해 들여쓰기가 적용된 JSON 포맷으로 기록
  writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf8");
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
