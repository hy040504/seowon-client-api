import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFILE_DIR = path.resolve(process.cwd(), ".puppeteer-user-data");
const CAPTURE_DIR = path.resolve(process.cwd(), "captures/live");

const RELEVANT_PATHS = [
  "viewAtclForm",
  "classRoomAtclList",
  "atclList",
  "viewAtcl",
  "bbsLect",
  "materials",
  "강의자료"
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitize(name) {
  return name.replace(/[\/\\:*?"<>|]/g, "_").substring(0, 100);
}

async function saveCapture(page, url, request, response, body) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dirName = `${ts}_${sanitize(url.split("/").pop() || "page")}`;
  const dir = path.join(CAPTURE_DIR, dirName);
  ensureDir(dir);

  try {
    // Save current page HTML
    try {
      const html = await page.content();
      fs.writeFileSync(path.join(dir, "page.html"), html, "utf8");
    } catch (e) {
      console.warn("page.html 저장 실패:", e.message);
    }

    // Save request info - handle both puppeteer Request and plain object (very defensive)
    let reqInfo = { url: "", method: "", headers: {}, postData: null };
    try {
      const getUrl = () => (typeof request.url === "function" ? request.url() : request.url || "");
      const getMethod = () =>
        typeof request.method === "function" ? request.method() : request.method || "";
      const getHeaders = () =>
        typeof request.headers === "function" ? request.headers() : request.headers || {};
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

    // Save response
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
          // 마지막 보루: .bin 이라도 남기기
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

async function main() {
  console.log("=== 실시간 LMS 캡처 도구 (Puppeteer 실제 브라우저) ===");
  console.log("실제 Chrome 창을 엽니다 (DevTools의 Network 탭 포함).");
  console.log(
    "- 로그인 상태 유지를 위해 기존 프로필을 사용합니다 (깨끗한 세션은 FRESH_PROFILE=1 환경변수 사용)."
  );
  console.log("- 평소처럼 사용하세요: 로그인 → 과목 → 강의자료 → 상세 보기 → 다운로드.");
  console.log("- 스크립트가 관련 HTML과 요청을 자동으로 캡처합니다 (viewAtclForm, 다운로드 등).");
  console.log(
    '- 언제든 여기서 "save" + Enter를 입력하면 현재 페이지와 최근 트래픽을 강제로 저장합니다.'
  );
  console.log("- Chrome 창을 닫거나 여기서 Ctrl+C를 누르면 종료됩니다.");
  console.log("");
  console.log(
    "팁: 스크립트가 자동으로 오래된 SingletonLock을 정리하고 (Windows에서 흔한 문제), 필요 시 새 프로필로 전환합니다 (FRESH_PROFILE=1)."
  );
  console.log("");

  ensureDir(CAPTURE_DIR);
  ensureDir(PROFILE_DIR);

  // Support fresh profile via env var to avoid "browser already running" errors
  // Usage: FRESH_PROFILE=1 npm run capture:live
  let userDataDir = PROFILE_DIR;
  if (process.env.FRESH_PROFILE) {
    userDataDir = path.join(PROFILE_DIR, `fresh-${Date.now()}`);
    console.log("새 프로필 디렉토리 사용 중:", userDataDir);
  } else {
    console.log("기존 프로필 디렉토리 사용 중:", userDataDir);
    console.log("(Windows에서 오래된 SingletonLock을 자동으로 정리하려고 시도합니다.)");

    // Try to remove stale lock file (very common cause of this exact error on Windows)
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

  // Stealth-ish
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const capturedRequests = new Map(); // to associate response with request

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

    // Also capture actual file downloads (attachments, materials files, etc.)
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

      // Resolve request info *immediately* (plain values) to avoid deferred calls to puppeteer Request methods
      // which can fail with "xxx is not a function" depending on timing / object identity / puppeteer-core version.
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

  // Manual save command
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
    } else {
      console.log('명령어: "save" (현재 페이지 저장), "exit"');
    }
  });

  // Start on main page
  await page.goto("https://ecampus.seowon.ac.kr/", { waitUntil: "networkidle2" }).catch(() => {});

  console.log("\n브라우저가 열렸습니다. 사이트를 정상적으로 사용하세요.\n");

  // Keep process alive until browser closes
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
