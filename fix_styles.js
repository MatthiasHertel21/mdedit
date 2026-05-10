import fs from 'fs';

const printCssPath = '/home/ga/md/public/print.css';
let css = fs.readFileSync(printCssPath, 'utf8');

// 1. IMPROVE TABLES (Hyphenation, Padding, Font-size)
css = css.replace(
  /\.print-content table \{([\s\S]+?)font-size: 10pt;([\s\S]+?)\}/,
  '.print-content table {$1font-size: 9.5pt;$2}'
);

css = css.replace(
  /\.print-content th \{([\s\S]+?)padding: 8pt;([\s\S]+?)hyphens: auto;([\s\S]+?)\}/,
  '.print-content th {$1padding: 5pt 8pt;$2hyphens: manual;$3}'
);

css = css.replace(
  /\.print-content td \{([\s\S]+?)padding: 8pt;([\s\S]+?)hyphens: auto;([\s\S]+?)\}/,
  '.print-content td {$1padding: 5pt 8pt;$2hyphens: manual;$3}'
);

// 2. IMPROVE MATH (Centering and borders)
css = css.replace(
  /\.print-content \.math-block \{([\s\S]+?)margin: 18pt 0;([\s\S]+?)\}/,
  '.print-content .math-block {$1margin: 24pt 0;\\n  padding: 8pt 0;$2}'
);

// 3. IMPROVE CODEBLOCKS (Background, padding, border)
css = css.replace(
  /\.print-content pre \{([\s\S]+?)background: #e8ecf0;([\s\S]+?)border: 1pt solid #c0cad3;([\s\S]+?)\}/,
  '.print-content pre {$1background: #fdfdfe;\\n  border: 0.5pt solid #ddd;$3}'
);

fs.writeFileSync(printCssPath, css);
