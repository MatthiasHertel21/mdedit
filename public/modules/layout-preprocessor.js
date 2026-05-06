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

export class LayoutPreprocessor {
  constructor() {
    this.tableCounter = 0;
    this.figureCounter = 0;
    this.chapterNumber = 0;
  }

  /**
   * Process markdown with layout commands
   */
  process(markdown) {
    const protectedMarkdown = protectMarkdownCode(markdown);
    let processed = protectedMarkdown.text;

    // Process all command types
    processed = this.processPageBreaks(processed);
    processed = this.processColumnBreaks(processed);
    processed = this.processColumns(processed);
    processed = this.processChapters(processed);
    processed = this.processSections(processed);
    processed = this.processTableMarkers(processed);
    processed = this.processTitlePage(processed);
    processed = this.processBlankPages(processed);

    return protectedMarkdown.restore(processed);
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
      .replace(/^\s*:::\s*page-?break\s*$/gim, createLayoutToken('page-break'))
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
      .replace(/^\s*:::\s*column-?break\s*$/gim, createLayoutToken('column-break'));
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
      /^\s*:::\s*columns\{count=(\d+)(?:\s+gap=(\S+))?(?:\s+rule=(true|false))?\}\s*$/gim,
      (match, count, gap, rule) => {
        const gapValue = gap || '20pt';
        const ruleEnabled = rule === 'true';
        return createLayoutToken('columns-open', { count, gap: gapValue, rule: ruleEnabled });
      }
    );

    // Closing ::: (standalone)
    // We need to be careful not to close other ::: blocks
    // For now, we'll use a simple approach - match ::: that aren't starting other blocks
    result = result.replace(/^\s*:::\s*$/gm, (match, offset, string) => {
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
      .replace(/^\s*:::\s*chapter\s*$/gim, createLayoutToken('chapter'));
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
      /^\s*:::\s*section\{type=(\S+)(?:\s+columns=(\d+))?\}\s*$/gim,
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
  processTableMarkers(markdown) {
    let result = markdown;

    // HTML comment syntax: <!-- table:compact -->
    result = result.replace(
      /<!--\s*table:(\w+)\s*-->/gi,
      (match, layout) => createLayoutToken('table', { layout })
    );

    // ::: syntax: ::: table{layout=compact}
    result = result.replace(
      /^\s*:::\s*table\{layout=(\w+)\}\s*$/gim,
      (match, layout) => createLayoutToken('table', { layout })
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
      /^\s*:::\s*title-?page\s*$/gim,
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
      .replace(/^\s*:::\s*blank-?page\s*$/gim, createLayoutToken('blank-page'));
  }

  /**
   * Apply layout markers to HTML after markdown-it rendering
   */
  postProcessHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    this.hydrateLayoutTokens(doc);
    this.wrapColumnBlocks(doc);

    // Apply column styles
    this.applyColumnStyles(doc);

    this.hydrateTableOfContents(doc);
    this.applyChapterMarkers(doc);

    // Apply table layouts
    this.applyTableLayouts(doc);

    // Apply section breaks
    this.applySectionBreaks(doc);

    // Clean up markers
    this.cleanupMarkers(doc);
    this.removeResidualLayoutTokenText(doc);

    return doc.body.innerHTML;
  }

  applyChapterMarkers(doc) {
    const keepWithHeadingSelector = [
      'p',
      'h2',
      'h3',
      'ul',
      'ol',
      'pre',
      'table',
      'blockquote',
      '.math-block',
      '.md-columns'
    ].join(', ');

    doc.querySelectorAll('.chapter-marker').forEach((marker) => {
      let target = marker.nextElementSibling;
      while (target && target.classList.contains('chapter-marker')) {
        target = target.nextElementSibling;
      }

      if (!target) {
        marker.remove();
        return;
      }

      const wrapper = doc.createElement('div');
      wrapper.className = 'chapter-start';
      marker.replaceWith(wrapper);
      wrapper.appendChild(target);

      const firstContent = wrapper.nextElementSibling;
      if (firstContent?.matches(keepWithHeadingSelector)) {
        wrapper.appendChild(firstContent);
      }
    });
  }

  buildTableOfContents(doc) {
    const headings = Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter((heading) => {
        if (!heading.id || heading.closest('.table-of-contents')) return false;
        if (heading.closest('.md-columns, .md-column')) return false;
        const level = Number.parseInt(heading.tagName.slice(1), 10) || 1;
        return level <= 3;
      });

    if (headings.length === 0) return null;

    const nav = doc.createElement('nav');
    nav.className = 'table-of-contents';

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
        break;
      case 'column-break':
        marker.className = 'column-break';
        break;
      case 'columns-open':
        marker.className = 'md-columns-token-start';
        marker.dataset.count = token.attrs.count || '2';
        marker.dataset.gap = token.attrs.gap || '20pt';
        marker.dataset.rule = token.attrs.rule || 'false';
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
      case 'title-page':
        marker.className = 'title-page-marker';
        if (token.attrs.start === 'true') marker.dataset.start = 'true';
        if (token.attrs.end === 'true') marker.dataset.end = 'true';
        break;
      case 'blank-page':
        marker.className = 'blank-page-marker';
        break;
      default:
        return null;
    }

    return marker;
  }

  hydrateLayoutTokens(doc) {
    Array.from(doc.body.querySelectorAll('*')).forEach((element) => {
      if (element.childElementCount > 0) return;
      if (element.closest('code, pre')) return;

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
      const toc = this.buildTableOfContents(doc);
      if (toc) {
        element.replaceWith(index === 0 ? toc : toc.cloneNode(true));
        return;
      }
      element.remove();
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

        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('md-column')) {
          Array.from(node.childNodes).forEach((child) => currentColumn.appendChild(child));
          node.remove();
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

      const count = el.dataset.count || '2';
      const gap = el.dataset.gap || '20pt';
      const rule = el.dataset.rule === 'true';

      el.style.setProperty('--md-columns-count', count);
      el.style.setProperty('--md-columns-gap', gap);
      el.style.columnCount = count;
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

      // Find the next table
      while (nextElement && nextElement.tagName !== 'TABLE') {
        nextElement = nextElement.nextElementSibling;
      }

      if (nextElement && nextElement.tagName === 'TABLE') {
        nextElement.dataset.layout = layout;
        nextElement.classList.add(`table-layout-${layout}`);
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
          el.style.breakBefore = 'page';
          el.style.pageBreakBefore = 'always';
          break;
        case 'odd-page':
        case 'right':
          el.style.breakBefore = 'page';
          el.style.pageBreakBefore = 'always';
          break;
        case 'even-page':
        case 'left':
          el.style.breakBefore = 'page';
          el.style.pageBreakBefore = 'always';
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

  cleanupMarkers(doc) {
    // Remove marker divs that are no longer needed
    // (but keep them if they have styling applied)
    doc.querySelectorAll('.table-layout-marker, .md-columns-token-start, .md-columns-token-end, .chapter-marker').forEach(el => el.remove());
  }

  removeResidualLayoutTokenText(doc) {
    Array.from(doc.body.querySelectorAll('*')).forEach((element) => {
      if (element.childElementCount > 0) return;
      if (element.closest('code, pre')) return;

      const text = (element.textContent || '').trim();
      if (!text) return;
      if (parseLayoutToken(text) || isTocPlaceholder(text)) {
        element.remove();
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
  }
}

// Export singleton
export const layoutPreprocessor = new LayoutPreprocessor();
