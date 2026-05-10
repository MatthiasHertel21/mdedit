#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3210";
const minPageScore = Number(process.env.MIN_PAGE_SCORE || "0.58");
const commonTokenRatio = Number(process.env.COMMON_TOKEN_RATIO || "0.6");
const traceEnabled = process.env.SMOKE_TRACE === "1";
const parityKeywords = [
  "archiv", "befund", "corpus", "diskurs", "evidenz", "fundstelle", "gliederung", "horizont",
  "iteration", "journal", "kanon", "lesart", "material", "notation", "ordnung", "praemisse",
  "quelle", "referenz", "struktur", "these", "umfeld", "vergleich", "wirkung", "xenon",
  "yield", "zitation", "anhang", "beleg", "kontur", "layout", "methode", "narrativ",
  "objekt", "praxis", "rahmung", "signal", "terminus", "urteil", "variante", "wissen"
];
const stopwords = new Set([
  "aber", "alle", "auch", "beim", "dass", "diese", "dieser", "einem", "einer", "eines", "eine", "einen",
  "fuer", "have", "into", "kann", "kein", "mehr", "nach", "noch", "oder", "page", "pages", "section",
  "sein", "sind", "such", "that", "their", "there", "these", "this", "und", "unter", "wird", "with",
  "zwar"
]);
const smokeBibliographyItems = [
  {
    id: "doe2020",
    type: "book",
    title: "Example Book",
    author: [{ family: "Doe", given: "Jane" }],
    issued: { "date-parts": [[2020]] },
    publisher: "Example Press",
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function trace(message) {
  if (traceEnabled) {
    console.log(`[trace] ${message}`);
  }
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 4)
    .filter((token) => !stopwords.has(token))
    .filter((token) => !/^\d+$/.test(token));
}

function uniqueTokens(tokens) {
  return Array.from(new Set(tokens));
}

function toShingles(tokens, size = 4) {
  if (tokens.length <= size) {
    return new Set(tokens);
  }

  const shingles = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(" "));
  }
  return shingles;
}

function diceScore(left, right) {
  const leftItems = left instanceof Set ? left : new Set(left);
  const rightItems = right instanceof Set ? right : new Set(right);

  if (!leftItems.size && !rightItems.size) {
    return 1;
  }

  let overlap = 0;
  leftItems.forEach((item) => {
    if (rightItems.has(item)) {
      overlap += 1;
    }
  });

  return (2 * overlap) / (leftItems.size + rightItems.size);
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
    "/opt/microsoft/msedge/msedge",
  ].filter(Boolean);

  for (const command of candidates) {
    if (runOk(command, ["--version"])) {
      return resolveCommandPath(command) || command;
    }
  }

  return null;
}

function buildEmbeddedBibliographyBlock(items) {
  return [
    "```mdedit-bibliography",
    JSON.stringify({ version: 1, format: "csl-json", items }, null, 2),
    "```",
    "",
  ].join("\n");
}

function buildSectionParagraph(section, index) {
  const offset = ((section - 1) * 10) + index;
  const words = [
    parityKeywords[offset % parityKeywords.length],
    parityKeywords[(offset + 7) % parityKeywords.length],
    parityKeywords[(offset + 13) % parityKeywords.length],
  ];

  return [
    `Abschnitt ${section} Absatz ${index}.`,
    `Dieser Paritaetstext nutzt die Begriffe ${words.join(", ")} und beschreibt dieselbe wissenschaftliche Lage in leicht variierter Form.`,
    "Er sorgt dafuer, dass der paged Preview und der paged PDF ueber mehrere Seiten hinweg dieselbe Textverteilung einhalten muessen.",
    "Das Literaturverzeichnis soll erst am Dokumentende erscheinen, damit die Seitenaufteilung testbar bleibt.",
  ].join(" ");
}

function buildShortSmokeMarkdown() {
  return [
    "---",
    "title: Test",
    "citation-source: embedded",
    "reference-section-title: Literaturverzeichnis",
    "---",
    "",
    buildEmbeddedBibliographyBlock(smokeBibliographyItems),
    "Hallo [@doe2020].",
    "",
    "#refs",
    "",
  ].join("\n");
}

function buildParityMarkdown() {
  const sections = [
    { heading: "# Einleitung", count: 9 },
    { heading: "## Argumentation", count: 11 },
    { heading: "## Auswertung", count: 11 },
    { heading: "## Schluss", count: 6 },
  ];
  const lines = [
    "---",
    "title: Citation Parity",
    "citation-source: embedded",
    "reference-section-title: Literaturverzeichnis",
    "---",
    "",
    buildEmbeddedBibliographyBlock(smokeBibliographyItems),
    sections[0].heading,
    "",
    "Die erste Einordnung verweist bereits auf [@doe2020] und setzt damit die Bibliografie fuer den Paritaetstest voraus.",
    "",
  ];

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push(section.heading, "");
    }

    for (let index = 1; index <= section.count; index += 1) {
      lines.push(buildSectionParagraph(sectionIndex + 1, index), "");
    }
  });

  lines.push(
    "Die letzte Beobachtung nimmt erneut Bezug auf [@doe2020], bevor das Literaturverzeichnis explizit eingesetzt wird.",
    "",
    "#refs",
    ""
  );

  return lines.join("\n");
}

async function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function checkPreview(markdown) {
  const response = await postJson(`${baseUrl}/api/preview/citations/html`, { markdown });
  assert(response.ok, `Preview endpoint failed with status ${response.status}`);
  const json = await response.json();
  const html = normalizeWhitespace(json.html);

  assert(json.isCitationDocument === true, "Preview endpoint did not detect a citation document");
  assert(typeof json.html === "string" && html.includes("(Doe 2020)"), "Preview HTML is missing the resolved citation");
  assert(html.includes("Literaturverzeichnis"), "Preview HTML is missing the bibliography heading");
  assert(html.includes("Example Book"), "Preview HTML is missing the bibliography entry");
  assert(!html.includes("[@doe2020]"), "Preview HTML still contains raw citation syntax");
}

async function checkDocx(markdown) {
  const response = await postJson(`${baseUrl}/api/export/docx`, {
    markdown,
    html: "<p>fallback</p>",
    pagedModeActive: false,
  });
  assert(response.ok, `DOCX export failed with status ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "DOCX export returned the wrong content type");

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = normalizeWhitespace(await zip.file("word/document.xml").async("string"));

  assert(documentXml.includes("(Doe 2020)"), "DOCX content is missing the resolved citation");
  assert(documentXml.includes("Literaturverzeichnis"), "DOCX content is missing the bibliography heading");
  assert(documentXml.includes("Example Book"), "DOCX content is missing the bibliography entry");
  assert(!documentXml.includes("[@doe2020]"), "DOCX content still contains raw citation syntax");
  assert(!documentXml.includes("::: {#refs}"), "DOCX content still contains the refs placeholder marker");
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
    return previewText.includes("Die erste Einordnung verweist bereits");
  }, { timeout: 120000 });
}

async function showScientificPagedPreview(page) {
  await page.evaluate(async () => {
    delete window.__mdCitationsParityState;
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
    const state = window.__mdCitationsParityState || {
      lastCount: totalPages,
      stableSince: now,
    };

    if (preview?.isRendering || state.lastCount !== totalPages) {
      state.lastCount = totalPages;
      state.stableSince = now;
    }

    window.__mdCitationsParityState = state;
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

async function extractPreviewPages(page) {
  return page.evaluate(() => {
    const pages = Array.from(document.querySelectorAll("#printPreview .pagedjs_page")).map((pageEl, index) => {
      const contentRoot = pageEl.querySelector(".pagedjs_page_content") || pageEl;
      const text = String(contentRoot.innerText || contentRoot.textContent || "").replace(/\s+/g, " ").trim();
      return {
        page: index + 1,
        text,
      };
    });

    return {
      totalPages: pages.length,
      pages,
    };
  });
}

async function captureExportHtml(page) {
  return page.evaluate(async () => {
    return window.__mdTestApi.serializePreviewForExport({ forPdf: true });
  });
}

async function exportPdf(markdown, html) {
  const response = await postJson(`${baseUrl}/api/export/pdf`, {
    markdown,
    html,
    paged: true,
    requireChromiumPaged: true,
  });

  assert(response.ok, `PDF export failed with status ${response.status}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    engine: response.headers.get("x-export-engine") || "unknown",
  };
}

async function extractPdfPages(browser, pdfBuffer) {
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.addScriptTag({ url: `${baseUrl}/static/vendor/pdfjs/pdf.min.js` });

    const base64 = pdfBuffer.toString("base64");
    return await page.evaluate(async (payload) => {
      const raw = atob(payload.base64);
      const bytes = new Uint8Array(raw.length);
      for (let index = 0; index < raw.length; index += 1) {
        bytes[index] = raw.charCodeAt(index);
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = payload.workerSrc;
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const pdfPage = await pdf.getPage(pageNumber);
        const textContent = await pdfPage.getTextContent();
        const text = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
        pages.push({
          page: pageNumber,
          text,
        });
      }

      return {
        totalPages: pages.length,
        pages,
      };
    }, {
      base64,
      workerSrc: `${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js`,
    });
  } finally {
    await page.close();
  }
}

function buildCommonTokenSet(previewPages, pdfPages) {
  const pageCount = Math.max(previewPages.length, pdfPages.length) || 1;
  const minOccurrences = Math.max(2, Math.ceil(pageCount * commonTokenRatio));
  const counts = new Map();

  [...previewPages, ...pdfPages].forEach((entry) => {
    const seen = new Set(tokenize(entry.text));
    seen.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });

  return new Set(Array.from(counts.entries())
    .filter(([, count]) => count >= minOccurrences)
    .map(([token]) => token));
}

function comparePages(previewPage, pdfPage, commonTokens) {
  const previewTokens = tokenize(previewPage.text).filter((token) => !commonTokens.has(token));
  const pdfTokens = tokenize(pdfPage.text).filter((token) => !commonTokens.has(token));
  const previewTokenSet = new Set(uniqueTokens(previewTokens));
  const pdfTokenSet = new Set(uniqueTokens(pdfTokens));
  const previewShingles = toShingles(previewTokens);
  const pdfShingles = toShingles(pdfTokens);
  const tokenScore = diceScore(previewTokenSet, pdfTokenSet);
  const shingleScore = diceScore(previewShingles, pdfShingles);
  const totalScore = Number(((tokenScore * 0.35) + (shingleScore * 0.65)).toFixed(3));

  return {
    previewPage: previewPage.page,
    pdfPage: pdfPage.page,
    totalScore,
    tokenScore: Number(tokenScore.toFixed(3)),
    shingleScore: Number(shingleScore.toFixed(3)),
  };
}

function findPageContaining(pages, ...needles) {
  const normalizedNeedles = needles.map((value) => normalizeText(value)).filter(Boolean);
  const match = pages.find((page) => {
    const normalizedPage = normalizeText(page.text);
    return normalizedNeedles.every((needle) => normalizedPage.includes(needle));
  });
  return match?.page || null;
}

async function checkPagedParity(markdown) {
  const chromium = resolveChromium();
  assert(chromium, "Chromium binary not found. Set CHROMIUM_BIN or install chromium.");
  trace(`using chromium ${chromium}`);

  const browser = await puppeteer.launch({
    executablePath: chromium,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    trace("opened browser page");
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    trace("loaded app shell");
    await waitForEditorReady(page);
    trace("editor ready");
    await setMarkdown(page, markdown);
    trace("markdown set");
    await showScientificPagedPreview(page);
    trace("scientific paged preview ready");

    const preview = await extractPreviewPages(page);
    trace(`extracted preview pages (${preview.totalPages})`);
    const exportHtml = await captureExportHtml(page);
    trace(`captured export html (${exportHtml.length} chars)`);
    const pdfResult = await exportPdf(markdown, exportHtml);
    trace(`exported pdf via ${pdfResult.engine} (${pdfResult.buffer.length} bytes)`);
    const pdf = await extractPdfPages(browser, pdfResult.buffer);
    trace(`extracted pdf pages (${pdf.totalPages})`);

    assert(
      preview.totalPages === pdf.totalPages,
      `Paged parity page count mismatch: preview=${preview.totalPages}, pdf=${pdf.totalPages}`
    );

    const commonTokens = buildCommonTokenSet(preview.pages, pdf.pages);
    const pageScores = preview.pages.map((previewPage, index) => comparePages(previewPage, pdf.pages[index], commonTokens));
    const lowScores = pageScores.filter((score) => score.totalScore < minPageScore);
    assert(
      lowScores.length === 0,
      `Paged parity drift detected: ${lowScores.map((score) => `page ${score.previewPage}=${score.totalScore}`).join(", ")}`
    );

    const bibliographyPreviewPage = findPageContaining(preview.pages, "Literaturverzeichnis", "Example Book");
    const bibliographyPdfPage = findPageContaining(pdf.pages, "Literaturverzeichnis", "Example Book");
    assert(bibliographyPreviewPage !== null, "Paged preview is missing the bibliography placement");
    assert(bibliographyPdfPage !== null, "Paged PDF is missing the bibliography placement");
    assert(
      bibliographyPreviewPage === bibliographyPdfPage,
      `Bibliography page mismatch: preview=${bibliographyPreviewPage}, pdf=${bibliographyPdfPage}`
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  const smokeMarkdown = buildShortSmokeMarkdown();
  const parityMarkdown = buildParityMarkdown();

  trace("checking preview endpoint");
  await checkPreview(smokeMarkdown);
  trace("checking docx export");
  await checkDocx(smokeMarkdown);
  trace("checking paged parity");
  await checkPagedParity(parityMarkdown);

  console.log(`citations smoke passed against ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});