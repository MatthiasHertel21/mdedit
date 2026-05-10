import fs from 'fs';

const printCssPath = '/home/ga/md/public/print.css';
let css = fs.readFileSync(printCssPath, 'utf8');

// 1. IMPROVE TABLES (Hyphenation, Spacing)
// Force no hyphenation in tables and simplify padding
css = css.replace(
  /\.print-content th \{([\s\S]+?)hyphens: manual;([\s\S]+?)\}/,
  '.print-content th {$1hyphens: none !important;\\n  word-break: normal !important;\\n  overflow-wrap: normal !important;$2}'
);

css = css.replace(
  /\.print-content td \{([\s\S]+?)hyphens: manual;([\s\S]+?)\}/,
  '.print-content td {$1hyphens: none !important;\\n  word-break: normal !important;\\n  overflow-wrap: normal !important;$2}'
);

// 2. IMPROVE MATH BLOCK STYLING
css = css.replace(
  /\.print-content \.math-block \{([\s\S]+?)margin: 24pt 0;([\s\S]+?)\}/,
  '.print-content .math-block {$1margin: 28pt 0;\\n  padding: 12pt 0;\\n  background: #fcfcfc;\\n  border-top: 0.2pt solid #eee;\\n  border-bottom: 0.2pt solid #eee;$2}'
);

// 3. IMPROVE CODEBLOCK OPTICS
css = css.replace(
  /\.print-content pre \{([\s\S]+?)background: #fdfdfe;([\s\S]+?)border: 0.5pt solid #ddd;([\s\S]+?)\}/,
  '.print-content pre {$1background: #f8f9fa;\\n  border: 0.5pt solid #d1d5db;\\n  border-left: 4pt solid #4f46e5;$3}'
);

// Fix newlines
css = css.replace(/\\n/g, '\n');

fs.writeFileSync(printCssPath, css);

// 4. FIX KATEX DISPLAY MODE IN LOCAL PLUGIN
const katexPluginPath = '/home/ga/md/public/vendor/esm/markdown-it-katex-local.js';
let js = fs.readFileSync(katexPluginPath, 'utf8');

// The issue might be that katex-display class is not being applied or the div wrapper is too outer.
// We want to ensure displayMode: true is passed and result is wrapped correctly.
// Let's modify the katexBlock function to be more explicit.
js = js.replace(
  /return `<div class="math-block">\$\{katexInstance\.renderToString\(latex, renderOptions\)\}<\/div>`;/g,
  'return `<div class="math-block display-math">${katexInstance.renderToString(latex, renderOptions)}</div>`;'
);

fs.writeFileSync(katexPluginPath, js);
