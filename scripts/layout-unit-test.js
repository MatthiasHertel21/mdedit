/**
 * layout-unit-test.js
 *
 * DOM-level layout tests for mdedit.io's layout preprocessor.
 * Uses the running dev server + Puppeteer to execute tests in a real browser
 * context where DOMParser and all browser APIs are available.
 *
 * Usage:
 *   node scripts/layout-unit-test.js
 *   BASE_URL=http://127.0.0.1:3210 node scripts/layout-unit-test.js
 *   node scripts/layout-unit-test.js --filter figures
 *
 * Does NOT commit to git (see .gitignore: scripts/layout-unit-test.js)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const readDoc = (relPath) => readFileSync(resolve(ROOT, relPath), 'utf8');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3210';
const filterArg = process.argv.find(a => a.startsWith('--filter='))?.slice(9)
  || (process.argv.indexOf('--filter') !== -1 ? process.argv[process.argv.indexOf('--filter') + 1] : null);

// ─── Chromium ────────────────────────────────────────────────────────────────

const resolveChromium = () => {
  const candidates = [
    process.env.CHROMIUM_BIN, 'chromium', 'chromium-browser',
    'google-chrome', 'google-chrome-stable'
  ].filter(Boolean);
  for (const cmd of candidates) {
    if (spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0) return cmd;
  }
  return null;
};

// ─── Test runner ─────────────────────────────────────────────────────────────

const results = [];

const suite = (name, tests) => ({ name, tests });

const check = (id, description, fn) => ({ id, description, fn });

// ─── Config-driven reference-docs suite ──────────────────────────────────────

const loadTestConfig = () => {
  const specPath = resolve(ROOT, 'docs/testing/layout-test-spec.md');
  let specContent;
  try {
    specContent = readFileSync(specPath, 'utf8');
  } catch {
    return null;
  }
  const match = specContent.match(/```test-config\r?\n([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.error(`layout-test-spec.md: invalid JSON in test-config block: ${e.message}`);
    return null;
  }
};

const buildReferenceDocsSuite = (config) => {
  if (!config?.referenceDocs?.length) {
    return suite('reference-docs', [
      check('config-missing', 'test-config loaded from docs/testing/layout-test-spec.md', async () => {
        assert(false, 'No referenceDocs configured — check docs/testing/layout-test-spec.md');
      })
    ]);
  }

  const evalDocHtml = (page, mdContent) => page.evaluate((mdStr) => {
    window.layoutPreprocessor.resetCounters();
    const lp = window.layoutPreprocessor;
    const processed = lp.process(mdStr);
    const renderer = window.buildMarkdownIt ? window.buildMarkdownIt({}) : null;
    if (!renderer) throw new Error('buildMarkdownIt not found');
    const html = renderer.render(processed);
    return lp.postProcessHTML(html);
  }, mdContent);

  const evalDocCount = (page, mdContent, selector) => page.evaluate((mdStr, sel) => {
    window.layoutPreprocessor.resetCounters();
    const lp = window.layoutPreprocessor;
    const processed = lp.process(mdStr);
    const renderer = window.buildMarkdownIt ? window.buildMarkdownIt({}) : null;
    if (!renderer) return -1;
    const html = renderer.render(processed);
    const out = lp.postProcessHTML(html);
    const doc = new DOMParser().parseFromString(out, 'text/html');
    return doc.querySelectorAll(sel).length;
  }, mdContent, selector);

  const checks = [];

  for (const doc of config.referenceDocs) {
    const { id, label, file, expect: exp = {} } = doc;

    if (exp.figureCount !== undefined) {
      const expected = exp.figureCount;
      checks.push(check(`${id}/figures`, `${label}: ${expected} <figure>(s)`, async (page) => {
        const count = await evalDocCount(page, readDoc(file), 'figure');
        assert(count === expected, `Expected ${expected} <figure> elements, got ${count}`);
      }));
    }

    if (exp.firstFigureLabel !== undefined) {
      const expected = exp.firstFigureLabel;
      checks.push(check(`${id}/firstFigureLabel`, `${label}: first figure label "${expected}"`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(result.includes(expected), `Expected label "${expected}" in output`);
      }));
    }

    if (exp.captionCount !== undefined) {
      const expected = exp.captionCount;
      checks.push(check(`${id}/captions`, `${label}: ${expected} table caption(s)`, async (page) => {
        const count = await evalDocCount(page, readDoc(file), 'caption');
        assert(count === expected, `Expected ${expected} <caption> elements, got ${count}`);
      }));
    }

    if (exp.firstCaptionLabel !== undefined) {
      const expected = exp.firstCaptionLabel;
      checks.push(check(`${id}/firstCaptionLabel`, `${label}: first caption label "${expected}"`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(result.includes(expected), `Expected label "${expected}" in output`);
      }));
    }

    if (exp.listOfFiguresEntries !== undefined) {
      const expected = exp.listOfFiguresEntries;
      checks.push(check(`${id}/lof`, `${label}: list-of-figures has ${expected} entries`, async (page) => {
        const count = await evalDocCount(page, readDoc(file), '.list-of-figures a');
        assert(count === expected, `Expected ${expected} list-of-figures entries, got ${count}`);
      }));
    }

    if (exp.listOfTablesEntries !== undefined) {
      const expected = exp.listOfTablesEntries;
      checks.push(check(`${id}/lot`, `${label}: list-of-tables has ${expected} entries`, async (page) => {
        const count = await evalDocCount(page, readDoc(file), '.list-of-tables a');
        assert(count === expected, `Expected ${expected} list-of-tables entries, got ${count}`);
      }));
    }

    if (exp.dataLayouts) {
      for (const [layoutName, layoutCount] of Object.entries(exp.dataLayouts)) {
        const lName = layoutName;
        const lCount = layoutCount;
        checks.push(check(`${id}/layout-${lName}`, `${label}: ${lCount} table(s) with data-layout="${lName}"`, async (page) => {
          const count = await evalDocCount(page, readDoc(file), `table[data-layout="${lName}"]`);
          assert(count === lCount, `Expected ${lCount} tables with data-layout="${lName}", got ${count}`);
        }));
      }
    }

    if (exp.floatFigure) {
      const dir = exp.floatFigure;
      checks.push(check(`${id}/float-${dir}`, `${label}: float figure has md-figure--${dir}`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(result.includes(`md-figure--${dir}`), `Expected md-figure--${dir} class`);
      }));
    }

    if (exp.figureShadow) {
      checks.push(check(`${id}/shadow`, `${label}: figure has md-figure--shadow`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(result.includes('md-figure--shadow'), 'Expected md-figure--shadow class');
      }));
    }

    if (exp.figureFrame) {
      checks.push(check(`${id}/frame`, `${label}: figure has md-figure--frame`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(result.includes('md-figure--frame'), 'Expected md-figure--frame class');
      }));
    }

    if (exp.noResidualTokens) {
      checks.push(check(`${id}/no-tokens`, `${label}: no [[MDLAYOUT: tokens in output`, async (page) => {
        const result = await evalDocHtml(page, readDoc(file));
        assert(!result.includes('[[MDLAYOUT:'), '[[MDLAYOUT: token must not appear in output');
      }));
    }
  }

  return suite('reference-docs', checks);
};

// ─── Test suites ─────────────────────────────────────────────────────────────

const SUITES = [

  suite('figures', [

    check('FIG-01', 'Image with caption prefix "Abbildung N:" becomes <figure>', async (page) => {
      const html = '<p><img alt="Abbildung 1: Testtitel" src="x.png"></p>';
      const result = await evalPreprocessor(page, html);
      assert(result.includes('<figure'), 'Expected <figure> element');
      assert(result.includes('class="md-figure'), 'Expected md-figure class');
      assert(result.includes('figcaption'), 'Expected <figcaption>');
      assert(result.includes('Abb.&nbsp;1:'), 'Expected "Abb.&nbsp;1:" label');
      assert(result.includes('Testtitel'), 'Expected caption text');
    }),

    check('FIG-02', 'Image with caption prefix "Figure N:" becomes <figure>', async (page) => {
      const html = '<p><img alt="Figure 2: Test figure" src="x.png"></p>';
      const result = await evalPreprocessor(page, html);
      assert(result.includes('<figure'), 'Expected <figure> element');
      // resetCounters() resets to 0, so the first figure in this test gets number 1
      assert(result.includes('Abb.&nbsp;1:'), 'Expected "Abb.&nbsp;1:" label (counter reset)');
      assert(result.includes('Test figure'), 'Expected caption text');
    }),

    check('FIG-03', 'Image WITHOUT caption prefix is NOT wrapped in <figure>', async (page) => {
      const html = '<p><img alt="just-an-image" src="x.png"></p>';
      const result = await evalPreprocessor(page, html);
      assert(!result.includes('<figure'), 'Should NOT produce <figure>');
    }),

    check('FIG-04', '<!-- img: align=right width=40% --> marker sets float class and width on figure', async (page) => {
      // blank line between marker and image is essential (HTML comment is block-level before process())
      const md = '<!-- img: align=right width=40% -->\n\n![Abbildung 1: Float test](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('md-figure--right'), 'Expected md-figure--right class');
      // Width should be on the figure element for float
      assert(/style="[^"]*width\s*:\s*40%/.test(result), 'Expected width:40% on figure');
    }),

    check('FIG-05', '<!-- img: frame --> marker adds md-figure--frame class', async (page) => {
      const md = '<!-- img: frame -->\n\n![Abbildung 1: Frame test](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('md-figure--frame'), 'Expected md-figure--frame class');
    }),

    check('FIG-06', '<!-- img: shadow --> marker adds md-figure--shadow class', async (page) => {
      const md = '<!-- img: shadow -->\n\n![Abbildung 1: Shadow test](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('md-figure--shadow'), 'Expected md-figure--shadow class');
    }),

    check('FIG-07', '<!-- img: filter=grayscale --> marker adds md-figure--filter-grayscale class', async (page) => {
      const md = '<!-- img: filter=grayscale -->\n\n![Abbildung 1: Grayscale test](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('md-figure--filter-grayscale'), 'Expected md-figure--filter-grayscale class');
    }),

    check('FIG-08', 'center-aligned image width is set on <img>, not <figure>', async (page) => {
      const md = '<!-- img: align=center width=80% -->\n\n![Abbildung 1: Center](x.png)';
      const result = await evalPreprocessorMd(page, md);
      // For center alignment, width goes on img element, not figure
      assert(result.includes('md-figure--center'), 'Expected md-figure--center class');
      // img should have the width style
      const imgWidthMatch = /img[^>]+style="[^"]*width\s*:\s*80%/.test(result);
      assert(imgWidthMatch, 'Expected width:80% on <img> for center align');
    }),

    check('FIG-09', 'figureRegistry is populated for list-of-figures', async (page) => {
      const md = '<!-- img: -->\n\n![Abbildung 1: First](x.png)\n\n![Abbildung 2: Second](y.png)';
      const count = await page.evaluate((mdStr) => {
        window.layoutPreprocessor.resetCounters();
        const md = window.layoutPreprocessor;
        const processed = md.process(mdStr);
        const renderer = window.buildMarkdownIt ? window.buildMarkdownIt({}) : null;
        if (!renderer) return -1;
        const html = renderer.render(processed);
        md.postProcessHTML(html);
        return md.figureRegistry.length;
      }, md);
      assert(count === 2, `Expected 2 figures in registry, got ${count}`);
    }),

    check('FIG-10', '<!-- img: --> marker is NOT visible in rendered output', async (page) => {
      const md = '<!-- img: align=center width=100% -->\n![Abbildung 1: Test](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('MDLAYOUT'), 'MDLAYOUT token should not appear in output');
      assert(!result.includes('img:'), 'Raw img: marker should not appear in output');
    }),

    check('FIG-11', '<!-- img: #fig:schema --> marker sets a semantic figure id', async (page) => {
      const md = '<!-- img: #fig:schema align=center -->\n\n![Schema der Exportpipeline](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('id="fig:schema"'), 'Expected semantic figure id');
      assert(result.includes('Schema der Exportpipeline'), 'Expected plain alt text to become caption for semantic figure');
    }),

    check('FIG-12', '![...](...){#fig:id} is normalized into the semantic figure pipeline', async (page) => {
      const md = '![Schema der Exportpipeline](x.png){#fig:schema}';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('id="fig:schema"'), 'Expected semantic figure id from post-image attribute');
      assert(!result.includes('{#fig:schema}'), 'Raw image id attribute should not remain in output');
    }),

    check('FIG-13', 'Explicit img marker id wins over post-image attribute id', async (page) => {
      const md = '<!-- img: #fig:marker -->\n\n![Schema der Exportpipeline](x.png){#fig:attr}';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('id="fig:marker"'), 'Expected explicit marker id to win');
      assert(!result.includes('id="fig:attr"'), 'Expected post-image attribute id to be ignored when marker already sets id');
    }),

  ]),

  suite('tables', [

    check('TAB-01', 'Table preceded by "Tabelle N: caption" gets <caption> element', async (page) => {
      const md = '**Tabelle 1: Test-Tabelle.**\n\n| A | B |\n|---|---|\n| x | y |';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('<caption'), 'Expected <caption> element');
      assert(result.includes('Tab.&nbsp;1:'), 'Expected "Tab.&nbsp;1:" label');
      assert(result.includes('Test-Tabelle'), 'Expected caption text');
    }),

    check('TAB-02', 'Table preceded by "Table N: caption" (EN) gets <caption> element', async (page) => {
      const md = 'Table 1: English caption.\n\n| A | B |\n|---|---|\n| x | y |';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('<caption'), 'Expected <caption> element');
      assert(result.includes('Tab.&nbsp;1:'), 'Expected "Tab.&nbsp;1:" label');
    }),

    check('TAB-03', 'Caption is recognized even when <!-- table:scientific --> marker is between it and the table', async (page) => {
      const md = '**Tabelle 1: Mit Layoutmarker.**\n\n<!-- table:scientific -->\n\n| A | B |\n|---|---|\n| x | y |';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('<caption'), 'Expected <caption> element even with table marker between');
    }),

    check('TAB-04', 'tableRegistry is populated for list-of-tables', async (page) => {
      const md = 'Tabelle 1: Erste.\n\n| A | B |\n|---|---|\n| x | y |\n\nTabelle 2: Zweite.\n\n| C | D |\n|---|---|\n| a | b |';
      const count = await page.evaluate((mdStr) => {
        window.layoutPreprocessor.resetCounters();
        const lp = window.layoutPreprocessor;
        const processed = lp.process(mdStr);
        const renderer = window.buildMarkdownIt ? window.buildMarkdownIt({}) : null;
        if (!renderer) return -1;
        const html = renderer.render(processed);
        lp.postProcessHTML(html);
        return lp.tableRegistry.length;
      }, md);
      assert(count === 2, `Expected 2 tables in registry, got ${count}`);
    }),

    check('TAB-05', 'Table without caption prefix is NOT touched', async (page) => {
      const md = 'No caption here.\n\n| A | B |\n|---|---|\n| x | y |';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('<caption'), 'Should NOT add <caption> without prefix');
    }),

    check('TAB-06', 'Colon in lof-num/lot-num has no space before it', async (page) => {
      const md = 'Tabelle 1: Test.\n\n| A | B |\n|---|---|\n| x | y |';
      const result = await evalPreprocessorMd(page, md);
      // Must NOT contain "Tab. 1 :" or "Tab.&nbsp;1 :" (space before colon)
      assert(!/Tab\.(\u00a0|&nbsp;)1\s+:/.test(result), 'Colon must not have space before it');
    }),

  ]),

  suite('directories', [

    check('DIR-01', '<!-- list-of-figures --> produces <nav class="list-of-figures">', async (page) => {
      const md = '![Abbildung 1: Test](x.png)\n\n<!-- list-of-figures -->';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('class="list-of-figures"'), 'Expected list-of-figures nav');
    }),

    check('DIR-02', '<!-- list-of-tables --> produces <nav class="list-of-tables">', async (page) => {
      const md = 'Tabelle 1: Test.\n\n| A | B |\n|---|---|\n| x | y |\n\n<!-- list-of-tables -->';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('class="list-of-tables"'), 'Expected list-of-tables nav');
    }),

    check('DIR-03', 'list-of-figures contains all registered figures', async (page) => {
      const md = '![Abbildung 1: Eins](x.png)\n\n![Abbildung 2: Zwei](y.png)\n\n<!-- list-of-figures -->';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('Abb.&nbsp;1:'), 'Expected Abb.&nbsp;1: entry');
      assert(result.includes('Abb.&nbsp;2:'), 'Expected Abb.&nbsp;2: entry');
    }),

    check('DIR-04', 'list-of-tables contains all registered tables', async (page) => {
      const md = 'Tabelle 1: Erste.\n\n| A | B |\n|---|---|\n| x | y |\n\nTabelle 2: Zweite.\n\n| C | D |\n|---|---|\n| a | b |\n\n<!-- list-of-tables -->';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('Tab.&nbsp;1:'), 'Expected Tab.&nbsp;1: entry');
      assert(result.includes('Tab.&nbsp;2:'), 'Expected Tab.&nbsp;2: entry');
    }),

    check('DIR-05', 'MDLAYOUT tokens do not appear in final output', async (page) => {
      const md = '<!-- list-of-figures -->\n\n<!-- list-of-tables -->';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('MDLAYOUT'), 'MDLAYOUT tokens must not appear in output');
    }),

  ]),

  suite('images', [

    check('IMG-01', 'Pasted image (plain alt text) is NOT wrapped in <figure>', async (page) => {
      // Simulates auto-generated alt text from paste
      const html = '<p><img alt="paste-1778320804300" src="/assets/test/fa83ac9d.png"></p>';
      const result = await evalPreprocessor(page, html);
      assert(!result.includes('<figure'), 'Pasted image should not become <figure>');
    }),

    check('IMG-02', 'Image marker token does not appear in rendered text', async (page) => {
      const md = '<!-- img: align=right width=30% -->\n![just text](x.png)';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('image-layout-marker'), 'Marker class should be cleaned up');
      assert(!result.includes('MDLAYOUT'), 'MDLAYOUT token should not appear');
    }),

    check('IMG-03', 'Multiple images in one document are numbered independently', async (page) => {
      const md = [
        '![Abbildung 1: Erste Abbildung](a.png)',
        '',
        '![Abbildung 2: Zweite Abbildung](b.png)',
        '',
        '![Abbildung 3: Dritte Abbildung](c.png)',
      ].join('\n');
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('id="figure-1"'), 'Expected figure-1 id');
      assert(result.includes('id="figure-2"'), 'Expected figure-2 id');
      assert(result.includes('id="figure-3"'), 'Expected figure-3 id');
    }),

    check('IMG-04', 'resetCounters() clears figureRegistry and tableRegistry', async (page) => {
      const cleared = await page.evaluate(() => {
        const lp = window.layoutPreprocessor;
        lp.figureRegistry = [{ id: 'figure-1', num: 1, caption: 'test' }];
        lp.tableRegistry = [{ id: 'table-1', num: 1, caption: 'test' }];
        lp.resetCounters();
        return { fig: lp.figureRegistry.length, tab: lp.tableRegistry.length };
      });
      assert(cleared.fig === 0, 'figureRegistry should be empty after resetCounters');
      assert(cleared.tab === 0, 'tableRegistry should be empty after resetCounters');
    }),

    check('IMG-05', 'Images inside code blocks are NOT processed', async (page) => {
      const md = '```\n![Abbildung 1: Should be ignored](x.png)\n```';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('<figure'), 'Images in code blocks must not become <figure>');
    }),

  ]),

  suite('page-breaks', [

    check('PBR-01', '<!-- page-break --> adds data-break-before="page" to next sibling', async (page) => {
      const md = '<!-- page-break -->\n\nThis paragraph follows.';
      const result = await evalPreprocessorMd(page, md);
      assert(result.includes('data-break-before="page"'), 'Expected data-break-before="page"');
    }),

    check('PBR-02', '<!-- column-break --> marker is processed without error', async (page) => {
      const md = 'Text before\n\n<!-- column-break -->\n\nText after';
      const result = await evalPreprocessorMd(page, md);
      assert(!result.includes('MDLAYOUT'), 'Column break token should not appear in output');
    }),

  ]),

  buildReferenceDocsSuite(loadTestConfig()),

  suite('layout-css', [

    check('CSS-01', 'Footer is enabled by default', async (page) => {
      const enabled = await page.evaluate(() => {
        const dl = window.documentLayout || new DocumentLayout();
        return dl.currentLayout?.footer?.enabled;
      });
      assert(enabled === true, 'footer.enabled should default to true');
    }),

    check('CSS-02', 'Generated CSS contains @bottom-center with counter(page) when footer enabled', async (page) => {
      const css = await page.evaluate(() => {
        const dl = window.documentLayout;
        const gen = window.layoutCSSGenerator;
        if (!dl || !gen) return '';
        return gen.generate(dl.currentLayout);
      });
      assert(/@bottom-center/.test(css), 'Expected @bottom-center in generated CSS');
      assert(/counter\(page\)/.test(css), 'Expected counter(page) in generated CSS');
    }),

    check('CSS-03', 'Scientific table CSS contains booktabs top rule', async (page) => {
      const css = await page.evaluate(() => {
        const dl = window.documentLayout;
        const gen = window.layoutCSSGenerator;
        if (!dl || !gen) return '';
        return gen.generate(dl.currentLayout);
      });
      assert(/thead\s+tr:first-child\s+th/.test(css), 'Expected booktabs top rule (thead tr:first-child th)');
    }),

    check('CSS-04', 'Scientific table CSS contains booktabs bottom rule', async (page) => {
      const css = await page.evaluate(() => {
        const dl = window.documentLayout;
        const gen = window.layoutCSSGenerator;
        if (!dl || !gen) return '';
        return gen.generate(dl.currentLayout);
      });
      assert(/tbody\s+tr:last-child\s+td/.test(css), 'Expected booktabs bottom rule (tbody tr:last-child td)');
    }),

    check('CSS-05', 'Caption CSS contains break-after: avoid', async (page) => {
      const css = await page.evaluate(() => {
        const dl = window.documentLayout;
        const gen = window.layoutCSSGenerator;
        if (!dl || !gen) return '';
        return gen.generate(dl.currentLayout);
      });
      assert(/break-after\s*:\s*avoid/.test(css), 'Expected break-after: avoid in caption CSS');
    }),

  ]),

];

// ─── Browser helpers ──────────────────────────────────────────────────────────

async function evalPreprocessorMd(page, md) {
  return page.evaluate((mdStr) => {
    const lp = window.layoutPreprocessor;
    if (!lp) throw new Error('layoutPreprocessor not found on window');
    lp.resetCounters();
    const processed = lp.process(mdStr);
    const renderer = window.buildMarkdownIt ? window.buildMarkdownIt({}) : null;
    if (!renderer) throw new Error('buildMarkdownIt not found on window');
    const html = renderer.render(processed);
    return lp.postProcessHTML(html);
  }, md);
}

async function evalPreprocessor(page, html) {
  return page.evaluate((htmlStr) => {
    const lp = window.layoutPreprocessor;
    if (!lp) throw new Error('layoutPreprocessor not found on window');
    lp.resetCounters();
    return lp.postProcessHTML(htmlStr);
  }, html);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const run = async () => {
  const chromiumCmd = resolveChromium();
  if (!chromiumCmd) {
    console.error('Chromium binary not found. Set CHROMIUM_BIN or install chromium.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromiumCmd,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') process.stderr.write(`  [browser] ${msg.text()}\n`);
  });

  try {
    // Load the app to get all modules initialized
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for layoutPreprocessor to be available
    await page.waitForFunction(
      () => Boolean(window.layoutPreprocessor && window.buildMarkdownIt && window.documentLayout),
      { timeout: 30000 }
    );

    const suites = filterArg
      ? SUITES.filter(s => s.name.includes(filterArg))
      : SUITES;

    if (suites.length === 0) {
      console.log(`No suites matching filter: ${filterArg}`);
      process.exit(1);
    }

    let totalPass = 0, totalFail = 0, totalSkip = 0;
    const failures = [];

    for (const s of suites) {
      console.log(`\n${BOLD}${s.name.toUpperCase()}${RESET}`);

      for (const c of s.tests) {
        try {
          await c.fn(page);
          totalPass++;
          console.log(`  ${GREEN}✓${RESET} [${DIM}${c.id}${RESET}] ${c.description}`);
        } catch (err) {
          totalFail++;
          failures.push({ suite: s.name, ...c, error: err.message });
          console.log(`  ${RED}✗${RESET} [${DIM}${c.id}${RESET}] ${c.description}`);
          console.log(`      ${RED}${err.message}${RESET}`);
        }
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${BOLD}Results:${RESET} ${GREEN}${totalPass} passed${RESET}, ${totalFail ? RED : DIM}${totalFail} failed${RESET}, ${DIM}${totalSkip} skipped${RESET}`);

    if (failures.length) {
      console.log(`\n${BOLD}${RED}Failures:${RESET}`);
      failures.forEach(f => {
        console.log(`  ${f.suite}/${f.id}: ${f.description}`);
        console.log(`    ${RED}→ ${f.error}${RESET}`);
      });
      process.exitCode = 1;
    } else {
      console.log(`\n${GREEN}${BOLD}All tests passed.${RESET}`);
    }

  } finally {
    await browser.close();
  }
};

run().catch(err => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
