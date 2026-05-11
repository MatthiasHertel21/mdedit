/**
 * Print Preview Module
 * Handles Paged.js print layout preview and PDF generation
 */

import { documentLayout } from './document-layout.js';
import { layoutCSSGenerator } from './layout-css-generator.js';
import { layoutPreprocessor } from './layout-preprocessor.js';
import { sanitizeRenderedHtml } from './markdown-renderer.js';
import { buildPagedRenderContract } from './paged-render-contract.js';

export class PrintPreview {
  constructor() {
    this.isActive = false;
    this.paged = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.zoom = 1;
    this.minZoom = 0.25;
    this.maxZoom = 1.8;
    this.zoomStep = 0.1;
    this.isRendering = false;
    this.pendingRender = false;
    this.elements = {
      previewBody: document.getElementById('previewBody'),
      printPreviewBody: document.getElementById('printPreviewBody'),
      printPreviewScroll: document.getElementById('printPreviewScroll'),
      toggleBtn: document.getElementById('togglePrintViewBtn'),
      printBtn: document.getElementById('printViewBtn'),
      printPdfBtn: document.getElementById('printPdfBtn'),
      printPreview: document.getElementById('printPreview'),
      preview: document.getElementById('preview'),
      prevPageBtn: document.getElementById('printPrevPage'),
      nextPageBtn: document.getElementById('printNextPage'),
      pageInfo: document.getElementById('printPageInfo')
    };
    
    this.init();
    this.setupErrorSuppression();
  }

  getKatexPrintCss() {
    if (typeof this.katexPrintCss === 'string') {
      return this.katexPrintCss;
    }

    const absolutizeCssUrls = (cssText, baseHref) => {
      if (!cssText || !baseHref) {
        return cssText;
      }

      return cssText.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (match, quote, rawUrl) => {
        if (/^(?:data:|https?:|file:|blob:|\/)/i.test(rawUrl)) {
          return match;
        }

        try {
          const absoluteUrl = new URL(rawUrl, baseHref).href;
          const wrappedUrl = quote || '"';
          return `url(${wrappedUrl}${absoluteUrl}${wrappedUrl})`;
        } catch {
          return match;
        }
      });
    };

    let katexCss = '';
    Array.from(document.styleSheets || []).forEach((sheet) => {
      try {
        const href = String(sheet.href || '');
        const rules = Array.from(sheet.cssRules || []);
        if (!/katex/i.test(href) && !rules.some((rule) => /\.katex\b/.test(rule.cssText))) {
          return;
        }
        katexCss += `${rules.map((rule) => absolutizeCssUrls(rule.cssText, href)).join('\n')}\n`;
      } catch {
        // Ignore inaccessible stylesheets.
      }
    });

    this.katexPrintCss = katexCss;
    return katexCss;
  }

  async getCitationPrintHtml(markdown) {
    if (typeof window.isCitationDocument !== 'function' || !window.isCitationDocument(markdown)) {
      return null;
    }

    const previewMarkdown = typeof window.buildCitationPreviewMarkdown === 'function'
      ? window.buildCitationPreviewMarkdown(markdown)
      : markdown;
    let response;
    let payload = {};

    try {
      response = await fetch('/api/preview/citations/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, previewMarkdown })
      });
      payload = await response.json().catch(() => ({}));
    } catch (error) {
      console.warn('[print-preview] Citation preview unavailable, using rendered preview fallback.', error);
      return null;
    }

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        console.warn('[print-preview] Citation preview endpoint unavailable, using rendered preview fallback.', {
          status: response.status,
          error: payload?.error || null
        });
        return null;
      }
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    if (!payload?.isCitationDocument || !payload?.html) {
      return null;
    }

    const processedHtml = layoutPreprocessor.postProcessHTML(payload.html);
    return this.prepareHTMLForPrint(sanitizeRenderedHtml(processedHtml));
  }
  
  setupErrorSuppression() {
    // Wrap requestAnimationFrame to suppress cosmetic Paged.js errors.
    // Only active while the preview is visible to avoid swallowing unrelated errors.
    const self = this;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      return originalRAF.call(window, function(...args) {
        try {
          return callback(...args);
        } catch (error) {
          if (self.isActive && error.stack && error.stack.includes('paged.js')) {
            return;
          }
          throw error;
        }
      });
    };
    
    // Also suppress unhandled promise rejections from Paged.js
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.stack && event.reason.stack.includes('paged.js')) {
        event.preventDefault();
        console.warn('[Paged.js internal rejection suppressed]', event.reason);
      }
    });
  }

  canRenderInPlace() {
    const root = this.elements.printPreview;
    if (!root || !root.isConnected) {
      return false;
    }
    if (root.getClientRects().length === 0) {
      return false;
    }
    // On narrow viewports (mobile) paged.js would use the small container width
    // to determine page dimensions, producing pages with far too little content.
    // Force staging render so pages are laid out at full A4 width, then
    // fitToWidth() scales them visually for display.
    const scroll = this.elements.printPreviewScroll;
    if (scroll && scroll.clientWidth < 700) {
      return false;
    }
    return true;
  }

  createStagingRenderTarget() {
    const target = document.createElement('div');
    target.className = 'print-content print-preview-staging';
    target.setAttribute('aria-hidden', 'true');
    target.style.position = 'absolute';
    target.style.left = '-20000px';
    target.style.top = '0';
    target.style.width = '1400px';
    target.style.minHeight = '100vh';
    target.style.overflow = 'hidden';
    target.style.pointerEvents = 'none';
    target.style.visibility = 'hidden';
    document.body.appendChild(target);
    return target;
  }

  moveRenderedPreview(source, target) {
    if (!source || !target || source === target) {
      return;
    }

    target.innerHTML = '';
    while (source.firstChild) {
      target.appendChild(source.firstChild);
    }
  }

  init() {
    // Note: Toggle is now handled by app.js via togglePrintView()
    // This class is called via refresh() method
    
    // Print button
    this.elements.printBtn?.addEventListener('click', () => this.print());
    this.elements.printPdfBtn?.addEventListener('click', () => this.downloadPdf());
    
    // Page navigation
    this.elements.prevPageBtn?.addEventListener('click', () => this.prevPage());
    this.elements.nextPageBtn?.addEventListener('click', () => this.nextPage());
    this.elements.printPreviewScroll?.addEventListener('scroll', () => this.syncCurrentPageFromScroll());
    this.elements.printPreviewScroll?.addEventListener('wheel', (event) => {
      if (!this.isActive || !event.ctrlKey) {
        return;
      }
      event.preventDefault();
      this.adjustZoom(event.deltaY < 0 ? this.zoomStep : -this.zoomStep);
    }, { passive: false });
    window.addEventListener('resize', () => {
      if (!this.isActive) {
        return;
      }
      requestAnimationFrame(() => this.fitToWidth());
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isActive) {
        if (e.key === 'Escape') {
          this.hide();
        } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
          e.preventDefault();
          this.prevPage();
        } else if (e.key === 'ArrowRight' && e.ctrlKey) {
          e.preventDefault();
          this.nextPage();
        } else if (e.key === 'p' && e.ctrlKey) {
          e.preventDefault();
          this.print();
        }
      }
    });
  }

  async toggle() {
    if (this.isActive) {
      this.hide();
    } else {
      await this.show();
    }
  }

  async show() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Switch between preview and print preview bodies
    if (this.elements.previewBody) {
      this.elements.previewBody.style.display = 'none';
    }
    if (this.elements.printPreviewBody) {
      this.elements.printPreviewBody.style.display = 'flex';
    }

    // Let the browser commit the visibility/layout change before Paged.js reads
    // container bounds. Without this, export-triggered hidden renders can hit
    // null/unstable layout measurements inside Paged.js Layout().
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    
    // Generate print preview
    await this.generatePreview();
  }

  hide() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Switch back to normal preview
    if (this.elements.printPreviewBody) {
      this.elements.printPreviewBody.style.display = 'none';
    }
    if (this.elements.previewBody) {
      this.elements.previewBody.style.display = 'flex';
    }
    
    // Update button state
    this.elements.toggleBtn?.classList.remove('active');
    
    // Clear print preview
    if (this.elements.printPreview) {
      this.elements.printPreview.innerHTML = '';
    }
  }

  applyZoom() {
    const pages = this.elements.printPreview?.querySelector('.pagedjs_pages');
    if (!pages) {
      return;
    }

    pages.style.setProperty('--print-preview-scale', String(this.zoom));
    pages.style.zoom = String(this.zoom);
    this.updatePageInfo();
  }

  fitToWidth() {
    const scrollContainer = this.elements.printPreviewScroll;
    const firstPage = this.elements.printPreview?.querySelector('.pagedjs_page');
    if (!scrollContainer || !firstPage) {
      return;
    }

    const styles = window.getComputedStyle(scrollContainer);
    const horizontalPadding = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const availableWidth = scrollContainer.clientWidth - horizontalPadding - 12;
    const pageWidth = firstPage.offsetWidth;
    if (availableWidth <= 0 || pageWidth <= 0) {
      return;
    }

    const fittedZoom = Number(Math.min(this.maxZoom, Math.max(this.minZoom, availableWidth / pageWidth)).toFixed(2));
    if (!Number.isFinite(fittedZoom)) {
      return;
    }

    this.zoom = fittedZoom;
    this.applyZoom();
  }

  adjustZoom(delta) {
    const nextZoom = Number(Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom + delta)).toFixed(2));
    if (nextZoom === this.zoom) {
      return;
    }
    this.zoom = nextZoom;
    this.applyZoom();
    this.scrollToPage(this.currentPage);
  }

  syncCurrentPageFromScroll() {
    const pages = Array.from(this.elements.printPreview?.querySelectorAll('.pagedjs_page') || []);
    const scrollContainer = this.elements.printPreviewScroll;

    if (!pages.length || !scrollContainer) {
      return;
    }

    const viewportCenterX = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
    const viewportCenterY = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;

    let nearestPage = this.currentPage;
    let nearestDistance = Number.POSITIVE_INFINITY;

    pages.forEach((page, index) => {
      const pageCenterX = page.offsetLeft + page.offsetWidth / 2;
      const pageCenterY = page.offsetTop + page.offsetHeight / 2;
      const distance = Math.hypot(pageCenterX - viewportCenterX, pageCenterY - viewportCenterY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPage = index + 1;
      }
    });

    if (nearestPage !== this.currentPage) {
      this.currentPage = nearestPage;
      this.updatePageInfo();
    }
  }

  restoreSplitTableHeaders() {
    const root = this.elements.printPreview;
    if (!root) return;

    const originals = new Map();
    root.querySelectorAll('table[data-ref]').forEach((table) => {
      const ref = table.getAttribute('data-ref');
      const thead = table.querySelector('thead');
      if (ref && thead && !originals.has(ref)) {
        originals.set(ref, thead.cloneNode(true));
      }
    });

    root.querySelectorAll('table[data-split-from]').forEach((table) => {
      if (table.querySelector('thead')) return;

      const sourceRef = table.getAttribute('data-split-from');
      const header = sourceRef ? originals.get(sourceRef) : null;
      if (!header) return;

      table.insertBefore(header.cloneNode(true), table.firstChild);
    });
  }

  async generatePreview() {
    if (!this.elements.printPreview || !this.elements.preview) return;

    if (this.isRendering) {
      this.pendingRender = true;
      return;
    }

    this.isRendering = true;
    
    // Show loading state
    this.elements.printPreview.innerHTML = '<div class="loading-preview">Bereite Druckansicht vor...</div>';
    
    let renderTarget = this.elements.printPreview;
    let stagingTarget = null;

    try {
      const markdown = window.editor ? window.editor.getValue() : '';
      let printHTML = await this.getCitationPrintHtml(markdown);
      if (!printHTML) {
        const previewHTML = this.elements.preview.innerHTML;
        printHTML = this.prepareHTMLForPrint(previewHTML);
      }
      
      // Clear previous content/pages
      this.elements.printPreview.innerHTML = '';

      // Wait for Paged.js to be ready
      await this.waitForPagedJS();
      
      // Load layout configuration from document
      const layout = window.getEffectiveDocumentLayout
        ? window.getEffectiveDocumentLayout(markdown, { usePreviewPreset: true })
        : documentLayout.parseFromMarkdown(markdown);
      
      // Generate CSS from layout
      const layoutCSS = layoutCSSGenerator.generate(layout);
      const katexPrintCss = this.getKatexPrintCss();

      const debugPagedHeaders = window.localStorage?.getItem('debugPagedHeaders') === '1';

      if (debugPagedHeaders) {
        console.info('[print-preview] Header config:', layout.header);
        console.info('[print-preview] Footer config:', layout.footer);
        console.info('[print-preview] Layout CSS:\n', layoutCSS);
      }
      
      // Initialize Paged.js
      if (window.Paged && window.Paged.Previewer) {
        if (this.paged) {
          try { this.paged.chunker.removePages(); } catch (e) {}
          this.paged = null;
        }
        this.paged = new window.Paged.Previewer();

        if (!this.canRenderInPlace()) {
          stagingTarget = this.createStagingRenderTarget();
          renderTarget = stagingTarget;
        }
        
        const { styledHTML, polisherStylesheets, polisherCSS } = buildPagedRenderContract({
          printHTML,
          layoutCss: layoutCSS,
          katexCss: katexPrintCss,
          debugPagedHeaders,
          stylesheetUrl: window.location.href
        });
        await this.paged.preview(styledHTML, polisherStylesheets, renderTarget);
        if (stagingTarget) {
          this.moveRenderedPreview(stagingTarget, this.elements.printPreview);
        }
        this.restoreSplitTableHeaders();

        // Count pages within the print preview container
        this.totalPages = this.elements.printPreview?.querySelectorAll('.pagedjs_page').length || 0;
        this.currentPage = 1;

        const marginCount = this.elements.printPreview?.querySelectorAll(
          '.pagedjs_margin, .pagedjs_margin-top, .pagedjs_margin-bottom, ' +
          '.pagedjs_margin-left, .pagedjs_margin-right, .pagedjs_margin-top-left, ' +
          '.pagedjs_margin-top-center, .pagedjs_margin-top-right, ' +
          '.pagedjs_margin-bottom-left, .pagedjs_margin-bottom-center, .pagedjs_margin-bottom-right, ' +
          '.pagedjs_margin-left-top, .pagedjs_margin-left-middle, .pagedjs_margin-left-bottom, ' +
          '.pagedjs_margin-right-top, .pagedjs_margin-right-middle, .pagedjs_margin-right-bottom, ' +
          '.pagedjs_margin-content'
        ).length || 0;

        if (debugPagedHeaders) {
          console.info('[print-preview] Margin box count:', marginCount);
        }

        // The Paged.js polisher handles @top-* / @bottom-* natively via CSS counters.
        // Only run the JS fallback when the polisher CSS does NOT include margin-box rules
        // — otherwise both mechanisms run simultaneously and page numbers appear twice.
        const polisherHandlesMargins = /@(top|bottom)-/.test(polisherCSS || '');
        if ((layout.header.enabled || layout.footer.enabled) && !polisherHandlesMargins) {
          this.applyMarginBoxFallback(layout, debugPagedHeaders);
        }

        const warning = this.elements.printPreview?.querySelector('.print-preview-warning');
        if ((layout.header.enabled || layout.footer.enabled) && marginCount === 0) {
          if (!warning) {
            const warningEl = document.createElement('div');
            warningEl.className = 'print-preview-warning';
            warningEl.textContent = 'Kopf-/Fusszeilen werden nicht gerendert. Aktiviere Debug-Mode oder pruefe Paged.js/CSS.';
            this.elements.printPreview.prepend(warningEl);
          }
        } else if (warning) {
          warning.remove();
        }
        
        this.fitToWidth();
        
        // Scroll to first page
        this.scrollToPage(1);
      } else {
        throw new Error('Paged.js Previewer nicht verfuegbar');
      }
    } catch (error) {
      console.error('Print preview generation failed:', error);
      this.elements.printPreview.innerHTML = `
        <div class="error-preview">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <p>Fehler beim Erstellen der Druckansicht</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    } finally {
      stagingTarget?.remove();
      this.isRendering = false;
      if (this.pendingRender) {
        this.pendingRender = false;
        await this.generatePreview();
      }
    }
  }

  applyMarginBoxFallback(layout, debugPagedHeaders) {
    const pages = Array.from(this.elements.printPreview?.querySelectorAll('.pagedjs_page') || []);
    if (!pages.length) return;

    const firstHeading = this.elements.printPreview?.querySelector('h1, h2, h3, h4, h5, h6');
    const docTitle = firstHeading ? firstHeading.textContent.trim() : document.title || '';

    pages.forEach((page, index) => {
      const pageNumber = index + 1;
      const totalPages = pages.length;

      const headerVisible = layout.header.enabled && !(layout.header.hideOnFirstPage && pageNumber === 1);
      const footerVisible = layout.footer.enabled && !(layout.footer.hideOnFirstPage && pageNumber === 1);

      if (headerVisible) {
        this.fillMarginBox(page, 'top-left', layout.header.left, layout.header, pageNumber, totalPages, docTitle);
        this.fillMarginBox(page, 'top-center', layout.header.center, layout.header, pageNumber, totalPages, docTitle);
        this.fillMarginBox(page, 'top-right', layout.header.right, layout.header, pageNumber, totalPages, docTitle);
      }

      if (footerVisible) {
        this.fillMarginBox(page, 'bottom-left', layout.footer.left, layout.footer, pageNumber, totalPages, docTitle);
        this.fillMarginBox(page, 'bottom-center', layout.footer.center, layout.footer, pageNumber, totalPages, docTitle);
        this.fillMarginBox(page, 'bottom-right', layout.footer.right, layout.footer, pageNumber, totalPages, docTitle);
      }

      this.applyMarginBoxPadding(page, layout);
    });

    if (debugPagedHeaders) {
      console.info('[print-preview] Applied margin box fallback');
    }
  }

  fillMarginBox(page, position, template, style, pageNumber, totalPages, docTitle) {
    if (!template) return;

    const selector = `.pagedjs_margin-${position}`;
    const box = page.querySelector(selector);
    if (!box) return;

    // If the entire margin box already has text content (e.g. from Paged.js polisher
    // processing @page margin rules), skip to avoid duplicating page numbers.
    if (box.textContent?.trim()) return;

    const content = box.querySelector('.pagedjs_margin-content') || box;
    if (!content) return;

    const sectionHeading = page.querySelector('.pagedjs_pagebox h1, .pagedjs_pagebox h2, .pagedjs_pagebox h3');
    const section = sectionHeading ? sectionHeading.textContent.trim() : '';

    const text = template
      .replace(/{page}/g, String(pageNumber))
      .replace(/{pages}/g, String(totalPages))
      .replace(/{doc-title}/g, docTitle)
      .replace(/{title}/g, docTitle)
      .replace(/{section}/g, section)
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{author}/g, '');

    content.textContent = text;
    if (style?.fontSize) {
      content.style.fontSize = style.fontSize;
    }
    if (style?.color) {
      content.style.color = style.color;
    }
  }

  applyMarginBoxPadding(page, layout) {
    const headerOffset = layout.header?.offset || '0';
    const footerOffset = layout.footer?.offset || '0';

    if (headerOffset !== '0') {
      page
        .querySelectorAll('.pagedjs_margin-top .pagedjs_margin-content')
        .forEach((el) => {
          el.style.paddingTop = headerOffset;
        });
    }

    if (footerOffset !== '0') {
      page
        .querySelectorAll('.pagedjs_margin-bottom .pagedjs_margin-content')
        .forEach((el) => {
          el.style.paddingBottom = footerOffset;
        });
    }
  }

  prepareHTMLForPrint(html) {
    // Clone and transform HTML for print - use textContent and serialize to string
    // to completely break any DOM references that might confuse Paged.js
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove scripts and potentially problematic elements
    temp.querySelectorAll('script, iframe, object, embed').forEach(el => el.remove());
    
    // Simplify Mermaid diagrams - convert to static images if possible
    const mermaidDivs = temp.querySelectorAll('.mermaid');
    mermaidDivs.forEach(div => {
      const svg = div.querySelector('svg');
      if (svg) {
        // Clone the SVG to break references
        const svgClone = svg.cloneNode(true);
        svgClone.style.maxWidth = '100%';
        svgClone.style.height = 'auto';
        svgClone.removeAttribute('id');
        svgClone.removeAttribute('data-processed');
        
        // Remove interactive attributes
        svgClone.querySelectorAll('*').forEach(el => {
          el.removeAttribute('data-id');
          el.removeAttribute('data-reactroot');
        });
        
        div.innerHTML = '';
        div.appendChild(svgClone);
      }
    });
    
    // Re-apply layout inline styles stripped by the preview HTML sanitizer.
    // The sanitizer (sanitizeRenderedHtml) removes all style="" attributes for
    // security. Column gap and flow-guard properties must be re-set here since
    // they are read from data-* attributes (which survive sanitization).
    layoutPreprocessor.applyColumnStyles(temp);
    layoutPreprocessor.applyColumnsGuard(temp);

    // Get the HTML as a string to break all DOM references
    const cleanHTML = `<div class="print-content">${temp.innerHTML}</div>`;
    
    // Return clean HTML without wrapper - Paged.js will create its own structure
    return cleanHTML;
  }

  waitForPagedJS() {
    return new Promise((resolve, reject) => {
      if (window.Paged && window.Paged.Previewer) {
        resolve();
        return;
      }
      
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      
      const interval = setInterval(() => {
        attempts++;
        if (window.Paged && window.Paged.Previewer) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Paged.js konnte nicht geladen werden'));
        }
      }, 100);
    });
  }

  async print() {
    if (!this.isActive) {
      await this.show();
      // Wait a bit for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Get the rendered Paged.js content
    const printContent = this.elements.printPreview;
    if (!printContent || !printContent.innerHTML.trim()) {
      alert('Bitte warten Sie, bis die Seitenvorschau vollständig geladen ist.');
      return;
    }
    
    // Get current layout to determine if headers/footers should be shown
    const markdown = window.editor ? window.editor.getValue() : '';
    const layout = window.getEffectiveDocumentLayout
      ? window.getEffectiveDocumentLayout(markdown, { usePreviewPreset: true })
      : documentLayout.parseFromMarkdown(markdown);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.');
      return;
    }
    
    // Generate CSS to show/hide margin boxes based on layout config
    let marginBoxCSS = '';
    if (!layout.header.enabled && !layout.footer.enabled) {
      marginBoxCSS = `
          /* Hide all margin boxes when headers/footers disabled */
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
          .pagedjs_margin-bottom-right {
            display: none !important;
          }`;
    } else {
      // Selectively hide based on what's enabled
      if (!layout.header.enabled) {
        marginBoxCSS += `
          .pagedjs_margin-top,
          .pagedjs_margin-top-left,
          .pagedjs_margin-top-center,
          .pagedjs_margin-top-right {
            display: none !important;
          }`;
      }
      if (!layout.footer.enabled) {
        marginBoxCSS += `
          .pagedjs_margin-bottom,
          .pagedjs_margin-bottom-left,
          .pagedjs_margin-bottom-center,
          .pagedjs_margin-bottom-right {
            display: none !important;
          }`;
      }
    }
    
    // Write the print content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Drucken</title>
        <style>
          @page {
            size: ${layout.page.size} ${layout.page.orientation};
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .pagedjs_pages {
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .pagedjs_page {
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always;
            box-shadow: none !important;
            width: 100% !important;
            height: 100% !important;
          }
          
          .pagedjs_page:last-child {
            page-break-after: auto;
          }
          ${marginBoxCSS}
          
          @media print {
            html, body {
              margin: 0;
              padding: 0;
            }
            
            .pagedjs_page {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              page-break-after: always;
            }
            
            .pagedjs_page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  }

  async downloadPdf() {
    if (typeof window.exportFile === "function") {
      const ok = await window.exportFile("pdf");
      if (ok) return;
    }
    await this.print();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToPage(this.currentPage);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToPage(this.currentPage);
    }
  }

  scrollToPage(pageNum) {
    const pages = this.elements.printPreview?.querySelectorAll('.pagedjs_page');
    const scrollContainer = this.elements.printPreviewScroll;
    
    if (pages && pages[pageNum - 1] && scrollContainer) {
      const page = pages[pageNum - 1];
      const containerHeight = scrollContainer.clientHeight;
      const containerWidth = scrollContainer.clientWidth;
      const pageTop = page.offsetTop;
      const pageLeft = page.offsetLeft;
      const pageHeight = page.offsetHeight;
      const pageWidth = page.offsetWidth;
      
      // Scroll so the page is centered in the view
      const targetScroll = pageTop - (containerHeight - pageHeight) / 2;
      const targetScrollLeft = pageLeft - (containerWidth - pageWidth) / 2;
      
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
      
      this.currentPage = pageNum;
      this.updatePageInfo();
    }
  }

  updatePageInfo() {
    if (this.elements.pageInfo) {
      this.elements.pageInfo.textContent = `Seite ${this.currentPage} / ${this.totalPages} · ${Math.round(this.zoom * 100)}%`;
    }
    
    // Update button states
    if (this.elements.prevPageBtn) {
      this.elements.prevPageBtn.disabled = this.currentPage <= 1;
    }
    if (this.elements.nextPageBtn) {
      this.elements.nextPageBtn.disabled = this.currentPage >= this.totalPages;
    }
  }

  // Public method to refresh preview (called when content changes)
  async refresh() {
    if (this.isActive) {
      await this.generatePreview();
    }
  }
}

// Export singleton instance
export const printPreview = new PrintPreview();
