import "dotenv/config";
import { describe, expect, it } from "vitest";
import { createEcampusClient, createLoginEncryptData } from "../src/index";

describe("eCampus 실제 로그인", () => {
  it("encryptData를 출력하고 로그인 성공 시 쿠키를 출력한다", async () => {
    const userId = process.env.SEOWON_ID;
    const password = process.env.SEOWON_PASSWORD;

    if (!userId || !password) {
      throw new Error(".env에 SEOWON_ID와 SEOWON_PASSWORD를 설정해야 합니다.");
    }

    const encryptData = createLoginEncryptData(userId, password);
    console.log("로그인 encryptData:", encryptData);

    const client = createEcampusClient();
    const result = await client.loginWithEncryptData({ encryptData });

    console.log("로그인 응답 타입:", result.type);
    console.log("로그인 응답 데이터:", result.data);

    if (result.type !== "error") {
      const cookieString = await client.cookieJar.getCookieString(client.baseUrl);
      console.log("로그인 쿠키:", cookieString);
    }

    expect(result.type).not.toBe("error");
  }, 30_000);
});
