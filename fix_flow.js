import fs from 'fs';

const filePath = '/home/ga/md/public/modules/layout-preprocessor.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add data-layout to markers
content = content.replace(
  /case 'columns-open':\s+marker\.className = 'md-columns-token-start';\s+marker\.dataset\.count = token\.attrs\.count \|\| '2';\s+marker\.dataset\.gap = token\.attrs\.gap \|\| '20pt';\s+marker\.dataset\.rule = token\.attrs\.rule \|\| 'false';\s+break;/g,
  "case 'columns-open':\\n        marker.className = 'md-columns-token-start';\\n        marker.dataset.count = token.attrs.count || '2';\\n        marker.dataset.gap = token.attrs.gap || '20pt';\\n        marker.dataset.rule = token.attrs.rule || 'false';\\n        marker.dataset.layout = 'columns';\\n        break;"
);

// 2. Insert applyColumnsGuard call in postProcessHTML
content = content.replace(
  /this\.applyTableLayouts\(doc\);/g,
  "this.applyTableLayouts(doc);\\n    this.applyColumnsGuard(doc);"
);

// 3. Add applyColumnsGuard method
const newMethod = \`
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
\`;

content = content.replace(
  /applySectionBreaks\(doc\) \{/g,
  newMethod + "\\n  applySectionBreaks(doc) {"
);

fs.writeFileSync(filePath, content);
