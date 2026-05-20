#!/usr/bin/env node
// Generates docs/assets/readme-pdf-output.png and docs/examples/example-output.pdf
// from docs/examples/example.md using the running dev server (port 3210).
//
// Usage: node scripts/generate-readme-assets.js
//
// Prerequisites:
//   - Dev server running: node server.js  (or docker start mdedit-io)
//   - Chromium available at /snap/bin/chromium

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3210';
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOT_OUT = path.join(ROOT, 'docs', 'assets', 'readme-pdf-output.png');
const PDF_OUT = path.join(ROOT, 'docs', 'examples', 'example-output.pdf');
// Use masterthesis-reference-en.md for both the screenshot and the sample PDF.
// The English version matches the thesis-writing.html landing page language,
// produces a realistic-looking academic document with citations, TOC, and
// all scientific layout features, and avoids a mid-session document switch
// that can cause re-render race conditions.
const DEMO_SOURCE = path.join(ROOT, 'docs', 'examples', 'masterthesis-reference-en.md');

// ── Helpers ────────────────────────────────────────────────────────────────

const normalizeText = (text) =>
  String(text || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const extractPreviewAnchor = (markdown) => {
  const firstLine = String(markdown || '').replace(/\r/g, '').split('\n').find((l) => l.trim());
  return firstLine ? firstLine.replace(/^#+\s*/, '').trim() : '';
};

const waitForEditorReady = async (page) => {
  await page.waitForFunction(
    () => Boolean(window.editor && window.printPreview && window.__mdTestApi?.serializePreviewForExport),
    { timeout: 120000 }
  );
};

const setMarkdown = async (page, markdown) => {
  await page.evaluate((content) => window.editor.setValue(content), markdown);

  await page.waitForFunction(
    (expected) => (window.editor?.getValue?.() || '') === expected,
    { timeout: 120000 },
    markdown
  );

  const previewAnchor = normalizeText(extractPreviewAnchor(markdown)).slice(0, 120);
  if (!previewAnchor) return;

  await page.waitForFunction(
    (expected) => {
      const previewText = String(document.getElementById('preview')?.textContent || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
      return previewText.includes(expected);
    },
    { timeout: 120000 },
    previewAnchor
  );
};

const showScientificPagedPreview = async (page) => {
  await page.evaluate(async () => {
    delete window.__mdGeneratePreviewState;
    const scientificButton = document.querySelector('.preview-preset-item[data-preset="scientific"]');
    scientificButton?.click();

    if (window.printPreview.isActive) {
      await window.printPreview.refresh();
      return;
    }
    await window.printPreview.show();
  });

  await page.waitForFunction(
    () => {
      const totalPages = document.querySelectorAll('#printPreview .pagedjs_page').length;
      const hasErrorPreview = Boolean(document.querySelector('#printPreview .error-preview'));
      const preview = window.printPreview;
      if (hasErrorPreview) return true;

      const now = performance.now();
      const state = window.__mdGeneratePreviewState || { lastCount: totalPages, stableSince: now };

      if (preview?.isRendering || state.lastCount !== totalPages) {
        state.lastCount = totalPages;
        state.stableSince = now;
      }
      window.__mdGeneratePreviewState = state;

      return totalPages > 0 && !preview?.isRendering && (now - state.stableSince) >= 500;
    },
    { timeout: 120000 }
  );

  const renderState = await page.evaluate(() => ({
    totalPages: document.querySelectorAll('#printPreview .pagedjs_page').length,
    errorText: document.querySelector('#printPreview .error-preview')?.textContent?.trim() || null
  }));

  if (renderState.errorText) throw new Error(`Print preview error: ${renderState.errorText}`);
  if (renderState.totalPages === 0) throw new Error('Print preview produced no pages');

  console.log(`  Preview rendered: ${renderState.totalPages} page(s)`);
};

/** POST JSON to server, returns Buffer of response body. */
const httpPost = (url, body) =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${buf.toString().slice(0, 300)}`));
          } else {
            resolve(buf);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DEMO_SOURCE)) {
    throw new Error(`Source document not found: ${DEMO_SOURCE}`);
  }
  const markdown = fs.readFileSync(DEMO_SOURCE, 'utf8');
  console.log(`Loaded masterthesis-reference.md (${markdown.length} chars)`);

  // Ensure output directories exist
  fs.mkdirSync(path.dirname(SCREENSHOT_OUT), { recursive: true });
  fs.mkdirSync(path.dirname(PDF_OUT), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log(`Navigating to ${BASE_URL} ...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 60000 });

    console.log('Waiting for editor...');
    await waitForEditorReady(page);

    // Dismiss the tips/welcome modal if it is visible so it does not obscure the screenshot.
    await page.evaluate(() => {
      const modal = document.getElementById('tipsModal');
      const overlay = document.getElementById('tipsOverlay');
      if (modal && !modal.classList.contains('hidden')) {
        document.getElementById('tipsClose')?.click();
      }
      // Fallback: just hide directly
      modal?.classList.add('hidden');
      if (overlay) overlay.classList.add('hidden');
    });
    await new Promise((r) => setTimeout(r, 200));

    console.log('Setting markdown...');
    await setMarkdown(page, markdown);

    console.log('Rendering scientific print preview...');
    await showScientificPagedPreview(page);

    // ── Screenshot ──────────────────────────────────────────────────────────
    // Capture a clean A4 page from the print preview as the README screenshot.
    // Page 3 of the masterthesis tends to be the abstract / intro with nice text.
    // Hide the fixed page-navigation bar so it doesn't overlay the screenshot.
    await page.evaluate(() => {
      const ctrl = document.querySelector('.print-preview-controls');
      if (ctrl) ctrl.style.display = 'none';
    });

    const targetPageEl = await page.$('#printPreview .pagedjs_page:nth-child(3)');
    if (!targetPageEl) throw new Error('Could not find target pagedjs_page element');

    await targetPageEl.scrollIntoView();
    await new Promise((r) => setTimeout(r, 300));

    const rect = await targetPageEl.boundingBox();
    if (!rect) throw new Error('Could not get bounding box of page element');

    await page.screenshot({ path: SCREENSHOT_OUT, clip: rect });

    // Restore controls bar
    await page.evaluate(() => {
      const ctrl = document.querySelector('.print-preview-controls');
      if (ctrl) ctrl.style.display = '';
    });

    console.log(`Screenshot saved → ${SCREENSHOT_OUT}`);

    // ── PDF export ──────────────────────────────────────────────────────────
    // Serialize the rendered Paged.js DOM and send it to the server's PDF
    // endpoint, which uses Chromium+Paged.js to produce a print-ready PDF.
    // The preview is already rendered from the same markdown (masterthesis).
    console.log('Serializing preview for PDF export...');
    const html = await page.evaluate(async () =>
      window.__mdTestApi.serializePreviewForExport({ forPdf: true })
    );
    if (!html) throw new Error('serializePreviewForExport returned empty HTML');

    console.log(`Exporting PDF via server API (${BASE_URL}/api/export/pdf) ...`);
    const pdfBuffer = await httpPost(`${BASE_URL}/api/export/pdf`, {
      markdown,
      html,
      paged: true,
      requireChromiumPaged: true
    });

    fs.writeFileSync(PDF_OUT, pdfBuffer);
    console.log(`PDF saved → ${PDF_OUT} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  } finally {
    await browser.close();
  }

  console.log('\nDone. Files generated:');
  console.log(`  ${SCREENSHOT_OUT}`);
  console.log(`  ${PDF_OUT}`);
}

main().catch((err) => {
  console.error('\nError:', err.message || err);
  process.exit(1);
});
