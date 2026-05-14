#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomPort() {
  return 4600 + Math.floor(Math.random() * 1000);
}

async function waitForServer(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health check returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }

  throw lastError || new Error("Server did not become ready in time");
}

function extractCookie(response) {
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const sidCookie = cookies.find((value) => value.startsWith("sid="));
  return sidCookie ? sidCookie.split(";")[0] : "";
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "md-stats-smoke-"));
  const port = Number(process.env.SMOKE_PORT || randomPort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverLogs = [];

  const server = spawn(process.execPath, ["server.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      ENABLE_STATS_PAGE: "1",
      DATA_DIR: tempDir,
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  server.stdout.on("data", (chunk) => {
    serverLogs.push(String(chunk));
  });

  server.stderr.on("data", (chunk) => {
    serverLogs.push(String(chunk));
  });

  try {
    await waitForServer(baseUrl);

    const landingResponse = await fetch(`${baseUrl}/?utm_source=smoke-source&utm_medium=smoke-medium&utm_campaign=stats-smoke`);
    assert(landingResponse.ok, `Landing page request failed with ${landingResponse.status}`);

    const cookieHeader = extractCookie(landingResponse);
    assert(cookieHeader, "Landing page did not set a session cookie");

    const ctaResponse = await fetch(`${baseUrl}/api/marketing/event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader
      },
      body: JSON.stringify({
        surface: "homepage",
        path: "/",
        target: "open-app",
        utmSource: "smoke-source",
        utmMedium: "smoke-medium",
        utmCampaign: "stats-smoke"
      })
    });
    assert(ctaResponse.ok, `Marketing event request failed with ${ctaResponse.status}`);

    await fetch(`${baseUrl}/api/export/pdf`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader
      },
      body: JSON.stringify({
        markdown: "# Smoke"
      })
    }).catch(() => null);

    const statsResponse = await fetch(`${baseUrl}/stats`, {
      headers: {
        cookie: cookieHeader
      }
    });
    assert(statsResponse.ok, `/stats returned ${statsResponse.status}`);

    const html = await statsResponse.text();
    const requiredSnippets = [
      "Aktivierungs-Signale",
      "UTM Sources 30d",
      "UTM Campaigns 30d",
      "Search Snapshot",
      "Kein Search- oder SEO-Snapshot importiert.",
      "smoke-source",
      "stats-smoke"
    ];

    for (const snippet of requiredSnippets) {
      assert(html.includes(snippet), `Expected /stats to include: ${snippet}`);
    }

    console.log("stats smoke passed");
  } catch (error) {
    const logOutput = serverLogs.join("").trim();
    if (logOutput) {
      console.error(logOutput);
    }
    throw error;
  } finally {
    server.kill("SIGTERM");
    await delay(300);
    if (!server.killed) {
      server.kill("SIGKILL");
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});