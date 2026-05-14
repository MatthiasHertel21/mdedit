#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3210";
const markdownPath = process.env.MARKDOWN_PATH || path.join("docs", "examples", "masterthesis-reference.md");
const pdfTempPath = path.join("tmp", "reference-citations-smoke.pdf");
const pdfTextPath = path.join("tmp", "reference-citations-smoke.txt");
const embeddedJsonPattern = /\[\{(?:&quot;|")URL(?:&quot;|"):/i;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripXmlTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Strip <code> and <pre> content before checking for raw citation syntax,
// since literal [@...] examples in code spans are not unresolved citations.
function stripCodeContent(html) {
  return String(html || "")
    .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, "<code></code>")
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, "<pre></pre>");
}

function hasResolvedCitation(text) {
  return /(Gruber 2004|Booth|Wieringa|CommonMark Contributors 2026)/.test(String(text || ""));
}

function commandExists(command) {
  const result = spawnSync("which", [command], { stdio: "ignore" });
  return result.status === 0;
}

function runOk(command, args) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.status === 0;
}

function resolveCommandPath(command) {
  if (!command || command.includes("/")) {
    return command || null;
  }

  const result = spawnSync("which", [command], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }

  const resolved = String(result.stdout || "").split(/\r?\n/)[0].trim();
  return resolved || null;
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
    "microsoft-edge",
    "microsoft-edge-stable",
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/opt/microsoft/msedge/msedge"
  ].filter(Boolean);

  for (const command of candidates) {
    if (runOk(command, ["--version"])) {
      return resolveCommandPath(command) || command;
    }
  }

  return null;
}

async function waitForEditorReady(page) {
  await page.waitForFunction(() => {
    return Boolean(window.editor && window.printPreview && window.__mdTestApi?.serializePreviewForExport);
  }, { timeout: 120000 });
}

async function setMarkdown(page, markdown) {
  await page.evaluate((content) => {
    window.editor.setValue(content);
  }, markdown);

  await page.waitForFunction((expected) => {
    return (window.editor?.getValue?.() || "") === expected;
  }, { timeout: 120000 }, markdown);

  await page.waitForFunction(() => {
    const previewText = String(document.getElementById("preview")?.textContent || "");
    return previewText.includes("Literaturverzeichnis") && previewText.length > 2000;
  }, { timeout: 120000 });
}

async function showScientificPagedPreview(page) {
  await page.evaluate(async () => {
    delete window.__mdReferenceCitationsState;
    const scientificButton = document.querySelector('.preview-preset-item[data-preset="scientific"]');
    scientificButton?.click();

    if (window.printPreview?.isActive) {
      await window.printPreview.refresh();
      return;
    }

    await window.printPreview.show();
    if (typeof window.printPreview?.refresh === "function") {
      await window.printPreview.refresh();
    }
  });

  await page.waitForFunction(() => {
    const totalPages = document.querySelectorAll("#printPreview .pagedjs_page").length;
    const hasErrorPreview = Boolean(document.querySelector("#printPreview .error-preview"));
    const preview = window.printPreview;
    if (hasErrorPreview) {
      return true;
    }

    const now = performance.now();
    const state = window.__mdReferenceCitationsState || {
      lastCount: totalPages,
      stableSince: now,
    };

    if (preview?.isRendering || state.lastCount !== totalPages) {
      state.lastCount = totalPages;
      state.stableSince = now;
    }

    window.__mdReferenceCitationsState = state;
    return totalPages > 0 && !preview?.isRendering && (now - state.stableSince) >= 250;
  }, { timeout: 120000 });

  const renderState = await page.evaluate(() => {
    const root = document.getElementById("printPreview");
    const errorPreview = root?.querySelector(".error-preview");
    return {
      totalPages: document.querySelectorAll("#printPreview .pagedjs_page").length,
      errorText: errorPreview?.textContent?.replace(/\s+/g, " ").trim() || null,
    };
  });

  assert(!renderState.errorText, `Print preview render failed: ${renderState.errorText}`);
  assert(renderState.totalPages > 0, "Print preview render produced no paged pages");
}

async function captureScientificExportHtml(markdown) {
  const executablePath = resolveChromium();
  assert(executablePath, "Chromium executable not found for scientific PDF smoke");

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await waitForEditorReady(page);
    await setMarkdown(page, markdown);
    await showScientificPagedPreview(page);

    const html = await page.evaluate(async () => {
      return window.__mdTestApi.serializePreviewForExport({ forPdf: true });
    });

    assert(typeof html === "string" && html.trim(), "serializePreviewForExport returned empty HTML");
    return html;
  } finally {
    await browser.close();
  }
}

async function checkPreview(markdown) {
  const response = await postJson(`${baseUrl}/api/preview/citations/html`, { markdown });
  assert(response.ok, `Preview endpoint failed with status ${response.status}`);

  const json = await response.json();
  const html = String(json.html || "");
  const normalizedHtml = normalizeWhitespace(html);

  assert(json.isCitationDocument === true, "Preview endpoint did not detect a citation document");
  assert(normalizedHtml.includes("Literaturverzeichnis"), "Preview HTML is missing the bibliography heading");
  assert(hasResolvedCitation(normalizedHtml), "Preview HTML is missing resolved citations");
  const htmlNoCode = stripCodeContent(html);
  assert(!htmlNoCode.includes("[@"), "Preview HTML still contains raw citation syntax (outside code spans)");
  assert(!embeddedJsonPattern.test(html), "Preview HTML still contains embedded bibliography JSON");
}

async function checkDocx(markdown) {
  const response = await postJson(`${baseUrl}/api/export/docx`, { markdown });
  assert(response.ok, `DOCX export failed with status ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  assert(
    contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "DOCX export returned the wrong content type"
  );

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = String(await zip.file("word/document.xml").async("string"));
  const collapsed = stripXmlTags(documentXml);

  assert(collapsed.includes("Literaturverzeichnis"), "DOCX content is missing the bibliography heading");
  assert(hasResolvedCitation(collapsed), "DOCX content is missing resolved citations");
  // Strip VerbatimChar runs (code spans) before checking for raw citation syntax
  const xmlNoCode = documentXml.replace(/<w:r[^>]*>(?:<w:rPr>.*?<\/w:rPr>)?<w:t[^>]*>.*?<\/w:t><\/w:r>/gs, (m) =>
    m.includes('VerbatimChar') ? '' : m
  );
  const collapsedNoCode = stripXmlTags(xmlNoCode);
  assert(!collapsedNoCode.includes("[@"), "DOCX content still contains raw citation syntax (outside code spans)");
  assert(!embeddedJsonPattern.test(collapsed), "DOCX content still contains embedded bibliography JSON");
}

async function checkPdf(markdown) {
  const html = await captureScientificExportHtml(markdown);
  const response = await postJson(`${baseUrl}/api/export/pdf`, {
    markdown,
    html,
    paged: true,
    requireChromiumPaged: true,
  });
  assert(response.ok, `PDF export failed with status ${response.status}`);

  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes("application/pdf"), "PDF export returned the wrong content type");

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(pdfTempPath), { recursive: true });
  fs.writeFileSync(pdfTempPath, buffer);

  if (!commandExists("mutool")) {
    console.log("reference citations smoke: skipped PDF text inspection because mutool is unavailable");
    return;
  }

  const extractResult = spawnSync("mutool", ["draw", "-F", "txt", "-o", pdfTextPath, pdfTempPath], {
    encoding: "utf8",
  });
  assert(extractResult.status === 0, `mutool text extraction failed: ${extractResult.stderr || extractResult.stdout}`);

  const text = fs.readFileSync(pdfTextPath, "utf8");
  assert(text.includes("Literaturverzeichnis"), "PDF text is missing the bibliography heading");
  assert(hasResolvedCitation(text), "PDF text is missing resolved citations");
  // Strip literal code-span examples ([@sec:...] with ellipsis) before checking
  const textNoExamples = text.replace(/\[@[^\]]*\.\.\.[^\]]*\]/g, "");
  assert(!textNoExamples.includes("[@"), "PDF text still contains raw citation syntax (outside code examples)");
  assert(!embeddedJsonPattern.test(text), "PDF text still contains embedded bibliography JSON");
}

async function main() {
  const markdown = fs.readFileSync(markdownPath, "utf8");

  await checkPreview(markdown);
  await checkDocx(markdown);
  await checkPdf(markdown);

  console.log(`reference citations smoke passed against ${baseUrl} using ${markdownPath}`);
}

main().catch((error) => {
  console.error(error && error.stack || String(error));
  process.exit(1);
});