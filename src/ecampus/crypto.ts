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
