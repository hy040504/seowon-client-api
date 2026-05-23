import { readFileSync, writeFileSync } from "node:fs";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";

/**
 * 로컬 파일 시스템에서 저장된 쿠키 데이터를 읽어와서 CookieJar를 복원한다.
 * @param {string} filePath - 로드할 JSON 파일의 전체 경로
 * @returns {CookieJar | undefined} 복원된 저장소 객체 (파일이 없거나 손상된 경우 undefined)
 */
export function loadCookieJarFromFile(filePath: string): CookieJar | undefined {
  try {
    const raw = readFileSync(filePath, "utf8");
    const serialized = JSON.parse(raw) as SerializedCookieJar;
    return CookieJar.deserializeSync(serialized);
  } catch {
    // 파일이 없거나 JSON 포맷이 틀린 경우 세션을 새로 시작하도록 유도
    return undefined;
  }
}

/**
 * 현재 메모리에 있는 CookieJar 세션 데이터를 파일로 직렬화하여 저장한다.
 * @param {string} filePath - 저장할 대상 경로
 * @param {CookieJar} cookieJar - 직렬화할 쿠키 저장소 객체
 */
export function saveCookieJarToFile(filePath: string, cookieJar: CookieJar): void {
  const serialized = cookieJar.serializeSync();
  if (!serialized) return;

  // 가독성을 위해 들여쓰기 처리된 JSON으로 저장
  writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf8");
}

/**
 * 직렬화된 쿠키 목록 중에 만료되지 않고 사용 가능한 쿠키가 하나라도 존재하는지 검사한다.
 * 세션 유지 여부를 판단하는 저비용 검사 도구로 사용된다.
 * @param {SerializedCookieJar | undefined} serialized - 직렬화된 데이터
 * @param {number} [now=Date.now()] - 기준 시각
 * @returns {boolean} 유효한 쿠키가 존재하면 true
 */
export function isSerializedCookieJarUsable(serialized: SerializedCookieJar | undefined, now: number = Date.now()): boolean {
  if (!serialized?.cookies?.length) return false;

  return serialized.cookies.some((cookie) => {
    const expires = cookie.expires;
    // 세션 쿠키 또는 영구 쿠키 중 아직 만료되지 않은 항목 탐색
    if (typeof expires !== "string" || expires === "Infinity") return true;
    const expiresAt = Date.parse(expires);
    return !Number.isNaN(expiresAt) && expiresAt > now;
  });
}

/**
 * 현재 CookieJar 저장소 내에 활성화된 유효 쿠키가 있는지 실시간으로 확인한다.
 * @param {CookieJar} cookieJar - 검사할 저장소
 * @param {number} [now=Date.now()] - 기준 시각
 * @returns {boolean} 유효 세션 존재 여부
 */
export function isCookieJarUsable(cookieJar: CookieJar, now: number = Date.now()): boolean {
  return isSerializedCookieJarUsable(cookieJar.serializeSync(), now);
}
