import { createRequire } from "node:module";

/** 로그인 시 사용되는 보안 옵션 */
export interface LoginEncryptOptions {
  /** 로그인 사유 코드 */
  reason?: string;
  /** 외국인 여부 플래그 */
  foreigner?: string;
}

/** 레거시 CommonJS 암호화 모듈 인터페이스 정의 */
interface LegacyScrypto {
  /** 서버 전송용 복합 정보를 생성한다 */
  makeSendInfo(
    userId: string,
    encodedPassword: string,
    reason?: string,
    foreigner?: string
  ): string;
}

// ESM 환경에서 기존 CJS 스크립트 파일을 동적으로 불러오기 위해 createRequire 사용
const require = createRequire(import.meta.url);
const legacyCrypto = require("./legacy/login-crypto.cjs") as LegacyScrypto;

/**
 * 서원대 e-campus 서버가 로그인 인증 시 요구하는 암호화된 'encryptData' 패킷을 생성한다.
 * 내부적으로 레거시 JavaScript 암호화 라이브러리를 사용한다.
 * @param {string} userId - 사용자 ID (학번)
 * @param {string} password - 일반 텍스트 비밀번호
 * @param {LoginEncryptOptions} [options={}] - 부가 보안 옵션
 * @returns {string} 서버 API의 encryptData 파라미터로 전달할 최종 문자열
 */
export function createLoginEncryptData(
  userId: string,
  password: string,
  options: LoginEncryptOptions = {}
): string {
  // 서버는 비밀번호를 URL 인코딩된 상태에서 다시 암호화 모듈에 넣기를 기대함
  return legacyCrypto.makeSendInfo(
    userId,
    encodeURIComponent(password),
    options.reason,
    options.foreigner
  );
}
