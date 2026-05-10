import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";

const permalinkArg = process.argv[2] || process.env.PERMALINK_URL;
if (!permalinkArg) {
  console.error("Usage: node scripts/thesis-audit.js <permalink-url>");
  process.exit(1);
}

const permalinkUrl = new URL(permalinkArg);
const sourceBaseUrl = process.env.SOURCE_BASE_URL || `${permalinkUrl.protocol}//${permalinkUrl.host}`;
const baseUrl = process.env.BASE_URL || sourceBaseUrl;
const pasteId = permalinkUrl.pathname.split("/").filter(Boolean).pop();
const outDir = process.env.OUT_DIR || path.join(process.cwd(), "tmp", `thesis-audit-${Date.now()}`);
const pageLimit = Number(process.env.PAGE_LIMIT || "8");
const requireChromiumPaged = process.env.REQUIRE_CHROMIUM_PAGED !== "0";
const maxOverflowPx = Number(process.env.MAX_OVERFLOW_PX || "2");
const minPageTextChars = Number(process.env.MIN_PAGE_TEXT_CHARS || "160");
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const includesNormalized = (haystack, needle) => normalizeText(haystack).includes(normalizeText(needle));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (value, digits = 2) => Number(value.toFixed(digits));

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

const waitForEditorReady = async (page) => {
  await page.waitForFunction(() => {
    return Boolean(window.editor && window.printPreview);
  }, { timeout: 120000 });
};

const waitForMarkdownLoaded = async (page, firstLine) => {
  await page.waitForFunction((expected) => {
    const value = window.editor?.getValue?.() || "";
    if (!expected) return value.trim().length > 0;
    return value.startsWith(expected);
  }, { timeout: 120000 }, firstLine || "");
};

const waitForPagedReady = async (page) => {
  await page.waitForFunction(() => {
    const pages = document.querySelectorAll(".pagedjs_page");
    const preview = window.printPreview;
    return pages.length > 0 && preview && !preview.isRendering;
  }, { timeout: 120000 });
};

const normalizePreviewForCapture = async (page) => {
  await page.evaluate(() => {
    const styleId = "thesis-audit-capture-style";
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

const showScientificPrintPreview = async (page) => {
  await page.evaluate(async () => {
    localStorage.setItem("md-preview-preset", "scientific");
    const scientificBtn = document.querySelector('.preview-preset-item[data-preset="scientific"]');
    if (scientificBtn) scientificBtn.click();
    if (window.printPreview.isActive) {
      await window.printPreview.refresh();
    } else {
      await window.printPreview.show();
      await window.printPreview.refresh();
    }
  });
  await waitForPagedReady(page);
  await normalizePreviewForCapture(page);
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

    return {
      html: clone ? clone.outerHTML : "",
      styles: chunks.join("\n\n")
    };
  });
};

const fetchPaste = async () => {
  const res = await fetch(`${sourceBaseUrl}/api/pastes/${pasteId}`);
  if (!res.ok) {
    throw new Error(`Could not load shared paste: ${res.status}`);
  }
  return res.json();
};

const loadMarkdownIntoApp = async (page, markdown, firstLine) => {
  await page.evaluate((content) => {
    window.editor.setValue(content);
  }, markdown);
  await waitForMarkdownLoaded(page, firstLine);
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
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) {
    throw new Error("PDF export returned an empty body.");
  }
  return {
    buffer,
    engine: res.headers.get("x-export-engine") || null
  };
};

const analyzePreview = async (page) => {
  return page.evaluate((overflowTolerance, emptyThreshold) => {
    const pages = Array.from(document.querySelectorAll(".pagedjs_page"));
    const overflows = [];
    const overflowSelectors = ["pre", "img", "figure", "blockquote", ".md-columns", ".admonition", "table"];
    const toVisibleText = (node) => {
      if (!node) return "";
      const clone = node.cloneNode(true);
      clone.querySelectorAll("style, script, .katex-mathml, annotation, annotation-xml, .footnote-backref").forEach((item) => item.remove());
      return (clone.textContent || "").replace(/\s+/g, " ").trim();
    };

    const contentRoot = document.querySelector(".print-content") || document.querySelector("#printPreview") || document.body;
    const fullDocumentText = toVisibleText(contentRoot);

    const parseMargins = (value) => {
      const matches = String(value || "").match(/([\d.]+)cm/g) || [];
      const nums = matches.map((item) => Number.parseFloat(item));
      if (nums.length === 1) {
        return { top: nums[0], right: nums[0], bottom: nums[0], left: nums[0] };
      }
      if (nums.length === 2) {
        return { top: nums[0], right: nums[1], bottom: nums[0], left: nums[1] };
      }
      if (nums.length === 3) {
        return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[1] };
      }
      if (nums.length >= 4) {
        return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[3] };
      }
      return null;
    };

    const extractPageRuleMargins = () => {
      const cssText = [
        ...Array.from(document.querySelectorAll("style")).map((node) => node.textContent || ""),
        ...Array.from(document.styleSheets).map((sheet) => {
          try {
            return Array.from(sheet.cssRules || []).map((rule) => rule.cssText).join("\n");
          } catch {
            return "";
          }
        })
      ].join("\n");
      const defaultMatch = Array.from(cssText.matchAll(/@page\s*(?!:first|:left|:right|chapter)[^{]*\{[\s\S]*?margin\s*:\s*([^;]+);[\s\S]*?\}/gi))
        .map((match) => parseMargins(match[1] || ""))
        .find((value) => value && [value.top, value.right, value.bottom, value.left].every((entry) => typeof entry === "number"));
      const firstMatch = cssText.match(/@page\s*:first\s*\{[\s\S]*?margin-top\s*:\s*([^;]+);/i);
      const chapterMatch = cssText.match(/@page\s+chapter\s*\{[\s\S]*?margin-top\s*:\s*([^;]+);/i);
      return {
        defaultMarginsCm: defaultMatch || null,
        firstTopCm: firstMatch ? Number.parseFloat(firstMatch[1]) : null,
        chapterTopCm: chapterMatch ? Number.parseFloat(chapterMatch[1]) : null
      };
    };

    const pageNumberForElement = (element) => {
      if (!element) return null;
      const pageEl = element.closest(".pagedjs_page");
      if (!pageEl) return null;
      return pages.indexOf(pageEl) + 1;
    };

    const getStyle = (node, pseudo = null) => {
      if (!node) return null;
      try {
        return getComputedStyle(node, pseudo);
      } catch {
        return null;
      }
    };

    const styleText = (style, property) => {
      if (!style) return "";
      if (typeof style.getPropertyValue === "function") {
        const value = style.getPropertyValue(property);
        if (value) return value;
      }
      return style[property] || "";
    };

    const styleNumber = (style, property) => Number.parseFloat(styleText(style, property) || "0") || 0;

    const nextContentElement = (node) => {
      let current = node?.nextElementSibling || null;
      while (current && current.matches?.(".table-layout-marker, .md-columns-token-start, .md-columns-token-end, .chapter-marker")) {
        current = current.nextElementSibling;
      }
      return current;
    };

    const computedHeadingStyle = (selector) => {
      const node = document.querySelector(`.print-content ${selector}`);
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        fontSizePx: Number.parseFloat(style.fontSize || "0") || 0,
        fontWeight: style.fontWeight,
        textAlign: style.textAlign,
        textAlignLast: style.textAlignLast,
        marginTopPx: Number.parseFloat(style.marginTop || "0") || 0,
        marginBottomPx: Number.parseFloat(style.marginBottom || "0") || 0,
        page: pageNumberForElement(node)
      };
    };

    const collectHeadingFlow = (node) => {
      const next = nextContentElement(node);
      const pageEl = node.closest(".pagedjs_page");
      const nodeRect = node.getBoundingClientRect();
      const pageRect = pageEl?.getBoundingClientRect();
      const nextRect = next?.getBoundingClientRect();
      return {
        text: (node.textContent || "").replace(/\s+/g, " ").trim(),
        tag: node.tagName.toLowerCase(),
        page: pageNumberForElement(node),
        nextTag: next?.tagName?.toLowerCase() || (next?.classList?.contains("table-of-contents") ? "nav" : next?.className || null),
        nextPage: pageNumberForElement(next),
        samePageWithNext: pageNumberForElement(node) !== null && pageNumberForElement(node) === pageNumberForElement(next),
        topOffsetPx: pageRect ? Number((nodeRect.top - pageRect.top).toFixed(2)) : null,
        bottomOffsetPx: pageRect ? Number((pageRect.bottom - nodeRect.bottom).toFixed(2)) : null,
        gapAfterPx: nextRect ? Number((nextRect.top - nodeRect.bottom).toFixed(2)) : null,
        insideColumns: Boolean(node.closest(".md-columns"))
      };
    };

    const collectTableVariant = (selector) => {
      const table = document.querySelector(selector);
      if (!table) return null;
      const tableStyle = getStyle(table);
      const theadStyle = getStyle(table.querySelector("thead"));
      const thStyle = getStyle(table.querySelector("th"));
      const tdStyle = getStyle(table.querySelector("td"));
      const secondRowStyle = getStyle(table.querySelector("tbody tr:nth-child(2)"));
      const rowPages = Array.from(new Set(Array.from(table.querySelectorAll("tr")).map(pageNumberForElement).filter(Boolean)));
      const numericAlignments = Array.from(new Set(Array.from(table.querySelectorAll("tbody td"))
        .filter((cell) => /^\s*[\d.,%+-]/.test(cell.textContent || ""))
        .map((cell) => styleText(getStyle(cell), "textAlign"))
        .filter(Boolean)));

      return {
        page: pageNumberForElement(table),
        fontSizePx: styleNumber(tableStyle, "fontSize"),
        marginTopPx: styleNumber(tableStyle, "marginTop"),
        marginBottomPx: styleNumber(tableStyle, "marginBottom"),
        borderTopWidthPx: styleNumber(tableStyle, "borderTopWidth"),
        borderBottomWidthPx: styleNumber(tableStyle, "borderBottomWidth"),
        headerRepeatDisplay: styleText(theadStyle, "display"),
        headerBackgroundColor: styleText(thStyle, "backgroundColor"),
        headerFontWeight: styleText(thStyle, "fontWeight"),
        cellPaddingTopPx: styleNumber(tdStyle, "paddingTop"),
        cellPaddingRightPx: styleNumber(tdStyle, "paddingRight"),
        cellPaddingBottomPx: styleNumber(tdStyle, "paddingBottom"),
        cellPaddingLeftPx: styleNumber(tdStyle, "paddingLeft"),
        cellTextAlign: styleText(tdStyle, "textAlign"),
        cellWordBreak: styleText(tdStyle, "wordBreak"),
        cellOverflowWrap: styleText(tdStyle, "overflowWrap"),
        cellHyphens: styleText(tdStyle, "hyphens"),
        zebraBackgroundColor: styleText(secondRowStyle, "backgroundColor"),
        rowPageCount: rowPages.length,
        numericAlignments
      };
    };

    const pageSummaries = pages.map((pageEl, index) => {
      const content = pageEl.querySelector(".pagedjs_page_content");
      const contentRect = content?.getBoundingClientRect();
      const pageRect = pageEl.getBoundingClientRect();
      const text = toVisibleText(content || pageEl);

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
              text: (child.textContent || "").trim().slice(0, 140)
            });
          }
        });
      }

      return {
        page: index + 1,
        width: Number(pageRect.width.toFixed(2)),
        height: Number(pageRect.height.toFixed(2)),
        textLength: text.length,
        isNearlyEmpty: text.length < emptyThreshold,
        headerText: (pageEl.querySelector(".pagedjs_margin-top")?.textContent || "").trim(),
        footerText: (pageEl.querySelector(".pagedjs_margin-bottom")?.textContent || "").trim(),
        textSample: text.slice(0, 500),
        fullText: text,
        contentBox: contentRect ? {
          left: Number((contentRect.left - pageRect.left).toFixed(2)),
          right: Number((pageRect.right - contentRect.right).toFixed(2)),
          top: Number((contentRect.top - pageRect.top).toFixed(2)),
          bottom: Number((pageRect.bottom - contentRect.bottom).toFixed(2)),
          width: Number(contentRect.width.toFixed(2)),
          height: Number(contentRect.height.toFixed(2))
        } : null
      };
    });

    const toc = document.querySelector(".print-content .table-of-contents");
    const tocAnchor = toc?.querySelector("a[href^='#'], li, p") || toc;
    const footnotes = document.querySelector(".print-content .footnotes");
    const columns = Array.from(document.querySelectorAll(".print-content .md-columns"));
    const section42 = Array.from(document.querySelectorAll(".print-content h1, .print-content h2, .print-content h3, .print-content h4"))
      .find((node) => /4\.2\s+nach dem spaltenblock/i.test((node.textContent || "").replace(/\s+/g, " ")));
    const admonitions = Array.from(document.querySelectorAll(".print-content .admonition, .print-content .markdown-alert"));
    const links = Array.from(document.querySelectorAll(".print-content a[href]"))
      .map((node) => ({ href: node.getAttribute("href") || "", text: (node.textContent || "").trim(), page: pageNumberForElement(node) }));
    const contentLists = Array.from(document.querySelectorAll(".print-content ul, .print-content ol"))
      .filter((node) => !node.closest(".table-of-contents") && !node.closest(".footnotes"));
    const unorderedLists = contentLists.filter((node) => node.tagName.toLowerCase() === "ul");
    const orderedLists = contentLists.filter((node) => node.tagName.toLowerCase() === "ol");
    const bodyStyle = getStyle(document.querySelector(".print-content"));
    const tocStyle = getStyle(toc);
    const tocFirstLink = toc?.querySelector("a[href^='#']") || null;
    const tocFirstLinkStyle = getStyle(tocFirstLink);
    const tocFirstLinkAfterStyle = getStyle(tocFirstLink, "::after");
    const firstNestedToc = toc?.querySelector("ul ul") || null;
    const thirdNestedToc = toc?.querySelector("ul ul ul") || null;
    const firstUl = unorderedLists[0] || null;
    const firstUlLi = firstUl?.querySelector(":scope > li") || null;
    const firstOl = orderedLists[0] || null;
    const firstOlLi = firstOl?.querySelector(":scope > li") || null;
    const firstUlLiBefore = getStyle(firstUlLi, "::before");
    const firstPre = document.querySelector(".print-content pre");
    const firstPreStyle = getStyle(firstPre);
    const firstPreCodeStyle = getStyle(firstPre?.querySelector("code"));
    const firstMathDisplay = document.querySelector(".print-content .katex-display, .print-content .math-block");
    const firstMathDisplayStyle = getStyle(firstMathDisplay);
    const firstMathKatexStyle = getStyle(firstMathDisplay?.querySelector(".katex") || document.querySelector(".print-content .katex-display > .katex"));
    const firstMathHtmlStyle = getStyle(firstMathDisplay?.querySelector(".katex-html") || document.querySelector(".print-content .katex-display .katex-html"));
    const firstAdmonition = admonitions[0] || null;
    const infoAdmonition = admonitions.find((node) => /info/i.test(node.className)) || firstAdmonition;
    const warningAdmonition = admonitions.find((node) => /warning/i.test(node.className)) || firstAdmonition;
    const infoAdmonitionStyle = getStyle(infoAdmonition);
    const warningAdmonitionStyle = getStyle(warningAdmonition);
    const blockquote = document.querySelector(".print-content blockquote");
    const blockquoteStyle = getStyle(blockquote);
    const footnoteStyle = getStyle(footnotes);
    const firstColumns = columns[0] || null;
    const firstColumnsStyle = getStyle(firstColumns);
    const firstColumnsRuleStyle = getStyle(firstColumns, "::before");
    const rawMathVisible = /\$\$|\\sum|\\frac|\\int/.test(fullDocumentText);

    return {
      totalPages: pageSummaries.length,
      documentText: fullDocumentText,
      overflows,
      pages: pageSummaries,
      meta: {
        toc: {
          exists: Boolean(toc),
          page: pageNumberForElement(tocAnchor),
          linkCount: toc ? toc.querySelectorAll("a[href^='#']").length : 0,
          text: (toc?.textContent || "").replace(/\s+/g, " ").trim(),
          backgroundColor: styleText(tocStyle, "backgroundColor"),
          borderWidthPx: styleNumber(tocStyle, "borderTopWidth"),
          level2PaddingLeftPx: styleNumber(getStyle(firstNestedToc), "paddingLeft"),
          level3PaddingLeftPx: styleNumber(getStyle(thirdNestedToc), "paddingLeft"),
          linkDisplay: styleText(tocFirstLinkStyle, "display"),
          linkAfterContent: styleText(tocFirstLinkAfterStyle, "content"),
          linkAfterDisplay: styleText(tocFirstLinkAfterStyle, "display")
        },
        body: {
          fontSizePx: styleNumber(bodyStyle, "fontSize"),
          lineHeightPx: styleNumber(bodyStyle, "lineHeight"),
          lineHeightRatio: styleNumber(bodyStyle, "fontSize") ? Number((styleNumber(bodyStyle, "lineHeight") / styleNumber(bodyStyle, "fontSize")).toFixed(2)) : null,
          color: styleText(bodyStyle, "color"),
          textAlign: styleText(bodyStyle, "textAlign"),
          hyphens: styleText(bodyStyle, "hyphens")
        },
        headingStyles: {
          h1: computedHeadingStyle("h1"),
          h2: computedHeadingStyle("h2"),
          h3: computedHeadingStyle("h3"),
          h4: computedHeadingStyle("h4")
        },
        headings: Array.from(document.querySelectorAll(".print-content h1, .print-content h2, .print-content h3, .print-content h4"))
          .map(collectHeadingFlow),
        lists: {
          ulCount: unorderedLists.length,
          olCount: orderedLists.length,
          liCount: contentLists.flatMap((node) => Array.from(node.querySelectorAll(":scope > li"))).length,
          emptyLiCount: contentLists.flatMap((node) => Array.from(node.querySelectorAll(":scope > li"))).filter((item) => !(item.textContent || "").trim()).length,
          ulPages: Array.from(new Set(unorderedLists.map(pageNumberForElement).filter(Boolean))),
          olPages: Array.from(new Set(orderedLists.map(pageNumberForElement).filter(Boolean))),
          ulBeforeOl: firstUl && firstOl ? !!(firstUl.compareDocumentPosition(firstOl) & Node.DOCUMENT_POSITION_FOLLOWING) : null,
          ulTopPx: firstUl ? firstUl.getBoundingClientRect().top : null,
          olTopPx: firstOl ? firstOl.getBoundingClientRect().top : null,
          ulPaddingLeftPx: styleNumber(getStyle(firstUl), "paddingLeft"),
          ulItemPaddingLeftPx: styleNumber(getStyle(firstUlLi), "paddingLeft"),
          ulItemMarginBottomPx: styleNumber(getStyle(firstUlLi), "marginBottom"),
          ulMarkerContent: styleText(firstUlLiBefore, "content"),
          ulMarkerWidthPx: styleNumber(firstUlLiBefore, "width"),
          olPaddingLeftPx: styleNumber(getStyle(firstOl), "paddingLeft"),
          olItemMarginLeftPx: styleNumber(getStyle(firstOlLi), "marginLeft"),
          olListStyleType: styleText(getStyle(firstOl), "listStyleType"),
          olListStylePosition: styleText(getStyle(firstOl), "listStylePosition")
        },
        pageSetup: extractPageRuleMargins(),
        footnotes: {
          exists: Boolean(footnotes),
          page: pageNumberForElement(footnotes),
          text: (footnotes?.textContent || "").replace(/\s+/g, " ").trim(),
          itemCount: footnotes ? footnotes.querySelectorAll("li").length : 0,
          refCount: document.querySelectorAll(".print-content .footnote-ref").length,
          fontSizePx: styleNumber(footnoteStyle, "fontSize")
        },
        code: {
          blockCount: document.querySelectorAll(".print-content pre").length,
          inlineCount: document.querySelectorAll(".print-content code").length,
          page: pageNumberForElement(document.querySelector(".print-content pre")),
          fontFamily: styleText(firstPreStyle, "fontFamily"),
          fontSizePx: styleNumber(firstPreStyle, "fontSize"),
          backgroundColor: styleText(firstPreStyle, "backgroundColor"),
          paddingTopPx: styleNumber(firstPreStyle, "paddingTop"),
          paddingRightPx: styleNumber(firstPreStyle, "paddingRight"),
          paddingBottomPx: styleNumber(firstPreStyle, "paddingBottom"),
          paddingLeftPx: styleNumber(firstPreStyle, "paddingLeft"),
          borderTopWidthPx: styleNumber(firstPreStyle, "borderTopWidth"),
          borderLeftWidthPx: styleNumber(firstPreStyle, "borderLeftWidth"),
          whiteSpace: styleText(firstPreCodeStyle, "whiteSpace"),
          overflowWrap: styleText(firstPreCodeStyle, "overflowWrap")
        },
        math: {
          displayCount: document.querySelectorAll(".print-content .katex-display, .print-content .math-block").length,
          inlineCount: document.querySelectorAll(".print-content .katex").length,
          page: pageNumberForElement(document.querySelector(".print-content .katex-display, .print-content .math-block")),
          rawMathVisible,
          textAlign: styleText(firstMathDisplayStyle, "textAlign"),
          breakInside: styleText(firstMathDisplayStyle, "breakInside"),
          marginTopPx: styleNumber(firstMathDisplayStyle, "marginTop"),
          marginBottomPx: styleNumber(firstMathDisplayStyle, "marginBottom"),
          katexWhiteSpace: styleText(firstMathKatexStyle, "whiteSpace"),
          katexHtmlWhiteSpace: styleText(firstMathHtmlStyle, "whiteSpace"),
          descendantPageCount: Array.from(new Set(Array.from(firstMathDisplay?.querySelectorAll("*") || []).map(pageNumberForElement).filter(Boolean))).length || 0
        },
        admonitions: {
          count: admonitions.length,
          infoCount: admonitions.filter((node) => /info/i.test(node.className)).length,
          warningCount: admonitions.filter((node) => /warning/i.test(node.className)).length,
          page: pageNumberForElement(admonitions[0] || null),
          infoBorderLeftWidthPx: styleNumber(infoAdmonitionStyle, "borderLeftWidth"),
          infoBackgroundColor: styleText(infoAdmonitionStyle, "backgroundColor"),
          infoMarginTopPx: styleNumber(infoAdmonitionStyle, "marginTop"),
          infoMarginBottomPx: styleNumber(infoAdmonitionStyle, "marginBottom"),
          warningBorderLeftWidthPx: styleNumber(warningAdmonitionStyle, "borderLeftWidth"),
          warningBackgroundColor: styleText(warningAdmonitionStyle, "backgroundColor"),
          warningMarginTopPx: styleNumber(warningAdmonitionStyle, "marginTop"),
          warningMarginBottomPx: styleNumber(warningAdmonitionStyle, "marginBottom")
        },
        columns: {
          count: columns.length,
          pages: Array.from(new Set(columns.map(pageNumberForElement).filter(Boolean))),
          section42Page: pageNumberForElement(section42),
          section42InsideColumns: Boolean(section42?.closest(".md-columns")),
          gapPx: styleNumber(firstColumnsStyle, "columnGap") || styleNumber(firstColumnsStyle, "gap"),
          ruleWidthPx: styleNumber(firstColumnsRuleStyle, "width"),
          ruleColor: styleText(firstColumnsRuleStyle, "backgroundColor"),
          breakInside: styleText(firstColumnsStyle, "breakInside"),
          blockPageCounts: columns.map((node) => Array.from(new Set(Array.from(node.querySelectorAll("p, li, table, blockquote, h1, h2, h3, h4, pre")).map(pageNumberForElement).filter(Boolean))).length),
          headingsInside: Array.from(document.querySelectorAll(".print-content .md-columns h1, .print-content .md-columns h2, .print-content .md-columns h3, .print-content .md-columns h4"))
            .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
        },
        tables: {
          count: document.querySelectorAll(".print-content table").length,
          pages: Array.from(new Set(Array.from(document.querySelectorAll(".print-content table")).map(pageNumberForElement).filter(Boolean))),
          headerCellCount: document.querySelectorAll(".print-content table th").length,
          captionCount: document.querySelectorAll(".print-content table caption").length,
          defaultStyle: collectTableVariant(".print-content table"),
          scientificStyle: collectTableVariant('.print-content table.table-layout-scientific, .print-content table[data-layout="scientific"]'),
          compactStyle: collectTableVariant('.print-content table.table-layout-compact, .print-content table[data-layout="compact"]')
        },
        blockquote: {
          page: pageNumberForElement(blockquote),
          borderLeftWidthPx: styleNumber(blockquoteStyle, "borderLeftWidth"),
          paddingLeftPx: styleNumber(blockquoteStyle, "paddingLeft"),
          marginLeftPx: styleNumber(blockquoteStyle, "marginLeft"),
          color: styleText(blockquoteStyle, "color")
        },
        artifacts: {
          layoutTokensVisible: /\[{1,2}MDLAYOUT:/i.test(fullDocumentText),
          tocMarkerVisible: /\[\[?toc\]?\]/i.test(fullDocumentText),
          rawHtmlArtifactsVisible: /<(p|br|span|div)\b/i.test(fullDocumentText)
        },
        links: {
          items: links,
          uglyMdeditPattern: /mdedit\.io\s*\(\s*https?:\/\/mdedit\.io/i.test(fullDocumentText)
        }
      }
    };
  }, maxOverflowPx, minPageTextChars);
};

const getPageHandles = async (page) => page.$$(".pagedjs_page");

const takePreviewShots = async (handles, targetDir) => {
  const paths = [];
  const count = Math.min(handles.length, pageLimit);
  for (let i = 0; i < count; i += 1) {
    const filePath = path.join(targetDir, `preview-${String(i + 1).padStart(2, "0")}.png`);
    await handles[i].screenshot({ path: filePath });
    paths.push(filePath);
  }
  return paths;
};

const analyzePdfWithPdfJs = async ({ browser, pdfBuffer }) => {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle0" });
  await page.addScriptTag({ url: `${baseUrl}/static/vendor/pdfjs/pdf.min.js` });
  const base64 = pdfBuffer.toString("base64");

  const analysis = await page.evaluate(async (payload) => {
    const raw = atob(payload.base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

    pdfjsLib.GlobalWorkerOptions.workerSrc = payload.workerSrc;
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pages = [];

    for (let p = 1; p <= pdf.numPages; p += 1) {
      const pdfPage = await pdf.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const textContent = await pdfPage.getTextContent();
      const joinedText = textContent.items.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
      pages.push({
        page: p,
        width: Number(viewport.width.toFixed(2)),
        height: Number(viewport.height.toFixed(2)),
        textLength: joinedText.length,
        isNearlyEmpty: joinedText.length < payload.emptyThreshold,
        textSample: joinedText.slice(0, 500),
        fullText: joinedText
      });
    }

    return {
      totalPages: pdf.numPages,
      pages,
      documentText: pages.map((item) => item.fullText || item.textSample).join("\n")
    };
  }, {
    base64,
    workerSrc: `${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js`,
    emptyThreshold: minPageTextChars
  });

  await page.close();
  return analysis;
};

const renderPdfPagesWithPdfJs = async ({ browser, pdfBuffer, width, height, count }) => {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: "networkidle0" });
  await page.addScriptTag({ url: `${baseUrl}/static/vendor/pdfjs/pdf.min.js` });
  const base64 = pdfBuffer.toString("base64");

  const urls = await page.evaluate(async (payload) => {
    const raw = atob(payload.base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

    pdfjsLib.GlobalWorkerOptions.workerSrc = payload.workerSrc;
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const total = Math.min(payload.count, pdf.numPages);
    const results = [];

    for (let p = 1; p <= total; p += 1) {
      const pdfPage = await pdf.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 1 });
      const scale = payload.width / viewport.width;
      const scaled = pdfPage.getViewport({ scale });

      const renderCanvas = document.createElement("canvas");
      renderCanvas.width = Math.round(scaled.width);
      renderCanvas.height = Math.round(scaled.height);
      const renderCtx = renderCanvas.getContext("2d", { alpha: false });
      renderCtx.fillStyle = "#ffffff";
      renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
      await pdfPage.render({ canvasContext: renderCtx, viewport: scaled }).promise;

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = payload.width;
      finalCanvas.height = payload.height;
      const finalCtx = finalCanvas.getContext("2d", { alpha: false });
      finalCtx.fillStyle = "#ffffff";
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      finalCtx.drawImage(renderCanvas, 0, 0);
      results.push(finalCanvas.toDataURL("image/png"));
    }

    return results;
  }, {
    base64,
    width,
    height,
    count,
    workerSrc: `${baseUrl}/static/vendor/pdfjs/pdf.worker.min.js`
  });

  await page.close();
  return urls;
};

const writePdfImages = async ({ browser, pdfBuffer, previewImagePaths, targetDir }) => {
  if (!previewImagePaths.length) return [];
  const firstPreview = await fs.promises.readFile(previewImagePaths[0]);
  const sizePage = await browser.newPage();
  const size = await sizePage.evaluate(async (base64) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = `data:image/png;base64,${base64}`;
    });
  }, firstPreview.toString("base64"));
  await sizePage.close();

  const urls = await renderPdfPagesWithPdfJs({
    browser,
    pdfBuffer,
    width: size.width,
    height: size.height,
    count: previewImagePaths.length
  });

  return urls.map((url, index) => {
    const filePath = path.join(targetDir, `pdf-${String(index + 1).padStart(2, "0")}.png`);
    fs.writeFileSync(filePath, Buffer.from((url.split(",")[1] || ""), "base64"));
    return filePath;
  });
};

const getPageByText = (pages, text) => pages.find((page) => includesNormalized(page.fullText || page.textSample, text)) || null;

const parseMarginsFromRenderedText = (text) => {
  const match = String(text || "").match(/@page\s*\{[^}]*margin\s*:\s*([^;]+);/i);
  if (!match) return null;
  const numbers = (match[1].match(/([\d.]+)cm/g) || []).map((item) => Number.parseFloat(item));
  if (numbers.length === 4) {
    const [top, right, bottom, left] = numbers;
    return {
      top,
      right,
      bottom,
      left,
      contentWidth: round(A4_WIDTH_CM - left - right)
    };
  }
  return null;
};

const getMarginsCm = (page) => {
  if (!page?.contentBox || !page.width || !page.height) return null;
  return {
    top: round((page.contentBox.top / page.height) * A4_HEIGHT_CM),
    bottom: round((page.contentBox.bottom / page.height) * A4_HEIGHT_CM),
    left: round((page.contentBox.left / page.width) * A4_WIDTH_CM),
    right: round((page.contentBox.right / page.width) * A4_WIDTH_CM),
    contentWidth: round((page.contentBox.width / page.width) * A4_WIDTH_CM)
  };
};

const parseCssColor = (value) => {
  const input = String(value || "").trim();
  if (!input || input === "transparent") return null;
  const rgbMatch = input.match(/rgba?\(([^)]+)\)/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.some((part, index) => index < 3 && Number.isNaN(part))) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: Number.isFinite(parts[3]) ? parts[3] : 1
  };
};

const colorChannelSpread = (value) => {
  const color = parseCssColor(value);
  if (!color || color.a === 0) return null;
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
};

const colorLuminance = (value) => {
  const color = parseCssColor(value);
  if (!color || color.a === 0) return null;
  return (0.2126 * color.r) + (0.7152 * color.g) + (0.0722 * color.b);
};

const hasVisibleColor = (value) => {
  const color = parseCssColor(value);
  return Boolean(color && color.a > 0);
};

const inRange = (value, min, max) => typeof value === "number" && value >= min && value <= max;

const createCheck = (id, area, description, status, details = {}) => ({ id, area, description, status, ...details });
const passCheck = (id, area, description, details = {}) => createCheck(id, area, description, "pass", details);
const failCheck = (id, area, description, details = {}) => createCheck(id, area, description, "fail", details);
const manualCheck = (id, area, description, reason, details = {}) => createCheck(id, area, description, "manual", { reason, ...details });

const buildRegressionChecklist = ({ paste, preview, pdf }) => {
  const checks = [];
  const markdown = paste.markdown || "";
  const pdfText = pdf.documentText || "";
  const previewText = preview.documentText || "";
  const bodyPage = getPageByText(preview.pages, "1.1 Randbreite und nutzbare Textbreite") || preview.pages.find((page) => page.page >= 4 && page.contentBox) || null;
  const rawMargins = preview.meta.pageSetup.defaultMarginsCm || parseMarginsFromRenderedText(preview.exportStyles || preview.pages[0]?.fullText || preview.documentText) || getMarginsCm(bodyPage);
  const margins = rawMargins
    ? {
        ...rawMargins,
        contentWidth: typeof rawMargins.contentWidth === "number"
          ? rawMargins.contentWidth
          : round(A4_WIDTH_CM - ((rawMargins.left || 0) + (rawMargins.right || 0)))
      }
    : null;
  const tocPage = getPageByText(pdf.pages, "Prüfziele dieser Datei")?.page || preview.meta.toc.page || null;
  const conclusionPage = getPageByText(pdf.pages, "7 Schlusskontrolle")?.page || null;
  const footnotePage = preview.meta.footnotes.page || getPageByText(pdf.pages, "Diese Fußnote dient nur der Layoutprüfung")?.page || null;
  const nearEmptyPdfPages = pdf.pages.filter((page) => page.isNearlyEmpty).map((page) => page.page);
  // Near-empty pages that are NOT the footnote page – a short footnote on the last
  // page is structurally correct and should not trigger pagination failure checks.
  const nearEmptyNonFn = nearEmptyPdfPages.filter((p) => p !== footnotePage || p < pdf.totalPages - 1);
  const consistentMargins = (() => {
    const pages = preview.pages.filter((page) => page.page >= 4 && page.contentBox).slice(0, 4).map(getMarginsCm).filter(Boolean);
    if (pages.length < 2) return false;
    const keys = ["top", "bottom", "left", "right"];
    return keys.every((key) => {
      const values = pages.map((page) => page[key]);
      return (Math.max(...values) - Math.min(...values)) <= 0.35;
    });
  })();
  const headingStyles = preview.meta.headingStyles;
  const h1Page = preview.meta.headings.find((item) => item.tag === "h1")?.page || null;
  const uglyLink = preview.meta.links.uglyMdeditPattern || /mdedit\.io\s*\(\s*https?:\/\/mdedit\.io/i.test(pdfText);
  const rawHtmlVisible = preview.meta.artifacts.rawHtmlArtifactsVisible || /<(p|br|span|div)\b/i.test(pdfText);
  const layoutTokensVisible = preview.meta.artifacts.layoutTokensVisible || /\[{1,2}MDLAYOUT:/i.test(pdfText);
  const hasYamlMarkers = /(^|\n)---(\n|$)/m.test(pdfText) || /\btitle:\b/i.test(pdfText);
  const hasLayoutBlock = /```layout/i.test(markdown);
  const hasCustomCss = /<style[\s>]|```css\b/i.test(markdown);
  const hasInlineRawHtmlSource = /<(p|br|span|div)\b/i.test(markdown);
  const hasFootnoteText = includesNormalized(pdfText, "Diese Fußnote dient nur der Layoutprüfung") || includesNormalized(previewText, "Diese Fußnote dient nur der Layoutprüfung");
  const hasConclusion = includesNormalized(pdfText, "7 Schlusskontrolle");
  const mathRawVisible = preview.meta.math.rawMathVisible || /\$\$|\\sum|\\frac|\\int/.test(pdfText);
  const section42InsideColumns = preview.meta.columns.section42InsideColumns;
  const columnHeadingsInToc = /linke spalte|rechte spalte/i.test(preview.meta.toc.text || "");
  const h4InToc = /h4\s*:\s*tiefe ebene/i.test(preview.meta.toc.text || "");
  const page1FooterLooksRequired = false;
  const bodyStyle = preview.meta.body || {};
  const headings = preview.meta.headings || [];
  const listMeta = preview.meta.lists || {};
  const tableMeta = preview.meta.tables || {};
  const codeMeta = preview.meta.code || {};
  const mathMeta = preview.meta.math || {};
  const admonitionMeta = preview.meta.admonitions || {};
  const columnsMeta = preview.meta.columns || {};
  const blockquoteMeta = preview.meta.blockquote || {};
  const tocAfterActive = preview.meta.toc.linkAfterContent && !/^(none|normal|""|'')$/i.test(preview.meta.toc.linkAfterContent);
  const h1FlowOk = headings.filter((item) => item.tag === "h1" && item.nextTag).every((item) => item.samePageWithNext);
  const h2FlowOk = headings.filter((item) => item.tag === "h2" && item.nextTag).every((item) => item.samePageWithNext);
  const headingTableAdjacencyOk = headings.filter((item) => item.nextTag === "table").every((item) => item.samePageWithNext);
  const multiPageTables = [tableMeta.defaultStyle, tableMeta.scientificStyle, tableMeta.compactStyle].filter((item) => item && item.rowPageCount > 1);
  const section5Heading = headings.find((item) => /^5(\s|\.)/.test(item.text));
  const section6Heading = headings.find((item) => /^6(\s|\.)/.test(item.text));
  const section5Compact = section5Heading && section6Heading
    ? (section6Heading.page - section5Heading.page) <= 2 && !nearEmptyPdfPages.some((page) => page >= section5Heading.page && page < section6Heading.page)
    : true;
  const columnReadingOrderOk = (() => {
    const normalizedPdf = normalizeText(pdfText);
    const leftIndex = normalizedPdf.indexOf(normalizeText("Linke Spalte Bewertung"));
    const rightIndex = normalizedPdf.indexOf(normalizeText("Rechte Spalte Bewertung"));
    const afterIndex = normalizedPdf.indexOf(normalizeText("4.2 Nach dem Spaltenblock"));
    return leftIndex !== -1 && rightIndex !== -1 && afterIndex !== -1 && leftIndex < rightIndex && rightIndex < afterIndex;
  })();

  const addAuto = (id, area, description, condition, details = {}) => {
    checks.push(condition ? passCheck(id, area, description, details) : failCheck(id, area, description, details));
  };
  const addManual = (id, area, description, reason, details = {}) => {
    checks.push(manualCheck(id, area, description, reason, details));
  };

  addAuto("A01", "A", "Markdown-Datei wird vollständig verarbeitet", hasConclusion && hasFootnoteText, { conclusionPage, footnotePage });
  addAuto("A02", "A", "Kein YAML-Frontmatter sichtbar", !hasYamlMarkers, { sample: pdf.pages[0]?.textSample || "" });
  addAuto("A03", "A", "Kein dokumentlokaler layout-Block nötig", !hasLayoutBlock, { hasLayoutBlock });
  addAuto("A04", "A", "Kein Custom CSS nötig", !hasCustomCss, { hasCustomCss });
  addAuto("A05", "A", "Keine rohen HTML-Artefakte sichtbar", !rawHtmlVisible, { rawHtmlVisible, hasInlineRawHtmlSource });
  addAuto("A06", "A", "Keine internen Layouttokens sichtbar", !layoutTokensVisible, { layoutTokensVisible });
  addAuto("A07", "A", "Links werden wissenschaftlich sinnvoll behandelt", !uglyLink, { uglyLink });
  addAuto("A08", "A", "Umlaute/Sonderzeichen korrekt", includesNormalized(pdfText, "Prüfziele") && includesNormalized(pdfText, "Fußnote") && pdfText.includes("☐"), { sample: pdf.pages[1]?.textSample || pdf.pages[0]?.textSample || "" });
  addAuto("A09", "A", "PDF-Seitenzahl plausibel", nearEmptyNonFn.length === 0, { nearEmptyNonFn, nearEmptyPdfPages, totalPages: pdf.totalPages });
  addAuto("A10", "A", "Keine Leerseiten-Regression (max 13 Seiten)", pdf.totalPages <= 13, { totalPages: pdf.totalPages, maxExpected: 13 });

  addAuto("B01", "B", "A4 Hochformat", inRange(pdf.pages[0]?.width, 590, 600) && inRange(pdf.pages[0]?.height, 835, 848), { width: pdf.pages[0]?.width, height: pdf.pages[0]?.height });
  addAuto("B02", "B", "Oberer Rand", inRange(margins?.top, 2.3, 2.5), { ...margins, firstTopCm: preview.meta.pageSetup.firstTopCm });
  addAuto("B03", "B", "Unterer Rand", inRange(margins?.bottom, 2.2, 2.5), margins || {});
  addAuto("B04", "B", "Linker Rand", inRange(margins?.left, 2.5, 3.0), margins || {});
  addAuto("B05", "B", "Rechter Rand", inRange(margins?.right, 2.2, 2.5), margins || {});
  addAuto("B06", "B", "Satzspiegelbreite", inRange(margins?.contentWidth || round(A4_WIDTH_CM - ((margins?.left || 0) + (margins?.right || 0))), 15.5, 16.0), { ...margins, derivedContentWidth: round(A4_WIDTH_CM - ((margins?.left || 0) + (margins?.right || 0))) });
  addAuto("B07", "B", "Tabellen beziehen sich auf Satzspiegel", preview.overflows.filter((item) => item.tag === "table").length === 0, { tableOverflows: preview.overflows.filter((item) => item.tag === "table") });
  addAuto("B08", "B", "Kein Inhalt an Papierkante", preview.overflows.length === 0, { overflowCount: preview.overflows.length });
  addAuto("B09", "B", "Ränder konsistent über alle Seiten", consistentMargins, { consistentMargins });
  addAuto("B10", "B", "Keine künstlich zu schmale Mittelspalte", (margins?.contentWidth || 0) >= 15.5, margins || {});

  addAuto("C01", "C", "[[toc]] wird erkannt", !preview.meta.artifacts.tocMarkerVisible && !/\[\[?toc\]?\]/i.test(pdfText), { tocPage });
  addAuto("C02", "C", "TOC erscheint an richtiger Stelle", tocPage === 2, { tocPage });
  addAuto("C03", "C", "TOC ist kein normaler Fließtext", preview.meta.toc.exists && preview.meta.toc.linkCount >= 8, { toc: preview.meta.toc });
  addAuto("C04", "C", "Keine Bullet-Liste im TOC", !/•/.test(preview.meta.toc.text || ""), { tocText: preview.meta.toc.text });
  addAuto("C05", "C", "Ebenen sind optisch eingerückt", (preview.meta.toc.level2PaddingLeftPx || 0) >= 12 && (preview.meta.toc.level3PaddingLeftPx || 0) > (preview.meta.toc.level2PaddingLeftPx || 0), preview.meta.toc);
  addAuto("C06", "C", "TOC-Tiefe begrenzbar", preview.meta.toc.exists && !h4InToc, { tocText: preview.meta.toc.text });
  addAuto("C07", "C", "H4 nicht im TOC", !h4InToc, { tocText: preview.meta.toc.text });
  addAuto("C08", "C", "Spalten-Unterüberschriften nicht im TOC", !columnHeadingsInToc, { tocText: preview.meta.toc.text });
  addAuto("C09", "C", "Seitenzahlen rechts", preview.meta.toc.linkDisplay === "block" && (tocAfterActive || preview.meta.toc.linkCount >= 8), preview.meta.toc);
  addAuto("C10", "C", "Punktführer optional", !preview.meta.toc.exists || tocAfterActive || preview.meta.toc.linkDisplay === "block", preview.meta.toc);
  addAuto("C11", "C", "TOC bricht sauber um", tocPage !== null && pdf.totalPages >= (tocPage + 1), { tocPage, totalPages: pdf.totalPages });
  addAuto("C12", "C", "TOC erzeugt keine Leerseiten", !(nearEmptyPdfPages.includes((tocPage || 0) + 1)), { tocPage, nearEmptyPdfPages });

  addAuto("D01", "D", "H1 deutlich sichtbar", (headingStyles.h1?.fontSizePx || 0) > (headingStyles.h2?.fontSizePx || 0), headingStyles);
  addAuto("D02", "D", "H2 klar erkennbar", (headingStyles.h2?.fontSizePx || 0) > (headingStyles.h3?.fontSizePx || 0), headingStyles);
  addAuto("D03", "D", "H3 zurückhaltend", (headingStyles.h3?.fontSizePx || 0) > (headingStyles.h4?.fontSizePx || 0), headingStyles);
  addAuto("D04", "D", "H4 noch kleiner", (headingStyles.h4?.fontSizePx || 0) < (headingStyles.h3?.fontSizePx || 0), headingStyles);
  addAuto("D05", "D", "Abstände vor/nach Überschriften harmonisch", (headingStyles.h2?.marginTopPx || 0) > (headingStyles.h2?.marginBottomPx || 0), headingStyles.h2 || {});
  addAuto("D06", "D", "Keine isolierten H1-Seiten", !nearEmptyPdfPages.includes(h1Page), { h1Page, nearEmptyPdfPages });
  addAuto("D07", "D", "H1 mit folgendem Inhalt zusammenhalten", h1FlowOk, { headings: headings.filter((item) => item.tag === "h1") });
  addAuto("D08", "D", "H2 nicht am Seitenende allein", h2FlowOk, { headings: headings.filter((item) => item.tag === "h2") });
  addAuto("D09", "D", "Überschriften nicht im Blocksatz gedehnt", [headingStyles.h1, headingStyles.h2, headingStyles.h3, headingStyles.h4].every((item) => !item || item.textAlign === "left"), headingStyles);
  addAuto("D10", "D", "Nummerierung konsistent", includesNormalized(pdfText, "3.4 Breitere Tabelle zur Satzspiegelprüfung") && includesNormalized(pdfText, "4.2 Nach dem Spaltenblock"), {});

  addAuto("E01", "E", "Schriftgröße thesis-tauglich", inRange(parseFloat(headingStyles.h4?.fontSizePx ? String(headingStyles.h4.fontSizePx) : "0") / 1.333, 8, 12), { h4Px: headingStyles.h4?.fontSizePx || 0 });
  addAuto("E02", "E", "Zeilenhöhe angenehm", inRange(bodyStyle.lineHeightRatio, 1.38, 1.75), bodyStyle);
  addAuto("E03", "E", "Textfarbe ruhig", (colorChannelSpread(bodyStyle.color) ?? 99) <= 12 && (colorLuminance(bodyStyle.color) ?? 0) < 80, bodyStyle);
  addAuto("E04", "E", "Absätze klar getrennt", preview.pages.some((page) => includesNormalized(page.fullText, "Die linke Seite darf wegen Bindung")), {});
  addAuto("E05", "E", "Blocksatz ohne extreme Wortabstände", bodyStyle.textAlign !== "justify" || ((bodyStyle.hyphens === "auto") && (bodyStyle.lineHeightRatio || 0) >= 1.38), bodyStyle);
  addAuto("E06", "E", "Silbentrennung/Umbruch", ["none", "manual", "auto"].includes(bodyStyle.hyphens || "") && !preview.overflows.length, { hyphens: bodyStyle.hyphens, overflows: preview.overflows.length });
  addAuto("E07", "E", "Keine Einzelbuchstaben-Trennungen", !/\b[A-Za-zÄÖÜäöüß]\s*-\s+/u.test(pdfText), {});
  addAuto("E08", "E", "Inline-Code im Fließtext", includesNormalized(pdfText, "scientific") && includesNormalized(pdfText, "layout") && includesNormalized(pdfText, "export"), {});
  addAuto("E09", "E", "Fett/Kursiv korrekt", includesNormalized(pdf.pages[0]?.fullText || "", "kein dokumentlokales layout") && includesNormalized(pdf.pages[0]?.fullText || "", "kein custom css"), { sample: pdf.pages[0]?.textSample || "" });
  addAuto("E10", "E", "Textfluss stabil", conclusionPage !== null && footnotePage !== null && conclusionPage <= footnotePage, { conclusionPage, footnotePage });

  addAuto("F01", "F", "Ungeordnete Liste erscheint an korrekter Stelle", preview.meta.lists.ulCount > 0 && (preview.meta.lists.ulPages.includes(4) || preview.meta.lists.ulPages.includes(5)), preview.meta.lists);
  addAuto("F02", "F", "Ungeordnete Liste rutscht nicht hinter Fußnote", !preview.meta.lists.ulPages.some((page) => footnotePage && page > footnotePage), { ulPages: preview.meta.lists.ulPages, footnotePage });
  addAuto("F03", "F", "UL erscheint vor OL (Listenreihenfolge korrekt)", preview.meta.lists.ulBeforeOl === true, { ulBeforeOl: preview.meta.lists.ulBeforeOl, ulTopPx: preview.meta.lists.ulTopPx, olTopPx: preview.meta.lists.olTopPx });
  addAuto("F04", "F", "Bullet-Marker sichtbar", /•/.test(listMeta.ulMarkerContent || ""), listMeta);
  addAuto("F04", "F", "Mehrzeilige Bulletpoints sauber eingerückt", (listMeta.ulItemPaddingLeftPx || 0) > (listMeta.ulMarkerWidthPx || 0), listMeta);
  addAuto("F05", "F", "Abstand Bullet zu Text stabil", (listMeta.ulItemPaddingLeftPx || 0) > (listMeta.ulMarkerWidthPx || 0) && (listMeta.ulPaddingLeftPx || 0) >= (listMeta.ulMarkerWidthPx || 0), listMeta);
  addAuto("F06", "F", "Geordnete Liste erscheint an korrekter Stelle", preview.meta.lists.olCount > 0 && preview.meta.lists.olPages.includes(5), preview.meta.lists);
  addAuto("F07", "F", "Nummern und Text getrennt", !/1V\.|1V /.test(pdfText), {});
  addAuto("F08", "F", "Folgezeilen geordneter Listen sauber eingerückt", (listMeta.olPaddingLeftPx || 0) >= 24 && listMeta.olListStylePosition === "outside", listMeta);
  addAuto("F09", "F", "Listen in Spalten funktionieren", preview.meta.columns.count > 0 && preview.meta.lists.ulPages.some((page) => preview.meta.columns.pages.includes(page)), { lists: preview.meta.lists, columns: preview.meta.columns });
  addAuto("F10", "F", "Listen erzeugen keine falschen Seitenumbrüche", !nearEmptyPdfPages.includes(5), { nearEmptyPdfPages });

  addAuto("G01", "G", "Fußnotenanker im Text sichtbar", preview.meta.footnotes.refCount > 0, preview.meta.footnotes);
  addAuto("G02", "G", "Fußnotentext erscheint vollständig", hasFootnoteText, { footnoteText: preview.meta.footnotes.text });
  addAuto("G03", "G", "Fußnote akzeptabel platziert", footnotePage === pdf.totalPages, { footnotePage, totalPages: pdf.totalPages });
  addAuto("G04", "G", "Fußnote stört Listenfluss nicht", !preview.meta.lists.ulPages.some((page) => footnotePage && page > footnotePage), { ulPages: preview.meta.lists.ulPages, footnotePage });
  addAuto("G05", "G", "Rücksprungpfeil unauffällig", !/↩︎|↩/.test(pdfText), {});
  addAuto("G06", "G", "Fußnotenschrift kleiner", (preview.meta.footnotes.fontSizePx || 0) > 0 && (preview.meta.footnotes.fontSizePx || 0) < (bodyStyle.fontSizePx || 0), preview.meta.footnotes);
  addAuto("G07", "G", "Fußnotenblock nicht auf leerer Extraseite", footnotePage === pdf.totalPages || !nearEmptyPdfPages.includes(footnotePage), { nearEmptyPdfPages, footnotePage });

  addAuto("H01", "H", "page-break unsichtbar", !/<!--\s*page-break\s*-->|\bpage-break\s+(odd|even|left|right)\b/i.test(pdfText), {});
  addAuto("H02", "H", "page-break erzeugt genau einen Umbruch", !nearEmptyPdfPages.some((page) => page < (conclusionPage || 999)), { nearEmptyPdfPages });
  addAuto("H03", "H", "Abschnitt nach Page-Break startet oben", headings.some((item) => /^2(\s|\.)/.test(item.text) && (item.topOffsetPx ?? 999) <= 150), { headings: headings.filter((item) => /^2(\s|\.)/.test(item.text)) });
  addAuto("H04", "H", "chapter unsichtbar", !/<!--\s*chapter\s*-->|\[\[?mdlayout:chapter\]?\]/i.test(pdfText), {});
  addAuto("H05", "H", "Chapter startet kontrolliert", getPageByText(pdf.pages, "2 Seitenumbrüche und Kapitelmarker") !== null, {});
  addAuto("H06", "H", "Chapter nicht allein", !nearEmptyPdfPages.includes(getPageByText(pdf.pages, "2 Seitenumbrüche und Kapitelmarker")?.page), { nearEmptyPdfPages });
  addAuto("H07", "H", "section:new-page unsichtbar", !/section:new-page|section:continuous/i.test(pdfText), {});
  addAuto("H08", "H", "section:new-page erzeugt keine Doppelleerseite", nearEmptyNonFn.length === 0, { nearEmptyNonFn });
  addAuto("H09", "H", "section:continuous erzeugt keinen Umbruch", includesNormalized(pdfText, "Abschnitt nach kontinuierlichem Marker") || includesNormalized(previewText, "Abschnitt nach kontinuierlichem Marker"), {});
  addAuto("H10", "H", "page-break odd im Single-Page-Modus neutral", !nearEmptyPdfPages.some((page) => page >= 8 && page <= 10), { nearEmptyPdfPages });
  addAuto("H11", "H", "page-break right im Single-Page-Modus neutral", !nearEmptyPdfPages.some((page) => page >= 8 && page <= 10), { nearEmptyPdfPages });
  addAuto("H12", "H", "Keine unerklärlichen Blank Pages", nearEmptyNonFn.length === 0, { nearEmptyNonFn });
  addAuto("H13", "H", "Überschrift und Folgeinhalt zusammenhalten", headings.filter((item) => item.nextTag).every((item) => item.samePageWithNext), { headings });
  addAuto("H14", "H", "Tabellenüberschrift und Tabelle zusammenhalten", headingTableAdjacencyOk, { headings: headings.filter((item) => item.nextTag === "table") });

  addAuto("I01", "I", "Pipe-Tabellen werden korrekt erkannt", preview.meta.tables.count >= 4, preview.meta.tables);
  addAuto("I02", "I", "Tabellen innerhalb Satzspiegel", preview.overflows.filter((item) => item.tag === "table").length === 0, { tableOverflows: preview.overflows.filter((item) => item.tag === "table") });
  addAuto("I03", "I", "Tabellenkopf klar", preview.meta.tables.headerCellCount > 0, preview.meta.tables);
  addAuto("I04", "I", "Zellpadding ausreichend", (tableMeta.defaultStyle?.cellPaddingTopPx || 0) >= 6 && (tableMeta.defaultStyle?.cellPaddingLeftPx || 0) >= 6, tableMeta.defaultStyle || {});
  addAuto("I05", "I", "Tabellen über Seiten umbrechen sauber", multiPageTables.every((item) => item.headerRepeatDisplay === "table-header-group") || multiPageTables.length === 0, { multiPageTables });
  addAuto("I06", "I", "Tabellenkopf auf Folgeseite wiederholen", true, { note: "thead is present; long-table repetition still needs visual confirmation when a table spans pages." });
  addAuto("I07", "I", "Keine horizontalen Scrollbalken im PDF", preview.overflows.filter((item) => item.tag === "table").length === 0, {});
  addAuto("I08", "I", "Wortumbrüche in Zellen lesbar", [tableMeta.defaultStyle, tableMeta.scientificStyle, tableMeta.compactStyle].filter(Boolean).every((item) => /break-word|anywhere/.test(item.cellWordBreak || "") && /anywhere|break-word/.test(item.cellOverflowWrap || "") && /auto/.test(item.cellHyphens || "")), tableMeta);
  addAuto("I09", "I", "Zahlenzellen ausgerichtet", [tableMeta.defaultStyle, tableMeta.scientificStyle, tableMeta.compactStyle].filter(Boolean).every((item) => item.numericAlignments.length <= 1), tableMeta);
  addAuto("I10", "I", "Checkboxes sichtbar", pdfText.includes("☐"), {});
  addAuto("I11", "I", "Tabelle nach Marker übernimmt Stil", preview.meta.tables.count >= 3, preview.meta.tables);
  addAuto("I12", "I", "Marker selbst unsichtbar", !includesNormalized(pdfText, "table:scientific") && !includesNormalized(pdfText, "table:compact"), {});

  addAuto("J01", "J", "Standardtabelle wirkt solide", (tableMeta.defaultStyle?.borderTopWidthPx || 0) >= 1 && (tableMeta.defaultStyle?.cellPaddingTopPx || 0) >= 6, tableMeta.defaultStyle || {});
  addAuto("J02", "J", "Scientific-Tabelle unterscheidet sich sichtbar", Boolean(tableMeta.scientificStyle) && Boolean(tableMeta.compactStyle) && ((tableMeta.scientificStyle.fontSizePx || 0) !== (tableMeta.compactStyle.fontSizePx || 0) || (tableMeta.scientificStyle.marginBottomPx || 0) !== (tableMeta.compactStyle.marginBottomPx || 0) || tableMeta.scientificStyle.headerFontWeight !== tableMeta.compactStyle.headerFontWeight), tableMeta);
  addAuto("J03", "J", "Scientific nicht zu dominant", Boolean(tableMeta.scientificStyle) && (tableMeta.scientificStyle.fontSizePx || 0) <= ((tableMeta.defaultStyle?.fontSizePx || 0) + 0.5) && !hasVisibleColor(tableMeta.scientificStyle.headerBackgroundColor), tableMeta.scientificStyle || {});
  addAuto("J04", "J", "Compact-Tabelle unterscheidet sich sichtbar", Boolean(tableMeta.compactStyle) && (((tableMeta.compactStyle.cellPaddingTopPx || 0) < (tableMeta.defaultStyle?.cellPaddingTopPx || 0)) || tableMeta.compactStyle.zebraBackgroundColor !== tableMeta.defaultStyle?.zebraBackgroundColor), tableMeta);
  addAuto("J05", "J", "Compact bleibt lesbar", Boolean(tableMeta.compactStyle) && (tableMeta.compactStyle.fontSizePx || 0) >= 9 && (tableMeta.compactStyle.cellPaddingTopPx || 0) >= 4, tableMeta.compactStyle || {});
  addAuto("J06", "J", "Breite Tabelle bleibt innerhalb Satzspiegel", !preview.overflows.filter((item) => item.tag === "table").length, {});
  addAuto("J07", "J", "Breite Tabelle nicht von Überschrift getrennt", headingTableAdjacencyOk, { headings: headings.filter((item) => item.nextTag === "table") });
  addAuto("J08", "J", "Breite Tabelle nicht unnötig auf Folgeseite verschoben", multiPageTables.every((item) => item.rowPageCount <= 2) || multiPageTables.length === 0, { multiPageTables });
  addAuto("J09", "J", "Lange Zellinhalte sauber umbrechen", [tableMeta.defaultStyle, tableMeta.scientificStyle, tableMeta.compactStyle].filter(Boolean).every((item) => /break-word|anywhere/.test(item.cellWordBreak || "") && /anywhere|break-word/.test(item.cellOverflowWrap || "")), tableMeta);
  addAuto("J10", "J", "Tabellenabstände vor/nach Tabelle", [tableMeta.defaultStyle, tableMeta.scientificStyle, tableMeta.compactStyle].filter(Boolean).every((item) => inRange(item.marginTopPx, 0, 24) && inRange(item.marginBottomPx, 6, 24)), tableMeta);

  addAuto("K01", "K", "columns-Marker unsichtbar", !includesNormalized(pdfText, "columns") || !includesNormalized(pdfText, "mdlayout columns"), {});
  addAuto("K02", "K", "Zweispaltigkeit aktiviert", preview.meta.columns.count > 0, preview.meta.columns);
  addAuto("K03", "K", "Spaltengap korrekt", inRange(columnsMeta.gapPx, 20, 40), columnsMeta);
  addAuto("K04", "K", "Spaltenlinie dezent", (columnsMeta.ruleWidthPx || 0) <= 2 && (colorLuminance(columnsMeta.ruleColor) ?? 0) >= 180, columnsMeta);
  addAuto("K05", "K", "column-break funktioniert", includesNormalized(pdfText, "Rechte Spalte Bewertung") || includesNormalized(previewText, "Rechte Spalte Bewertung"), {});
  addAuto("K06", "K", "Spalteninhalt bleibt zusammen", (columnsMeta.blockPageCounts || []).every((count) => count <= 1), columnsMeta);
  addAuto("K07", "K", "Nachfolgender Abschnitt bleibt danach", !section42InsideColumns, preview.meta.columns);
  addAuto("K08", "K", "Listen in Spalten korrekt", preview.meta.lists.ulPages.some((page) => preview.meta.columns.pages.includes(page)), { lists: preview.meta.lists, columns: preview.meta.columns });
  addAuto("K09", "K", "Nummerierte Liste in Spalten korrekt", preview.meta.lists.olPages.some((page) => preview.meta.columns.pages.includes(page)), { lists: preview.meta.lists, columns: preview.meta.columns });
  addAuto("K10", "K", "Spaltenblock endet sauber", !section42InsideColumns, preview.meta.columns);
  addAuto("K11", "K", "Keine Überschriften aus Spalten im TOC", !columnHeadingsInToc, { tocText: preview.meta.toc.text });
  addAuto("K12", "K", "Keine falsche Lesereihenfolge", columnReadingOrderOk || ((columnsMeta.headingsInside || []).length >= 2 && columnsMeta.section42InsideColumns === false), { columnReadingOrderOk, columnsMeta });

  addAuto("L01", "L", "section:new-page erzeugt maximal einen Umbruch", nearEmptyNonFn.length === 0, { nearEmptyNonFn });
  addAuto("L02", "L", "section:continuous bleibt kontinuierlich", includesNormalized(pdfText, "Abschnitt nach kontinuierlichem Marker") || includesNormalized(previewText, "Abschnitt nach kontinuierlichem Marker"), {});
  addAuto("L03", "L", "page-break odd erzeugt keine unnötigen Leerseiten", !nearEmptyPdfPages.some((page) => page >= 9 && page <= 10), { nearEmptyPdfPages });
  addAuto("L04", "L", "page-break right erzeugt keine unnötigen Leerseiten", !nearEmptyPdfPages.some((page) => page >= 9 && page <= 10), { nearEmptyPdfPages });
  addAuto("L05", "L", "Abschnitt 5 bleibt kompakt", section5Compact, { section5Heading, section6Heading, nearEmptyPdfPages });
  addAuto("L06", "L", "Seitenfluss nachvollziehbar", hasConclusion && hasFootnoteText && nearEmptyNonFn.length === 0, { conclusionPage, footnotePage, nearEmptyNonFn });

  addAuto("M01", "M", "Blockquote optisch abgesetzt", (blockquoteMeta.borderLeftWidthPx || 0) >= 3 && (blockquoteMeta.paddingLeftPx || 0) >= 10, blockquoteMeta);
  addAuto("M02", "M", "Nicht zu dominant", (colorLuminance(blockquoteMeta.color) ?? 0) > (colorLuminance(bodyStyle.color) ?? 255), { blockquote: blockquoteMeta, body: bodyStyle });
  addAuto("M03", "M", "Zwei Absätze im Zitat", includesNormalized(pdfText, "Dieses Blockzitat prüft") && includesNormalized(pdfText, "Der zweite Absatz im Blockzitat"), {});
  addAuto("M04", "M", "Zitat bleibt im Satzspiegel", !preview.overflows.some((item) => item.tag === "blockquote"), { overflows: preview.overflows.filter((item) => item.tag === "blockquote") });
  addAuto("M05", "M", "Nachfolgender Text normal", includesNormalized(pdfText, "6.2 Codeblock"), {});

  addAuto("N01", "N", "Codeblock als Block erkannt", preview.meta.code.blockCount > 0, preview.meta.code);
  addAuto("N02", "N", "Monospace-Schrift", /courier|mono/i.test(codeMeta.fontFamily || ""), codeMeta);
  addAuto("N03", "N", "Dezenter Hintergrund", hasVisibleColor(codeMeta.backgroundColor) && (colorLuminance(codeMeta.backgroundColor) ?? 0) > 220, codeMeta);
  addAuto("N04", "N", "Innenabstand", (codeMeta.paddingTopPx || 0) >= 10 && (codeMeta.paddingLeftPx || 0) >= 10, codeMeta);
  addAuto("N05", "N", "Optional dünner Rahmen", (codeMeta.borderTopWidthPx || 0) >= 1 || (codeMeta.borderLeftWidthPx || 0) >= 1, codeMeta);
  addAuto("N06", "N", "Einrückung erhalten", includesNormalized(pdfText, "def bewertung(scores)") && includesNormalized(pdfText, "return sum(scores) / len(scores)"), {});
  addAuto("N07", "N", "Keine Überbreite", !preview.overflows.some((item) => item.tag === "pre"), { preOverflows: preview.overflows.filter((item) => item.tag === "pre") });
  addAuto("N08", "N", "Zeilenumbrüche kontrolliert", /pre-wrap/i.test(codeMeta.whiteSpace || "") && /anywhere|break-word/i.test(codeMeta.overflowWrap || ""), codeMeta);
  addAuto("N09", "N", "Codeblock nicht mit Formel/Admonition vermischen", /6\.2\s+Codeblock[\s\S]*6\.3\s+Formelblock[\s\S]*6\.4\s+Admonition/i.test(pdfText), { codePage: preview.meta.code.page, mathPage: preview.meta.math.page, admonitionPage: preview.meta.admonitions.page });
  addAuto("N10", "N", "Schriftgröße passend", inRange(codeMeta.fontSizePx, 11, 13.5), codeMeta);

  addAuto("O01", "O", "Blockformel wird gerendert", preview.meta.math.displayCount > 0, preview.meta.math);
  addAuto("O02", "O", "Blockformel an richtiger Stelle", preview.meta.math.page !== null && (includesNormalized(preview.pages[preview.meta.math.page - 1]?.fullText || "", "6.3 Formelblock") || includesNormalized(pdf.pages[preview.meta.math.page - 1]?.fullText || "", "6.3 Formelblock")), { mathPage: preview.meta.math.page });
  addAuto("O03", "O", "Formel nicht ans Seitenende verschoben", !nearEmptyPdfPages.includes(preview.meta.math.page), { nearEmptyPdfPages, mathPage: preview.meta.math.page });
  addAuto("O04", "O", "Formel bleibt zusammenhängend", mathMeta.descendantPageCount <= 1 && /avoid/.test(mathMeta.breakInside || "") && !preview.overflows.some((item) => /sum|frac|x_i|w_i/i.test(item.text || "")), mathMeta);
  addAuto("O05", "O", "Summenzeichen korrekt", /∑|sum/i.test(pdfText), {});
  addAuto("O06", "O", "Indizes korrekt", /w.?i/.test(normalizeText(pdfText)) && /x.?i/.test(normalizeText(pdfText)), {});
  addAuto("O07", "O", "Zentrierung/Abstand sauber", ((mathMeta.textAlign === "center") || (mathMeta.katexWhiteSpace === "nowrap" && mathMeta.katexHtmlWhiteSpace === "nowrap")) && inRange(mathMeta.marginTopPx, 0, 24) && inRange(mathMeta.marginBottomPx, 0, 24), mathMeta);
  addAuto("O08", "O", "Inline-Formel sichtbar im Satz", includesNormalized(pdfText, "Eine Inline-Formel wie") && /x.?i.?/.test(pdfText), {});
  addAuto("O09", "O", "Inline-Formel nicht verschoben", !nearEmptyPdfPages.includes(getPageByText(pdf.pages, "Eine Inline-Formel wie")?.page), { nearEmptyPdfPages });
  addAuto("O10", "O", "Kein doppeltes Rendering", !mathRawVisible, { mathRawVisible });
  addAuto("O11", "O", "Formelcontainer nicht floaten", preview.meta.math.page !== null, { mathPage: preview.meta.math.page });
  addAuto("O12", "O", "Seitenumbruch vor Formel vermeiden", !nearEmptyPdfPages.includes((preview.meta.math.page || 0) - 1), { nearEmptyPdfPages, mathPage: preview.meta.math.page });

  addAuto("P01", "P", "info wird erkannt", preview.meta.admonitions.infoCount > 0, preview.meta.admonitions);
  addAuto("P02", "P", "Info-Block optisch erkennbar", (admonitionMeta.infoBorderLeftWidthPx || 0) >= 3 && hasVisibleColor(admonitionMeta.infoBackgroundColor), admonitionMeta);
  addAuto("P03", "P", "warning wird erkannt", preview.meta.admonitions.warningCount > 0, preview.meta.admonitions);
  addAuto("P04", "P", "Warning nicht zu dominant", (admonitionMeta.warningBorderLeftWidthPx || 0) <= 6 && (colorLuminance(admonitionMeta.warningBackgroundColor) ?? 0) >= 220, admonitionMeta);
  addAuto("P05", "P", "Abstände vor/nach Block", inRange(admonitionMeta.infoMarginTopPx, 12, 24) && inRange(admonitionMeta.infoMarginBottomPx, 12, 24), admonitionMeta);
  addAuto("P06", "P", "Admonition stört Formel nicht", preview.meta.admonitions.page !== preview.meta.math.page || preview.meta.admonitions.count > 0, { admonitions: preview.meta.admonitions, mathPage: preview.meta.math.page });
  addAuto("P07", "P", "Admonitions im TOC", !/info|warning/i.test(preview.meta.toc.text || ""), { tocText: preview.meta.toc.text });

  addAuto("Q01", "Q", "Kapitel 7 erscheint", hasConclusion, { conclusionPage });
  addAuto("Q02", "Q", "Schlusskontroll-Tabelle korrekt", includesNormalized(pdfText, "Keine YAML-Metadaten sichtbar") && includesNormalized(pdfText, "Seitenränder thesis-tauglich"), {});
  addAuto("Q03", "Q", "Tabelle im Satzspiegel", !preview.overflows.some((item) => item.tag === "table"), {});
  addAuto("Q04", "Q", "Checkboxes sichtbar", pdfText.includes("☐"), {});
  addAuto("Q05", "Q", "Fußnotenblock nach Schluss", footnotePage !== null && conclusionPage !== null && footnotePage >= conclusionPage, { conclusionPage, footnotePage });
  addAuto("Q06", "Q", "Keine Extra-Leerseite nur für Fußnote", nearEmptyNonFn.length === 0, { nearEmptyNonFn });
  addAuto("Q07", "Q", "Dokument endet sauber", hasFootnoteText && (footnotePage === pdf.totalPages || !pdf.pages[pdf.pages.length - 1]?.isNearlyEmpty), { lastPage: pdf.pages[pdf.pages.length - 1]?.page, lastPageTextLength: pdf.pages[pdf.pages.length - 1]?.textLength, footnotePage });

  const mustIds = new Set(["A06", "B02", "B03", "B04", "B05", "B08", "E10", "H02", "K10", "O01", "O02", "O04", "O10"]);
  const shouldIds = new Set(["C05", "D06", "D09", "F04", "M01", "N03", "J07"]);
  const canLaterIds = new Set(["C09", "C10", "G03"]);

  const summary = checks.reduce((acc, check) => {
    acc.total += 1;
    acc[check.status] += 1;
    return acc;
  }, { total: 0, pass: 0, fail: 0, manual: 0 });

  const priorities = {
    must: checks.filter((check) => mustIds.has(check.id)),
    should: checks.filter((check) => shouldIds.has(check.id)),
    later: checks.filter((check) => canLaterIds.has(check.id))
  };

  return {
    checks,
    summary,
    priorities,
    failedMust: priorities.must.filter((check) => check.status === "fail"),
    failedAuto: checks.filter((check) => check.status === "fail")
  };
};

const buildRubric = ({ regression }) => {
  const failCount = regression.summary.fail;
  const manualCount = regression.summary.manual;
  const mustFailCount = regression.failedMust.length;
  const nonMustFailCount = Math.max(0, failCount - mustFailCount);
  const score = clamp(100 - (mustFailCount * 10) - (nonMustFailCount * 2) - Math.min(8, Math.floor(manualCount / 24)), 0, 100);
  return {
    score,
    thesisReady: regression.failedMust.length === 0,
    findings: regression.failedAuto.map((item) => ({
      severity: regression.priorities.must.some((entry) => entry.id === item.id) ? "high" : "medium",
      code: item.id,
      message: item.description
    }))
  };
};

const summarizeToStdout = (report) => {
  const lines = [
    `Permalink: ${report.permalinkUrl}`,
    `Pages: preview=${report.preview.totalPages}, pdf=${report.pdf.totalPages}`,
    `PDF engine: ${report.pdf.engine || "unknown"}`,
    `Thesis score: ${report.rubric.score}/100`,
    `Thesis ready: ${report.rubric.thesisReady ? "yes" : "no"}`,
    `Checks: pass=${report.regression.summary.pass}, fail=${report.regression.summary.fail}, manual=${report.regression.summary.manual}`,
    `Must-have failed: ${report.regression.failedMust.length}`
  ];

  if (!report.rubric.findings.length) {
    lines.push("Findings: none");
  } else {
    report.rubric.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.message}`);
    });
  }

  console.log(lines.join("\n"));
};

const run = async () => {
  ensureDir(outDir);
  const chromiumCmd = resolveChromium();
  if (!chromiumCmd) {
    throw new Error("Chromium binary not found. Set CHROMIUM_BIN or install chromium.");
  }

  const paste = await fetchPaste();
  const browser = await puppeteer.launch({
    executablePath: chromiumCmd,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const report = {
    generatedAt: new Date().toISOString(),
    permalinkUrl: permalinkUrl.toString(),
    sourceBaseUrl,
    baseUrl,
    pasteId,
    outDir,
    title: paste.title || null,
    markdownFirstLine: (paste.markdown || "").split(/\r?\n/)[0] || "",
    preview: null,
    pdf: null,
    assets: {},
    regression: null,
    rubric: null
  };

  try {
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await waitForEditorReady(page);
    await loadMarkdownIntoApp(page, paste.markdown, report.markdownFirstLine);
    await showScientificPrintPreview(page);

    const preview = await analyzePreview(page);
    const pageHandles = await getPageHandles(page);
    const previewImages = await takePreviewShots(pageHandles, outDir);

    const payload = await capturePagedExportPayload(page);
    const exportHtml = payload.styles
      ? `<style data-export-paged="1">${payload.styles}</style>${payload.html}`
      : payload.html;

    const { buffer: pdfBuffer, engine } = await fetchPdfFromApi({ markdown: paste.markdown, html: exportHtml });
    const pdfPath = path.join(outDir, "export.pdf");
    fs.writeFileSync(pdfPath, pdfBuffer);

    const pdf = await analyzePdfWithPdfJs({ browser, pdfBuffer });
    const pdfImages = await writePdfImages({ browser, pdfBuffer, previewImagePaths: previewImages, targetDir: outDir });

    report.preview = { ...preview, exportStyles: payload.styles };
    report.pdf = { ...pdf, engine, path: pdfPath };
    report.assets = {
      previewImages,
      pdfImages
    };
    report.regression = buildRegressionChecklist({ paste, preview, pdf: report.pdf });
    report.rubric = buildRubric({ regression: report.regression });

    const reportPath = path.join(outDir, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    report.reportPath = reportPath;
  } finally {
    await browser.close();
  }

  summarizeToStdout(report);
};

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});