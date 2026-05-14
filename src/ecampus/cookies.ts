import { readFileSync, writeFileSync } from "node:fs";
import { CookieJar, type SerializedCookieJar } from "tough-cookie";

/**
 * 쿠키 파일에서 CookieJar를 불러온다
 * @param {string} filePath - 쿠키를 저장한 JSON 파일 경로
 * @returns {CookieJar | undefined} 불러온 CookieJar 또는 파일이 없을 때 undefined
 */
export function loadCookieJarFromFile(filePath: string): CookieJar | undefined {
  try {
    const raw = readFileSync(filePath, "utf8");
    const serialized = JSON.parse(raw) as SerializedCookieJar;
    return CookieJar.deserializeSync(serialized);
  } catch {
    return undefined;
  }
}

/**
 * CookieJar를 JSON 파일로 저장한다
 * @param {string} filePath - 저장할 파일 경로
 * @param {CookieJar} cookieJar - 저장할 쿠키 저장소
 * @returns {void} 반환값 없음
 */
export function saveCookieJarToFile(filePath: string, cookieJar: CookieJar): void {
  const serialized = cookieJar.serializeSync();
  if (!serialized) {
    return;
  }

  writeFileSync(filePath, JSON.stringify(serialized, null, 2), "utf8");
}

/**
 * 직렬화된 쿠키 저장소에 아직 쓸 수 있는 쿠키가 있는지 확인한다
 * @param {SerializedCookieJar | undefined} serialized - 직렬화된 CookieJar
 * @param {number} now - 현재 시각(밀리초)
 * @returns {boolean} 사용할 수 있는 쿠키가 있으면 true
 */
export function isSerializedCookieJarUsable(
  serialized: SerializedCookieJar | undefined,
  now: number = Date.now()
): boolean {
  if (!serialized?.cookies?.length) {
    return false;
  }

  return serialized.cookies.some((cookie) => {
    const expires = cookie.expires;
    if (typeof expires !== "string" || expires === "Infinity") {
      return true;
    }

    const expiresAt = Date.parse(expires);
    if (Number.isNaN(expiresAt)) {
      return true;
    }

    return expiresAt > now;
  });
}

/**
 * CookieJar가 아직 유효한 쿠키를 담고 있는지 확인한다
 * @param {CookieJar} cookieJar - 확인할 쿠키 저장소
 * @param {number} now - 현재 시각(밀리초)
 * @returns {boolean} 사용할 수 있는 쿠키가 있으면 true
 */
export function isCookieJarUsable(cookieJar: CookieJar, now: number = Date.now()): boolean {
  return isSerializedCookieJarUsable(cookieJar.serializeSync(), now);
}
