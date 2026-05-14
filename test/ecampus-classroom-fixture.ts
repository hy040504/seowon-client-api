import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 논리회로 강의실 패킷 SAZ 파일을 찾고 읽는다
 * @returns {Buffer} SAZ 파일 바이너리
 * @throws {Error} 패킷 폴더 또는 SAZ 파일을 찾지 못한 경우
 */
export function readLogicCircuitSaz(): Buffer {
  const filesRoot = join(process.cwd(), "files");
  const packetDirectory = findDirectory(filesRoot, (name) => name.includes("packet"));

  if (!packetDirectory) {
    throw new Error("논리회로 강의실 패킷 폴더를 찾을 수 없습니다.");
  }

  const sazFile = findFile(packetDirectory, (name) => name.endsWith(".saz"));

  if (!sazFile) {
    throw new Error("논리회로 강의실 SAZ 패킷 파일을 찾을 수 없습니다.");
  }

  return readFileSync(sazFile);
}

/**
 * 디렉터리 트리에서 조건에 맞는 폴더를 찾는다
 * @param {string} directory - 탐색할 기준 디렉터리
 * @param {(directoryName: string) => boolean} predicate - 폴더 이름 판별 함수
 * @returns {string | undefined} 찾은 폴더 경로
 */
function findDirectory(
  directory: string,
  predicate: (directoryName: string) => boolean
): string | undefined {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory() && predicate(entry.name)) {
      return entryPath;
    }

    if (entry.isDirectory()) {
      const found = findDirectory(entryPath, predicate);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

/**
 * 디렉터리 트리에서 조건에 맞는 파일을 찾는다
 * @param {string} directory - 탐색할 기준 디렉터리
 * @param {(fileName: string) => boolean} predicate - 파일 이름 판별 함수
 * @returns {string | undefined} 찾은 파일 경로
 */
function findFile(directory: string, predicate: (fileName: string) => boolean): string | undefined {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      const found = findFile(entryPath, predicate);
      if (found) {
        return found;
      }
    } else if (predicate(entry.name)) {
      return entryPath;
    }
  }

  return undefined;
}
