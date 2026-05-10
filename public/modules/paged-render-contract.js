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
            </style>
          </head>
          <body>
            ${printHTML}
          </body>
          </html>
        `;

  const polisherCSS = [
    extractAtPageRules(safeLayoutCSS),
    extractBreakRules(safeLayoutCSS),
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