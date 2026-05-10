#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";

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

function hasResolvedCitation(text) {
  return /(Gruber 2004|Booth|Wieringa|CommonMark Contributors 2026)/.test(String(text || ""));
}

function commandExists(command) {
  const result = spawnSync("which", [command], { stdio: "ignore" });
  return result.status === 0;
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
  assert(!normalizedHtml.includes("[@"), "Preview HTML still contains raw citation syntax");
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
  assert(!collapsed.includes("[@"), "DOCX content still contains raw citation syntax");
  assert(!embeddedJsonPattern.test(collapsed), "DOCX content still contains embedded bibliography JSON");
}

async function checkPdf(markdown) {
  const response = await postJson(`${baseUrl}/api/export/pdf`, { markdown });
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
  assert(!text.includes("[@"), "PDF text still contains raw citation syntax");
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