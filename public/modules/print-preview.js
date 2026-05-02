/**
 * Print Preview Module
 * Handles Paged.js print layout preview and PDF generation
 */

import { documentLayout } from './document-layout.js';
import { layoutCSSGenerator } from './layout-css-generator.js';
import { layoutPreprocessor } from './layout-preprocessor.js';

export class PrintPreview {
  constructor() {
    this.isActive = false;
    this.paged = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.isRendering = false;
    this.pendingRender = false;
    this.sourceElement = null; // Store reference to source element
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
  
  setupErrorSuppression() {
    // Wrap requestAnimationFrame to catch Paged.js errors
    // These errors don't affect print preview functionality but pollute the console
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      return originalRAF.call(window, function(...args) {
        try {
          return callback(...args);
        } catch (error) {
          // Check if error is from Paged.js
          if (error.stack && error.stack.includes('paged.js')) {
            // Suppress - these are cosmetic errors from Paged.js's resize handlers
            // They occur when Paged.js tries to access elements during async operations
            // but don't affect the actual print preview output
            return;
          }
          // Re-throw other errors
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

  init() {
    // Note: Toggle is now handled by app.js via togglePrintView()
    // This class is called via refresh() method
    
    // Print button
    this.elements.printBtn?.addEventListener('click', () => this.print());
    this.elements.printPdfBtn?.addEventListener('click', () => this.downloadPdf());
    
    // Page navigation
    this.elements.prevPageBtn?.addEventListener('click', () => this.prevPage());
    this.elements.nextPageBtn?.addEventListener('click', () => this.nextPage());
    
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
    
    // Clean up source element
    if (this.sourceElement) {
      this.sourceElement.remove();
      this.sourceElement = null;
    }
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
    
    try {
      // Get current preview HTML
      const previewHTML = this.elements.preview.innerHTML;
      
      // Apply print-specific transformations
      const printHTML = this.prepareHTMLForPrint(previewHTML);
      
      // Clear previous content/pages
      this.elements.printPreview.innerHTML = '';

      // Clean up old source element
      if (this.sourceElement) {
        this.sourceElement.remove();
        this.sourceElement = null;
      }

      // No need for offscreen element - pass HTML directly to Paged.js
      
      // Wait for Paged.js to be ready
      await this.waitForPagedJS();
      
      // Load layout configuration from document
      const markdown = window.editor ? window.editor.getValue() : '';
      const layout = documentLayout.parseFromMarkdown(markdown);
      
      // Generate CSS from layout
      const layoutCSS = layoutCSSGenerator.generate(layout);
      const debugPagedHeaders = window.localStorage?.getItem('debugPagedHeaders') === '1';

      if (debugPagedHeaders) {
        console.info('[print-preview] Header config:', layout.header);
        console.info('[print-preview] Footer config:', layout.footer);
        console.info('[print-preview] Layout CSS:\n', layoutCSS);
      }
      
      // Initialize Paged.js
      if (window.Paged && window.Paged.Previewer) {
        this.paged = new window.Paged.Previewer();
        
        // Add inline styles with dynamic layout CSS
        const debugCSS = debugPagedHeaders
          ? `
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

            @page {
              @top-center { content: "DEBUG HEADER"; }
              @bottom-center { content: "DEBUG FOOTER"; }
            }
          `
          : '';

        const styledHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              ${layoutCSS}

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
              
              /* Layout command styling */
              .page-break {
                break-after: page;
                page-break-after: always;
              }
              
              .column-break {
                break-after: column;
                column-break-after: always;
              }
              
              .md-columns {
                /* Styles applied via inline styles in preprocessing */
              }
              
              .section-break[data-type="new-page"] {
                break-before: page;
              }
              
              .section-break[data-type="odd-page"],
              .section-break[data-type="right"] {
                break-before: right;
              }
              
              .section-break[data-type="even-page"],
              .section-break[data-type="left"] {
                break-before: left;
              }
            </style>
          </head>
          <body>
            ${printHTML}
          </body>
          </html>
        `;
        
        // Render pages
        await this.paged.preview(styledHTML, [], this.elements.printPreview);
        
        // Clean up source element after rendering
        if (this.sourceElement) {
          this.sourceElement.remove();
          this.sourceElement = null;
        }
        
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

        if (layout.header.enabled || layout.footer.enabled) {
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
        
        this.updatePageInfo();
        
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

    const content = box.querySelector('.pagedjs_margin-content') || box;
    if (!content || (content.textContent && content.textContent.trim())) return;

    const sectionHeading = page.querySelector('.pagedjs_pagebox h1, .pagedjs_pagebox h2, .pagedjs_pagebox h3');
    const section = sectionHeading ? sectionHeading.textContent.trim() : '';

    const text = template
      .replace(/{page}/g, String(pageNumber))
      .replace(/{pages}/g, String(totalPages))
      .replace(/{doc-title}/g, docTitle)
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
    
    // Apply layout preprocessing post-processing (converts layout markers to proper styles)
    layoutPreprocessor.postProcessHTML(temp);
    
    // Get the HTML as a string to break all DOM references
    const cleanHTML = temp.innerHTML;
    
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
    const layout = documentLayout.parseFromMarkdown(markdown);
    
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
            size: A4;
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
            ${marginBoxCSS}
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
      const containerTop = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const pageTop = page.offsetTop;
      const pageHeight = page.offsetHeight;
      
      // Scroll so the page is centered in the view
      const targetScroll = pageTop - (containerHeight - pageHeight) / 2;
      
      scrollContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
      
      this.currentPage = pageNum;
      this.updatePageInfo();
    }
  }

  updatePageInfo() {
    if (this.elements.pageInfo) {
      this.elements.pageInfo.textContent = `Seite ${this.currentPage} / ${this.totalPages}`;
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
