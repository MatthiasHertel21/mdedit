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

    // Chapter page
    css += `

@page chapter {
  margin-top: 5cm;
}

.chapter-marker + * {
  page: chapter;
}`;

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
}

/* Headings */
.print-content h1, .print-content h2, .print-content h3, .print-content h4, .print-content h5, .print-content h6 {
  font-family: ${headings.fontFamily || body.fontFamily};
  color: ${headings.color};
  text-indent: 0;
  margin-left: 0;
  padding-left: 0;
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
  text-align: ${tLayout.header.textAlign};
  padding: ${tLayout.cellPadding};
  border: ${tLayout.border.width} solid ${tLayout.border.color};
  font-family: inherit;
  line-height: inherit;
  vertical-align: top;
  ${tLayout.headerBorderBottom ? `border-bottom: ${tLayout.headerBorderBottom.width} solid ${tLayout.headerBorderBottom.color};` : ''}
}

${selector} td {
  padding: ${tLayout.cellPadding};
  border: ${tLayout.border.width} solid ${tLayout.border.color};
  text-align: ${tLayout.body.textAlign};
  font-family: inherit;
  line-height: inherit;
  vertical-align: top;
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
  padding-left: 0;
}

.print-content ul {
  list-style: none;
}

.print-content ol {
  list-style: none;
  counter-reset: print-list-item;
}

.print-content li {
  position: relative;
  padding-left: calc(${spacing.listIndent} - 0.1em);
  line-height: inherit;
  margin: 0 0 1pt;
}

.print-content ul > li::before,
.print-content ol > li::before {
  position: absolute;
  left: 0;
  top: 0;
  width: 0.8em;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

.print-content ul > li::before {
  content: "${lists.unordered.marker}";
}

.print-content ol > li {
  counter-increment: print-list-item;
}

.print-content ol > li::before {
  content: counter(print-list-item) ".";
}

.print-content li > p {
  margin: 0;
}

.print-content blockquote {
  margin: ${spacing.blockquote} 0;
}

.print-content pre {
  margin: ${spacing.codeBlock} 0;
}

.print-content hr {
  margin: ${spacing.horizontalRule} 0;
}

.print-content .katex-display {
  margin: ${spacing.formula} 0;
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
