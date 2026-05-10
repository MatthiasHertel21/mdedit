import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const DEFAULT_PERMALINK = 'https://md.2b6.de/95f91642-ae0f-4d40-be2d-fe8ce8dd43ad';
const permalinkArg = process.argv[2] || process.env.PERMALINK_URL || DEFAULT_PERMALINK;
const permalinkUrl = new URL(permalinkArg);
const sourceBaseUrl = process.env.SOURCE_BASE_URL || `${permalinkUrl.protocol}//${permalinkUrl.host}`;
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3210';
const baseOrigin = new URL(baseUrl).origin;
const shouldOpenLivePermalinkPage = baseOrigin === permalinkUrl.origin;
const auditMode = shouldOpenLivePermalinkPage ? 'live-permalink' : 'injected-markdown';
const outDir = process.env.OUT_DIR || path.join(process.cwd(), 'tmp', `paged-preview-parity-${Date.now()}`);
const minPageScore = Number(process.env.MIN_PAGE_SCORE || '0.58');
const headingMinLength = Number(process.env.HEADING_MIN_LENGTH || '8');
const commonTokenRatio = Number(process.env.COMMON_TOKEN_RATIO || '0.6');

const stopwords = new Set([
  'aber', 'alle', 'auch', 'beim', 'dass', 'diese', 'dieser', 'einem', 'einer', 'eines', 'eine', 'einen',
  'fuer', 'have', 'into', 'kann', 'kein', 'mehr', 'nach', 'noch', 'oder', 'page', 'pages', 'section',
  'sein', 'sind', 'such', 'that', 'their', 'there', 'these', 'this', 'und', 'unter', 'wird', 'with',
  'zwar'
]);

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const runOk = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'ignore' });
  return result.status === 0;
};

const resolveChromium = () => {
  const candidates = [
    process.env.CHROMIUM_BIN,
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable'
  ].filter(Boolean);

  for (const command of candidates) {
    if (runOk(command, ['--version'])) {
      return command;
    }
  }

  return null;
};

const normalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
};

const tokenize = (value) => {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 4)
    .filter((token) => !stopwords.has(token))
    .filter((token) => !/^\d+$/.test(token));
};

const uniqueTokens = (tokens) => Array.from(new Set(tokens));

const toShingles = (tokens, size = 4) => {
  if (tokens.length <= size) {
    return new Set(tokens);
  }

  const shingles = new Set();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    shingles.add(tokens.slice(index, index + size).join(' '));
  }
  return shingles;
};

const diceScore = (left, right) => {
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
};

const fetchSharedPaste = async () => {
  const pasteId = permalinkUrl.pathname.split('/').filter(Boolean).pop();
  const response = await fetch(`${sourceBaseUrl}/api/pastes/${pasteId}`);
  if (!response.ok) {
    throw new Error(`Could not load shared paste ${pasteId}: HTTP ${response.status}`);
  }
  return response.json();
};

const extractPreviewAnchor = (markdown) => {
  return String(markdown || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/[`*_~\[\]()]/g, '').trim())
    .find((line) => line.length >= headingMinLength)
    || '';
};

const waitForEditorReady = async (page) => {
  await page.waitForFunction(() => {
    return Boolean(window.editor && window.printPreview && window.__mdTestApi?.serializePreviewForExport);
  }, { timeout: 120000 });
};

const setMarkdown = async (page, markdown) => {
  await page.evaluate((content) => {
    window.editor.setValue(content);
  }, markdown);

  await page.waitForFunction((expected) => {
    return (window.editor?.getValue?.() || '') === expected;
  }, { timeout: 120000 }, markdown);

  const previewAnchor = normalizeText(extractPreviewAnchor(markdown)).slice(0, 120);
  if (!previewAnchor) {
    return;
  }

  await page.waitForFunction((expected) => {
    const previewText = String(document.getElementById('preview')?.textContent || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    return previewText.includes(expected);
  }, { timeout: 120000 }, previewAnchor);
};

const waitForLivePaste = async (page, markdown) => {
  await waitForEditorReady(page);

  if (markdown) {
    await page.waitForFunction((expected) => {
      return (window.editor?.getValue?.() || '') === expected;
    }, { timeout: 120000 }, markdown);
  }

  const previewAnchor = normalizeText(extractPreviewAnchor(markdown)).slice(0, 120);
  if (!previewAnchor) {
    return;
  }

  await page.waitForFunction((expected) => {
    const previewText = String(document.getElementById('preview')?.textContent || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    return previewText.includes(expected);
  }, { timeout: 120000 }, previewAnchor);
};

const extractRuntimeContext = async (page) => {
  return page.evaluate(() => {
    const appScript = Array.from(document.querySelectorAll('script[src]'))
      .map((node) => node.src)
      .find((src) => /\/app\.js/i.test(src)) || null;
    const printCss = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((node) => node.href)
      .find((href) => /\/print\.css/i.test(href)) || null;

    return {
      pageUrl: window.location.href,
      pageOrigin: window.location.origin,
      appScript,
      printCss
    };
  });
};

const showScientificPagedPreview = async (page) => {
  await page.evaluate(async () => {
    delete window.__mdParityPreviewState;
    const scientificButton = document.querySelector('.preview-preset-item[data-preset="scientific"]');
    scientificButton?.click();

    if (window.printPreview.isActive) {
      await window.printPreview.refresh();
      return;
    }

    await window.printPreview.show();
  });

  await page.waitForFunction(() => {
    const totalPages = document.querySelectorAll('#printPreview .pagedjs_page').length;
    const hasErrorPreview = Boolean(document.querySelector('#printPreview .error-preview'));
    const preview = window.printPreview;
    if (hasErrorPreview) {
      return true;
    }

    const now = performance.now();
    const state = window.__mdParityPreviewState || {
      lastCount: totalPages,
      stableSince: now
    };

    if (preview?.isRendering || state.lastCount !== totalPages) {
      state.lastCount = totalPages;
      state.stableSince = now;
    }

    window.__mdParityPreviewState = state;
    return totalPages > 0 && !preview?.isRendering && (now - state.stableSince) >= 250;
  }, { timeout: 120000 });

  const renderState = await page.evaluate(() => {
    const root = document.getElementById('printPreview');
    const errorPreview = root?.querySelector('.error-preview');
    return {
      isActive: Boolean(window.printPreview?.isActive),
      isRendering: Boolean(window.printPreview?.isRendering),
      totalPages: document.querySelectorAll('#printPreview .pagedjs_page').length,
      errorText: errorPreview?.textContent?.replace(/\s+/g, ' ').trim() || null,
      rootText: (root?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    };
  });

  if (renderState.errorText) {
    throw new Error(`Print preview render failed: ${renderState.errorText}`);
  }

  if (renderState.totalPages === 0) {
    throw new Error(
      `Print preview render produced no paged pages (active=${renderState.isActive}, rendering=${renderState.isRendering}): ${renderState.rootText || 'empty preview root'}`
    );
  }
};

const extractPreviewPages = async (page) => {
  return page.evaluate((minHeadingLength) => {
    const normalizeHeading = (value) => String(value || '').replace(/\s+/g, ' ').trim();

    const pages = Array.from(document.querySelectorAll('#printPreview .pagedjs_page')).map((pageEl, index) => {
      const contentRoot = pageEl.querySelector('.pagedjs_page_content') || pageEl;
      const headings = Array.from(contentRoot.querySelectorAll('h1, h2, h3, h4'))
        .map((node) => normalizeHeading(node.textContent))
        .filter((text) => text.length >= minHeadingLength);
      const text = String(contentRoot.innerText || contentRoot.textContent || '').replace(/\s+/g, ' ').trim();

      return {
        page: index + 1,
        headings,
        text,
        textLength: text.length
      };
    });

    return {
      totalPages: pages.length,
      pages
    };
  }, headingMinLength);
};

const captureExportHtml = async (page) => {
  return page.evaluate(async () => {
    return window.__mdTestApi.serializePreviewForExport({ forPdf: true });
  });
};

const exportPdf = async ({ markdown, html }) => {
  const response = await fetch(`${baseUrl}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      markdown,
      html,
      paged: true,
      requireChromiumPaged: true
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`PDF export failed: HTTP ${response.status} ${text}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    engine: response.headers.get('x-export-engine') || 'unknown'
  };
};

const extractPdfPages = async ({ browser, pdfBuffer }) => {
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await page.addScriptTag({ url: `${baseUrl}/static/vendor/pdfjs/pdf.min.js` });

    const base64 = pdfBuffer.toString('base64');
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
        const text = textContent.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
        pages.push({
          page: pageNumber,
          text,
          textLength: text.length
        });
      }

      return {
        totalPages: pages.length,
        pages
      };
    }, {
      base64,
      workerSrc: `${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js`
    });
  } finally {
    await page.close();
  }
};

const buildCommonTokenSet = (previewPages, pdfPages) => {
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
};

const comparePages = (previewPage, pdfPage, commonTokens) => {
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
    previewTokenCount: previewTokenSet.size,
    pdfTokenCount: pdfTokenSet.size
  };
};

const getBestMatches = (matrix, by = 'row') => {
  if (by === 'row') {
    return matrix.map((row, index) => {
      return row.reduce((best, current) => current.totalScore > best.totalScore ? current : best, row[0] || {
        previewPage: index + 1,
        pdfPage: 0,
        totalScore: 0,
        tokenScore: 0,
        shingleScore: 0
      });
    });
  }

  const width = matrix[0]?.length || 0;
  return Array.from({ length: width }, (_, columnIndex) => {
    const column = matrix.map((row) => row[columnIndex]).filter(Boolean);
    return column.reduce((best, current) => current.totalScore > best.totalScore ? current : best, column[0] || {
      previewPage: 0,
      pdfPage: columnIndex + 1,
      totalScore: 0,
      tokenScore: 0,
      shingleScore: 0
    });
  });
};

const buildHeadingChecks = (previewPages, pdfPages) => {
  return previewPages.flatMap((page) => {
    const pdfText = normalizeText(pdfPages[page.page - 1]?.text || '');
    return page.headings.map((heading) => {
      const normalizedHeading = normalizeText(heading);
      return {
        page: page.page,
        heading,
        presentInPdfPage: normalizedHeading.length === 0 ? true : pdfText.includes(normalizedHeading)
      };
    });
  });
};

const buildFailures = ({ preview, pdf, rowMatches, columnMatches, headingChecks }) => {
  const failures = [];

  if (preview.totalPages !== pdf.totalPages) {
    failures.push(`Page count mismatch: preview=${preview.totalPages}, pdf=${pdf.totalPages}`);
  }

  rowMatches.forEach((match) => {
    if (match.previewPage !== match.pdfPage) {
      failures.push(`Preview page ${match.previewPage} best matches PDF page ${match.pdfPage} (score ${match.totalScore})`);
      return;
    }

    if (match.totalScore < minPageScore) {
      failures.push(`Preview page ${match.previewPage} vs PDF page ${match.pdfPage} score too low (${match.totalScore} < ${minPageScore})`);
    }
  });

  columnMatches.forEach((match) => {
    if (match.previewPage !== match.pdfPage) {
      failures.push(`PDF page ${match.pdfPage} best matches preview page ${match.previewPage} (score ${match.totalScore})`);
      return;
    }

    if (match.totalScore < minPageScore) {
      failures.push(`PDF page ${match.pdfPage} vs preview page ${match.previewPage} score too low (${match.totalScore} < ${minPageScore})`);
    }
  });

  headingChecks
    .filter((entry) => !entry.presentInPdfPage)
    .forEach((entry) => {
      failures.push(`Heading missing on corresponding PDF page ${entry.page}: ${entry.heading}`);
    });

  return failures;
};

const summarize = (report) => {
  const lines = [
    `Permalink: ${report.permalinkUrl}`,
    `Audit mode: ${report.auditMode}`,
    `Opened URL: ${report.openedUrl}`,
    `Runtime origin: ${report.runtime.pageOrigin}`,
    `Runtime app: ${report.runtime.appScript || 'n/a'}`,
    `Preview pages: ${report.preview.totalPages}`,
    `PDF pages: ${report.pdf.totalPages}`,
    `PDF engine: ${report.pdf.engine}`,
    `Row matches: ${report.matches.rows.map((entry) => `${entry.previewPage}->${entry.pdfPage} (${entry.totalScore})`).join(', ')}`,
    `Column matches: ${report.matches.columns.map((entry) => `${entry.pdfPage}->${entry.previewPage} (${entry.totalScore})`).join(', ')}`,
    `Heading checks: ${report.headingChecks.length}`,
    `Result: ${report.failures.length === 0 ? 'PASS' : 'FAIL'}`
  ];

  if (report.failures.length) {
    report.failures.forEach((failure) => lines.push(`- ${failure}`));
  }

  console.log(lines.join('\n'));
};

const main = async () => {
  ensureDir(outDir);
  const chromium = resolveChromium();
  if (!chromium) {
    throw new Error('Chromium binary not found. Set CHROMIUM_BIN or install chromium.');
  }

  const paste = await fetchSharedPaste();
  const browser = await puppeteer.launch({
    executablePath: chromium,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    if (shouldOpenLivePermalinkPage) {
      await page.goto(permalinkUrl.toString(), { waitUntil: 'networkidle0' });
      await waitForLivePaste(page, paste.markdown || '');
    } else {
      await page.goto(baseUrl, { waitUntil: 'networkidle0' });
      await waitForEditorReady(page);
      await setMarkdown(page, paste.markdown || '');
    }
    const runtime = await extractRuntimeContext(page);
    await showScientificPagedPreview(page);

    const preview = await extractPreviewPages(page);
    const exportHtml = await captureExportHtml(page);
    const pdfResult = await exportPdf({ markdown: paste.markdown || '', html: exportHtml });
    const pdf = await extractPdfPages({ browser, pdfBuffer: pdfResult.buffer });

    const commonTokens = buildCommonTokenSet(preview.pages, pdf.pages);
    const matrix = preview.pages.map((previewPage) => {
      return pdf.pages.map((pdfPage) => comparePages(previewPage, pdfPage, commonTokens));
    });
    const rowMatches = getBestMatches(matrix, 'row');
    const columnMatches = getBestMatches(matrix, 'column');
    const headingChecks = buildHeadingChecks(preview.pages, pdf.pages);
    const failures = buildFailures({
      preview,
      pdf,
      rowMatches,
      columnMatches,
      headingChecks
    });

    const report = {
      generatedAt: new Date().toISOString(),
      permalinkUrl: permalinkUrl.toString(),
      auditMode,
      sourceBaseUrl,
      baseUrl,
      outDir,
      openedUrl: shouldOpenLivePermalinkPage ? permalinkUrl.toString() : baseUrl,
      runtime: {
        ...runtime,
        sameOriginAsPermalink: runtime.pageOrigin === permalinkUrl.origin,
        sameOriginAsBaseUrl: runtime.pageOrigin === baseOrigin
      },
      preview,
      pdf: {
        ...pdf,
        engine: pdfResult.engine
      },
      matches: {
        rows: rowMatches,
        columns: columnMatches,
        matrix
      },
      headingChecks,
      failures
    };

    const reportPath = path.join(outDir, 'report.json');
    const pdfPath = path.join(outDir, 'export.pdf');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(pdfPath, pdfResult.buffer);

    summarize(report);

    if (failures.length) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});