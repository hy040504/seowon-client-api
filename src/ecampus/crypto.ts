import { createRequire } from "node:module";

/** e-campus 로그인 시 요구되는 부가 보안 옵션 */
export interface LoginEncryptOptions {
  /** 로그인의 기술적 사유 또는 목적 코드 */
  reason?: string;
  /** 내국인/외국인 구분 플래그 */
  foreigner?: string;
}

/** 서버에서 내려받은 레거시 JavaScript 암호화 라이브러리의 인터페이스 */
interface LegacyScrypto {
  /** 사용자 정보를 조합하여 서버 전송용 최종 암호화 패킷을 생성한다 */
  makeSendInfo(
    userId: string,
    encodedPassword: string,
    reason?: string,
    foreigner?: string
  ): string;
}

// ESM 환경에서 기존 CommonJS 기반의 복잡한 암호화 로직을 그대로 사용하기 위해 Require 생성
const require = createRequire(import.meta.url);
const legacyCrypto = require("./legacy/login-crypto.cjs") as LegacyScrypto;

/**
 * e-campus 서버의 자체 보안 규격에 맞는 'encryptData' 문자열을 생성한다.
 * @param {string} userId - 사용자 식별자 (학번/ID)
 * @param {string} password - 비밀번호 (평문)
 * @param {LoginEncryptOptions} [options={}] - 암호화 옵션
 * @returns {string} 서버 API 호출 시 encryptData 필드에 담을 암호문
 */
export function createLoginEncryptData(
  userId: string,
  password: string,
  options: LoginEncryptOptions = {}
): string {
  // 내부 라이브러리가 URI 인코딩된 비밀번호를 기대하므로 인코딩 후 전달
  return legacyCrypto.makeSendInfo(
    userId,
    encodeURIComponent(password),
    options.reason,
    options.foreigner
  );
}
