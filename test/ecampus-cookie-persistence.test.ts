import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Cookie, CookieJar } from "tough-cookie";
import { describe, expect, it } from "vitest";
import {
  createEcampusClient,
  isCookieJarUsable,
  isSerializedCookieJarUsable,
  loadCookieJarFromFile,
  saveCookieJarToFile
} from "../src/index";

describe("쿠키 저장소", () => {
  it("쿠키 파일을 저장하고 다시 불러올 수 있다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seowon-cookie-"));
    const filePath = join(dir, "cookie.json");
    try {
      const jar = new CookieJar();
      await jar.setCookie(
        Cookie.parse("session=live; Domain=ecampus.seowon.ac.kr; Path=/; Expires=Tue, 21 Oct 2099 00:00:00 GMT")!,
        "https://ecampus.seowon.ac.kr"
      );

      saveCookieJarToFile(filePath, jar);

      const loaded = loadCookieJarFromFile(filePath);
      expect(loaded).toBeDefined();
      expect(loaded && isCookieJarUsable(loaded)).toBe(true);
      expect(isSerializedCookieJarUsable(loaded?.serializeSync())).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("만료된 쿠키 파일은 유효하지 않은 것으로 판단한다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seowon-cookie-"));
    const filePath = join(dir, "cookie.json");
    try {
      const jar = new CookieJar();
      await jar.setCookie(
        Cookie.parse("session=dead; Domain=ecampus.seowon.ac.kr; Path=/; Expires=Tue, 21 Oct 2000 00:00:00 GMT")!,
        "https://ecampus.seowon.ac.kr"
      );

      saveCookieJarToFile(filePath, jar);

      const loaded = loadCookieJarFromFile(filePath);
      expect(loaded).toBeDefined();
      expect(isCookieJarUsable(loaded!)).toBe(false);
      expect(isSerializedCookieJarUsable(loaded?.serializeSync())).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("자동 재로그인", () => {
  it("쿠키가 만료되면 저장된 계정 정보로 다시 로그인한다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seowon-cookie-"));
    const filePath = join(dir, "cookie.json");
    try {
      const expiredJar = new CookieJar();
      await expiredJar.setCookie(
        Cookie.parse("session=dead; Domain=ecampus.seowon.ac.kr; Path=/; Expires=Tue, 21 Oct 2000 00:00:00 GMT")!,
        "https://ecampus.seowon.ac.kr"
      );
      saveCookieJarToFile(filePath, expiredJar);

      const http = {
        get: async (path: string) => {
          expect(path).toBe("/home/mainHome/Form/main");
          return { data: "<html></html>" };
        }
      };

      const client = createEcampusClient({
        axios: http as never,
        cookieFilePath: filePath,
        loginCredentials: {
          userId: "202612345",
          password: "password"
        }
      });

      let loginCount = 0;
      client.login = (async (credentials) => {
        loginCount += 1;
        expect(credentials.userId).toBe("202612345");
        await client.cookieJar.setCookie(
          Cookie.parse("session=renewed; Domain=ecampus.seowon.ac.kr; Path=/; Expires=Tue, 21 Oct 2099 00:00:00 GMT")!,
          client.baseUrl
        );
        return {
          type: "reload",
          data: {}
        };
      }) as typeof client.login;

      await client.getMainPageHtml();

      expect(loginCount).toBe(1);
      expect(isCookieJarUsable(client.cookieJar)).toBe(true);
      expect(isSerializedCookieJarUsable(loadCookieJarFromFile(filePath)?.serializeSync())).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
