import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { CookieJar } from "tough-cookie";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve(process.cwd(), ".puppeteer-user-data");
const CAPTURE_DIR = path.resolve(process.cwd(), "captures/live");
const ECAMPUS_ORIGIN = "https://ecampus.seowon.ac.kr";
const COOKIE_EXPORT_FILE = path.resolve(process.cwd(), ".seowon-ecampus.cookies.json");

const RELEVANT_PATHS = [
  "scoreLect",
  "scoreHome",
  "viewStdScore",
  "viewStdScoreSumm",
  "viewStdScoreItem",
  "checkStdReshJoin",
  "cheeckStdReshJoin",
  "viewHaksaResearchInfo",
  "viewAtclForm",
  "classRoomAtclList",
  "atclList",
  "viewAtcl",
  "bbsLect",
  "materials",
  "성적",
  "강의자료"
];

/**
 * 캡처 결과 저장 디렉터리를 보장한다.
 * @param {string} dir - 생성할 디렉터리 경로
 * @returns {void} 반환값 없음
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * 파일명에 사용할 수 없는 문자를 제거한다.
 * @param {string} name - 원본 파일명
 * @returns {string} 저장 가능한 파일명
 */
function sanitize(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_").substring(0, 100);
}

/**
 * 현재 브라우저의 e-campus 쿠키를 tough-cookie 직렬화 형식으로 내보낸다.
 * @param {import("puppeteer-core").Page} page - 쿠키를 읽을 Puppeteer 페이지
 * @param {string} [outputPath=COOKIE_EXPORT_FILE] - 쿠키 저장 파일 경로
 * @returns {Promise<number>} 저장한 쿠키 개수
 */
async function exportEcampusCookies(page, outputPath = COOKIE_EXPORT_FILE) {
  const cookies = await page.cookies(ECAMPUS_ORIGIN);
  const jar = new CookieJar();

  for (const cookie of cookies) {
    const parts = [`${cookie.name}=${cookie.value}`, `Path=${cookie.path || "/"}`];
    if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
    if (cookie.secure) parts.push("Secure");
    if (cookie.httpOnly) parts.push("HttpOnly");
    if (cookie.expires && cookie.expires > 0) {
      parts.push(`Expires=${new Date(cookie.expires * 1000).toUTCString()}`);
    }

    jar.setCookieSync(parts.join("; "), ECAMPUS_ORIGIN);
  }

  fs.writeFileSync(outputPath, JSON.stringify(jar.serializeSync(), null, 2), "utf8");
  return cookies.length;
}

/**
 * 현재 페이지와 관련 요청/응답 데이터를 캡처 디렉터리에 저장한다.
 * @param {import("puppeteer-core").Page} page - 현재 브라우저 페이지
 * @param {string} url - 캡처 대상 URL
 * @param {object} request - Puppeteer Request 또는 평문 요청 정보
 * @param {import("puppeteer-core").HTTPResponse | null} response - Puppeteer 응답 객체
 * @param {string | Buffer | null} body - 응답 본문 preview
 * @returns {Promise<void>} 저장 완료 시 resolve
 */
async function saveCapture(page, url, request, response, body) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dirName = `${ts}_${sanitize(url.split("/").pop() || "page")}`;
  const dir = path.join(CAPTURE_DIR, dirName);
  ensureDir(dir);

  try {
    // 네트워크 응답만으로 놓치는 렌더링 후 DOM 상태를 함께 남긴다.
    try {
      const html = await page.content();
      fs.writeFileSync(path.join(dir, "page.html"), html, "utf8");
    } catch (e) {
      console.warn("page.html 저장 실패:", e.message);
    }

    // Puppeteer 버전과 타이밍에 따라 Request 메서드 접근 방식이 달라 방어적으로 읽는다.
    let reqInfo = { url: "", method: "", headers: {}, postData: null };
    try {
      /**
       * 요청 URL을 안전하게 읽는다.
       * @returns {string} 요청 URL
       */
      const getUrl = () => (typeof request.url === "function" ? request.url() : request.url || "");
      /**
       * 요청 method를 안전하게 읽는다.
       * @returns {string} 요청 method
       */
      const getMethod = () =>
        typeof request.method === "function" ? request.method() : request.method || "";
      /**
       * 요청 헤더를 안전하게 읽는다.
       * @returns {object} 요청 헤더 객체
       */
      const getHeaders = () =>
        typeof request.headers === "function" ? request.headers() : request.headers || {};
      /**
       * 요청 본문을 안전하게 읽는다.
       * @returns {string | null} 요청 본문 또는 null
       */
      const getPostData = () =>
        typeof request.postData === "function" ? request.postData() : request.postData || null;

      reqInfo = {
        url: getUrl(),
        method: getMethod(),
        headers: getHeaders(),
        postData: getPostData()
      };
    } catch (e) {
      console.warn("request info 추출 중 오류 (무시하고 계속):", e.message);
      reqInfo = {
        url: (request && request.url) || "",
        method: (request && request.method) || "",
        headers: (request && request.headers) || {},
        postData: (request && request.postData) || null
      };
    }
    fs.writeFileSync(path.join(dir, "request.json"), JSON.stringify(reqInfo, null, 2), "utf8");

    if (response) {
      const resInfo = {
        status: response.status(),
        headers: response.headers()
      };
      fs.writeFileSync(path.join(dir, "response.json"), JSON.stringify(resInfo, null, 2), "utf8");

      const cd = (response.headers()["content-disposition"] || "").toLowerCase();
      const ct = (response.headers()["content-type"] || "").toLowerCase();
      const isBinaryDownload =
        cd.includes("attachment") ||
        ct.includes("application/pdf") ||
        ct.includes("application/octet-stream") ||
        url.match(/\.(pdf|hwp|doc|zip|rar|mp4)$/i);

      if (isBinaryDownload) {
        try {
          const buffer = Buffer.from(await response.arrayBuffer());
          let filename = "downloaded-file.bin";
          const fnMatch = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
          if (fnMatch && fnMatch[1]) {
            try {
              filename = decodeURIComponent(fnMatch[1]);
            } catch {
              filename = fnMatch[1];
            }
          } else {
            const urlFn = url.split("/").pop().split("?")[0];
            if (urlFn && urlFn.includes(".")) filename = urlFn;
            else if (url.includes("/download/")) {
              const token = url.split("/download/")[1]?.split(/[?#]/)[0] || Date.now().toString();
              filename = `download_${token}.bin`;
            }
          }
          filename = sanitize(filename);
          const outPath = path.join(dir, filename);
          fs.writeFileSync(outPath, buffer);
          console.log(`[다운로드 저장됨] ${filename} (${buffer.length} bytes)`);
          body = `[binary downloaded file saved as ${filename}]`;
        } catch (e) {
          console.warn("바이너리 다운로드 저장 실패:", e.message);
          // 파일명 추출이 실패해도 재분석에 필요한 바이너리 흔적은 남긴다.
          try {
            const fb = path.join(dir, "downloaded-file.bin");
            const b2 = Buffer.from(await response.arrayBuffer().catch(() => Buffer.alloc(0)));
            if (b2.length > 0) fs.writeFileSync(fb, b2);
          } catch {}
        }
      }

      if (body && typeof body === "string" && !isBinaryDownload) {
        const ext = body.trim().startsWith("{") || body.trim().startsWith("[") ? ".json" : ".html";
        fs.writeFileSync(path.join(dir, `response-body${ext}`), body, "utf8");
      }
    }

    console.log(`[캡처됨] ${dirName}  (captures/live/${dirName}에 저장됨)`);
  } catch (e) {
    console.warn("saveCapture 전체 실패:", url, e.message);
  }
}

/**
 * 실제 Chrome 세션을 열어 e-campus 관련 트래픽을 라이브 캡처한다.
 * @returns {Promise<void>} 브라우저 세션 종료 시 resolve
 */
async function main() {
  console.log("=== 실시간 LMS 캡처 도구 (Puppeteer 실제 브라우저) ===");
  console.log("실제 Chrome 창을 엽니다 (DevTools의 Network 탭 포함).");
  console.log(
    "- 로그인 상태 유지를 위해 기존 프로필을 사용합니다 (깨끗한 세션은 FRESH_PROFILE=1 환경변수 사용)."
  );
  console.log("- 평소처럼 사용하세요: 로그인 → 과목 → 성적확인 또는 강의자료 → 상세 보기.");
  console.log(
    "- 스크립트가 관련 HTML과 요청을 자동으로 캡처합니다 (viewStdScore, viewAtclForm, 다운로드 등)."
  );
  console.log(
    '- 언제든 여기서 "save" + Enter를 입력하면 현재 페이지와 최근 트래픽을 강제로 저장합니다.'
  );
  console.log(
    `- "cookies" + Enter를 입력하면 현재 브라우저 세션 쿠키를 ${path.basename(
      COOKIE_EXPORT_FILE
    )}에 저장합니다.`
  );
  console.log("- Chrome 창을 닫거나 여기서 Ctrl+C를 누르면 종료됩니다.");
  console.log("");
  console.log(
    "팁: 스크립트가 자동으로 오래된 SingletonLock을 정리하고 (Windows에서 흔한 문제), 필요 시 새 프로필로 전환합니다 (FRESH_PROFILE=1)."
  );
  console.log("");

  ensureDir(CAPTURE_DIR);
  ensureDir(PROFILE_DIR);

  // 기존 Chrome 프로필 잠금이 잦아 FRESH_PROFILE로 즉시 우회할 수 있게 한다.
  let userDataDir = PROFILE_DIR;
  if (process.env.FRESH_PROFILE) {
    userDataDir = path.join(PROFILE_DIR, `fresh-${Date.now()}`);
    console.log("새 프로필 디렉토리 사용 중:", userDataDir);
  } else {
    console.log("기존 프로필 디렉토리 사용 중:", userDataDir);
    console.log("(Windows에서 오래된 SingletonLock을 자동으로 정리하려고 시도합니다.)");

    // Windows에서 비정상 종료 후 남는 잠금 파일 때문에 재실행이 막히는 경우가 잦다.
    const lockFile = path.join(userDataDir, "SingletonLock");
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log("오래된 SingletonLock을 제거했습니다. 기존 프로필로 실행을 시도합니다...");
      } catch (e) {
        console.warn(
          "SingletonLock 파일을 제거할 수 없습니다. 실행 실패 시 새 프로필로 전환합니다."
        );
      }
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false,
      devtools: true,
      userDataDir: userDataDir,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--start-maximized"
      ],
      defaultViewport: null
    });
  } catch (launchErr) {
    console.error("브라우저 실행 실패:", launchErr.message);

    if (
      (launchErr.message.includes("already running") ||
        launchErr.message.includes("userDataDir")) &&
      !process.env.FRESH_PROFILE
    ) {
      console.error(
        "\n기존 프로필이 잠겨 있습니다. 이번 실행에서는 자동으로 새 프로필로 전환합니다..."
      );
      userDataDir = path.join(PROFILE_DIR, `fresh-${Date.now()}`);
      try {
        browser = await puppeteer.launch({
          executablePath: CHROME_PATH,
          headless: false,
          devtools: true,
          userDataDir: userDataDir,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--start-maximized"
          ],
          defaultViewport: null
        });
        console.log("새 프로필로 성공적으로 실행되었습니다:", userDataDir);
      } catch (retryErr) {
        console.error("새 프로필 전환도 실패했습니다:", retryErr.message);
        console.error("\n모든 Chrome 창을 수동으로 닫은 후 다시 시도해주세요.");
        console.error("또는 강제로 새 프로필 사용: FRESH_PROFILE=1 npm run capture:live");
        process.exit(1);
      }
    } else {
      if (
        launchErr.message.includes("already running") ||
        launchErr.message.includes("userDataDir")
      ) {
        console.error(
          "\n팁: 해당 프로필을 사용하는 모든 Chrome 창을 닫거나 다음 명령으로 실행하세요:"
        );
        console.error("  FRESH_PROFILE=1 npm run capture:live");
        console.error("\n또는 수동으로 잠금 파일을 삭제하세요:");
        console.error(`  ${path.join(userDataDir, "SingletonLock")}`);
      }
      process.exit(1);
    }
  }

  const page = await browser.newPage();

  // 일부 사이트가 webdriver 플래그만 보고 자동화 세션을 차단하는 경우가 있어 제거한다.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const capturedRequests = new Map();

  page.on("request", (req) => {
    capturedRequests.set(req, {
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      postData: req.postData()
    });
  });

  page.on("response", async (res) => {
    const url = res.url();
    let isRelevant = RELEVANT_PATHS.some((p) => url.includes(p));

    // 첨부파일은 URL 경로가 다양해 Content-Type과 Content-Disposition도 함께 본다.
    const contentDisp = (res.headers()["content-disposition"] || "").toLowerCase();
    const contentType = (res.headers()["content-type"] || "").toLowerCase();
    if (
      contentDisp.includes("attachment") ||
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream") ||
      url.match(/\.(pdf|hwp|doc|zip|rar|mp4|jpg|png)$/i)
    ) {
      isRelevant = true;
    }

    if (!isRelevant) return;

    try {
      const req = res.request();
      const stored = capturedRequests.get(req) || {};

      // Puppeteer Request 객체는 응답 처리 시점에 메서드 접근이 실패할 수 있어 값으로 즉시 고정한다.
      const requestData = {
        url: stored.url || (typeof req.url === "function" ? req.url() : req.url || ""),
        method:
          stored.method || (typeof req.method === "function" ? req.method() : req.method || ""),
        headers:
          stored.headers || (typeof req.headers === "function" ? req.headers() : req.headers || {}),
        postData:
          stored.postData ||
          (typeof req.postData === "function" ? req.postData() : req.postData || null)
      };

      let body = "";
      const contentType = res.headers()["content-type"] || "";

      if (
        contentType.includes("text") ||
        contentType.includes("json") ||
        contentType.includes("html")
      ) {
        body = await res.text().catch(() => "");
      }

      await saveCapture(page, url, requestData, res, body);
    } catch (e) {
      console.warn("캡처 오류:", url, e.message);
    }
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on("line", async (line) => {
    if (line.trim().toLowerCase() === "save") {
      try {
        const url = page.url();
        const html = await page.content();
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const dirName = `${ts}_manual_${sanitize(url.split("/").pop() || "page")}`;
        const dir = path.join(CAPTURE_DIR, dirName);
        ensureDir(dir);
        fs.writeFileSync(path.join(dir, "page.html"), html, "utf8");
        console.log(`[수동 저장] ${dirName}`);
      } catch (e) {
        console.error("수동 저장 실패:", e.message);
      }
    } else if (line.trim().toLowerCase() === "exit") {
      await browser.close();
      rl.close();
      process.exit(0);
    } else if (line.trim().toLowerCase() === "cookies") {
      try {
        const count = await exportEcampusCookies(page);
        console.log(`[쿠키 저장] e-campus 쿠키 ${count}개를 ${COOKIE_EXPORT_FILE}에 저장했습니다.`);
      } catch (e) {
        console.error("쿠키 저장 실패:", e.message);
      }
    } else {
      console.log('명령어: "save" (현재 페이지 저장), "cookies" (세션 쿠키 저장), "exit"');
    }
  });

  await page.goto("https://ecampus.seowon.ac.kr/", { waitUntil: "networkidle2" }).catch(() => {});

  console.log("\n브라우저가 열렸습니다. 사이트를 정상적으로 사용하세요.\n");

  browser.on("disconnected", () => {
    console.log("브라우저가 닫혔습니다. 캡처 도구를 종료합니다.");
    rl.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("치명적 오류:", err);
  process.exit(1);
});
