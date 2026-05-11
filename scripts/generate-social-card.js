#!/usr/bin/env node
// scripts/generate-social-card.js
// Generates public/brand/social-card.png (1200×630) showing MD editor + rendered preview

import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, '../public/brand/social-card.png');

const HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  width:1200px;height:630px;overflow:hidden;
  background:#091524;
  font-family:'Liberation Sans','DejaVu Sans',Arial,Helvetica,sans-serif;
  position:relative;
}
.bg{
  position:absolute;inset:0;
  background:
    radial-gradient(ellipse 520px 420px at 14% 55%, rgba(0,137,207,.20) 0%, transparent 65%),
    radial-gradient(ellipse 340px 240px at 78% 14%, rgba(0,195,255,.10) 0%, transparent 55%),
    radial-gradient(ellipse 260px 200px at 90% 90%, rgba(0,80,140,.12) 0%, transparent 60%),
    linear-gradient(145deg, #091524 0%, #0d2240 55%, #091524 100%);
}
.bg::after{
  content:'';position:absolute;inset:0;
  background-image:radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px);
  background-size:30px 30px;
}
/* ── Brand left ─────────────────────────────────── */
.brand{
  position:absolute;left:58px;top:0;bottom:0;width:365px;
  display:flex;flex-direction:column;justify-content:center;
  z-index:10;
}
.logo{
  font-size:46px;font-weight:800;color:#fff;
  letter-spacing:-1.5px;line-height:1;margin-bottom:4px;
}
.logo .accent{color:#0089cf;}
.logo-rule{
  width:36px;height:3px;background:#0089cf;
  border-radius:2px;margin:14px 0 18px;
}
.tagline{
  font-size:18px;font-weight:700;
  color:rgba(255,255,255,.88);
  line-height:1.35;margin-bottom:10px;
}
.desc{
  font-size:12px;color:rgba(255,255,255,.42);
  line-height:1.65;margin-bottom:30px;
}
.pills{display:flex;flex-wrap:wrap;gap:7px;}
.pill{
  background:rgba(0,137,207,.18);
  border:1px solid rgba(0,137,207,.38);
  color:#4ecdf5;
  font-size:10px;font-weight:700;
  padding:4px 10px;border-radius:100px;
  letter-spacing:.5px;text-transform:uppercase;
}
/* ── Separator ──────────────────────────────────── */
.sep{
  position:absolute;left:412px;top:72px;bottom:72px;width:1px;
  background:linear-gradient(to bottom,transparent,rgba(0,137,207,.28) 25%,rgba(0,137,207,.28) 75%,transparent);
}
/* ── Screens container ──────────────────────────── */
.screens{position:absolute;left:420px;top:0;right:0;bottom:0;}
.screen{position:absolute;border-radius:9px;overflow:hidden;}

/* Back screen – light editor */
.screen-back{
  width:460px;height:340px;
  left:30px;top:54px;
  transform:rotate(-4deg);
  box-shadow:-4px 22px 64px rgba(0,0,0,.65), 0 0 0 1px rgba(0,0,0,.12);
  z-index:1;
}
/* Front screen – rendered preview */
.screen-front{
  width:442px;height:374px;
  left:232px;top:120px;
  transform:rotate(2.5deg);
  box-shadow:0 28px 72px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.07), 0 0 44px rgba(0,137,207,.22);
  z-index:2;
}
/* Window chrome */
.chrome{height:30px;display:flex;align-items:center;padding:0 10px;gap:5px;flex-shrink:0;}
.chrome-light{background:#e8e8e8;}
.d{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.dr{background:#ff5f57;} .dy{background:#febc2e;} .dg{background:#28c840;}
.clabel{margin:0 auto;font-size:10px;font-weight:600;color:#555;}

/* ── Markdown editor (light theme) ─────────────── */
.editor{
  background:#ffffff;
  height:calc(100% - 30px);
  padding:11px 6px 11px 0;
  font-family:'Liberation Mono','DejaVu Sans Mono','Courier New',Consolas,monospace;
  font-size:10.5px;line-height:1.74;
  overflow:hidden;
  border-top:1px solid #e0e0e0;
}
.l{display:flex;align-items:baseline;}
.ln{width:32px;text-align:right;padding-right:12px;color:#c0c0c0;font-size:9.5px;flex-shrink:0;user-select:none;}
.h2{color:#0070c1;font-weight:bold;}
.pipe{color:#999;}
.bold{color:#1e293b;font-weight:bold;}
.txt{color:#1e293b;}
.math{color:#a31515;}
.fnc{color:#795e26;}
.dim{color:#bbb;}
.kw{color:#af00db;}
.cmt{color:#008000;font-style:italic;}

/* ── Rendered preview ───────────────────────────── */
.preview{
  background:#fff;
  height:calc(100% - 30px);
  padding:18px 22px 14px;
  overflow:hidden;
}
.ph2{
  font-size:14px;font-weight:700;color:#0f172a;
  border-bottom:2.5px solid #0089cf;
  padding-bottom:5px;margin-bottom:12px;
  font-family:Arial,Helvetica,sans-serif;
}
.ptable{
  width:100%;border-collapse:collapse;
  font-size:9.5px;margin-bottom:12px;
  font-family:Arial,Helvetica,sans-serif;
}
.ptable thead tr{background:#0089cf;color:#fff;}
.ptable th{padding:5px 8px;font-weight:600;font-size:9px;letter-spacing:.3px;border:none;}
.ptable td{padding:4px 8px;border:1px solid #e8ecef;color:#1e293b;}
.ptable tbody tr:nth-child(even){background:#f4f9fc;}
.ptable .best td{font-weight:700;color:#0069a8;}
.pformula{
  background:#f7faff;
  border-left:3px solid #0089cf;
  padding:8px 16px;
  margin-bottom:12px;
  border-radius:0 4px 4px 0;
  text-align:center;
}
.ftext{
  font-family:'Liberation Serif','DejaVu Serif',Georgia,'Times New Roman',serif;
  font-size:15px;color:#0f172a;font-style:italic;
}
.ftext sub{font-size:9px;font-style:normal;}
.chartlbl{
  font-size:8.5px;text-transform:uppercase;
  letter-spacing:.6px;color:#94a3b8;
  font-family:Arial,Helvetica,sans-serif;margin-bottom:4px;
}
.pgfooter{
  position:absolute;bottom:8px;left:0;right:0;
  text-align:center;font-size:8.5px;color:#cbd5e0;
  font-family:Arial,sans-serif;
}
</style>
</head><body>
<div class="bg"></div>

<!-- ── Brand ─────────────────────────────────────── -->
<div class="brand">
  <div class="logo">mdedit<span class="accent">.io</span></div>
  <div class="logo-rule"></div>
  <div class="tagline">Style up your Markdown Documents<br><span style="color:rgba(255,255,255,.72)">— together, now and with AI help</span></div>
  <div class="desc">Write in Markdown — export print-ready documents<br>with tables, formulas, diagrams &amp; layouts.</div>
  <div class="pills">
    <span class="pill">KaTeX</span>
    <span class="pill">Mermaid</span>
    <span class="pill">AI</span>
    <span class="pill">Collaboration</span>
    <span class="pill">No account</span>
  </div>
</div>
<div class="sep"></div>

<!-- ── Screens ────────────────────────────────────── -->
<div class="screens">

  <!-- Back: Markdown source editor -->
  <div class="screen screen-back">
    <div class="chrome chrome-light">
      <span class="d dr"></span><span class="d dy"></span><span class="d dg"></span>
      <span class="clabel">document.md — mdedit.io</span>
    </div>
    <div class="editor">
      <div class="l"><span class="ln">1</span><span class="cmt"># Research Report</span></div>
      <div class="l"><span class="ln">2</span></div>
      <div class="l"><span class="ln">3</span><span class="h2">## 2. Results</span></div>
      <div class="l"><span class="ln">4</span></div>
      <div class="l"><span class="ln">5</span><span class="pipe">| </span><span class="txt">Method      </span><span class="pipe">| </span><span class="txt">Accuracy </span><span class="pipe">| </span><span class="txt">F1   </span><span class="pipe">|</span></div>
      <div class="l"><span class="ln">6</span><span class="dim">|------------|---------|-----|</span></div>
      <div class="l"><span class="ln">7</span><span class="pipe">| </span><span class="txt">Baseline    </span><span class="pipe">| </span><span class="txt">84.3 %   </span><span class="pipe">| </span><span class="txt">0.81 </span><span class="pipe">|</span></div>
      <div class="l"><span class="ln">8</span><span class="pipe">| </span><span class="bold">**Ours**    </span><span class="pipe">| </span><span class="bold">**94.2 %**</span><span class="pipe">| </span><span class="bold">**0.93**</span><span class="pipe">|</span></div>
      <div class="l"><span class="ln">9</span><span class="pipe">| </span><span class="txt">GPT-4       </span><span class="pipe">| </span><span class="txt">91.0 %   </span><span class="pipe">| </span><span class="txt">0.89 </span><span class="pipe">|</span></div>
      <div class="l"><span class="ln">10</span></div>
      <div class="l"><span class="ln">11</span><span class="math">$$</span></div>
      <div class="l"><span class="ln">12</span><span class="math">\mathcal{L} = -\sum_i y_i \log(\hat{y}_i)</span></div>
      <div class="l"><span class="ln">13</span><span class="math">$$</span></div>
      <div class="l"><span class="ln">14</span></div>
      <div class="l"><span class="ln">15</span><span class="fnc">\`\`\`mermaid</span></div>
      <div class="l"><span class="ln">16</span><span class="kw">graph</span><span class="txt"> LR</span></div>
      <div class="l"><span class="ln">17</span><span class="txt">  Data --> Preprocess --> Model</span></div>
      <div class="l"><span class="ln">18</span><span class="fnc">\`\`\`</span></div>
    </div>
  </div>

  <!-- Front: Rendered PDF preview -->
  <div class="screen screen-front">
    <div class="chrome chrome-light">
      <span class="d dr"></span><span class="d dy"></span><span class="d dg"></span>
      <span class="clabel">Preview · PDF Export</span>
    </div>
    <div class="preview" style="position:relative;">
      <div class="ph2">2. Results</div>

      <table class="ptable">
        <thead><tr><th>Method</th><th>Accuracy</th><th>F1 Score</th></tr></thead>
        <tbody>
          <tr><td>Baseline</td><td>84.3 %</td><td>0.81</td></tr>
          <tr class="best"><td>Ours</td><td>94.2 %</td><td>0.93</td></tr>
          <tr><td>GPT-4</td><td>91.0 %</td><td>0.89</td></tr>
        </tbody>
      </table>

      <div class="pformula">
        <span class="ftext">&#x2112; = &#x2212;&#x2211;<sub>i</sub> y<sub>i</sub> log(&#x177;<sub>i</sub>)</span>
      </div>

      <div class="chartlbl">Accuracy comparison</div>
      <svg width="380" height="80" viewBox="0 0 380 80" style="display:block;overflow:visible">
        <line x1="0" y1="63" x2="380" y2="63" stroke="#e2e8f0" stroke-width="1"/>
        <!-- Baseline 84.3 / 94.2 * 52 ≈ 46 -->
        <rect x="18"  y="17" width="76" height="46" rx="3" fill="#93c5d9"/>
        <text x="56"  y="13" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Arial">84.3%</text>
        <text x="56"  y="75" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Arial">Baseline</text>
        <!-- Ours 94.2 full height 52 -->
        <rect x="152" y="11" width="76" height="52" rx="3" fill="#0089cf"/>
        <text x="190" y="7"  text-anchor="middle" font-size="8.5" font-weight="bold" fill="#0069a8" font-family="Arial">94.2%</text>
        <text x="190" y="75" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#0069a8" font-family="Arial">Ours</text>
        <!-- GPT-4 91/94.2*52 ≈ 50 -->
        <rect x="286" y="13" width="76" height="50" rx="3" fill="#93c5d9"/>
        <text x="324" y="9"  text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Arial">91.0%</text>
        <text x="324" y="75" text-anchor="middle" font-size="8.5" fill="#64748b" font-family="Arial">GPT-4</text>
      </svg>

      <div class="pgfooter">— 3 —</div>
    </div>
  </div>

</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: '/snap/bin/chromium',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));
await page.screenshot({ path: OUTPUT, type: 'png', fullPage: false });
await browser.close();
console.log('✓ social-card.png written to', OUTPUT);
