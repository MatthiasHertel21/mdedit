import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const baseUrl = process.env.BASE_URL || "http://localhost:3210";
const pageLimit = Number(process.env.PAGE_LIMIT || "5");
const outDir = process.env.OUT_DIR || path.join(process.cwd(), "tmp", `visual-smoke-${Date.now()}`);
const requireChromiumPaged = process.env.REQUIRE_CHROMIUM_PAGED !== "0";
const maxAllowedDiffRatio = Number(process.env.MAX_DIFF_RATIO || "0.02");
const maxOverflowPx = Number(process.env.MAX_OVERFLOW_PX || "2");
const enforceVisualDiff = process.env.ENFORCE_VISUAL_DIFF === "1";

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const runOk = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: "ignore" });
  return result.status === 0;
};

const resolveChromium = () => {
  const candidates = [
    process.env.CHROMIUM_BIN,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable"
  ].filter(Boolean);

  for (const cmd of candidates) {
    if (runOk(cmd, ["--version"])) return cmd;
  }
  return null;
};

const hasPdfToPpm = () => runOk("pdftoppm", ["-h"]);

const markerText = (id) => `[[LAYOUT-MARKER:${id}]]`;
const markerSpan = (id) => `<span class="layout-test-marker" data-layout-marker="${id}">${markerText(id)}</span>`;
const markerBlock = (id) => `<p class="layout-test-marker-block">${markerSpan(id)}</p>`;
const normalizeSearchText = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const repeatedParagraphs = (label, count, sentences = 12) => {
  const sentence = `${label} analyses editorial structure, citation flow, page transitions and paragraph rhythm under sustained layout pressure.`;
  const paragraph = Array.from({ length: sentences }, () => sentence).join(" ");
  return Array.from({ length: count }, () => paragraph).join("\n\n");
};

const markerStyleBlock = [
  "<style>",
  ".layout-test-marker {",
  "  display: inline;",
  "  font-size: 0.6pt;",
  "  line-height: 0.6pt;",
  "  color: rgba(255, 255, 255, 0.02);",
  "  letter-spacing: 0;",
  "}",
  ".layout-test-marker-block {",
  "  display: block;",
  "  margin: 0;",
  "  font-size: 0.6pt;",
  "  line-height: 0.6pt;",
  "  color: rgba(255, 255, 255, 0.02);",
  "}",
  "</style>",
  ""
].join("\n");

const inlineFigureSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#f7f1e8"/>
  <rect x="40" y="40" width="560" height="280" rx="24" fill="#d8e6dd" stroke="#224b3c" stroke-width="4"/>
  <path d="M110 245 C180 120, 280 120, 340 205 S500 285, 540 150" fill="none" stroke="#0e5a3b" stroke-width="12" stroke-linecap="round"/>
  <circle cx="200" cy="165" r="26" fill="#b96d40"/>
  <circle cx="410" cy="218" r="20" fill="#22536b"/>
  <text x="60" y="92" font-family="Georgia, serif" font-size="26" fill="#1e2d24">Layout Stability Figure</text>
  <text x="60" y="120" font-family="Georgia, serif" font-size="16" fill="#30463a">Inline SVG fixture for deterministic PDF export</text>
</svg>
`.trim());

const inlineFigureHtml = (markerId, captionMarkerId) => [
  "<figure>",
  `  <img src="data:image/svg+xml;charset=utf-8,${inlineFigureSvg}" alt="Deterministic layout test figure" />`,
  `  <figcaption>Deterministic figure for layout verification ${captionMarkerId ? markerSpan(captionMarkerId) : ""} ${markerSpan(markerId)}</figcaption>`,
  "</figure>",
  ""
].join("\n");

const makeTableRows = (count, label) => Array.from({ length: count }, (_, index) => {
  const n = index + 1;
  return `| ${label} ${n} | Stable pagination across chapter flow | ${80 + (n % 17)}% |`;
}).join("\n");

const makeHtmlTableRows = (count, label) => Array.from({ length: count }, (_, index) => {
  const n = index + 1;
  return `  <tr><td>${label} ${n}</td><td>Stable pagination across chapter flow</td><td>${80 + (n % 17)}%</td></tr>`;
}).join("\n");

const makeHtmlTable = ({ caption, rows }) => [
  "<table>",
  `  <caption>${caption}</caption>`,
  "  <thead>",
  "    <tr><th>Dataset</th><th>Observation</th><th>Confidence</th></tr>",
  "  </thead>",
  "  <tbody>",
  rows,
  "  </tbody>",
  "</table>",
  ""
].join("\n");

const makeSimpleMarkdownRows = (count, prefix = "Row") => Array.from({ length: count }, (_, index) => {
  const n = index + 1;
  return `| ${prefix} ${n} | Stable pagination across chapter flow | ${80 + (n % 17)}% |`;
}).join("\n");

const baseLayoutBlock = [
  "```layout",
  "page:",
  "  size: A4",
  "  orientation: portrait",
  "  margins:",
  "    top: 2.5cm",
  "    right: 2cm",
  "    bottom: 2cm",
  "    left: 2.5cm",
  "    firstPageTop: 4cm",
  "header:",
  "  enabled: true",
  "  hideOnFirstPage: true",
  "  left: \"{doc-title}\"",
  "  center: \"\"",
  "  right: \"{section}\"",
  "  fontSize: 9pt",
  "  color: \"#666666\"",
  "  offset: 6mm",
  "footer:",
  "  enabled: true",
  "  hideOnFirstPage: false",
  "  left: \"\"",
  "  center: \"{page} / {pages}\"",
  "  right: \"\"",
  "  fontSize: 9pt",
  "  color: \"#999999\"",
  "  offset: 6mm",
  "```",
  ""
].join("\n");

const scientificFixture = () => {
  const rows = makeTableRows(22, "Criterion");

  return {
    id: "scientific-thesis",
    title: "Scientific Thesis Layout",
    markers: [
      { id: "thesis-title", previewPage: 1, pdfPage: 1 },
      { id: "method-anchor", minPreviewPage: 2, minPdfPage: 2 },
      { id: "findings-anchor", minPreviewPage: 3, minPdfPage: 3 },
      { id: "conclusion-anchor", minPreviewPage: 4, minPdfPage: 4 }
    ],
    expected: {
      minPages: 4,
      firstPageHeaderHidden: true,
      firstPageFooterPattern: /1\s*\/\s*\d+/,
      requireNoOverflow: true
    },
    markdown: [
      markerStyleBlock,
      `# Master Thesis Reliability Review ${markerSpan("thesis-title")}`,
      "",
      "Status: Draft export contract for long-form academic writing.",
      "",
      "## Context and Scope",
      "",
      repeatedParagraphs("Context section", 8),
      "",
      `## Methodology ${markerSpan("method-anchor")}`,
      "",
      repeatedParagraphs("Methodology section", 12),
      "",
      "## Stability Matrix",
      "",
      "| Area | Observation | Confidence |",
      "|---|---|---|",
      rows,
      "",
      `## Findings ${markerSpan("findings-anchor")}`,
      "",
      repeatedParagraphs("Findings section", 16),
      "",
      `## Conclusion ${markerSpan("conclusion-anchor")}`,
      "",
      repeatedParagraphs("Conclusion section", 8),
      "",
      baseLayoutBlock
    ].join("\n")
  };
};

const thesisStructureFixture = () => {
  return {
    id: "thesis-structure",
    title: "Thesis Structure Layout",
    markers: [
      { id: "title-page-anchor", previewPage: 1, pdfPage: 1 },
      { id: "toc-anchor", previewPage: 1, pdfPage: 1 },
      { id: "chapter-one-anchor", previewPage: 1, pdfPage: 1 },
      { id: "chapter-two-anchor", minPreviewPage: 3, minPdfPage: 3 },
      { id: "appendix-anchor", minPreviewPage: 4, minPdfPage: 4 }
    ],
    expected: {
      minPages: 4,
      firstPageHeaderHidden: true,
      firstPageFooterPattern: /1\s*\/\s*\d+/,
      requireNoOverflow: true
    },
    markdown: [
      markerStyleBlock,
      `# Dissertation Workflow Contract ${markerSpan("title-page-anchor")}`,
      "",
      "A structured long-form fixture with deliberate chapter transitions, TOC generation and appendix flow.",
      "",
      `## Inhaltsverzeichnis ${markerSpan("toc-anchor")}`,
      "",
      "[[toc]]",
      "",
      "<!-- page-break -->",
      "",
      "# Kapitel 1: Forschungsrahmen",
      "",
      markerBlock("chapter-one-anchor"),
      "",
      repeatedParagraphs("Research framework", 10),
      "",
      "<!-- page-break -->",
      "",
      "# Kapitel 2: Analyse",
      "",
      markerBlock("chapter-two-anchor"),
      "",
      repeatedParagraphs("Analysis chapter", 12),
      "",
      "<!-- page-break -->",
      "",
      "# Anhang",
      "",
      markerBlock("appendix-anchor"),
      "",
      repeatedParagraphs("Appendix section", 8),
      "",
      baseLayoutBlock
    ].join("\n")
  };
};

const bookFixture = () => {
  const longQuote = [
    "> A durable book workflow needs the calm predictability of a typesetting engine,",
    "> but it must keep the immediate feedback loop of an editor that invites iteration.",
    "> The test suite therefore probes continuity, not only appearance."
  ].join("\n");

  return {
    id: "book-manuscript",
    title: "Book Manuscript Layout",
    markers: [
      { id: "chapter-one", previewPage: 1, pdfPage: 1 },
      { id: "chapter-two", minPreviewPage: 2, minPdfPage: 2 },
      { id: "chapter-three", minPreviewPage: 3, minPdfPage: 3 },
      { id: "epilogue", minPreviewPage: 4, minPdfPage: 4 }
    ],
    expected: {
      minPages: 4,
      firstPageHeaderHidden: true,
      firstPageFooterPattern: /1\s*\/\s*\d+/,
      requireNoOverflow: true
    },
    markdown: [
      markerStyleBlock,
      `# Chapter One: Thresholds ${markerSpan("chapter-one")}`,
      "",
      repeatedParagraphs("Opening chapter", 10),
      "",
      longQuote,
      "",
      `## Chapter Two: Movement ${markerSpan("chapter-two")}`,
      "",
      repeatedParagraphs("Middle chapter", 14),
      "",
      `## Chapter Three: Counterpoint ${markerSpan("chapter-three")}`,
      "",
      repeatedParagraphs("Counterpoint chapter", 14),
      "",
      `## Epilogue ${markerSpan("epilogue")}`,
      "",
      repeatedParagraphs("Epilogue section", 8),
      "",
      "```layout",
      "page:",
      "  size: A4",
      "  orientation: portrait",
      "  margins:",
      "    top: 2.5cm",
      "    right: 2cm",
      "    bottom: 2cm",
      "    left: 2.5cm",
      "    firstPageTop: 4cm",
      "  mirrorMargins: true",
      "header:",
      "  enabled: true",
      "  hideOnFirstPage: true",
      "  left: \"{doc-title}\"",
      "  center: \"\"",
      "  right: \"{section}\"",
      "footer:",
      "  enabled: true",
      "  center: \"{page} / {pages}\"",
      "```",
      ""
    ].join("\n")
  };
};

const columnFlowFixture = () => {
  return {
    id: "column-flow",
    title: "Column Flow Layout",
    markers: [
      { id: "column-intro-anchor", previewPage: 1, pdfPage: 1 },
      { id: "left-column-anchor", previewPage: 1, pdfPage: 1, previewColumn: 1, pdfColumn: 1, requireColumnParity: true },
      { id: "right-column-anchor", previewPage: 1, pdfPage: 1, previewColumn: 2, pdfColumn: 2, requireColumnParity: true },
      { id: "post-columns-anchor", previewPage: 1, pdfPage: 1 }
    ],
    expected: {
      minPages: 2,
      firstPageHeaderHidden: true,
      firstPageFooterPattern: /1\s*\/\s*\d+/,
      requireNoOverflow: true
    },
    markdown: [
      markerStyleBlock,
      `# Column Flow Contract ${markerSpan("column-intro-anchor")}`,
      "",
      "Column-break parity fixture.",
      "",
      "<!-- columns:2 gap:18pt rule:true -->",
      "",
      markerBlock("left-column-anchor"),
      "",
      repeatedParagraphs("Left column text", 2, 4),
      "",
      "<!-- column-break -->",
      "",
      markerBlock("right-column-anchor"),
      "",
      repeatedParagraphs("Right column text", 2, 4),
      "",
      "<!-- /columns -->",
      "",
      "<!-- page-break -->",
      "",
      `## After Columns ${markerSpan("post-columns-anchor")}`,
      "",
      repeatedParagraphs("Post-column section", 4, 8),
      "",
      baseLayoutBlock
    ].join("\n")
  };
};

const mediaStressFixture = () => {
  const captionTableRows = makeHtmlTableRows(4, "Dataset");
  const tableCaptionText = "Table 1. Deterministic long-table caption for repeat-header verification";
  const repeatedHeaderText = "ColA ColB ColC";
  const longMarkdownRows = makeSimpleMarkdownRows(90, "Dataset");

  return {
    id: "media-stress",
    title: "Media And Tables Stress Layout",
    markers: [
      { id: "stress-intro", previewPage: 1, pdfPage: 1 },
      { id: "figure-anchor", minPreviewPage: 2, minPdfPage: 2 },
      { id: "figure-caption-anchor", minPreviewPage: 2, minPdfPage: 2 },
      { id: "table-anchor", minPreviewPage: 2, minPdfPage: 2 },
      { id: "table-caption-anchor", minPreviewPage: 2, minPdfPage: 2 },
      { id: "closing-anchor", minPreviewPage: 3, minPdfPage: 3 }
    ],
    expected: {
      minPages: 3,
      firstPageHeaderHidden: true,
      firstPageFooterPattern: /1\s*\/\s*\d+/,
      requireNoOverflow: true,
      textProbes: {
        repeatedTableHeader: { text: repeatedHeaderText, minPreviewPages: 2, minPdfPages: 2 }
      }
    },
    markdown: [
      markerStyleBlock,
      `# Media Stress Test ${markerSpan("stress-intro")}`,
      "",
      repeatedParagraphs("Stress introduction", 6),
      "",
      "<!-- page-break -->",
      "",
      `## Figure Sequence ${markerSpan("figure-anchor")}`,
      "",
      inlineFigureHtml("figure-anchor", "figure-caption-anchor"),
      repeatedParagraphs("Figure discussion", 4),
      "",
      `## Long Table ${markerSpan("table-anchor")}`,
      "",
      "<!-- table:scientific -->",
      "",
      makeHtmlTable({ caption: `${tableCaptionText} ${markerSpan("table-caption-anchor")}`, rows: captionTableRows }),
      "",
      "| ColA | ColB | ColC |",
      "|---|---|---|",
      longMarkdownRows,
      "",
      "<!-- page-break -->",
      "",
      `## Closing Notes ${markerSpan("closing-anchor")}`,
      "",
      repeatedParagraphs("Closing section", 6),
      "",
      baseLayoutBlock
    ].join("\n")
  };
};

const fixtures = [scientificFixture(), thesisStructureFixture(), bookFixture(), mediaStressFixture(), columnFlowFixture()];

const waitForPagedReady = async (page) => {
  await page.waitForFunction(() => {
    const pages = document.querySelectorAll(".pagedjs_page");
    const preview = window.printPreview;
    return pages.length > 0 && preview && !preview.isRendering;
  }, { timeout: 60000 });
};

const showPreviewForFixture = async (page, markdown) => {
  await page.evaluate(async (content) => {
    window.editor.setValue(content);
    if (window.printPreview.isActive) {
      await window.printPreview.refresh();
    } else {
      await window.printPreview.show();
      // The first paged render can settle into an incomplete cold-start state.
      // Force one explicit refresh so the captured preview reflects the final document.
      await window.printPreview.refresh();
    }
  }, markdown);
  await waitForPagedReady(page);
};

const normalizePreviewForCapture = async (page) => {
  await page.evaluate(() => {
    const styleId = "layout-runner-capture-style";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      .pagedjs_page {
        box-shadow: none !important;
        margin: 0 !important;
      }
      .pagedjs_pages {
        background: #fff !important;
      }
    `;
  });
};

const getPageHandles = async (page) => page.$$(".pagedjs_page");

const takePreviewShots = async (handles, fixtureDir) => {
  const paths = [];
  const count = Math.min(handles.length, pageLimit);
  for (let i = 0; i < count; i += 1) {
    const filePath = path.join(fixtureDir, `preview-${String(i + 1).padStart(2, "0")}.png`);
    await handles[i].screenshot({ path: filePath });
    paths.push(filePath);
  }
  return paths;
};

const capturePagedExportPayload = async (page) => {
  return page.evaluate(() => {
    const root = document.getElementById("printPreview");
    const clone = root ? root.cloneNode(true) : null;
    const marker = /(pagedjs|@page|print-content|page-break|column-break|md-columns|section-break)/i;
    const chunks = [];

    document.querySelectorAll("style").forEach((styleEl) => {
      const text = styleEl.textContent || "";
      if (text && marker.test(text)) {
        chunks.push(text);
      }
    });

    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        const selected = rules
          .map((rule) => rule.cssText)
          .filter((cssText) => marker.test(cssText));
        if (selected.length) {
          chunks.push(selected.join("\n"));
        }
      } catch {
        // ignore inaccessible stylesheets
      }
    });

    const html = clone ? clone.outerHTML : "";
    const styles = chunks.join("\n\n");
    return { html, styles };
  });
};

const fetchPdfFromApi = async ({ markdown, html }) => {
  const res = await fetch(`${baseUrl}/api/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, html, paged: true, requireChromiumPaged })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PDF export failed: ${res.status} ${text}`);
  }
  const contentLength = res.headers.get("content-length");
  const engine = res.headers.get("x-export-engine") || null;
  const buf = await res.arrayBuffer();
  const buffer = Buffer.from(buf);
  if (!buffer.length) {
    throw new Error(`PDF export returned empty body (content-length=${contentLength || "unknown"})`);
  }
  return { buffer, engine };
};

const analyzePreview = async (page, probes = {}) => {
  return page.evaluate((overflowTolerance, probeMap) => {
    const pages = Array.from(document.querySelectorAll(".pagedjs_page"));
    const markers = {};
    const markerPositions = {};
    const textMatches = {};
    const overflows = [];
    const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const deriveColumn = (markerEl, contentEl, pageEl) => {
      const columnRoot = markerEl.closest('.md-columns') || contentEl;
      if (!columnRoot) return 1;
      const style = getComputedStyle(columnRoot);
      const count = Math.max(1, Number.parseInt(style.columnCount || columnRoot.dataset.count || '1', 10) || 1);
      if (count <= 1) return 1;
      const gap = Number.parseFloat(style.columnGap || columnRoot.dataset.gap || '0') || 0;
      const rootRect = columnRoot.getBoundingClientRect();
      const markerRect = markerEl.getBoundingClientRect();
      const relativeCenter = (markerRect.left - rootRect.left) + (markerRect.width / 2);
      const columnWidth = (rootRect.width - (gap * (count - 1))) / count;
      const slotWidth = columnWidth + gap;
      return Math.min(count, Math.max(1, Math.floor(relativeCenter / slotWidth) + 1));
    };
    const overflowSelectors = ["pre", "img", "figure", "blockquote", ".md-columns", ".admonition"];
    const pageSummaries = pages.map((pageEl, index) => {
      const content = pageEl.querySelector(".pagedjs_page_content");
      const contentRect = content?.getBoundingClientRect();
      const searchableText = normalize(pageEl.textContent || "");
      const markerEls = Array.from(pageEl.querySelectorAll("[data-layout-marker]"));
      const markerIds = markerEls.map((el) => el.getAttribute("data-layout-marker")).filter(Boolean);
      markerIds.forEach((id) => {
        if (!markers[id]) markers[id] = [];
        markers[id].push(index + 1);
      });
      markerEls.forEach((el) => {
        const id = el.getAttribute('data-layout-marker');
        if (!id) return;
        if (!markerPositions[id]) markerPositions[id] = [];
        const rect = el.getBoundingClientRect();
        markerPositions[id].push({
          page: index + 1,
          x: Number((rect.left - pageEl.getBoundingClientRect().left).toFixed(2)),
          y: Number((rect.top - pageEl.getBoundingClientRect().top).toFixed(2)),
          column: deriveColumn(el, content, pageEl)
        });
      });

      Object.entries(probeMap).forEach(([key, text]) => {
        if (!textMatches[key]) textMatches[key] = [];
        if (searchableText.includes(text)) {
          textMatches[key].push(index + 1);
        }
      });

      if (contentRect) {
        Array.from(content.querySelectorAll(overflowSelectors.join(", "))).forEach((child) => {
          const rect = child.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          const exceeds = rect.left < contentRect.left - overflowTolerance ||
            rect.right > contentRect.right + overflowTolerance ||
            rect.bottom > contentRect.bottom + overflowTolerance;
          if (exceeds) {
            overflows.push({
              page: index + 1,
              tag: child.tagName.toLowerCase(),
              text: (child.textContent || "").trim().slice(0, 120),
              rect: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom
              },
              contentRect: {
                left: contentRect.left,
                right: contentRect.right,
                top: contentRect.top,
                bottom: contentRect.bottom
              }
            });
          }
        });
      }

      return {
        page: index + 1,
        width: Math.round(pageEl.getBoundingClientRect().width),
        height: Math.round(pageEl.getBoundingClientRect().height),
        contentBox: contentRect ? {
          left: Number(contentRect.left.toFixed(2)),
          right: Number(contentRect.right.toFixed(2)),
          top: Number(contentRect.top.toFixed(2)),
          bottom: Number(contentRect.bottom.toFixed(2)),
          width: Number(contentRect.width.toFixed(2)),
          height: Number(contentRect.height.toFixed(2))
        } : null,
        contentCrop: contentRect ? {
          x: Number((contentRect.left - pageEl.getBoundingClientRect().left).toFixed(2)),
          y: Number((contentRect.top - pageEl.getBoundingClientRect().top).toFixed(2)),
          width: Number(contentRect.width.toFixed(2)),
          height: Number(contentRect.height.toFixed(2))
        } : null,
        headerText: (pageEl.querySelector(".pagedjs_margin-top")?.textContent || "").trim(),
        footerText: (pageEl.querySelector(".pagedjs_margin-bottom")?.textContent || "").trim(),
        markers: markerIds,
        searchableText: (pageEl.textContent || "").replace(/\s+/g, " ").trim().slice(0, 600)
      };
    });

    return {
      totalPages: pages.length,
      markers,
      markerPositions,
      textMatches,
      overflows,
      pages: pageSummaries
    };
  }, maxOverflowPx, Object.fromEntries(Object.entries(probes).map(([key, value]) => [key, value.text.toLowerCase().replace(/[^a-z0-9]+/g, "")])));
};

const renderPdfPagesWithPdfJs = async ({ browser, pdfBuffer, targetWidth, targetHeight, count }) => {
  const page = await browser.newPage();
  await page.setViewport({ width: targetWidth, height: targetHeight, deviceScaleFactor: 1 });

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body { margin: 0; padding: 0; background: #fff; }
        canvas { display: block; }
      </style>
      <script src="${baseUrl}/static/vendor/pdfjs/pdf.min.js"></script>
    </head>
    <body>
      <script>
        window.__renderPdf = async function(base64, targetWidth, targetHeight, count) {
          const raw = atob(base64);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

          pdfjsLib.GlobalWorkerOptions.workerSrc = "${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js";
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          const total = Math.min(count, pdf.numPages);
          const results = [];

          for (let p = 1; p <= total; p += 1) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 1 });
            const scale = targetWidth / viewport.width;
            const scaled = page.getViewport({ scale });

            const renderCanvas = document.createElement("canvas");
            renderCanvas.width = Math.round(scaled.width);
            renderCanvas.height = Math.round(scaled.height);
            const renderCtx = renderCanvas.getContext("2d", { alpha: false });
            renderCtx.fillStyle = "#ffffff";
            renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

            await page.render({ canvasContext: renderCtx, viewport: scaled }).promise;

            const finalCanvas = document.createElement("canvas");
            finalCanvas.width = targetWidth;
            finalCanvas.height = targetHeight;
            const finalCtx = finalCanvas.getContext("2d", { alpha: false });
            finalCtx.fillStyle = "#ffffff";
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            finalCtx.drawImage(renderCanvas, 0, 0);

            results.push(finalCanvas.toDataURL("image/png"));
          }

          return results;
        };
      </script>
    </body>
  </html>`;

  await page.setContent(html, { waitUntil: "load" });

  const base64 = pdfBuffer.toString("base64");
  const dataUrls = await page.evaluate(
    (payload) => window.__renderPdf(payload.base64, payload.targetWidth, payload.targetHeight, payload.count),
    { base64, targetWidth, targetHeight, count }
  );

  await page.close();
  return dataUrls;
};

const analyzePdfWithPdfJs = async ({ browser, pdfBuffer, markers, probes = {} }) => {
  const page = await browser.newPage();
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <script src="${baseUrl}/static/vendor/pdfjs/pdf.min.js"></script>
    </head>
    <body>
      <script>
        window.__analyzePdf = async function(base64, markerMap, probeMap) {
          const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
          const raw = atob(base64);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

          pdfjsLib.GlobalWorkerOptions.workerSrc = "${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js";
          const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
          const markerPages = {};
          const markerPositions = {};
          const textMatches = {};
          const pages = [];

          for (let p = 1; p <= pdf.numPages; p += 1) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 1 });
            const textContent = await page.getTextContent();
            const joinedText = textContent.items.map((item) => item.str).join("");
            const searchableText = normalize(joinedText);
            pages.push({
              page: p,
              width: Number(viewport.width.toFixed(2)),
              height: Number(viewport.height.toFixed(2)),
              textSample: joinedText.replace(/\s+/g, " ").trim().slice(0, 400)
            });

            Object.entries(markerMap).forEach(([id, token]) => {
              if (!markerPages[id] && joinedText.includes(token)) {
                markerPages[id] = p;
              }
            });

            textContent.items.forEach((item) => {
              const normalizedItem = normalize(item.str || "");
              Object.entries(markerMap).forEach(([id, token]) => {
                if (markerPositions[id]) return;
                if (!normalizedItem || !normalizedItem.includes(normalize(token))) return;
                const x = Number((item.transform?.[4] || 0).toFixed(2));
                const y = Number((viewport.height - (item.transform?.[5] || 0)).toFixed(2));
                markerPositions[id] = {
                  page: p,
                  x,
                  y,
                  column: x < (viewport.width / 2) ? 1 : 2
                };
              });
            });

            Object.entries(probeMap).forEach(([key, text]) => {
              if (!textMatches[key]) textMatches[key] = [];
              if (searchableText.includes(text)) {
                textMatches[key].push(p);
              }
            });
          }

          return { totalPages: pdf.numPages, pages, markerPages, markerPositions, textMatches };
        };
      </script>
    </body>
  </html>`;

  await page.setContent(html, { waitUntil: "load" });
  const base64 = pdfBuffer.toString("base64");
  const markerMap = Object.fromEntries(markers.map((marker) => [marker.id, markerText(marker.id)]));
  const probeMap = Object.fromEntries(Object.entries(probes).map(([key, value]) => [key, value.text.toLowerCase().replace(/[^a-z0-9]+/g, "")]));
  const analysis = await page.evaluate((payload) => window.__analyzePdf(payload.base64, payload.markerMap, payload.probeMap), {
    base64,
    markerMap,
    probeMap
  });
  await page.close();
  return analysis;
};

const compareImages = (previewPaths, pdfPaths, fixtureDir, previewPages = []) => {
  const results = [];
  const count = Math.min(previewPaths.length, pdfPaths.length);

  const resizeNearest = (src, targetWidth, targetHeight) => {
    if (src.width === targetWidth && src.height === targetHeight) return src;
    const out = new PNG({ width: targetWidth, height: targetHeight });
    for (let y = 0; y < targetHeight; y += 1) {
      const srcY = Math.min(src.height - 1, Math.round((y / targetHeight) * src.height));
      for (let x = 0; x < targetWidth; x += 1) {
        const srcX = Math.min(src.width - 1, Math.round((x / targetWidth) * src.width));
        const srcIdx = (src.width * srcY + srcX) * 4;
        const dstIdx = (targetWidth * y + x) * 4;
        out.data[dstIdx] = src.data[srcIdx];
        out.data[dstIdx + 1] = src.data[srcIdx + 1];
        out.data[dstIdx + 2] = src.data[srcIdx + 2];
        out.data[dstIdx + 3] = src.data[srcIdx + 3];
      }
    }
    return out;
  };

  const cropPng = (src, crop) => {
    if (!crop) return src;
    const x = Math.max(0, Math.floor(crop.x));
    const y = Math.max(0, Math.floor(crop.y));
    const width = Math.max(1, Math.min(src.width - x, Math.floor(crop.width)));
    const height = Math.max(1, Math.min(src.height - y, Math.floor(crop.height)));
    const out = new PNG({ width, height });

    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const srcIdx = ((src.width * (y + row)) + (x + col)) * 4;
        const dstIdx = ((width * row) + col) * 4;
        out.data[dstIdx] = src.data[srcIdx];
        out.data[dstIdx + 1] = src.data[srcIdx + 1];
        out.data[dstIdx + 2] = src.data[srcIdx + 2];
        out.data[dstIdx + 3] = src.data[srcIdx + 3];
      }
    }

    return out;
  };

  for (let i = 0; i < count; i += 1) {
    const previewImg = PNG.sync.read(fs.readFileSync(previewPaths[i]));
    const pdfImg = PNG.sync.read(fs.readFileSync(pdfPaths[i]));
    const crop = previewPages[i]?.contentCrop || null;
    const previewCropped = cropPng(previewImg, crop);
    const pdfCropped = cropPng(pdfImg, crop);
    const width = Math.min(previewCropped.width, pdfCropped.width);
    const height = Math.min(previewCropped.height, pdfCropped.height);
    const previewCrop = resizeNearest(previewCropped, width, height);
    const pdfCrop = resizeNearest(pdfCropped, width, height);

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(previewCrop.data, pdfCrop.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: true
    });

    const diffRatio = diffPixels / (width * height);
    const diffPath = path.join(fixtureDir, `diff-${String(i + 1).padStart(2, "0")}.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    results.push({
      page: i + 1,
      diffRatio,
      diffPixels,
      diffPath,
      comparedRegion: crop ? "content" : "page"
    });
  }

  return results;
};

const rasterizePdfImages = async ({ browser, pdfBuffer, previewImagePaths, fixtureDir, warnings }) => {
  if (!previewImagePaths.length) return [];

  const target = PNG.sync.read(fs.readFileSync(previewImagePaths[0]));
  try {
    const dataUrls = await renderPdfPagesWithPdfJs({
      browser,
      pdfBuffer,
      targetWidth: target.width,
      targetHeight: target.height,
      count: previewImagePaths.length
    });

    return dataUrls.map((url, index) => {
      const filePath = path.join(fixtureDir, `pdf-${index + 1}.png`);
      fs.writeFileSync(filePath, Buffer.from((url.split(",")[1] || ""), "base64"));
      return filePath;
    });
  } catch (err) {
    warnings.push(`pdf.js rasterization failed: ${err?.message || err}`);
    if (!hasPdfToPpm()) {
      warnings.push("pdftoppm not available; skipping PDF rasterization and diff.");
      return [];
    }

    const prefix = path.join(fixtureDir, "pdf");
    const pdfPath = path.join(fixtureDir, "export.pdf");
    const ppm = spawnSync(
      "pdftoppm",
      ["-png", "-scale-to-x", String(target.width), "-scale-to-y", String(target.height), pdfPath, prefix],
      { stdio: "ignore" }
    );
    if (ppm.status !== 0) {
      warnings.push("pdftoppm failed; skipping diff.");
      return [];
    }

    return fs.readdirSync(fixtureDir)
      .filter((name) => name.startsWith("pdf-") && name.endsWith(".png"))
      .sort()
      .map((name) => path.join(fixtureDir, name));
  }
};

const createAssertion = (id, passed, details = {}) => ({ id, passed, ...details });

const assertMarkerPages = (scope, actualPages, marker) => {
  const actualPage = actualPages?.[marker.id] ?? null;
  const assertions = [
    createAssertion(`${scope}:marker:${marker.id}:present`, actualPage !== null, {
      expected: "marker present",
      actual: actualPage
    })
  ];

  if (actualPage !== null && Number.isInteger(marker[`${scope}Page`])) {
    assertions.push(createAssertion(`${scope}:marker:${marker.id}:page`, actualPage === marker[`${scope}Page`], {
      expected: marker[`${scope}Page`],
      actual: actualPage
    }));
  }

  const minKey = `min${scope[0].toUpperCase()}${scope.slice(1)}Page`;
  if (actualPage !== null && Number.isInteger(marker[minKey])) {
    assertions.push(createAssertion(`${scope}:marker:${marker.id}:min-page`, actualPage >= marker[minKey], {
      expected: `>= ${marker[minKey]}`,
      actual: actualPage
    }));
  }

  return assertions;
};

const buildPreviewAssertions = (fixture, preview) => {
  const assertions = [
    createAssertion("preview:min-pages", preview.totalPages >= fixture.expected.minPages, {
      expected: `>= ${fixture.expected.minPages}`,
      actual: preview.totalPages
    })
  ];

  if (fixture.expected.firstPageHeaderHidden) {
    assertions.push(createAssertion("preview:first-page-header-hidden", !preview.pages[0]?.headerText, {
      expected: "empty header",
      actual: preview.pages[0]?.headerText || ""
    }));
  }

  if (fixture.expected.firstPageFooterPattern) {
    assertions.push(createAssertion(
      "preview:first-page-footer",
      fixture.expected.firstPageFooterPattern.test(preview.pages[0]?.footerText || ""),
      {
        expected: fixture.expected.firstPageFooterPattern.toString(),
        actual: preview.pages[0]?.footerText || ""
      }
    ));
  }

  if (fixture.expected.requireNoOverflow) {
    assertions.push(createAssertion("preview:no-overflow", preview.overflows.length === 0, {
      expected: 0,
      actual: preview.overflows.length,
      sample: preview.overflows[0] || null
    }));
  }

  for (const marker of fixture.markers) {
    const pages = preview.markers[marker.id] || [];
    assertions.push(...assertMarkerPages("preview", { [marker.id]: pages[0] ?? null }, marker));
    if (Number.isInteger(marker.previewColumn)) {
      const position = preview.markerPositions?.[marker.id]?.[0] || null;
      assertions.push(createAssertion(`preview:marker:${marker.id}:column`, position?.column === marker.previewColumn, {
        expected: marker.previewColumn,
        actual: position?.column ?? null
      }));
    }
  }

  Object.entries(fixture.expected.textProbes || {}).forEach(([key, probe]) => {
    const pages = preview.textMatches?.[key] || [];
    assertions.push(createAssertion(`preview:text-probe:${key}`, pages.length >= (probe.minPreviewPages || 1), {
      expected: `>= ${probe.minPreviewPages || 1} pages`,
      actual: pages.length,
      pages,
      text: probe.text
    }));
  });

  return assertions;
};

const buildPdfAssertions = (fixture, pdf) => {
  const assertions = [
    createAssertion("pdf:engine", pdf.engine === "chromium", {
      expected: "chromium",
      actual: pdf.engine
    }),
    createAssertion("pdf:min-pages", pdf.analysis.totalPages >= fixture.expected.minPages, {
      expected: `>= ${fixture.expected.minPages}`,
      actual: pdf.analysis.totalPages
    })
  ];

  for (const marker of fixture.markers) {
    assertions.push(...assertMarkerPages("pdf", pdf.analysis.markerPages, marker));
    if (Number.isInteger(marker.pdfColumn)) {
      const position = pdf.analysis.markerPositions?.[marker.id] || null;
      assertions.push(createAssertion(`pdf:marker:${marker.id}:column`, position?.column === marker.pdfColumn, {
        expected: marker.pdfColumn,
        actual: position?.column ?? null
      }));
    }
  }

  Object.entries(fixture.expected.textProbes || {}).forEach(([key, probe]) => {
    const pages = pdf.analysis.textMatches?.[key] || [];
    assertions.push(createAssertion(`pdf:text-probe:${key}`, pages.length >= (probe.minPdfPages || 1), {
      expected: `>= ${probe.minPdfPages || 1} pages`,
      actual: pages.length,
      pages,
      text: probe.text
    }));
  });

  return assertions;
};

const buildParityAssertions = (fixture, preview, pdf) => {
  const assertions = [
    createAssertion("parity:page-count", preview.totalPages === pdf.analysis.totalPages, {
      expected: preview.totalPages,
      actual: pdf.analysis.totalPages
    })
  ];

  for (const marker of fixture.markers) {
    const previewPage = preview.markers?.[marker.id]?.[0] ?? null;
    const pdfPage = pdf.analysis.markerPages?.[marker.id] ?? null;
    assertions.push(createAssertion(`parity:marker:${marker.id}:page`, previewPage !== null && previewPage === pdfPage, {
      expected: previewPage,
      actual: pdfPage
    }));

    if (marker.requireColumnParity) {
      const previewColumn = preview.markerPositions?.[marker.id]?.[0]?.column ?? null;
      const pdfColumn = pdf.analysis.markerPositions?.[marker.id]?.column ?? null;
      assertions.push(createAssertion(`parity:marker:${marker.id}:column`, previewColumn !== null && previewColumn === pdfColumn, {
        expected: previewColumn,
        actual: pdfColumn
      }));
    }
  }

  return assertions;
};

const buildVisualAssertions = (visualDiffs) => {
  if (!visualDiffs.length) {
    return [createAssertion("visual:diff-generated", false, { expected: "visual diffs", actual: "missing" })];
  }

  const worst = visualDiffs.reduce((current, item) => (item.diffRatio > current.diffRatio ? item : current), visualDiffs[0]);
  if (!enforceVisualDiff) {
    return [createAssertion("visual:diff-generated", true, {
      expected: "visual diffs",
      actual: `${visualDiffs.length} diff pages`,
      worstPage: worst.page,
      worstDiffRatio: worst.diffRatio,
      diffPath: worst.diffPath
    })];
  }

  return [createAssertion("visual:max-diff-ratio", worst.diffRatio <= maxAllowedDiffRatio, {
    expected: `<= ${maxAllowedDiffRatio}`,
    actual: worst.diffRatio,
    worstPage: worst.page,
    diffPath: worst.diffPath
  })];
};

const summarizeAssertions = (assertions) => {
  const failed = assertions.filter((assertion) => !assertion.passed);
  return {
    total: assertions.length,
    failed: failed.length,
    failedIds: failed.map((assertion) => assertion.id)
  };
};

const runFixture = async ({ browser, appPage, fixture }) => {
  const fixtureDir = path.join(outDir, slugify(fixture.id));
  ensureDir(fixtureDir);

  const result = {
    id: fixture.id,
    title: fixture.title,
    fixtureDir,
    warnings: [],
    assertions: [],
    preview: null,
    pdf: null,
    visual: null,
    status: "failed"
  };

  try {
    await showPreviewForFixture(appPage, fixture.markdown);
    await normalizePreviewForCapture(appPage);

    const preview = await analyzePreview(appPage, fixture.expected.textProbes || {});
    const pageHandles = await getPageHandles(appPage);
    const previewImages = await takePreviewShots(pageHandles, fixtureDir);
    const previewAssertions = buildPreviewAssertions(fixture, preview);

    const payload = await capturePagedExportPayload(appPage);
    const exportHtml = payload.styles
      ? `<style data-export-paged="1">${payload.styles}</style>${payload.html}`
      : payload.html;
    const { buffer: pdfBuffer, engine } = await fetchPdfFromApi({ markdown: fixture.markdown, html: exportHtml });
    const pdfPath = path.join(fixtureDir, "export.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);

    const pdfAnalysis = await analyzePdfWithPdfJs({
      browser,
      pdfBuffer,
      markers: fixture.markers,
      probes: fixture.expected.textProbes || {}
    });
    const pdfImages = await rasterizePdfImages({
      browser,
      pdfBuffer,
      previewImagePaths: previewImages,
      fixtureDir,
      warnings: result.warnings
    });
    const visualDiffs = pdfImages.length ? compareImages(previewImages, pdfImages, fixtureDir, preview.pages) : [];

    const pdfAssertions = buildPdfAssertions(fixture, { engine, analysis: pdfAnalysis });
    const parityAssertions = buildParityAssertions(fixture, preview, { engine, analysis: pdfAnalysis });
    const visualAssertions = engine === "chromium" ? buildVisualAssertions(visualDiffs) : [];

    result.preview = {
      ...preview,
      images: previewImages
    };
    result.pdf = {
      engine,
      path: pdfPath,
      analysis: pdfAnalysis,
      images: pdfImages
    };
    result.visual = {
      diffs: visualDiffs
    };
    result.assertions = [...previewAssertions, ...pdfAssertions, ...parityAssertions, ...visualAssertions];
  } catch (err) {
    result.warnings.push(err?.message || String(err));
    result.assertions.push(createAssertion("fixture:run", false, {
      expected: "fixture run completes",
      actual: err?.message || String(err)
    }));
  }

  result.summary = summarizeAssertions(result.assertions);
  result.status = result.summary.failed === 0 ? "passed" : "failed";
  return result;
};

const run = async () => {
  ensureDir(outDir);

  const chromiumCmd = resolveChromium();
  if (!chromiumCmd) {
    throw new Error("Chromium binary not found. Set CHROMIUM_BIN or install chromium.");
  }

  const browser = await puppeteer.launch({
    executablePath: chromiumCmd,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outDir,
    chromiumCmd,
    requireChromiumPaged,
    fixtures: []
  };

  try {
    const appPage = await browser.newPage();
    await appPage.goto(baseUrl, { waitUntil: "networkidle0" });
    await appPage.waitForFunction(() => window.editor && window.printPreview, { timeout: 30000 });

    for (const fixture of fixtures) {
      const result = await runFixture({ browser, appPage, fixture });
      report.fixtures.push(result);
    }

    report.summary = {
      totalFixtures: report.fixtures.length,
      passedFixtures: report.fixtures.filter((fixture) => fixture.status === "passed").length,
      failedFixtures: report.fixtures.filter((fixture) => fixture.status === "failed").length,
      totalAssertions: report.fixtures.reduce((sum, fixture) => sum + fixture.summary.total, 0),
      failedAssertions: report.fixtures.reduce((sum, fixture) => sum + fixture.summary.failed, 0)
    };
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Layout runner complete: ${reportPath}`);
  for (const fixture of report.fixtures) {
    console.log(`${fixture.status.toUpperCase()} ${fixture.id} (${fixture.summary.failed}/${fixture.summary.total} failed)`);
  }

  if (report.summary.failedAssertions > 0) {
    process.exitCode = 1;
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
