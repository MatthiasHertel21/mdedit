/**
 * Layout Commands Preprocessor
 * Converts layout commands (::: syntax and HTML comments) to HTML markers
 */

const createLayoutToken = (name, attrs = {}) => {
  const serialized = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(';');
  return `[[MDLAYOUT:${name}${serialized ? `;${serialized}` : ''}]]`;
};

const parseLayoutToken = (value) => {
  const match = String(value || '').trim().match(/^\[{1,2}MDLAYOUT:([a-z-]+)(?:;([^\]]+))?\]{1,2}$/i);
  if (!match) return null;

  const attrs = {};
  if (match[2]) {
    match[2].split(';').forEach((entry) => {
      const [key, rawValue = ''] = entry.split('=');
      if (!key) return;
      attrs[key] = rawValue;
    });
  }

  return { name: match[1].toLowerCase(), attrs };
};

const isTocPlaceholder = (value) => /^\[\[?_?toc_?\]?\]$/i.test(String(value || '').trim());

const parseTocDepth = (value) => {
  const m = String(value || '').match(/\bdepth=(\d+)/i);
  return m ? Math.max(1, Math.min(6, parseInt(m[1], 10))) : 3;
};

const protectMarkdownCode = (markdown) => {
  const placeholders = [];
  let protectedText = String(markdown || '');

  const reserve = (value) => {
    const token = `__MD_CODE_PLACEHOLDER_${placeholders.length}__`;
    placeholders.push(value);
    return token;
  };

  protectedText = protectedText.replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g, (match) => reserve(match));
  protectedText = protectedText.replace(/`([^`\n]+)`/g, (match) => reserve(match));

  return {
    text: protectedText,
    restore(value) {
      let restored = String(value || '');
      placeholders.forEach((original, index) => {
        restored = restored.replace(`__MD_CODE_PLACEHOLDER_${index}__`, original);
      });
      return restored;
    }
  };
};

const stripEmbeddedBibliographyBlocks = (markdown) => String(markdown || '').replace(
  /(^|\n)(`{3,}|~{3,})mdedit-bibliography[^\n]*\n[\s\S]*?\n\2(?=\n|$)/gi,
  (match, prefix) => prefix || ''
);

export class LayoutPreprocessor {
  constructor() {
    this.tableCounter = 0;
    this.figureCounter = 0;
    this.chapterNumber = 0;
    this.figureRegistry = [];
    this.tableRegistry = [];
  }

  /**
   * Process markdown with layout commands
   */
  process(markdown) {
    const protectedMarkdown = protectMarkdownCode(stripEmbeddedBibliographyBlocks(markdown));
    let processed = protectedMarkdown.text;

    // Strip author comments before any other processing
    processed = this.stripAuthorComments(processed);

    // Process all command types
    processed = this.processPageBreaks(processed);
    processed = this.processColumnBreaks(processed);
    processed = this.processColumns(processed);
    processed = this.processChapters(processed);
    processed = this.processSections(processed);
    processed = this.processTableIdMarkers(processed);
    processed = this.processTableMarkers(processed);
    processed = this.normalizeImageIdAttributes(processed);
    processed = this.processImageMarkers(processed);
    processed = this.processListOfFigures(processed);
    processed = this.processListOfTables(processed);
    processed = this.processTitlePage(processed);
    processed = this.processBlankPages(processed);
    processed = this.processScientificContainers(processed);
    processed = this.processAppendix(processed);

    return protectedMarkdown.restore(processed);
  }

  /**
   * Strip author comments: %% ... %% (inline or multiline)
   * These are editorial notes that should not appear in preview or export.
   */
  stripAuthorComments(markdown) {
    return String(markdown || '')
      // Multiline and inline: %% ... %%
      .replace(/%%[\s\S]*?%%/g, '')
      // Leftover lone %%-starting lines (unclosed blocks)
      .replace(/^%%[^\n]*$/gm, '');
  }

  /**
   * Scientific containers
   * Supports: ::: definition [title] ... :::
   * Types: definition, theorem, proof, remark, example, lemma, corollary, proposition
   */
  processScientificContainers(markdown) {
    const TYPE_PATTERN = 'definition|theorem|proof|remark|example|lemma|corollary|proposition';
    const blockRe = new RegExp(
      `(^|\\n)([ \\t]*:::[ \\t]*(${TYPE_PATTERN})(?:[ \\t]+([^\\n]*))?\\n[\\s\\S]*?\\n[ \\t]*:::[ \\t]*(?=\\n|$))`,
      'gi'
    );
    return markdown.replace(blockRe, (match, prefix, block, type, title) => {
      const trimTitle = (title || '').trim();
      // Extract inner content (between opening ::: type and closing :::)
      const innerMatch = block.match(/^[ \t]*:::[ \t]*[\w]+(?:[ \t]+[^\n]*)?\n([\s\S]*)\n[ \t]*:::[ \t]*$/);
      const inner = innerMatch ? innerMatch[1] : '';
      const open = createLayoutToken('sci-container-open', {
        type: type.toLowerCase(),
        ...(trimTitle ? { title: trimTitle } : {})
      });
      const close = createLayoutToken('sci-container-close', {});
      return `${prefix}${open}\n\n${inner}\n\n${close}`;
    });
  }

  /**
   * Appendix mode
   * Supports: <!-- appendix --> or ::: appendix
   * Headings after this marker are numbered Anhang A, B, C ...
   */
  processAppendix(markdown) {
    return markdown
      .replace(/<!--\s*appendix\s*-->/gi, createLayoutToken('appendix'))
      .replace(/^[ \t]*:::\s*appendix\s*$/gim, createLayoutToken('appendix'));
  }

  /**
   * Page breaks
   * Supports: <!-- page-break --> or ::: page-break or ::: pagebreak
   */
  processPageBreaks(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*page-break\s*-->/gi, createLayoutToken('page-break'))
      // ::: syntax (with or without hyphen)
      .replace(/^[ 	]*:::\s*page-?break\s*$/gim, createLayoutToken('page-break'))
      // Combined: <!-- page-break odd -->
      .replace(/<!--\s*page-break\s+(odd|even|right|left)\s*-->/gi, 
               (match, type) => createLayoutToken('page-break', { break: type }));
  }

  /**
   * Column breaks
   * Supports: <!-- column-break --> or ::: column-break
   */
  processColumnBreaks(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*column-break\s*-->/gi, createLayoutToken('column-break'))
      // ::: syntax
      .replace(/^[ 	]*:::\s*column-?break\s*$/gim, createLayoutToken('column-break'));
  }

  /**
   * Columns sections
   * Supports: 
   *   <!-- columns:2 gap:20pt -->...<!-- /columns -->
   *   ::: columns{count=2 gap=20pt}...:::
   */
  processColumns(markdown) {
    let result = markdown;

    // HTML comment syntax: <!-- columns:2 gap:20pt rule:true -->
    result = result.replace(
      /<!--\s*columns:(\d+)(?:\s+gap:(\S+))?(?:\s+rule:(true|false))?\s*-->/gi,
      (match, count, gap, rule) => {
        const gapValue = gap || '20pt';
        const ruleEnabled = rule === 'true';
        return createLayoutToken('columns-open', { count, gap: gapValue, rule: ruleEnabled });
      }
    );

    // Closing tag
    result = result.replace(/<!--\s*\/columns\s*-->/gi, createLayoutToken('columns-close'));

    // ::: syntax: ::: columns{count=2 gap=20pt rule=true}
    result = result.replace(
      /^[ 	]*:::\s*columns\{count=(\d+)(?:\s+gap=(\S+))?(?:\s+rule=(true|false))?\}\s*$/gim,
      (match, count, gap, rule) => {
        const gapValue = gap || '20pt';
        const ruleEnabled = rule === 'true';
        return createLayoutToken('columns-open', { count, gap: gapValue, rule: ruleEnabled });
      }
    );

    // Closing ::: (standalone)
    // We need to be careful not to close other ::: blocks
    // For now, we'll use a simple approach - match ::: that aren't starting other blocks
    result = result.replace(/^[ 	]*:::\s*$/gm, (match, offset, string) => {
      // Check if we're inside a columns block
      const before = string.substring(0, offset);
      const columnsOpen = (before.match(/\[\[MDLAYOUT:columns-open/g) || []).length;
      const columnsClose = (before.match(/\[\[MDLAYOUT:columns-close\]\]/g) || []).length;
      
      if (columnsOpen > columnsClose) {
        return createLayoutToken('columns-close');
      }
      return match;
    });

    return result;
  }

  /**
   * Chapter markers
   * Supports: <!-- chapter --> or ::: chapter
   */
  processChapters(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*chapter\s*-->/gi, createLayoutToken('chapter'))
      // ::: syntax
      .replace(/^[ 	]*:::\s*chapter\s*$/gim, createLayoutToken('chapter'));
  }

  /**
   * Section breaks
   * Supports: <!-- section:new-page --> or ::: section{type=new-page}
   */
  processSections(markdown) {
    let result = markdown;

    // HTML comment syntax: <!-- section:new-page columns:2 -->
    result = result.replace(
      /<!--\s*section:(\S+)(?:\s+columns:(\d+))?\s*-->/gi,
      (match, type, cols) => {
        const columns = cols || '1';
        return createLayoutToken('section', { type, columns });
      }
    );

    // ::: syntax: ::: section{type=new-page columns=2}
    result = result.replace(
      /^[ 	]*:::\s*section\{type=(\S+)(?:\s+columns=(\d+))?\}\s*$/gim,
      (match, type, cols) => {
        const columns = cols || '1';
        return createLayoutToken('section', { type, columns });
      }
    );

    return result;
  }

  /**
   * Table layout markers
   * Supports: <!-- table:compact --> or ::: table{layout=compact}
   */
  /**
   * Table ID markers
   * Supports: <!-- tbl: #tbl:id -->
   */
  processTableIdMarkers(markdown) {
    return markdown.replace(
      /<!--\s*tbl:\s*#(tbl:[^\s>]+)\s*-->/gi,
      (match, tblId) => createLayoutToken('tbl-id', { tblId }) + '\n\n'
    );
  }

  processTableMarkers(markdown) {
    let result = markdown;

    // HTML comment syntax: <!-- table:compact -->
    result = result.replace(
      /<!--\s*table:(\w+)\s*-->/gi,
      (match, layout) => `${createLayoutToken('table', { layout })}\n\n`
    );

    // ::: syntax: ::: table{layout=compact}
    result = result.replace(
      /^[ 	]*:::\s*table\{layout=(\w+)\}\s*$/gim,
      (match, layout) => `${createLayoutToken('table', { layout })}\n`
    );

    // Closing fence for ::: table{...} blocks. Once the opening fence has been
    // converted into a layout token, the trailing ::: is only syntactic noise and
    // can prevent Pandoc from keeping the token as its own block before the table.
    result = result.replace(
      /(^|\n)(\s*\|[^\n]*\n(?:\s*\|[^\n]*\n)+)\s*:::\s*(?=\n|$)/g,
      (match, prefix, tableBlock) => `${prefix}${tableBlock}`
    );

    return result;
  }

  /**
   * Title page
   * Supports: <!-- title-page -->...<!-- /title-page --> or ::: title-page...:::
   */
  processTitlePage(markdown) {
    let result = markdown;

    // HTML comment syntax
    result = result.replace(
      /<!--\s*title-page\s*-->/gi,
      createLayoutToken('title-page', { start: true })
    );
    result = result.replace(
      /<!--\s*\/title-page\s*-->/gi,
      createLayoutToken('title-page', { end: true })
    );

    // ::: syntax
    result = result.replace(
      /^[ 	]*:::\s*title-?page\s*$/gim,
      createLayoutToken('title-page', { start: true })
    );

    return result;
  }

  /**
   * Blank pages
   * Supports: <!-- blank-page --> or ::: blank-page
   */
  processBlankPages(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*blank-page\s*-->/gi, createLayoutToken('blank-page'))
      // ::: syntax
      .replace(/^[ 	]*:::\s*blank-?page\s*$/gim, createLayoutToken('blank-page'));
  }

  /**
   * Apply layout markers to HTML after markdown-it rendering
   */
  postProcessHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this.rehydrateLayoutComments(doc);
    this.hydrateLayoutTokens(doc);
    this.wrapColumnBlocks(doc);
    this.wrapTitlePageContent(doc);
    // Must run before hydrateTableOfContents so title-page headings are tagged
    this.applyTitlePageFixes(doc);

    // Scientific containers — must run before figures/tables
    this.wrapScientificContainers(doc);

    // Figures and table captions — must run before list building
    this.applyFigures(doc);
    this.applyTableCaptions(doc);
    // Mermaid captions — runs after applyFigures so figureCounter is already set
    this.applyMermaidCaptions(doc);

    this.applyPageBreakMarkers(doc);

    // Apply column styles
    this.applyColumnStyles(doc);

    this.hydrateTableOfContents(doc);

    // Build figure/table lists from registered entries
    this.hydrateListsOfFiguresAndTables(doc);
    this.wrapDisplayMathBlocks(doc);

    // Ensure the first body section starts on a new page after all front-matter
    // navigation elements (TOC, LoF, LoT).
    this.applyFrontMatterPageBreaks(doc);

    this.applyChapterMarkers(doc);

    // Appendix mode — must run after chapters so heading IDs are settled
    this.applyAppendixMode(doc);

    this.applyFlowGuards(doc);

    // Convert Pandoc footnotes into Paged.js footnotes for print output so the
    // call stays anchored at the sentence and the note is emitted on the same page.
    this.applyPagedFootnotes(doc);

    // Apply table layouts
    this.applyTableLayouts(doc);
    this.applyColumnsGuard(doc);

    // Apply section breaks
    this.applySectionBreaks(doc);

    // Clean up markers
    this.cleanupMarkers(doc);
    this.removeResidualLayoutTokenText(doc);

    return doc.body.innerHTML;
  }

  applyPageBreakMarkers(doc) {
    doc.querySelectorAll('.page-break').forEach((marker) => {
      if (marker.dataset.break) {
        return;
      }

      let next = marker.nextElementSibling;

      while (next && next.classList.contains('page-break')) {
        next = next.nextElementSibling;
      }

      if (next) {
        next.dataset.breakBefore = 'page';
      }

      marker.remove();
    });
  }

  applyChapterMarkers(doc) {
    const keepWithHeadingSelector = [
      'p',
      'h2',
      'ul',
      'ol',
      'blockquote',
      '.math-block'
    ].join(', ');

    const wrapChapterTarget = (target, marker = null) => {
      if (!target || target.closest('.chapter-start')) {
        marker?.remove();
        return null;
      }

      const wrapper = doc.createElement('div');
      wrapper.className = 'chapter-start';
      // Set data-break-before directly so Paged.js reads it during fragmentation.
      // Paged.js uses dataset.breakBefore (not CSS break-before) when explicit
      // polisherStylesheets are passed, because processBreaks only runs on those
      // stylesheets and never sees the inline <style> block from styledHTML.
      wrapper.dataset.breakBefore = 'page';

      if (marker) {
        marker.replaceWith(wrapper);
      } else {
        target.parentNode.insertBefore(wrapper, target);
      }

      wrapper.appendChild(target);

      const firstContent = wrapper.nextElementSibling;
      if (firstContent?.matches(keepWithHeadingSelector)) {
        wrapper.appendChild(firstContent);
      }

      return wrapper;
    };

    doc.querySelectorAll('.chapter-marker').forEach((marker) => {
      let target = marker.nextElementSibling;
      while (target && target.classList.contains('chapter-marker')) {
        target = target.nextElementSibling;
      }

      if (!target) {
        marker.remove();
        return;
      }

      wrapChapterTarget(target, marker);
    });

    // Scientific thesis documents use H2 for top-level body chapters. For the
    // later numbered chapters we only need an explicit page break, not an extra
    // wrapper, otherwise the additional container shifts too much surrounding
    // flow and creates false extra-break regressions.
    const numberedBodyChapters = Array.from(doc.querySelectorAll('h2')).filter((heading) => {
      if (heading.closest('.chapter-start, .title-page, .table-of-contents, .md-columns, .md-column')) return false;
      const text = (heading.textContent || '').trim();
      return /^\d+\./.test(text);
    });

    numberedBodyChapters.slice(2).forEach((heading) => {
      if (!heading.dataset.breakBefore) {
        heading.dataset.breakBefore = 'page';
      }
    });

    // The last chapter doesn't need a forced page break – let it flow from the
    // preceding page so the conclusion + footnote land on the same page.
    const chapterStarts = doc.querySelectorAll('.chapter-start');
    if (chapterStarts.length > 1) {
      const last = chapterStarts[chapterStarts.length - 1];
      last.classList.add('chapter-start-last');
      // Remove the inline break-before from the last chapter's heading
      const lastHeading = last.querySelector('h1, h2, h3, h4');
      if (lastHeading) {
        lastHeading.style.removeProperty('break-before');
        lastHeading.style.removeProperty('page-break-before');
      }
    }
  }

  applyFlowGuards(doc) {
    const wrapSequence = (nodes, className) => {
      const first = nodes[0];
      if (!first || !first.parentNode) return null;
      const wrapper = doc.createElement('div');
      wrapper.className = className;
      first.parentNode.insertBefore(wrapper, first);
      nodes.forEach((node) => wrapper.appendChild(node));
      return wrapper;
    };

    const markKeepWithNextBlock = (heading, intro, target) => {
      heading.dataset.breakAfter = 'avoid';
      heading.classList.add('keep-with-next-block-heading');

      if (intro) {
        intro.dataset.breakAfter = 'avoid';
        intro.classList.add('keep-with-next-block-intro');
      }

      if (target) {
        target.dataset.breakBefore = 'avoid';
        target.dataset.previousBreakAfter = 'avoid';
        target.classList.add('keep-with-next-block-target');
      }
    };

    // List intro: no DOM wrapping or break-after needed – let Paged.js flow naturally
    // (break-after: avoid-page on p caused list reordering in Paged.js)

    Array.from(doc.querySelectorAll('h2, h3, h4')).forEach((heading) => {
      if (heading.closest('.keep-with-next-table')) return;
      let next = heading.nextElementSibling;
      if (!next) return;

      const nodes = [heading];
      let intro = null;
      if (next.tagName === 'P') {
        intro = next;
        nodes.push(next);
        next = next.nextElementSibling;
      }

      if (!next) return;

      if (next.tagName === 'TABLE') {
        const bodyRowCount = next.querySelectorAll('tbody tr').length || next.querySelectorAll('tr').length;
        if (bodyRowCount <= 8) {
          next.classList.add('table-keep-together');
        }
        markKeepWithNextBlock(heading, intro, next);
        nodes.push(next);
        wrapSequence(nodes, 'keep-with-next-table');
      } else if (next.tagName === 'FIGURE') {
        const followingTable = next.nextElementSibling;
        if (followingTable?.tagName === 'TABLE') {
          const bodyRowCount = followingTable.querySelectorAll('tbody tr').length || followingTable.querySelectorAll('tr').length;
          if (bodyRowCount <= 8) {
            followingTable.classList.add('table-keep-together');
          }
          markKeepWithNextBlock(heading, intro, next);
          next.dataset.breakAfter = 'avoid';
          next.classList.add('keep-with-next-block-target');
          followingTable.dataset.breakBefore = 'avoid';
          followingTable.dataset.previousBreakAfter = 'avoid';
          followingTable.classList.add('keep-with-next-block-target');
          nodes.push(next, followingTable);
          wrapSequence(nodes, 'keep-with-following-objects');
        }
      } else if (next.tagName === 'PRE') {
        markKeepWithNextBlock(heading, intro, next);
        nodes.push(next);
        wrapSequence(nodes, 'keep-with-next-block');
      }
    });

    Array.from(doc.querySelectorAll('table')).forEach((table) => {
      const bodyRowCount = table.querySelectorAll('tbody tr').length || table.querySelectorAll('tr').length;
      if (bodyRowCount > 0 && bodyRowCount <= 8) {
        table.classList.add('table-keep-together');
      }
    });
  }

  buildTableOfContents(doc, maxDepth = 3) {
    const headings = Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter((heading) => {
        if (!heading.id || heading.closest('.table-of-contents')) return false;
        if (heading.closest('.md-columns, .md-column')) return false;
        if (heading.closest('.title-page') || heading.dataset.notoc) return false;
        if (heading.classList.contains('no-toc')) return false;
        const level = Number.parseInt(heading.tagName.slice(1), 10) || 1;
        return level <= maxDepth;
      });

    if (headings.length === 0) return null;

    const nav = doc.createElement('nav');
    nav.className = 'table-of-contents';

    const tocHeading = doc.createElement('h2');
    tocHeading.className = 'toc-heading';
    tocHeading.textContent = 'Inhaltsverzeichnis';
    nav.appendChild(tocHeading);

    const rootList = doc.createElement('ul');
    nav.appendChild(rootList);

    const listStack = [{ level: 0, list: rootList, item: null }];

    headings.forEach((heading) => {
      const level = Number.parseInt(heading.tagName.slice(1), 10) || 1;
      const item = doc.createElement('li');
      const link = doc.createElement('a');
      link.setAttribute('href', `#${heading.id}`);
      link.textContent = (heading.textContent || '').trim();
      item.appendChild(link);

      while (listStack.length > 1 && level <= listStack[listStack.length - 1].level) {
        listStack.pop();
      }

      if (level > listStack[listStack.length - 1].level && listStack[listStack.length - 1].item) {
        const nestedList = doc.createElement('ul');
        listStack[listStack.length - 1].item.appendChild(nestedList);
        listStack.push({ level, list: nestedList, item: null });
      }

      const current = listStack[listStack.length - 1];
      current.list.appendChild(item);
      current.item = item;
    });

    return nav;
  }

  createMarkerForToken(doc, token) {
    const marker = doc.createElement('div');

    switch (token.name) {
      case 'page-break':
        marker.className = 'page-break';
        if (token.attrs.break) marker.dataset.break = token.attrs.break;
        // Paged.js reads data-break-after during fragmentation (not CSS break-after).
        marker.dataset.breakAfter = 'page';
        break;
      case 'column-break':
        marker.className = 'column-break';
        // Paged.js reads data-break-before during fragmentation, not CSS break-before.
        marker.dataset.breakBefore = 'column';
        break;
      case 'columns-open':
        marker.className = 'md-columns-token-start';
        marker.dataset.count = token.attrs.count || '2';
        marker.dataset.gap = token.attrs.gap || '20pt';
        marker.dataset.rule = token.attrs.rule || 'false';
        marker.dataset.layout = 'columns';
        break;
      case 'columns-close':
        marker.className = 'md-columns-token-end';
        break;
      case 'chapter':
        marker.className = 'chapter-marker';
        break;
      case 'section':
        marker.className = 'section-break';
        marker.dataset.type = token.attrs.type || 'continuous';
        marker.dataset.columns = token.attrs.columns || '1';
        break;
      case 'table':
        marker.className = 'table-layout-marker';
        marker.dataset.layout = token.attrs.layout || 'default';
        break;
      case 'tbl-id':
        marker.className = 'tbl-id-marker';
        if (token.attrs.tblId) marker.dataset.tblId = token.attrs.tblId;
        break;
      case 'title-page':
        marker.className = 'title-page-marker';
        if (token.attrs.start === 'true') marker.dataset.start = 'true';
        if (token.attrs.end === 'true') marker.dataset.end = 'true';
        break;
      case 'blank-page':
        marker.className = 'blank-page-marker';
        break;
      case 'sci-container-open':
        marker.className = 'sci-container-open';
        marker.dataset.type = token.attrs.type || 'definition';
        if (token.attrs.title) marker.dataset.title = token.attrs.title;
        break;
      case 'sci-container-close':
        marker.className = 'sci-container-close';
        break;
      case 'appendix':
        marker.className = 'appendix-marker';
        break;
      case 'list-of-figures':
        marker.className = 'list-of-figures-placeholder';
        break;
      case 'list-of-tables':
        marker.className = 'list-of-tables-placeholder';
        break;
      case 'img':
        marker.className = 'image-layout-marker';
        if (token.attrs.id) marker.dataset.id = token.attrs.id;
        if (token.attrs.align) marker.dataset.align = token.attrs.align;
        if (token.attrs.width) marker.dataset.width = token.attrs.width;
        if (token.attrs.frame === 'true') marker.dataset.frame = 'true';
        if (token.attrs.shadow === 'true') marker.dataset.shadow = 'true';
        if (token.attrs.filter) marker.dataset.filter = token.attrs.filter;
        break;
      default:
        return null;
    }

    return marker;
  }

  /**
   * Convert Pandoc-preserved layout HTML comment nodes to [[MDLAYOUT:...]] token
   * paragraph elements so that hydrateLayoutTokens can process them normally.
   * This is needed because Pandoc passes <!-- columns:N ... --> comments through as
   * Comment nodes, which querySelectorAll('*') in hydrateLayoutTokens cannot reach.
   * Called before hydrateLayoutTokens in postProcessHTML.
   */
  rehydrateLayoutComments(doc) {
    const walk = (node) => {
      const children = Array.from(node.childNodes);
      children.forEach((child) => {
        if (child.nodeType === Node.COMMENT_NODE) {
          const text = (child.textContent || '').trim();
          let token = null;

          // <!-- columns:N gap:Xpt rule:Y -->
          const colOpen = text.match(/^columns:(\d+)(?:\s+gap:(\S+))?(?:\s+rule:(true|false))?$/i);
          if (colOpen) {
            token = createLayoutToken('columns-open', {
              count: colOpen[1],
              gap: colOpen[2] || '20pt',
              rule: colOpen[3] === 'true',
            });
          } else if (/^\/columns$/i.test(text)) {
            // <!-- /columns -->
            token = createLayoutToken('columns-close');
          } else if (/^column-break$/i.test(text)) {
            // <!-- column-break -->
            token = createLayoutToken('column-break');
          } else {
            // <!-- page-break [type] -->
            const pbMatch = text.match(/^page-break(?:\s+(odd|even|right|left))?$/i);
            if (pbMatch) {
              token = createLayoutToken('page-break', pbMatch[1] ? { break: pbMatch[1] } : {});
            }
          }

          if (token) {
            const p = doc.createElement('p');
            p.textContent = token;
            child.parentNode.replaceChild(p, child);
            // Do not recurse into the new element
          }
        } else {
          walk(child);
        }
      });
    };

    walk(doc.body);
  }

  hydrateLayoutTokens(doc) {
    Array.from(doc.body.querySelectorAll('*')).forEach((element) => {
      if (element.childElementCount > 0) return;
      if (element.closest('code, pre, .katex, .katex-display')) return;

      const token = parseLayoutToken(element.textContent || '');
      if (!token) return;

      const marker = this.createMarkerForToken(doc, token);
      if (!marker) return;

      element.replaceWith(marker);
    });
  }

  hydrateTableOfContents(doc) {
    const placeholderNodes = Array.from(doc.body.querySelectorAll('*')).filter((element) => {
      if (element.childElementCount > 0) return false;
      if (element.closest('code, pre')) return false;
      return isTocPlaceholder(element.textContent || '');
    });

    if (placeholderNodes.length === 0) return;

    placeholderNodes.forEach((element, index) => {
      const depth = parseTocDepth(element.textContent || '');
      const toc = this.buildTableOfContents(doc, depth);
      if (toc) {
        // Paged.js reads dataset.breakBefore during fragmentation — CSS break-before
        // on .table-of-contents is not processed by the polisher.
        toc.dataset.breakBefore = 'page';
        element.replaceWith(index === 0 ? toc : toc.cloneNode(true));
        return;
      }
      element.remove();
    });
  }

  wrapTitlePageContent(doc) {
    Array.from(doc.querySelectorAll('.title-page-marker[data-start="true"]')).forEach((start) => {
      const wrapper = doc.createElement('div');
      wrapper.className = 'title-page';

      let sibling = start.nextSibling;
      while (sibling) {
        const nextSibling = sibling.nextSibling;
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.classList.contains('title-page-marker') &&
          sibling.dataset.end === 'true'
        ) {
          sibling.remove();
          break;
        }
        wrapper.appendChild(sibling);
        sibling = nextSibling;
      }

      start.replaceWith(wrapper);
    });
    // Remove any orphaned end markers (e.g. no matching start)
    doc.querySelectorAll('.title-page-marker[data-end="true"]').forEach((el) => el.remove());
  }

  applyTitlePageFixes(doc) {
    // Pandoc fenced_divs outputs <section class="title-page">.
    // 1. Force Paged.js page-break after the section by setting breakBefore on
    //    the *next sibling*. Paged.js v0.4.3 reads dataset.breakBefore (and
    //    dataset.previousBreakAfter) to insert breaks, NOT dataset.breakAfter
    //    on the element itself — so we must annotate the following element.
    // 2. Tag all headings inside as data-notoc and remove their id so
    //    buildTableOfContents skips them via every filter path.
    doc.querySelectorAll('section.title-page, div.title-page, .title-page').forEach((section) => {
      // Find the next block-level sibling (the element that should start page 2).
      const next = section.nextElementSibling;
      if (next) {
        next.dataset.breakBefore = 'page';
      }
      section.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        h.dataset.notoc = '1';
        // Remove id so the heading also fails the !heading.id guard in buildTableOfContents.
        h.removeAttribute('id');
      });
    });
  }

  wrapColumnBlocks(doc) {
    Array.from(doc.querySelectorAll('.md-columns-token-start')).forEach((start) => {
      const wrapper = doc.createElement('div');
      wrapper.className = 'md-columns';
      wrapper.dataset.count = start.dataset.count || '2';
      wrapper.dataset.gap = start.dataset.gap || '20pt';
      wrapper.dataset.rule = start.dataset.rule || 'false';

      let sibling = start.nextSibling;
      while (sibling) {
        const nextSibling = sibling.nextSibling;
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.classList.contains('md-columns-token-end')) {
          sibling.remove();
          break;
        }
        wrapper.appendChild(sibling);
        sibling = nextSibling;
      }

      start.replaceWith(wrapper);
    });

    doc.querySelectorAll('.md-columns-token-end').forEach((el) => el.remove());
  }

  applyColumnStyles(doc) {
    doc.querySelectorAll('.md-columns').forEach(el => {
      const count = el.dataset.count || '2';
      const gap = el.dataset.gap || '20pt';
      const rule = el.dataset.rule === 'true';

      // Idempotency guard: if already split into .md-column divs, just reapply CSS vars
      if (el.querySelector(':scope > .md-column')) {
        el.style.display = 'flex'; // prevent Paged.js UndisplayedFilter from hiding this element
        el.style.setProperty('--md-columns-count', count);
        el.style.setProperty('--md-columns-gap', gap);
        el.style.columnGap = gap;
        if (rule) {
          el.style.setProperty('--md-columns-rule-width', '1pt');
          el.style.setProperty('--md-columns-rule-color', '#ccc');
        } else {
          el.style.removeProperty('--md-columns-rule-width');
          el.style.removeProperty('--md-columns-rule-color');
        }
        return;
      }

      const columns = [];
      let currentColumn = doc.createElement('div');
      currentColumn.className = 'md-column';

      Array.from(el.childNodes).forEach((node) => {
        const isBreak = node.nodeType === Node.ELEMENT_NODE &&
          (node.classList.contains('column-break') || node.classList.contains('md-columnbreak'));

        if (isBreak) {
          if (currentColumn.childNodes.length > 0) {
            columns.push(currentColumn);
          }
          currentColumn = doc.createElement('div');
          currentColumn.className = 'md-column';
          return;
        }

        currentColumn.appendChild(node);
      });

      if (currentColumn.childNodes.length > 0) {
        columns.push(currentColumn);
      }

      if (columns.length > 0) {
        el.replaceChildren(...columns);
      }

      el.style.display = 'flex'; // prevent Paged.js UndisplayedFilter from hiding this element
      el.style.setProperty('--md-columns-count', count);
      el.style.setProperty('--md-columns-gap', gap);
      el.style.columnGap = gap;
      if (rule) {
        el.style.setProperty('--md-columns-rule-width', '1pt');
        el.style.setProperty('--md-columns-rule-color', '#ccc');
        el.style.columnRule = '1pt solid #ccc';
      } else {
        el.style.removeProperty('--md-columns-rule-width');
        el.style.removeProperty('--md-columns-rule-color');
      }
    });
  }

  applyTableLayouts(doc) {
    const markers = doc.querySelectorAll('.table-layout-marker');

    markers.forEach(marker => {
      const layout = marker.dataset.layout;
      let nextElement = marker.nextElementSibling;
      let table = null;

      // Find the next table, even if a keep-with-next wrapper was inserted.
      while (nextElement && !table) {
        if (nextElement.tagName === 'TABLE') {
          table = nextElement;
          break;
        }

        table = nextElement.querySelector('table');
        if (table) {
          break;
        }

        nextElement = nextElement.nextElementSibling;
      }

      if (table) {
        table.dataset.layout = layout;
        table.classList.add(`table-layout-${layout}`);
      }
    });
  }

  /**
   * Column Guard
   * Prevents content following a column block from being pulled into empty space
   * on the page where the column block started, which can cause reordering.
   */
  applyColumnsGuard(doc) {
    doc.querySelectorAll('.md-columns').forEach(el => {
      let next = el.nextElementSibling;
      while (next && (next.classList.contains('md-columns-token-end') || next.tagName === 'BR')) {
        next = next.nextElementSibling;
      }
      if (next && (next.tagName.startsWith('H') || next.tagName === 'P')) {
        next.style.breakBefore = 'column';
        next.style.pageBreakBefore = 'column';
      }
    });
  }

  applySectionBreaks(doc) {
    doc.querySelectorAll('.section-break').forEach(el => {
      const type = el.dataset.type;
      const columns = el.dataset.columns;

      // Add appropriate classes based on type
      switch(type) {
        case 'new-page':
          el.dataset.breakBefore = 'page';
          break;
        case 'odd-page':
        case 'right':
          el.dataset.breakBefore = 'right';
          break;
        case 'even-page':
        case 'left':
          el.dataset.breakBefore = 'left';
          break;
        case 'continuous':
          // No page break
          break;
      }

      if (columns && columns !== '1') {
        el.dataset.applyColumns = columns;
      }
    });
  }

  /**
   * Normalize image ID attributes into the existing img-marker pipeline.
   * Supports: ![Caption](img.png){#fig:id}
   */
  normalizeImageIdAttributes(markdown) {
    const hasSemanticImageId = (optStr) => /(^|\s)(?:#fig:[^\s>]+|id=(?:"fig:[^"]+"|'fig:[^']+'|fig:[^\s>]+))/i.test(optStr || '');

    let normalized = markdown.replace(
      /(<!--\s*img:\s*([^>]*?)-->[ \t]*(?:\r?\n)+)!\[([^\]]*)\]\(([^)\n]+)\)\{#(fig:[^\s}]+)\}/gi,
      (match, prefix, optStr, alt, target, figId) => {
        if (hasSemanticImageId(optStr)) {
          return `${prefix}![${alt}](${target})`;
        }

        const mergedPrefix = prefix.replace(
          /<!--\s*img:\s*([^>]*?)-->/i,
          (markerMatch, markerOptStr) => `<!-- img: ${(markerOptStr || '').trim() ? `${(markerOptStr || '').trim()} id=${figId}` : `id=${figId}`} -->`
        );
        return `${mergedPrefix}![${alt}](${target})`;
      }
    );

    normalized = normalized.replace(
      /!\[([^\]]*)\]\(([^)\n]+)\)\{#(fig:[^\s}]+)\}/gi,
      (match, alt, target, figId) => `<!-- img: id=${figId} -->\n\n![${alt}](${target})`
    );

    return normalized;
  }

  /**
   * Image layout markers
   * Supports: <!-- img: align=right width=40% frame shadow filter=grayscale -->
   */
  processImageMarkers(markdown) {
    return markdown.replace(
      /<!--\s*img:\s*([^>]*?)-->/gi,
      (match, optStr) => {
        const attrs = {};
        const semanticIdMatch = optStr.match(/(^|\s)#(fig:[^\s>]+)/i);
        const plainOpts = optStr.replace(/(^|\s)#fig:[^\s>]+/ig, ' ').trim();
        plainOpts.replace(/(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g, (m, key, dq, sq, bare) => {
          attrs[key] = dq !== undefined ? dq : (sq !== undefined ? sq : (bare !== undefined ? bare : 'true'));
        });
        if (!attrs.id && semanticIdMatch) {
          attrs.id = semanticIdMatch[2];
        }
        return createLayoutToken('img', attrs);
      }
    );
  }

  /**
   * List of figures placeholder
   * Supports: <!-- list-of-figures --> or ::: list-of-figures
   */
  processListOfFigures(markdown) {
    return markdown
      .replace(/<!--\s*list-of-figures\s*-->/gi, createLayoutToken('list-of-figures'))
      .replace(/^[ 	]*:::\s*list-of-figures\s*$/gim, createLayoutToken('list-of-figures'));
  }

  /**
   * List of tables placeholder
   * Supports: <!-- list-of-tables --> or ::: list-of-tables
   */
  processListOfTables(markdown) {
    return markdown
      .replace(/<!--\s*list-of-tables\s*-->/gi, createLayoutToken('list-of-tables'))
      .replace(/^[ 	]*:::\s*list-of-tables\s*$/gim, createLayoutToken('list-of-tables'));
  }

  /**
   * Apply figure wrapping and captions to all relevant images.
   * Processes:
   *   - Images preceded by <!-- img: ... --> markers (explicit attributes)
   *   - Images with alt text starting "Abbildung N:" or "Figure N:" (auto-detect)
   *   - Pandoc-generated <figure> elements from the implicit_figures extension
   * Populates this.figureRegistry for list-of-figures.
   */
  applyFigures(doc) {
    this.figureRegistry = [];
    let figureNum = 0;
    const processed = new WeakSet();

    // First: register Pandoc-generated <figure> elements (implicit_figures output).
    // Pandoc wraps a lone image paragraph in <figure><img><figcaption>alt</figcaption></figure>.
    // These are skipped by the img-loop below (img.closest('figure') guard), so we
    // register them here and standardize their figcaption markup.
    Array.from(doc.querySelectorAll('figure:not(.md-figure)')).forEach(figure => {
      const img = figure.querySelector('img');
      if (!img || processed.has(img)) return;
      processed.add(img);

      figureNum++;
      // SCI-040: Pandoc preserves <!-- img: #fig:id ... --> comments as HTML comment
      // nodes. The markdown-it path converts them to [MDLAYOUT:img;...] tokens first,
      // but in the Pandoc path they arrive as raw Comment nodes. Extract the semantic
      // ID from a preceding comment so that figure cross-references can be resolved.
      let commentFigId = '';
      let prevNode = figure.previousSibling;
      while (prevNode && prevNode.nodeType === Node.TEXT_NODE && /^\s*$/.test(prevNode.textContent)) {
        prevNode = prevNode.previousSibling;
      }
      if (prevNode?.nodeType === Node.COMMENT_NODE) {
        const commentText = prevNode.textContent || '';
        const m = commentText.match(/(?:^|\s)#(fig:[^\s>]+)/i);
        if (m) { commentFigId = m[1]; prevNode.remove(); }
      }
      const semanticId = commentFigId || (/^fig:/.test(figure.id || '') ? figure.id : '');
      const figureId = semanticId || `figure-${figureNum}`;
      figure.id = figureId;
      figure.classList.add('md-figure', 'md-figure--center');

      // Use existing <figcaption> text (Pandoc mirrors the alt text), or fall back to alt
      const figcaption = figure.querySelector('figcaption');
      const rawCaptionText = figcaption
        ? figcaption.textContent.trim().replace(/\s+/g, ' ')
        : (img.getAttribute('alt') || '').replace(/\s+/g, ' ');
      // Strip leading "Abbildung N:"/"Figure N:" prefix to avoid double-label when the
      // alt text was written with an explicit prefix (e.g. "Abbildung 1: Caption text").
      const captionPrefixMatch = rawCaptionText.match(/^(?:Abbildung|Abb\.|Figure|Fig\.)\s*\d*\s*:?\s*(.+)/i);
      const captionText = captionPrefixMatch ? captionPrefixMatch[1].trim() : rawCaptionText;

      this.figureRegistry.push({ id: figureId, num: figureNum, caption: captionText });

      if (figcaption) {
        figcaption.innerHTML = `<span class="figure-label">Abb.\u00a0${figureNum}:</span> ${captionText}`;
      } else if (captionText) {
        const fc = doc.createElement('figcaption');
        fc.innerHTML = `<span class="figure-label">Abb.\u00a0${figureNum}:</span> ${captionText}`;
        figure.appendChild(fc);
      }
    });

    // Map: img element → marker element (for explicit <!-- img: --> markers)
    const markerMap = new Map();
    doc.querySelectorAll('.image-layout-marker').forEach(marker => {
      let next = marker.nextElementSibling;
      while (next && next.tagName !== 'IMG' && !next.querySelector('img')) {
        next = next.nextElementSibling;
      }
      if (!next) { marker.remove(); return; }
      const img = next.tagName === 'IMG' ? next : next.querySelector('img');
      if (img) {
        markerMap.set(img, { marker, container: next });
      } else {
        marker.remove();
      }
    });

    // Process all images in document order
    Array.from(doc.querySelectorAll('img')).forEach(img => {
      if (processed.has(img) || img.closest('figure')) return;
      processed.add(img);

      const mdata = markerMap.get(img);
      const altText = img.getAttribute('alt') || '';
      const semanticId = /^fig:/.test(mdata?.marker?.dataset?.id || '') ? mdata.marker.dataset.id : '';
      const rawCaption = altText.trim().replace(/\s+/g, ' ');

      // Extract caption from alt text: "Abbildung N: description" or "Figure N: description"
      const altMatch = altText.match(/^(?:Abbildung|Abb\.|Figure|Fig\.)\s*\d*\s*:?\s*(.+)/i);
      const altCaption = altMatch ? altMatch[1].trim() : '';

      // Only process if explicit marker OR alt text has a proper caption prefix
      if (!mdata && !altCaption) return;

      figureNum++;
      const figureId = semanticId || `figure-${figureNum}`;
      const caption = altCaption || (semanticId ? rawCaption : '');
      this.figureRegistry.push({ id: figureId, num: figureNum, caption });

      // Build <figure> wrapper
      const figure = doc.createElement('figure');
      figure.id = figureId;
      figure.className = 'md-figure';
      const align = mdata?.marker?.dataset?.align || 'center';
      figure.classList.add(`md-figure--${align}`);
      if (mdata?.marker?.dataset?.frame === 'true') figure.classList.add('md-figure--frame');
      if (mdata?.marker?.dataset?.shadow === 'true') figure.classList.add('md-figure--shadow');
      if (mdata?.marker?.dataset?.filter) figure.classList.add(`md-figure--filter-${mdata.marker.dataset.filter}`);

      // Apply explicit width — to the figure for floated alignments, to the img for block
      const width = mdata?.marker?.dataset?.width;
      if (width) {
        if (align === 'left' || align === 'right') {
          figure.style.width = width;
          figure.style.maxWidth = '100%';
          img.style.width = '100%';
        } else {
          img.style.width = width;
          img.style.maxWidth = '100%';
        }
      }

      // Find container (img is usually wrapped in a <p>)
      const container = mdata?.container || img.parentElement;
      if (container && container.parentNode) {
        container.parentNode.insertBefore(figure, container);
      } else if (img.parentNode) {
        img.parentNode.insertBefore(figure, img);
      }
      figure.appendChild(img);

      // Add <figcaption>
      if (caption) {
        const fc = doc.createElement('figcaption');
        fc.innerHTML = `<span class="figure-label">Abb.\u00a0${figureNum}:</span> ${caption}`;
        figure.appendChild(fc);
      }

      // Remove the now-empty container
      if (container && container !== img && container.parentNode && !container.textContent.trim()) {
        container.remove();
      }

      // Remove the marker
      if (mdata?.marker) mdata.marker.remove();
    });

    // Clean up any remaining unmatched image-layout-markers
    doc.querySelectorAll('.image-layout-marker').forEach(el => el.remove());
  }

  /**
   * Detect table captions from preceding paragraphs: "Tabelle N: description"
   * Moves caption text into a proper <caption> element and populates tableRegistry.
   */
  applyTableCaptions(doc) {
    this.tableRegistry = [];
    let tableNum = 0;

    Array.from(doc.querySelectorAll('table')).forEach(table => {
      if (table.closest('figure') || table.querySelector('caption')) return;

      // Walk backwards skipping layout marker elements (e.g. .table-layout-marker)
      // to find the preceding caption paragraph
      let prev = table.previousElementSibling;
      while (prev && prev.tagName !== 'P' && (
        prev.classList.contains('table-layout-marker') ||
        prev.classList.contains('page-break') ||
        prev.classList.contains('chapter-marker') ||
        prev.dataset.mdLayoutToken
      )) {
        prev = prev.previousElementSibling;
      }
      if (!prev || prev.tagName !== 'P') return;

      // Match "Tabelle N: caption", "Tabelle: caption", "Table N: caption"
      // Normalize whitespace first: Pandoc word-wraps long HTML lines with \n,
      // so textContent may contain embedded newlines that break the .+ match.
      const rawText = prev.textContent.trim().replace(/\s+/g, ' ');
      const match = rawText.match(/^(?:Tabelle|Tabl\.|Table|Tab\.)\s*\d*\s*:?\s*(.+)/i);
      if (!match) return;

      tableNum++;
      const idMarker = prev.previousElementSibling?.classList.contains('tbl-id-marker')
        ? prev.previousElementSibling : null;
      // SCI-040: Pandoc preserves <!-- tbl: #tbl:id --> as a preceding Comment node.
      // Check both the element-level idMarker (markdown-it path) and a preceding
      // comment node (Pandoc path) so that table cross-references can be resolved.
      let commentTblId = '';
      if (!idMarker) {
        let prevSib = prev.previousSibling;
        while (prevSib && prevSib.nodeType === Node.TEXT_NODE && /^\s*$/.test(prevSib.textContent)) {
          prevSib = prevSib.previousSibling;
        }
        if (prevSib?.nodeType === Node.COMMENT_NODE) {
          const commentText = prevSib.textContent || '';
          const m = commentText.match(/(?:^|\s)#(tbl:[^\s>]+)/i);
          if (m) { commentTblId = m[1]; prevSib.remove(); }
        }
      }
      const semanticId = idMarker?.dataset?.tblId || commentTblId || '';
      const tableId = semanticId || `table-${tableNum}`;
      table.id = tableId;
      if (idMarker) idMarker.remove();
      const captionText = match[1].trim();
      this.tableRegistry.push({ id: tableId, num: tableNum, caption: captionText });

      // Insert <caption> as first child of table
      const captionEl = doc.createElement('caption');
      captionEl.innerHTML = `<span class="table-label">Tab.\u00a0${tableNum}:</span> ${captionText}`;
      table.insertBefore(captionEl, table.firstChild);

      // Remove the preceding <p>
      prev.remove();
    });
  }

  /**
   * Wrap scientific container tokens into semantic <div> elements.
   * Supports: definition, theorem, proof, remark, example, lemma, corollary, proposition
   */
  wrapScientificContainers(doc) {
    const counter = {};

    Array.from(doc.querySelectorAll('.sci-container-open')).forEach((start) => {
      const type = start.dataset.type || 'definition';
      counter[type] = (counter[type] || 0) + 1;
      const num = counter[type];

      const wrapper = doc.createElement('div');
      wrapper.className = `sci-container sci-container--${type}`;
      wrapper.dataset.num = String(num);

      let sibling = start.nextSibling;
      while (sibling) {
        const next = sibling.nextSibling;
        if (
          sibling.nodeType === Node.ELEMENT_NODE &&
          sibling.classList.contains('sci-container-close')
        ) {
          sibling.remove();
          break;
        }
        wrapper.appendChild(sibling);
        sibling = next;
      }

      // Prepend label header (e.g. "Definition 1")
      const label = doc.createElement('div');
      label.className = 'sci-container-label';
      const labelName = start.dataset.title
        ? `${type.charAt(0).toUpperCase() + type.slice(1)} ${num}: ${start.dataset.title}`
        : `${type.charAt(0).toUpperCase() + type.slice(1)} ${num}`;
      label.textContent = labelName;
      wrapper.insertBefore(label, wrapper.firstChild);

      start.replaceWith(wrapper);
    });

    doc.querySelectorAll('.sci-container-close').forEach((el) => el.remove());
  }

  /**
   * Apply appendix mode: headings after <!-- appendix --> are numbered A, B, C …
   */
  applyAppendixMode(doc) {
    const marker = doc.querySelector('.appendix-marker');
    if (!marker) return;

    let appendixIndex = 0;
    let sibling = marker.nextElementSibling;

    while (sibling) {
      const next = sibling.nextElementSibling;
      // Find h2 elements (top-level appendix sections)
      const headings = sibling.matches('h2') ? [sibling] : Array.from(sibling.querySelectorAll('h2'));
      headings.forEach((h) => {
        const letter = String.fromCharCode(65 + appendixIndex); // A, B, C …
        appendixIndex++;
        h.classList.add('appendix-heading');
        // Prefix the heading text
        const existing = h.textContent.trim();
        h.textContent = `${letter}: ${existing}`;
        // Keep existing id for TOC links
      });
      sibling = next;
    }

    // Also handle the case where the marker is followed by h2 siblings (no wrapper)
    marker.remove();
  }

  /**
   * Detect mermaid block captions from preceding paragraphs.
   * Pattern: "Abbildung N: Title {#fig:id}" before ```mermaid block
   * Wraps in <figure id="fig:id"> with <figcaption>.
   * Runs after applyFigures so figureCounter is already set.
   */
  applyMermaidCaptions(doc) {
    Array.from(doc.querySelectorAll('pre')).forEach((pre) => {
      const code = pre.querySelector('code');
      if (!code || !code.className.includes('language-mermaid')) return;

      // Walk backwards to find caption paragraph (skipping markers)
      let prev = pre.previousElementSibling;
      while (prev && prev.tagName !== 'P' && (
        prev.classList.contains('table-layout-marker') ||
        prev.classList.contains('page-break') ||
        prev.classList.contains('chapter-marker') ||
        prev.dataset.mdLayoutToken
      )) {
        prev = prev.previousElementSibling;
      }
      if (!prev || prev.tagName !== 'P') return;

      const rawText = prev.textContent.trim().replace(/\s+/g, ' ');
      const match = rawText.match(/^(?:Abbildung|Abb\.|Figure|Fig\.)\s*\d*\s*:?\s*(.+?)(?:\s*\{#([\w:./-]+)\})?\s*$/i);
      if (!match) return;

      const captionText = match[1].trim();
      const figId = match[2] || null;

      this.figureRegistry = this.figureRegistry || [];
      const figureNum = this.figureRegistry.length + 1;
      const resolvedId = figId || `figure-${figureNum}`;

      this.figureRegistry.push({ id: resolvedId, num: figureNum, caption: captionText });

      const figure = doc.createElement('figure');
      figure.id = resolvedId;
      figure.className = 'md-figure md-figure--center md-figure--mermaid';

      if (pre.parentNode) {
        pre.parentNode.insertBefore(figure, pre);
      }
      figure.appendChild(pre);

      const fc = doc.createElement('figcaption');
      fc.innerHTML = `<span class="figure-label">Abb.\u00a0${figureNum}:</span> ${captionText}`;
      figure.appendChild(fc);

      prev.remove();
    });
  }

  /**
   * Transform Pandoc footnotes to Paged.js float:footnote format.
   * Pandoc outputs <section class="footnotes"><ol><li id="fn1">...</li></ol></section>.
   * Paged.js needs <span class="footnote"> near the inline reference.
   */
  applyPagedFootnotes(doc) {
    const section = doc.querySelector('section.footnotes, div.footnotes, .footnotes');
    if (!section) return;

    // Build map: fnId → inner HTML of <li> (minus backref link)
    const footnoteMap = new Map();
    section.querySelectorAll('li[id]').forEach((li) => {
      const id = li.getAttribute('id');
      const clone = li.cloneNode(true);
      clone.querySelectorAll('a.footnote-backref, a[role="doc-backlink"]').forEach((a) => a.remove());
      footnoteMap.set(id, clone.innerHTML.trim());
    });

    // Replace each visible footnote reference with the floated note placeholder.
    // Keeping the original <sup>/<a> marker alongside the float can let the call
    // detach from the sentence near page or column boundaries.
    doc.querySelectorAll('a.footnote-ref[href], sup > a[href^="#fn"]').forEach((ref) => {
      const href = ref.getAttribute('href') || '';
      const fnId = href.replace(/^#/, '');
      const content = footnoteMap.get(fnId);
      if (!content) return;

      const span = doc.createElement('span');
      span.className = 'footnote';
      // Pandoc wraps footnote text in <p>; a <p> inside <span> is invalid HTML and
      // causes browser auto-correction that breaks Paged.js float:footnote placement.
      // Unwrap a single wrapping <p> to keep the span valid.
      const tempFn = doc.createElement('div');
      tempFn.innerHTML = content;
      const fnChildren = Array.from(tempFn.childNodes);
      const singleP = fnChildren.length === 1 && fnChildren[0].nodeName === 'P';
      span.innerHTML = singleP ? fnChildren[0].innerHTML : content;

      const marker = ref.closest('sup') || ref;
      marker.replaceWith(span);
    });

    section.remove();
  }

  buildFigureList(doc) {    if (this.figureRegistry.length === 0) return null;
    const nav = doc.createElement('nav');
    nav.className = 'list-of-figures';
    const ol = doc.createElement('ol');
    nav.appendChild(ol);
    this.figureRegistry.forEach(({ id, num, caption }) => {
      const li = doc.createElement('li');
      li.className = 'lof-entry';
      const a = doc.createElement('a');
      a.setAttribute('href', `#${id}`);
      a.innerHTML = `<span class="lof-num">Abb.\u00a0${num}:</span>${caption ? ' ' + caption : ''}`;
      li.appendChild(a);
      ol.appendChild(li);
    });
    return nav;
  }

  buildTableList(doc) {
    if (this.tableRegistry.length === 0) return null;
    const nav = doc.createElement('nav');
    nav.className = 'list-of-tables';
    const ol = doc.createElement('ol');
    nav.appendChild(ol);
    this.tableRegistry.forEach(({ id, num, caption }) => {
      const li = doc.createElement('li');
      li.className = 'lot-entry';
      const a = doc.createElement('a');
      a.setAttribute('href', `#${id}`);
      a.innerHTML = `<span class="lot-num">Tab.\u00a0${num}:</span>${caption ? ' ' + caption : ''}`;
      li.appendChild(a);
      ol.appendChild(li);
    });
    return nav;
  }

  wrapFrontMatterList(placeholder, list, sectionClass) {
    if (!placeholder || !list) return list;
    const doc = placeholder.ownerDocument;
    const heading = placeholder.previousElementSibling;
    const wrapper = doc.createElement('section');
    wrapper.className = sectionClass;

    const anchor = heading && /^H[1-6]$/.test(heading.tagName)
      ? heading
      : placeholder;

    anchor.parentNode.insertBefore(wrapper, anchor);
    if (heading && /^H[1-6]$/.test(heading.tagName)) {
      wrapper.appendChild(heading);
    }
    wrapper.appendChild(list);
    placeholder.remove();
    return wrapper;
  }

  hydrateListsOfFiguresAndTables(doc) {
    doc.querySelectorAll('.list-of-figures-placeholder').forEach((el, index) => {
      const list = this.buildFigureList(doc);
      if (list) {
        const nextList = index === 0 ? list : list.cloneNode(true);
        this.wrapFrontMatterList(el, nextList, 'list-of-figures-section');
      } else {
        el.remove();
      }
    });
    doc.querySelectorAll('.list-of-tables-placeholder').forEach((el, index) => {
      const list = this.buildTableList(doc);
      if (list) {
        const nextList = index === 0 ? list : list.cloneNode(true);
        this.wrapFrontMatterList(el, nextList, 'list-of-tables-section');
      } else {
        el.remove();
      }
    });
  }

  wrapDisplayMathBlocks(doc) {
    doc.querySelectorAll('.math-block, .katex-display, p > math[display="block"]').forEach((node) => {
      const mathNode = node.matches('math[display="block"]') ? node.parentElement : node;
      if (!mathNode || mathNode.closest('.math-keep-together')) return;
      const previous = mathNode.previousElementSibling;
      if (!previous || previous.tagName !== 'P') return;
      if (!(previous.textContent || '').trim()) return;

      const wrapper = doc.createElement('div');
      wrapper.className = 'math-keep-together';
      previous.parentNode.insertBefore(wrapper, previous);
      wrapper.appendChild(previous);
      wrapper.appendChild(mathNode);
    });
  }

  applyFrontMatterPageBreaks(doc) {
    // Find the last front-matter navigation element (TOC, LoF, LoT).
    // The first block-level element that follows it should start on a new page
    // so that body chapters do not run onto the same page as the index pages.
    const frontMatterSelector = '.table-of-contents, .list-of-figures-section, .list-of-tables-section, .list-of-figures, .list-of-tables';
    const frontMatterNavs = Array.from(doc.querySelectorAll(frontMatterSelector))
      .filter((node) => !node.parentElement?.closest(frontMatterSelector));
    if (!frontMatterNavs.length) return;

    const toc = doc.querySelector('.table-of-contents');
    if (toc) {
      let supplementalNav = toc.nextElementSibling;
      while (supplementalNav && !supplementalNav.matches?.('.list-of-figures-section, .list-of-tables-section, .list-of-figures, .list-of-tables')) {
        supplementalNav = supplementalNav.nextElementSibling;
      }
      if (supplementalNav && !supplementalNav.dataset.breakBefore) {
        supplementalNav.dataset.breakBefore = 'page';
      }
    }

    const last = frontMatterNavs[frontMatterNavs.length - 1];
    let next = last.nextElementSibling;
    // Skip whitespace-only or empty elements
    while (next && !(next.textContent || '').trim()) {
      next = next.nextElementSibling;
    }
    if (next && !next.dataset.breakBefore) {
      next.dataset.breakBefore = 'page';
    }
  }

  cleanupMarkers(doc) {
    // Remove marker divs that are no longer needed
    // (but keep them if they have styling applied)
    doc.querySelectorAll(
      '.table-layout-marker, .tbl-id-marker, .md-columns-token-start, .md-columns-token-end, ' +
      '.chapter-marker, .image-layout-marker, .list-of-figures-placeholder, .list-of-tables-placeholder, ' +
      '.sci-container-open, .sci-container-close, .appendix-marker, .blank-page-marker'
    ).forEach(el => el.remove());
  }

  removeResidualLayoutTokenText(doc) {
    // Pass 1: remove whole leaf elements that are only a layout token or TOC placeholder
    Array.from(doc.body.querySelectorAll('*')).forEach((element) => {
      if (element.childElementCount > 0) return;
      if (element.closest('code, pre, .katex, .katex-display')) return;

      const text = (element.textContent || '').trim();
      if (!text) return;
      if (parseLayoutToken(text) || isTocPlaceholder(text)) {
        element.remove();
      }
    });

    // Pass 2: strip any residual [[MDLAYOUT:...]] text nodes that survived
    // (e.g. tokens that appeared inside mixed-content paragraphs)
    const walker = doc.createTreeWalker(doc.body, 0x4 /* NodeFilter.SHOW_TEXT */);
    const toRemove = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('code, pre, .katex, .katex-display')) continue;
      if (/\[\[MDLAYOUT:/i.test(node.textContent)) {
        toRemove.push(node);
      }
    }
    toRemove.forEach(node => {
      // If the parent element has no other content, remove the parent
      const parent = node.parentElement;
      if (parent && parent.childNodes.length === 1) {
        parent.remove();
      } else {
        node.remove();
      }
    });
  }

  /**
   * Reset counters
   */
  resetCounters() {
    this.tableCounter = 0;
    this.figureCounter = 0;
    this.chapterNumber = 0;
    this.figureRegistry = [];
    this.tableRegistry = [];
  }
}

// Export singleton
export const layoutPreprocessor = new LayoutPreprocessor();
