/**
 * Layout Commands Preprocessor
 * Converts layout commands (::: syntax and HTML comments) to HTML markers
 */

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
    let processed = markdown;

    // Process all command types
    processed = this.processPageBreaks(processed);
    processed = this.processColumnBreaks(processed);
    processed = this.processColumns(processed);
    processed = this.processChapters(processed);
    processed = this.processSections(processed);
    processed = this.processTableMarkers(processed);
    processed = this.processTitlePage(processed);
    processed = this.processBlankPages(processed);

    return processed;
  }

  /**
   * Page breaks
   * Supports: <!-- page-break --> or ::: page-break or ::: pagebreak
   */
  processPageBreaks(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*page-break\s*-->/gi, '<div class="page-break"></div>')
      // ::: syntax (with or without hyphen)
      .replace(/^\s*:::\s*page-?break\s*$/gim, '<div class="page-break"></div>')
      // Combined: <!-- page-break odd -->
      .replace(/<!--\s*page-break\s+(odd|even|right|left)\s*-->/gi, 
               '<div class="page-break" data-break="$1"></div>');
  }

  /**
   * Column breaks
   * Supports: <!-- column-break --> or ::: column-break
   */
  processColumnBreaks(markdown) {
    return markdown
      // HTML comment syntax
      .replace(/<!--\s*column-break\s*-->/gi, '<div class="column-break"></div>')
      // ::: syntax
      .replace(/^\s*:::\s*column-?break\s*$/gim, '<div class="column-break"></div>');
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
        return `<div class="md-columns" data-count="${count}" data-gap="${gapValue}" data-rule="${ruleEnabled}">`;
      }
    );

    // Closing tag
    result = result.replace(/<!--\s*\/columns\s*-->/gi, '</div>');

    // ::: syntax: ::: columns{count=2 gap=20pt rule=true}
    result = result.replace(
      /^\s*:::\s*columns\{count=(\d+)(?:\s+gap=(\S+))?(?:\s+rule=(true|false))?\}\s*$/gim,
      (match, count, gap, rule) => {
        const gapValue = gap || '20pt';
        const ruleEnabled = rule === 'true';
        return `<div class="md-columns" data-count="${count}" data-gap="${gapValue}" data-rule="${ruleEnabled}">`;
      }
    );

    // Closing ::: (standalone)
    // We need to be careful not to close other ::: blocks
    // For now, we'll use a simple approach - match ::: that aren't starting other blocks
    result = result.replace(/^\s*:::\s*$/gm, (match, offset, string) => {
      // Check if we're inside a columns block
      const before = string.substring(0, offset);
      const columnsOpen = (before.match(/<div class="md-columns"/g) || []).length;
      const columnsClose = (before.match(/<\/div><!--columns-close-->/g) || []).length;
      
      if (columnsOpen > columnsClose) {
        return '</div><!--columns-close-->';
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
      .replace(/<!--\s*chapter\s*-->/gi, '<div class="chapter-marker"></div>')
      // ::: syntax
      .replace(/^\s*:::\s*chapter\s*$/gim, '<div class="chapter-marker"></div>');
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
        return `<div class="section-break" data-type="${type}" data-columns="${columns}"></div>`;
      }
    );

    // ::: syntax: ::: section{type=new-page columns=2}
    result = result.replace(
      /^\s*:::\s*section\{type=(\S+)(?:\s+columns=(\d+))?\}\s*$/gim,
      (match, type, cols) => {
        const columns = cols || '1';
        return `<div class="section-break" data-type="${type}" data-columns="${columns}"></div>`;
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
      '<div class="table-layout-marker" data-layout="$1"></div>'
    );

    // ::: syntax: ::: table{layout=compact}
    result = result.replace(
      /^\s*:::\s*table\{layout=(\w+)\}\s*$/gim,
      '<div class="table-layout-marker" data-layout="$1"></div>'
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
      '<div class="title-page-marker" data-start="true"></div>'
    );
    result = result.replace(
      /<!--\s*\/title-page\s*-->/gi,
      '<div class="title-page-marker" data-end="true"></div>'
    );

    // ::: syntax
    result = result.replace(
      /^\s*:::\s*title-?page\s*$/gim,
      '<div class="title-page-marker" data-start="true"></div>'
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
      .replace(/<!--\s*blank-page\s*-->/gi, '<div class="blank-page-marker"></div>')
      // ::: syntax
      .replace(/^\s*:::\s*blank-?page\s*$/gim, '<div class="blank-page-marker"></div>');
  }

  /**
   * Apply layout markers to HTML after markdown-it rendering
   */
  postProcessHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Apply column styles
    this.applyColumnStyles(doc);

    // Apply table layouts
    this.applyTableLayouts(doc);

    // Apply section breaks
    this.applySectionBreaks(doc);

    // Clean up markers
    this.cleanupMarkers(doc);

    return doc.body.innerHTML;
  }

  applyColumnStyles(doc) {
    doc.querySelectorAll('.md-columns').forEach(el => {
      const count = el.dataset.count || '2';
      const gap = el.dataset.gap || '20pt';
      const rule = el.dataset.rule === 'true';

      el.style.columnCount = count;
      el.style.columnGap = gap;
      if (rule) {
        el.style.columnRule = '1pt solid #ccc';
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
          break;
        case 'odd-page':
        case 'right':
          el.style.breakBefore = 'right';
          break;
        case 'even-page':
        case 'left':
          el.style.breakBefore = 'left';
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
    doc.querySelectorAll('.table-layout-marker').forEach(el => el.remove());
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
