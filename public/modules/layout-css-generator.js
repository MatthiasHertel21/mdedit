/**
 * Layout CSS Generator
 * Generates CSS from layout configuration
 */

export class LayoutCSSGenerator {
  /**
   * Generate complete CSS from layout configuration
   */
  generate(layout) {
    const css = [];

    css.push(this.generatePageCSS(layout));
    css.push(this.generateHeaderFooterCSS(layout));
    css.push(this.generateTypographyCSS(layout));
    css.push(this.generateTableCSS(layout));
    css.push(this.generateImageCSS(layout));
    css.push(this.generateSpacingCSS(layout));
    css.push(this.generateColumnsCSS(layout));

    return css.join('\n\n');
  }

  generatePageCSS(layout) {
    const { page } = layout;
    const margins = page.margins;

    let css = `
/* Page Setup */
@page {
  size: ${page.size} ${page.orientation};
  margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
}`;

    // First page
    if (margins.firstPageTop !== margins.top) {
      css += `

@page :first {
  margin-top: ${margins.firstPageTop};
}`;
    }

    // Mirror margins for book printing
    if (page.mirrorMargins) {
      const bindingOffset = page.bindingOffset || '0';
      css += `

@page :left {
  margin-left: calc(${margins.left} + ${bindingOffset});
  margin-right: ${margins.right};
}

@page :right {
  margin-left: ${margins.left};
  margin-right: calc(${margins.right} + ${bindingOffset});
}`;
    }

    return css;
  }

  generateHeaderFooterCSS(layout) {
    const { header, footer } = layout;
    let css = '';
    const headerOffset = header.offset || '0';
    const footerOffset = footer.offset || '0';

    if (header.enabled) {
      css += `
/* Header */
@page {`;
      
      if (header.left) {
        css += `
  @top-left {
    content: ${this.buildContentValue(header.left)};
    font-size: ${header.fontSize};
    color: ${header.color};
  }`;
      }
      
      if (header.center) {
        css += `
  @top-center {
    content: ${this.buildContentValue(header.center)};
    font-size: ${header.fontSize};
    color: ${header.color};
  }`;
      }
      
      if (header.right) {
        css += `
  @top-right {
    content: ${this.buildContentValue(header.right)};
    font-size: ${header.fontSize};
    color: ${header.color};
  }`;
      }

      css += `
}`;

      if (header.hideOnFirstPage) {
        css += `

@page :first {
  @top-left { content: none; }
  @top-center { content: none; }
  @top-right { content: none; }
}`;
      }
    }

    if (footer.enabled) {
      css += `

/* Footer */
@page {`;
      
      if (footer.left) {
        css += `
  @bottom-left {
    content: ${this.buildContentValue(footer.left)};
    font-size: ${footer.fontSize};
    color: ${footer.color};
  }`;
      }
      
      if (footer.center) {
        css += `
  @bottom-center {
    content: ${this.buildContentValue(footer.center)};
    font-size: ${footer.fontSize};
    color: ${footer.color};
  }`;
      }
      
      if (footer.right) {
        css += `
  @bottom-right {
    content: ${this.buildContentValue(footer.right)};
    font-size: ${footer.fontSize};
    color: ${footer.color};
  }`;
      }

      css += `
}`;

      if (footer.hideOnFirstPage) {
        css += `

@page :first {
  @bottom-left { content: none; }
  @bottom-center { content: none; }
  @bottom-right { content: none; }
}`;
      }
    }

    if (header.enabled && headerOffset !== '0') {
      css += `

.pagedjs_margin-top .pagedjs_margin-content {
  padding-top: ${headerOffset};
}`;
    }

    if (footer.enabled && footerOffset !== '0') {
      css += `

.pagedjs_margin-bottom .pagedjs_margin-content {
  padding-bottom: ${footerOffset};
}`;
    }

    return css;
  }

  generateTypographyCSS(layout) {
    const { typography } = layout;
    const { body, headings, code, links, blockquote } = typography;

    let css = `
/* Typography - Body */
.print-content {
  font-family: ${body.fontFamily};
  font-size: ${body.fontSize};
  line-height: ${body.lineHeight};
  color: ${body.color};
  text-align: ${body.textAlign};
  ${body.hyphenation ? 'hyphens: auto;' : 'hyphens: none;'}
}

.print-content p {
  margin: ${body.paragraph.spacing} 0;
  text-align-last: auto;
}
.print-content p + p {
  text-indent: ${body.paragraph.firstLineIndent || '0'};
}

.print-content ul,
.print-content ol,
.print-content li,
.print-content li > * {
  font-family: inherit;
  line-height: inherit;
  text-align: left;
  text-align-last: auto;
}

/* Headings */
.print-content h1, .print-content h2, .print-content h3, .print-content h4, .print-content h5, .print-content h6 {
  font-family: ${headings.fontFamily || body.fontFamily};
  color: ${headings.color};
  text-align: left;
  text-align-last: auto;
  text-indent: 0;
  margin-left: 0;
  padding-left: 0;
  break-after: avoid;
  page-break-after: avoid;
}`;

    css += `

.print-content .chapter-start {
  break-before: page;
  page-break-before: always;
  break-inside: auto;
  page-break-inside: auto;
}

.print-content .chapter-start-last {
  break-before: auto;
  page-break-before: auto;
}

.print-content .chapter-start > :first-child {
  margin-top: 0;
}`;

    css += `

.print-content .chapter-start > h2 {
  break-after: avoid;
  page-break-after: avoid;
}

.print-content .keep-with-next-table > h2,
.print-content .keep-with-next-table > h3,
.print-content .keep-with-next-table > h4,
.print-content .keep-with-next-table > p {
  break-after: avoid;
  page-break-after: avoid;
}`;

    // Individual heading styles
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(level => {
      const h = headings[level];
      if (h) {
        css += `

.print-content ${level} {
  font-size: ${h.size};
  font-weight: ${h.weight};
  margin-top: ${h.marginTop};
  margin-bottom: ${h.marginBottom};
}`;
      }
    });

    css += `

/* Code */
.print-content code {
  font-size: ${code.inline};
  background: ${code.block.background};
  padding: 2pt 4pt;
  border-radius: 2pt;
}

.print-content pre code {
  font-size: ${code.block.fontSize};
  line-height: ${code.block.lineHeight};
  background: none;
  padding: 0;
  display: block;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.print-content pre {
  padding: 13pt 15pt;
  background: ${code.block.background};
  border: 1pt solid ${code.block.border};
  border-left: 5pt solid #7a8fa0;
  border-radius: 3pt;
  font-family: 'Courier New', Courier, monospace;
  font-size: ${code.block.fontSize};
  line-height: ${code.block.lineHeight};
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  text-align: left;
  text-align-last: auto;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}

/* Links */
.print-content a {
  color: ${links.color};
  text-decoration: underline;
}`;

    if (links.showUrls) {
      css += `

.print-content a[href^="http"]:after {
  content: " (" attr(href) ")";
  font-size: 9pt;
  color: #666;
}

.print-content a[href^="#"]:after {
  content: none;
}`;
    }

    css += `

/* Blockquote */
.print-content blockquote {
  color: ${blockquote.color};
  border-left: 3pt solid ${blockquote.borderColor};
}`;

    return css;
  }

  generateTableCSS(layout) {
    const { tableLayouts } = layout;
    let css = '';

    Object.entries(tableLayouts).forEach(([name, tLayout]) => {
      const selector = name === 'default'
        ? '.print-content table'
        : `.print-content table.table-layout-${name}, .print-content table[data-layout="${name}"]`;
      
      css += `

/* Table Layout: ${name} */
${selector} {
  width: 100%;
  margin: ${tLayout.margin.top} 0 ${tLayout.margin.bottom};
  border-collapse: collapse;
  font-family: ${layout.typography.body.fontFamily};
  font-size: ${tLayout.fontSize};
  line-height: ${layout.typography.body.lineHeight};
  ${(name === 'scientific' || name === 'default') ? 'table-layout: fixed;' : ''}
  break-inside: auto;
  page-break-inside: auto;
  ${tLayout.borderTop ? `border-top: ${tLayout.borderTop.width} solid ${tLayout.borderTop.color};` : ''}
  ${tLayout.borderBottom ? `border-bottom: ${tLayout.borderBottom.width} solid ${tLayout.borderBottom.color};` : ''}
}

${selector} thead {
  ${tLayout.header.repeatOnPages ? 'display: table-header-group;' : ''}
}

${selector} th {
  background: ${tLayout.header.background};
  color: ${tLayout.header.textColor};
  font-weight: ${tLayout.header.fontWeight};
  text-align: ${name === 'scientific' ? 'left' : tLayout.header.textAlign};
  text-align-last: auto;
  padding: ${tLayout.cellPadding};
  border: ${tLayout.border.width} solid ${tLayout.border.color};
  font-family: inherit;
  ${name === 'scientific' ? `font-size: calc(${tLayout.fontSize} * 0.9);` : 'line-height: inherit;'}
  vertical-align: top;
  white-space: normal;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: manual;
  ${tLayout.headerBorderBottom ? `border-bottom: ${tLayout.headerBorderBottom.width} solid ${tLayout.headerBorderBottom.color};` : ''}
}

${selector} td {
  padding: ${tLayout.cellPadding};
  border: ${tLayout.border.width} solid ${tLayout.border.color};
  text-align: ${name === 'scientific' ? 'left' : tLayout.body.textAlign};
  text-align-last: auto;
  font-family: inherit;
  line-height: inherit;
  vertical-align: top;
  white-space: normal;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: manual;
}`;

      css += `

${selector} th *,
${selector} td * {
  font-family: inherit;
  line-height: inherit;
}`;

      if (tLayout.body.zebraStriping) {
        css += `

${selector} tbody tr:nth-child(even) {
  background: ${tLayout.body.evenRowBackground};
}

${selector} tbody tr:nth-child(odd) {
  background: ${tLayout.body.oddRowBackground};
}`;
      }

      if (tLayout.caption.enabled) {
        css += `

${selector} caption {
  caption-side: ${tLayout.caption.position};
  font-size: ${tLayout.caption.fontSize};
  font-style: ${tLayout.caption.fontStyle};
  color: ${tLayout.caption.color};
  margin-top: ${tLayout.caption.marginTop};
  margin-bottom: ${tLayout.caption.marginBottom};
  text-align: left;
}`;
      }
    });

    return css;
  }

  generateImageCSS(layout) {
    const { images } = layout;
    const align = images.alignment === 'center' ? 'auto' : 
                  images.alignment === 'right' ? '0 0 0 auto' : '0';

    let css = `
/* Images & Figures */
.print-content img {
  max-width: ${images.maxWidth};
  height: auto;
  display: block;
  margin: ${images.margin.top} ${align} ${images.margin.bottom};
  break-inside: avoid;
  page-break-inside: avoid;
}

.print-content figure {
  margin: ${images.margin.top} 0 ${images.margin.bottom};
  text-align: ${images.alignment};
  break-inside: avoid;
  page-break-inside: avoid;
}`;

    if (images.caption.enabled) {
      css += `

.print-content figcaption {
  margin-top: ${images.caption.marginTop};
  font-size: ${images.caption.fontSize};
  font-style: ${images.caption.fontStyle};
  color: ${images.caption.color};
  caption-side: ${images.caption.position};
}`;
    }

    return css;
  }

  generateSpacingCSS(layout) {
    const { spacing, lists } = layout;

    return `
/* Spacing */
.print-content ul, .print-content ol {
  margin: ${spacing.list} 0;
  padding-left: ${spacing.listIndent};
  break-inside: auto;
  page-break-inside: auto;
}

.print-content ul {
  list-style: none;
}

.print-content ol {
  list-style: decimal;
  list-style-position: outside;
  padding-left: calc(${spacing.listIndent} + 0.7em);
}

.print-content li {
  line-height: inherit;
  text-align: left;
  margin: 0 0 1pt;
}

.print-content ul > li {
  padding-left: calc(${spacing.listIndent} - 0.1em);
  text-indent: -0.8em;
}

.print-content ul > li::before {
  content: "${lists.unordered.marker}";
  display: inline-block;
  width: 0.8em;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

.print-content ol > li {
  padding-left: 0;
}

.print-content ol > li::before {
  content: none;
}

.print-content li > p {
  margin: 0;
  text-align: left;
}



.print-content .md-column p,
.print-content .md-column li,
.print-content .md-column blockquote,
.print-content .md-column table,
.print-content .md-column th,
.print-content .md-column td,
.print-content .md-column h1,
.print-content .md-column h2,
.print-content .md-column h3,
.print-content .md-column h4,
.print-content .md-column h5,
.print-content .md-column h6 {
  text-align: left;
  text-align-last: auto;
}

.print-content blockquote {
  margin: ${spacing.blockquote} 0;
}

.print-content pre {
  margin: ${spacing.codeBlock} 0;
}

.print-content .keep-with-next-block-intro {
  break-inside: avoid;
  page-break-inside: avoid;
}

.print-content .keep-with-next-block-target {
  break-before: avoid-page;
  page-break-before: avoid;
}

.print-content table.table-keep-together,
.print-content .keep-with-next-table table {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

.print-content hr {
  margin: ${spacing.horizontalRule} 0;
}

.print-content .katex .katex-mathml {
  display: none !important;
}

/* Protect KaTeX internals from global typography that would break precisely
 * positioned math elements (hyphens, word-break, overflow-wrap, line-height,
 * text-align, text-indent).  KaTeX sets its own line-height/white-space and
 * relies on them being intact throughout its entire span subtree. */
.print-content .katex,
.print-content .katex * {
  hyphens: none !important;
  -webkit-hyphens: none !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
  line-height: normal !important;
  text-indent: 0 !important;
}

.print-content .katex .base,
.print-content .katex-display > .katex,
.print-content .katex-display > .katex > .katex-html {
  white-space: nowrap !important;
}

.print-content .katex-display {
  margin: ${spacing.formula} 0;
  text-align: center;
  text-align-last: auto;
  overflow: visible;
  break-inside: avoid;
  page-break-inside: avoid;
}

.print-content .katex-display > .katex {
  display: block;
  max-width: 100%;
  overflow-wrap: normal !important;
  word-break: normal !important;
}

.print-content .katex-display .katex-html {
  display: inline-block;
  max-width: 100%;
}

.print-content .math-block {
  break-inside: avoid;
  page-break-inside: avoid;
}

.print-content p + .math-block,
.print-content p + .katex-display,
.print-content .math-block + p,
.print-content .katex-display + p {
  break-before: auto;
  page-break-before: auto;
}

.print-content .table-of-contents ul,
.print-content .table-of-contents ol {
  list-style: none !important;
  padding-left: 0;
  margin: 0;
}

.print-content .table-of-contents li::marker {
  content: "";
}

.print-content .table-of-contents ul > li {
  padding-left: 0;
}

.print-content .table-of-contents ul > li::before,
.print-content .table-of-contents ol > li::before {
  content: none !important;
}

.print-content .table-of-contents li + li {
  margin-top: 6pt;
}

.print-content .table-of-contents ul ul {
  margin-top: 6pt;
  padding-left: 1.2em;
}

.print-content .table-of-contents ul ul ul {
  padding-left: 2.2em;
}

.print-content .table-of-contents a {
  display: block;
  text-decoration: none;
  color: #000;
  text-align: left;
}

.print-content .table-of-contents a::after {
  content: " " leader('.') " " target-counter(attr(href), page);
}

.print-content .footnotes {
  margin-top: 14pt;
  padding-top: 8pt;
  border-top: 1pt solid #ccc;
  font-size: 8.5pt;
  break-before: avoid-page;
  break-inside: auto;
  page-break-inside: auto;
}

.print-content .footnotes ol {
  margin: 0;
  padding-left: 1.5em;
}

.print-content .footnotes li,
.print-content .footnotes p {
  margin: 0;
}

.print-content .footnote-backref,
.print-content .footnotes a[href^="#fnref"],
.print-content .footnotes a[role="doc-backlink"] {
  display: none !important;
}`;
  }

  generateColumnsCSS(layout) {
    const { columns } = layout;
    
    if (!columns.enabled) {
      return '';
    }

    let css = `
/* Global Columns */
.print-content {
  column-count: ${columns.count};
  column-gap: ${columns.gap};
`;

    if (columns.rule.enabled) {
      css += `  column-rule: ${columns.rule.width} solid ${columns.rule.color};
`;
    }

    css += `}`;

    return css;
  }

  /**
   * Build a valid CSS content value with counters and strings.
   */
  buildContentValue(text) {
    if (!text) {
      return '""';
    }

    const tokenMap = {
      '{page}': 'counter(page)',
      '{pages}': 'counter(pages)',
      '{doc-title}': 'string(doc-title)',
      '{section}': 'string(section-title)'
    };

    const parts = [];
    const regex = /{page}|{pages}|{doc-title}|{section}|{date}|{author}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(this.quoteContent(text.slice(lastIndex, match.index)));
      }

      const token = match[0];
      if (token === '{date}') {
        parts.push(this.quoteContent(new Date().toLocaleDateString()));
      } else if (token === '{author}') {
        // No-op for now; placeholder reserved for future use.
      } else {
        parts.push(tokenMap[token]);
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(this.quoteContent(text.slice(lastIndex)));
    }

    const filtered = parts.filter(Boolean);
    return filtered.length ? filtered.join(' ') : '""';
  }

  quoteContent(value) {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
}

// Export singleton
export const layoutCSSGenerator = new LayoutCSSGenerator();
