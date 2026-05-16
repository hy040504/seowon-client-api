/**
 * 텍스트의 중복 공백을 하나로 정리한다
 * @param {string} value - 정리할 문자열
 * @returns {string} 공백이 정리된 문자열
 */
export function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * 상대 경로를 절대 URL로 변환한다
 * @param {string} pathOrUrl - 상대 경로나 절대 URL
 * @param {string} baseUrl - 기준 URL
 * @returns {string} 절대 URL 문자열
 */
export function absoluteUrl(pathOrUrl: string, baseUrl: string): string {
  return new URL(pathOrUrl, baseUrl).toString();
}

/**
 * HTTP 메시지를 헤더와 본문으로 나눈다
 * @param {string} message - 전체 HTTP 메시지
 * @returns {[string, string]} 헤더와 본문
 */
export function splitHttpMessage(message: string): [string, string] {
  const crlfIndex = message.indexOf("\r\n\r\n");
  if (crlfIndex >= 0) {
    return [message.slice(0, crlfIndex), message.slice(crlfIndex + 4)];
  }

  const lfIndex = message.indexOf("\n\n");
  if (lfIndex >= 0) {
    return [message.slice(0, lfIndex), message.slice(lfIndex + 2)];
  }

  return [message, ""];
}

/**
 * form-urlencoded 본문을 객체로 변환한다
 * @param {string} body - form body 문자열
 * @returns {Record<string, string>} key/value 객체
 */
export function parseFormBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body.trim());
  const result: Record<string, string> = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
}

/**
 * JavaScript 함수 호출 문자열에서 인자를 분리한다
 * @param {string} source - 예: javascript:viewAtcl('A','B')
 * @returns {string[]} 추출된 인자 배열
 */
export function parseFunctionArguments(source: string): string[] {
  const match = source.match(/\((.*)\)/);
  if (!match?.[1]) {
    return [];
  }

  const args: string[] = [];
  const regex = /'([^']*)'|"([^"]*)"|([^,\s)]+)/g;
  let arg: RegExpExecArray | null;

  while ((arg = regex.exec(match[1]))) {
    args.push(arg[1] ?? arg[2] ?? arg[3] ?? "");
  }

  return args;
}

/**
 * 정규식 특수문자를 이스케이프한다
 * @param {string} value - 원본 문자열
 * @returns {string} 정규식에 안전한 문자열
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
