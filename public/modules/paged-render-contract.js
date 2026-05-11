const buildDebugCss = (enabled) => {
  if (!enabled) {
    return '';
  }

  return `
            /* Debug: visualize margin boxes and inject test content */
            .pagedjs_margin,
            .pagedjs_margin-top,
            .pagedjs_margin-bottom,
            .pagedjs_margin-left,
            .pagedjs_margin-right,
            .pagedjs_margin-top-left,
            .pagedjs_margin-top-center,
            .pagedjs_margin-top-right,
            .pagedjs_margin-bottom-left,
            .pagedjs_margin-bottom-center,
            .pagedjs_margin-bottom-right,
            .pagedjs_margin-left-top,
            .pagedjs_margin-left-middle,
            .pagedjs_margin-left-bottom,
            .pagedjs_margin-right-top,
            .pagedjs_margin-right-middle,
            .pagedjs_margin-right-bottom,
            .pagedjs_margin-content {
              background: rgba(255, 230, 0, 0.12) !important;
              outline: 1px dashed rgba(255, 140, 0, 0.7) !important;
              color: #111 !important;
            }

          `;
};

const buildDebugPageRules = (enabled) => {
  if (!enabled) {
    return '';
  }

  return '@page { @top-center { content: "DEBUG HEADER"; } @bottom-center { content: "DEBUG FOOTER"; } }';
};

const extractAtPageRules = (cssText) => {
  return (String(cssText || '').match(/@page[^{]*\{(?:[^{}]*|\{[^{}]*\})*\}/g) || []).join('\n');
};

const extractBreakRules = (cssText) => {
  const output = [];
  const source = String(cssText || '');
  const ruleRegex = /((?:[^@{}]+))\{([^{}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(source)) !== null) {
    if (/break-(?:before|after|inside)\s*:/i.test(match[2])) {
      output.push(match[0].trim());
    }
  }

  return output.join('\n');
};

export const stripNamedPageAssignments = (layoutCss = '') => {
  return String(layoutCss || '').replace(/\bpage\s*:\s*[a-zA-Z][a-zA-Z0-9_-]*\s*;?/g, '');
};

export const buildPagedRenderContract = ({
  printHTML,
  layoutCss,
  katexCss = '',
  debugPagedHeaders = false,
  stylesheetUrl = 'about:blank'
}) => {
  const safeLayoutCSS = stripNamedPageAssignments(layoutCss);
  const debugCSS = buildDebugCss(debugPagedHeaders);
  const debugPageRules = buildDebugPageRules(debugPagedHeaders);

  const styledHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${katexCss}

              ${safeLayoutCSS}

              ${debugCSS}

              /* Ensure margin boxes are visible in preview */
              .pagedjs_margin,
              .pagedjs_margin-top,
              .pagedjs_margin-bottom,
              .pagedjs_margin-left,
              .pagedjs_margin-right,
              .pagedjs_margin-top-left,
              .pagedjs_margin-top-center,
              .pagedjs_margin-top-right,
              .pagedjs_margin-bottom-left,
              .pagedjs_margin-bottom-center,
              .pagedjs_margin-bottom-right,
              .pagedjs_margin-left-top,
              .pagedjs_margin-left-middle,
              .pagedjs_margin-left-bottom,
              .pagedjs_margin-right-top,
              .pagedjs_margin-right-middle,
              .pagedjs_margin-right-bottom,
              .pagedjs_margin-content {
                display: block !important;
                visibility: visible !important;
              }
              
              /* Forced breaks are handled via data-break-before/after HTML attributes
               * set in layout-preprocessor.js. CSS break-* in this inline block is not
               * processed by the Paged.js polisher and has no effect on fragmentation.
               * Only non-break layout properties belong here. */
              .column-break {
                height: 0;
                margin: 0;
              }

              /* Pandoc syntax-highlighted code blocks — guaranteed present in Paged.js
               * styledHTML so the rules affect fragmentation (break-inside: avoid) and
               * survive serialisation into the paged export HTML for the PDF path.
               * Two selector strategies:
               *   div.sourceCode — Pandoc wraps <pre> in this div (primary case)
               *   pre.sourceCode — fallback if the outer div is absent (e.g. after
               *                    Paged.js page-break fragmentation edge cases) */
              div.sourceCode,
              pre.sourceCode {
                background: #f3f4f6 !important;
                border: 0.75pt solid #c8cdd4 !important;
                border-left: 3pt solid #7a8fa0 !important;
                border-radius: 2pt !important;
                margin: 12pt 0 !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                print-color-adjust: exact !important;
                -webkit-print-color-adjust: exact !important;
              }
              div.sourceCode pre {
                margin: 0 !important;
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                padding: 9pt 12pt !important;
                font-family: 'Courier New', Courier, ui-monospace, monospace !important;
                font-size: 8.8pt !important;
                line-height: 1.5 !important;
                white-space: pre-wrap !important;
                overflow-wrap: anywhere !important;
              }
              pre.sourceCode {
                padding: 9pt 12pt !important;
                font-family: 'Courier New', Courier, ui-monospace, monospace !important;
                font-size: 8.8pt !important;
                line-height: 1.5 !important;
                white-space: pre-wrap !important;
                overflow-wrap: anywhere !important;
              }
              div.sourceCode code,
              div.sourceCode span,
              pre.sourceCode code,
              pre.sourceCode span {
                font-family: inherit !important;
              }
            </style>
          </head>
          <body>
            ${printHTML}
          </body>
          </html>
        `;

  // Hardcoded break rules that must reach the Paged.js chunker but are defined in
  // print.css (not in safeLayoutCSS), so extractBreakRules() would miss them.
  // The chunker only uses polisher-registered CSS for fragmentation decisions.
  const hardcodedBreakRules = [
    // Prevent Paged.js from splitting Pandoc syntax-highlighted code blocks.
    // Without this, div.sourceCode loses its visual frame on split pages.
    'div.sourceCode { break-inside: avoid; page-break-inside: avoid; }',
    // Also protect bare pre.sourceCode (fallback if div.sourceCode wrapper is absent).
    'pre.sourceCode { break-inside: avoid; page-break-inside: avoid; }',
    // Keep footnote list items (number + text) on the same page.
    '.footnotes li { break-inside: avoid; page-break-inside: avoid; }',
    // Keep the footnote separator (hr) with the footnote list.
    '.footnotes hr { break-after: avoid; page-break-after: avoid; }',
  ].join('\n');

  const polisherCSS = [
    extractAtPageRules(safeLayoutCSS),
    extractBreakRules(safeLayoutCSS),
    hardcodedBreakRules,
    debugPageRules
  ].filter(Boolean).join('\n');

  const polisherStylesheets = polisherCSS
    ? [{ [stylesheetUrl || 'about:blank']: polisherCSS }]
    : [];

  return {
    safeLayoutCSS,
    styledHTML,
    polisherCSS,
    polisherStylesheets
  };
};