import { createRequire } from "node:module";

export interface LoginEncryptOptions {
  reason?: string;
  foreigner?: string;
}

interface LegacyScrypto {
  makeSendInfo(
    userId: string,
    encodedPassword: string,
    reason?: string,
    foreigner?: string
  ): string;
}

const require = createRequire(import.meta.url);
const legacyCrypto = require("./legacy/login-crypto.cjs") as LegacyScrypto;

/**
 * e-campus 로그인용 encryptData 문자열을 생성한다
 * @param {string} userId - 로그인에 사용할 학번 또는 아이디
 * @param {string} password - 로그인에 사용할 비밀번호
 * @param {LoginEncryptOptions} options - 추가 암호화 옵션
 * @returns {string} 서버 전송용 encryptData 문자열
 */
export function createLoginEncryptData(
  userId: string,
  password: string,
  options: LoginEncryptOptions = {}
): string {
  return legacyCrypto.makeSendInfo(
    userId,
    encodeURIComponent(password),
    options.reason,
    options.foreigner
  );
}
