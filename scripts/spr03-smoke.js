#!/usr/bin/env node
/**
 * SPR-03 smoke test: Section IDs, heading numbering, cross-references.
 * Tests the client-side preview rendering against a live server.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3211 node scripts/spr03-smoke.js
 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://localhost:3210";
const fixturePath = process.env.MARKDOWN_PATH || path.join("docs", "examples", "masterthesis-reference.md");

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function createSharedPaste(markdown) {
  const createResponse = await fetch(`${baseUrl}/api/pastes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown }),
  });
  assert(createResponse.ok, `Creating paste failed with status ${createResponse.status}`);
  const created = await createResponse.json();
  assert(created?.id, "Creating paste did not return an id");
  const sessionCookie = createResponse.headers.get("set-cookie");

  const shareResponse = await fetch(`${baseUrl}/api/pastes/${created.id}/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: JSON.stringify({ shared: true }),
  });
  assert(shareResponse.ok, `Sharing paste failed with status ${shareResponse.status}`);
  return created.id;
}

function resolveChromium() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.BROWSER_EXECUTABLE_PATH,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);
  for (const c of candidates) {
    if (c.startsWith("/")) {
      if (spawnSync("test", ["-x", c]).status === 0) return c;
      continue;
    }
    if (spawnSync(c, ["--version"], { stdio: "ignore" }).status !== 0) continue;
    const r = spawnSync("which", [c], { encoding: "utf8" });
    if (r.status === 0) return r.stdout.trim();
  }
  return null;
}

const chromiumPath = resolveChromium();
if (!chromiumPath) {
  console.log("spr03-smoke: skipped (no Chromium found)");
  process.exit(0);
}

const browser = await puppeteer.launch({
  executablePath: chromiumPath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  const markdown = fs.readFileSync(fixturePath, "utf8");
  const pasteId = process.env.PASTE_ID || await createSharedPaste(markdown);
  const url = `${baseUrl}/${pasteId}`;
  console.log(`Navigating to ${url}`);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait for preview content to render
  await page.waitForSelector(".preview-content", { timeout: 10000 });
  // Wait until section IDs are present (set by Pandoc rendering or markdown-it)
  // or until section-ref links appear (added by replacePandocSectionRefs)
  await page.waitForFunction(
    () =>
      document.querySelector(".preview-content [id^='sec:']") !== null ||
      document.querySelector(".preview-content a.section-ref") !== null ||
      document.querySelector(".preview-content .section-number") !== null,
    { timeout: 15000 }
  );

  const results = await page.evaluate(() => {
    const container = document.querySelector(".preview-content");

    // 1. Section IDs on headings
    const headingsWithIds = Array.from(
      container.querySelectorAll("h1[id^='sec:'],h2[id^='sec:'],h3[id^='sec:']")
    ).map((h) => h.getAttribute("id"));

    // 2. Section numbers in heading text (Pandoc path: "1. Einleitung", "1.1 Forschungsfrage")
    //    or in .section-number spans (markdown-it path).
    const pandocNumbers = Array.from(
      container.querySelectorAll("[id^='sec:']")
    ).map((h) => {
      const text = h.textContent.trim();
      const m = text.match(/^(\d+(?:\.\d+)*)[.\s]/);
      return m ? m[1] : "";
    }).filter(Boolean);

    const spanNumbers = Array.from(
      container.querySelectorAll(".section-number")
    ).map((s) => s.textContent.trim());

    // Combined: numbers come from either Pandoc text or injected spans
    const hasNumbers = pandocNumbers.length > 0 || spanNumbers.length > 0;

    // 3. No residual {#sec: text visible
    const textContent = container.textContent || "";
    const hasResidualAttrs = textContent.includes("{#sec:");

    // 4. Cross-reference links resolved
    const crossRefLinks = Array.from(
      container.querySelectorAll("a.section-ref")
    ).map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent.trim(),
    }));

    // 5. No raw [@sec:...] text visible (outside code spans)
    const codeSpanTexts = Array.from(
      container.querySelectorAll("code")
    ).map((c) => c.textContent);
    const allText = container.textContent || "";
    const codeText = codeSpanTexts.join(" ");
    const nonCodeText = allText.replace(codeText, "");
    const hasRawCrossRef = /\[@sec:[a-z]/.test(nonCodeText);

    // 6. Sample: first sec: heading number
    const einleitungEl = container.querySelector("[id='sec:einleitung']");
    const einleitungNum = einleitungEl
      ? (einleitungEl.querySelector(".section-number")?.textContent?.trim() ||
         (einleitungEl.textContent.trim().match(/^(\d+(?:\.\d+)*)[.\s]/) || [])[1] ||
         "")
      : "";

    return {
      headingsWithIds,
      pandocNumbers: pandocNumbers.slice(0, 8),
      spanNumbers: spanNumbers.slice(0, 8),
      hasNumbers,
      hasResidualAttrs,
      crossRefLinks: crossRefLinks.slice(0, 6),
      hasRawCrossRef,
      einleitungNum,
    };
  });

  console.log("\n=== SPR-03 QS Results ===\n");

  console.log(`Section IDs found (${results.headingsWithIds.length}):`);
  results.headingsWithIds.slice(0, 6).forEach((id) => console.log(`  id="${id}"`));

  console.log(`\nPandoc numbers: ${results.pandocNumbers.join(", ")}`);
  console.log(`Span numbers: ${results.spanNumbers.join(", ")}`);
  console.log(`Einleitung number: "${results.einleitungNum}"`);

  console.log(`\nCross-reference links (${results.crossRefLinks.length}):`);
  results.crossRefLinks.forEach((l) =>
    console.log(`  href="${l.href}" text="${l.text}"`)
  );

  console.log("\n--- Assertions ---");

  assert(
    results.headingsWithIds.length >= 5,
    `Expected ≥5 section IDs, got ${results.headingsWithIds.length}`
  );
  console.log(`✓ ${results.headingsWithIds.length} headings have sec: IDs`);

  assert(
    results.hasNumbers,
    "Expected section numbers in Pandoc heading text or .section-number spans"
  );
  console.log(`✓ Section numbers present (pandoc: ${results.pandocNumbers.length}, spans: ${results.spanNumbers.length})`);

  assert(
    results.einleitungNum === "1",
    `sec:einleitung should have number "1", got "${results.einleitungNum}"`
  );
  console.log(`✓ sec:einleitung numbered "1"`);

  assert(
    !results.hasResidualAttrs,
    'Residual {#sec:...} text visible in preview'
  );
  console.log("✓ No residual {#sec:...} attrs in preview text");

  assert(
    !results.hasRawCrossRef,
    'Raw [@sec:...] visible outside code spans'
  );
  console.log("✓ No raw [@sec:...] outside code spans");

  assert(
    results.crossRefLinks.length >= 3,
    `Expected ≥3 resolved cross-refs, got ${results.crossRefLinks.length}`
  );
  console.log(`✓ ${results.crossRefLinks.length} cross-references resolved to links`);

  // All cross-ref link texts should start with "Abschnitt " and a number
  for (const link of results.crossRefLinks) {
    assert(
      /^Abschnitt[\s\u202F]\d/.test(link.text),
      `Cross-ref link text "${link.text}" should start with "Abschnitt N"`
    );
  }
  console.log("✓ All cross-ref link texts follow 'Abschnitt N.M' pattern");

  console.log(`\n✓ spr03-smoke passed against ${baseUrl}`);
} finally {
  await browser.close();
}
