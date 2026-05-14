import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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
