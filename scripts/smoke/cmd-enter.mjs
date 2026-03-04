#!/usr/bin/env node

import process from "node:process";
import { spawn } from "node:child_process";

const AUTO_DEV = process.env.CAPTURE_SMOKE_AUTO_DEV !== "0";
const DEV_PORT = Number(process.env.CAPTURE_SMOKE_DEV_PORT ?? 4022);
const DEV_HOST = process.env.CAPTURE_SMOKE_DEV_HOST ?? "127.0.0.1";
const FALLBACK_BASE_URL = `http://${DEV_HOST}:${DEV_PORT}`;
const BASE_URL = process.env.CAPTURE_BASE_URL ?? FALLBACK_BASE_URL;
const MODE = process.env.CAPTURE_SMOKE_MODE ?? "browser";
const ACTION_TIMEOUT_MS = Number(process.env.CAPTURE_SMOKE_TIMEOUT_MS ?? 20_000);
const REQUEST_TIMEOUT_MS = Number(process.env.CAPTURE_SMOKE_REQUEST_TIMEOUT_MS ?? 4_000);
const BOOT_TIMEOUT_MS = Number(process.env.CAPTURE_SMOKE_BOOT_TIMEOUT_MS ?? 120_000);
const NAV_TIMEOUT_MS = Number(process.env.CAPTURE_SMOKE_NAV_TIMEOUT_MS ?? 120_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, baseUrl = BASE_URL) {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Request failed ${path}: ${response.status}`);
  }
  return response.json();
}

async function waitForMetricsIncrement(previousEntries, baseUrl) {
  const started = Date.now();
  while (Date.now() - started <= ACTION_TIMEOUT_MS) {
    const metrics = await fetchJson("/api/capture/metrics", baseUrl);
    const nextEntries = Number(metrics.entries24h ?? 0);
    if (nextEntries > previousEntries) {
      return nextEntries;
    }
    await sleep(300);
  }
  throw new Error("Metrics did not increment in time after hotkey submit.");
}

async function canReachMetrics(baseUrl) {
  try {
    await fetchJson("/api/capture/metrics", baseUrl);
    return true;
  } catch {
    return false;
  }
}

function startDevServer(baseUrl) {
  const parsed = new URL(baseUrl);
  const host = parsed.hostname;
  const port = Number(parsed.port || 80);
  const nextCli = new URL("../../node_modules/next/dist/bin/next", import.meta.url);
  let logs = "";
  const appendLog = (chunk) => {
    logs += chunk.toString();
    if (logs.length > 8000) {
      logs = logs.slice(-8000);
    }
  };

  const child = spawn(
    process.execPath,
    [nextCli.pathname, "dev", "--hostname", host, "--port", String(port)],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: {
        ...process.env,
        LINEAR_API_KEY: "",
        LINEAR_DEFAULT_TEAM: "",
      },
    },
  );

  child.stdout.on("data", appendLog);
  child.stderr.on("data", appendLog);

  return { child, getLogs: () => logs };
}

async function run() {
  let activeBaseUrl = BASE_URL;
  let devRuntime = null;
  let browser = null;
  let page = null;

  try {
    if (!(await canReachMetrics(activeBaseUrl))) {
      if (!AUTO_DEV) {
        throw new Error(`Metrics endpoint unavailable on ${activeBaseUrl}.`);
      }

      activeBaseUrl = FALLBACK_BASE_URL;
      devRuntime = startDevServer(activeBaseUrl);
      const started = Date.now();
      while (Date.now() - started <= BOOT_TIMEOUT_MS) {
        if (await canReachMetrics(activeBaseUrl)) {
          break;
        }
        if (devRuntime.child.exitCode !== null) {
          throw new Error(
            `Dev server exited before health check (code=${devRuntime.child.exitCode}).\n${devRuntime.getLogs()}`,
          );
        }
        await sleep(500);
      }

      if (!(await canReachMetrics(activeBaseUrl))) {
        throw new Error(`App did not become healthy at ${activeBaseUrl} within timeout.`);
      }
    }

    const beforeMetrics = await fetchJson("/api/capture/metrics", activeBaseUrl);
    const beforeEntries = Number(beforeMetrics.entries24h ?? 0);
    const beforeWords = Number(beforeMetrics.words24h ?? 0);

    const payload = `Cmd/Ctrl+Enter smoke ${new Date().toISOString()} unique token`;

    if (MODE === "browser") {
      const { chromium } = await import("playwright");
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      await page.goto(activeBaseUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      const textarea = page.getByPlaceholder("Capture a thought, idea, insight...");
      await textarea.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

      await textarea.fill(payload);
      const key = process.platform === "darwin" ? "Meta+Enter" : "Control+Enter";
      await textarea.press(key);

      await page.getByText("Captured.").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      await page.waitForFunction(
        () => {
          const el = document.querySelector("textarea");
          return !!el && "value" in el && el.value === "";
        },
        undefined,
        { timeout: ACTION_TIMEOUT_MS },
      );
    } else if (MODE === "api") {
      const response = await fetch(`${activeBaseUrl}/api/capture`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: payload }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`API capture fallback failed: ${response.status}`);
      }
    } else {
      throw new Error(`Unsupported CAPTURE_SMOKE_MODE: ${MODE}`);
    }

    const afterEntries = await waitForMetricsIncrement(beforeEntries, activeBaseUrl);
    const afterMetrics = await fetchJson("/api/capture/metrics", activeBaseUrl);
    const afterWords = Number(afterMetrics.words24h ?? 0);

    console.log(
      [
        "cmd-enter smoke: PASS",
        `mode=${MODE}`,
        `base_url=${activeBaseUrl}`,
        `entries24h_before=${beforeEntries}`,
        `entries24h_after=${afterEntries}`,
        `words24h_before=${beforeWords}`,
        `words24h_after=${afterWords}`,
      ].join("\n"),
    );
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
    if (devRuntime) {
      devRuntime.child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("executable")) {
    console.error(`${message}\nInstall browser once: npx playwright install chromium`);
  } else {
    console.error(`cmd-enter smoke: FAIL\n${message}`);
  }
  process.exit(1);
});
