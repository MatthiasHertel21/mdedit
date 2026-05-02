import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const baseUrl = process.env.BASE_URL || "http://localhost:3210";
const pageLimit = Number(process.env.PAGE_LIMIT || "5");
const outDir = process.env.OUT_DIR || path.join(process.cwd(), "tmp", `visual-smoke-${Date.now()}`);

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

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
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <script>
        window.__renderPdf = async function(base64, targetWidth, targetHeight, count) {
          const raw = atob(base64);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
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

const markdownFixture = () => {
  const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ";
  const body = Array.from({ length: 120 }, () => lorem).join("");
  return [
    "# SAWEM Market Code Rev 2.1 - Compliance Summary",
    "",
    "Status: February 6, 2026",
    "",
    "Overall Compliance: 95% SAWEM-compliant",
    "",
    "---",
    "",
    "## 1. Compliance Overview",
    "",
    "| Category | Compliance | Key Features |",
    "|---|---|---|",
    "| Bidding Rules | 100% | Multi-bid (A/B/C lots), monotonicity, gate closure |",
    "| Market Clearing | 95% | Merit order, pro-rata, must-run units |",
    "| Pricing Mechanisms | 95% | SMP, IDP with ±5% cap, price floor/cap |",
    "| Balancing & Settlement | 85% | Imbalance settlement, static balancing prices |",
    "| Intraday Markets | 100% | IDP calculation, gate closure, metadata tracking |",
    "| Delta-Based Clearing | 100% | DA baseline, delta calculation, split settlement |",
    "| Transmission | 0% | Not implemented (simplified zones only) |",
    "",
    "Overall: 95% compliance across all relevant SAWEM requirements",
    "",
    "---",
    "",
    "## 2. Feature Implementation Details",
    "",
    body,
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
};

const waitForPagedReady = async (page) => {
  await page.waitForFunction(() => {
    const pages = document.querySelectorAll(".pagedjs_page");
    const preview = window.printPreview;
    return pages.length > 0 && preview && !preview.isRendering;
  }, { timeout: 60000 });
};

const getPageHandles = async (page) => {
  return page.$$(".pagedjs_page");
};

const takePreviewShots = async (page, handles) => {
  const paths = [];
  const count = Math.min(handles.length, pageLimit);
  for (let i = 0; i < count; i += 1) {
    const filePath = path.join(outDir, `preview-${String(i + 1).padStart(2, "0")}.png`);
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
    body: JSON.stringify({ markdown, html, paged: true })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PDF export failed: ${res.status} ${text}`);
  }
  const contentLength = res.headers.get("content-length");
  const buf = await res.arrayBuffer();
  const buffer = Buffer.from(buf);
  if (!buffer.length) {
    throw new Error(`PDF export returned empty body (content-length=${contentLength || "unknown"})`);
  }
  return buffer;
};

const compareImages = (previewPaths, pdfPaths) => {
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

  for (let i = 0; i < count; i += 1) {
    const previewImg = PNG.sync.read(fs.readFileSync(previewPaths[i]));
    const pdfImg = PNG.sync.read(fs.readFileSync(pdfPaths[i]));
    const width = Math.min(previewImg.width, pdfImg.width);
    const height = Math.min(previewImg.height, pdfImg.height);
    const previewCrop = resizeNearest(previewImg, width, height);
    const pdfCrop = resizeNearest(pdfImg, width, height);

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(previewCrop.data, pdfCrop.data, diff.data, width, height, {
      threshold: 0.1,
      includeAA: true
    });

    const diffRatio = diffPixels / (width * height);
    const diffPath = path.join(outDir, `diff-${String(i + 1).padStart(2, "0")}.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    results.push({
      page: i + 1,
      diffRatio,
      diffPixels,
      diffPath
    });
  }

  return results;
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
    baseUrl,
    outDir,
    pages: [],
    pdfPath: null,
    previewImages: [],
    pdfImages: [],
    diffs: [],
    warnings: []
  };

  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.editor && window.printPreview, { timeout: 30000 });

    const md = markdownFixture();
    await page.evaluate((content) => {
      window.editor.setValue(content);
    }, md);

    await page.evaluate(async () => {
      await window.printPreview.show();
    });

    await waitForPagedReady(page);

    const handles = await getPageHandles(page);
    report.pages = handles.length;

    report.previewImages = await takePreviewShots(page, handles);

    const payload = await capturePagedExportPayload(page);
    const exportHtml = payload.styles
      ? `<style data-export-paged="1">${payload.styles}</style>${payload.html}`
      : payload.html;
    const pdfBuffer = await fetchPdfFromApi({ markdown: md, html: exportHtml });

    const pdfPath = path.join(outDir, "export.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);
    report.pdfPath = pdfPath;

    const target = PNG.sync.read(fs.readFileSync(report.previewImages[0]));
    try {
      const dataUrls = await renderPdfPagesWithPdfJs({
        browser,
        pdfBuffer,
        targetWidth: target.width,
        targetHeight: target.height,
        count: Math.min(pageLimit, report.pages)
      });

      const pdfImages = dataUrls.map((url, idx) => {
        const base64 = url.split(",")[1] || "";
        const filePath = path.join(outDir, `pdf-${idx + 1}.png`);
        fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
        return filePath;
      });

      report.pdfImages = pdfImages;
      report.diffs = compareImages(report.previewImages, report.pdfImages);
    } catch (err) {
      report.warnings.push(`pdf.js rasterization failed: ${err?.message || err}`);
      if (!hasPdfToPpm()) {
        report.warnings.push("pdftoppm not available; skipping PDF rasterization and diff.");
      } else {
        const prefix = path.join(outDir, "pdf");
        const ppm = spawnSync(
          "pdftoppm",
          ["-png", "-scale-to-x", String(target.width), "-scale-to-y", String(target.height), pdfPath, prefix],
          { stdio: "ignore" }
        );
        if (ppm.status !== 0) {
          report.warnings.push("pdftoppm failed; skipping diff.");
        } else {
          const pdfImages = fs
            .readdirSync(outDir)
            .filter((name) => name.startsWith("pdf-") && name.endsWith(".png"))
            .sort()
            .map((name) => path.join(outDir, name));
          report.pdfImages = pdfImages;
          report.diffs = compareImages(report.previewImages, report.pdfImages);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Visual smoke test complete: ${reportPath}`);
  if (report.diffs.length) {
    const worst = report.diffs.reduce((a, b) => (b.diffRatio > a.diffRatio ? b : a));
    console.log(`Worst diff ratio: ${worst.diffRatio.toFixed(4)} on page ${worst.page}`);
  }

  if (report.warnings.length) {
    console.log("Warnings:");
    report.warnings.forEach((warning) => console.log(`- ${warning}`));
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
