/**
 * Document Layout Module
 * Manages layout configuration from YAML frontmatter
 */

export class DocumentLayout {
  constructor() {
    this.currentLayout = this.getDefaultLayout();
  }

  /**
   * Get default layout configuration
   */
  getDefaultLayout() {
    return {
      page: {
        size: 'A4',
        orientation: 'portrait',
        margins: {
          top: '25mm',
          right: '25mm',
          bottom: '25mm',
          left: '25mm',
          firstPageTop: '25mm'
        },
        bindingOffset: '0',
        mirrorMargins: false
      },
      
      titlePage: {
        enabled: false,
        title: '',
        subtitle: '',
        author: '',
        date: '{today}',
        institution: '',
        logo: '',
        pageBreakAfter: true
      },
      
      columns: {
        enabled: false,
        count: 1,
        gap: '20pt',
        rule: {
          enabled: false,
          width: '1pt',
          color: '#cccccc'
        }
      },
      
      header: {
        enabled: false,
        hideOnFirstPage: true,
        left: '',
        center: '',
        right: '',
        fontSize: '9pt',
        color: '#666666',
        offset: '6mm'
      },
      
      footer: {
        enabled: true,
        hideOnFirstPage: true,
        left: '',
        center: '{page}',
        right: '',
        fontSize: '9pt',
        color: '#999999',
        offset: '6mm'
      },
      
      indexes: {
        tableOfContents: {
          enabled: true,
          title: 'Inhaltsverzeichnis',
          depth: 3,
          pageBreakAfter: true
        },
        listOfFigures: {
          enabled: false,
          title: 'Abbildungsverzeichnis',
          pageBreakAfter: true
        },
        listOfTables: {
          enabled: false,
          title: 'Tabellenverzeichnis',
          pageBreakAfter: true
        }
      },
      
      numbering: {
        enabled: true,
        resetPerChapter: false,
        tables: {
          enabled: true,
          prefix: 'Tabelle',
          format: '{number}'
        },
        figures: {
          enabled: true,
          prefix: 'Abbildung',
          format: '{number}'
        },
        headings: {
          enabled: false,
          depth: 3,
          style: 'decimal',
          h1Prefix: ''
        }
      },
      
      typography: {
        body: {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '10.5pt',
          lineHeight: 1.42,
          textAlign: 'justify',
          color: '#1a1a1a',
          hyphenation: true,
          paragraph: {
            firstLineIndent: '0',
            spacing: '8pt'
          }
        },
        headings: {
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#000000',
          h1: { size: '21pt', marginTop: '0', marginBottom: '12pt', weight: 700 },
          h2: { size: '16pt', marginTop: '16pt', marginBottom: '8pt', weight: 600 },
          h3: { size: '13pt', marginTop: '12pt', marginBottom: '6pt', weight: 600 },
          h4: { size: '11.5pt', marginTop: '10pt', marginBottom: '5pt', weight: 600 },
          h5: { size: '10.5pt', marginTop: '8pt', marginBottom: '4pt', weight: 600 },
          h6: { size: '10.5pt', marginTop: '8pt', marginBottom: '4pt', weight: 600 }
        },
        code: {
          inline: '9.5pt',
          block: {
            fontSize: '9pt',
            lineHeight: 1.4,
            background: '#e8e8e8',
            border: '#c0c0c0'
          }
        },
        links: {
          color: '#000000',
          showUrls: false
        },
        blockquote: {
          color: '#555555',
          borderColor: '#dddddd'
        }
      },
      
      tableLayouts: {
        default: {
          fontSize: '10pt',
          cellPadding: '8pt',
          border: {
            width: '1pt',
            color: '#cccccc'
          },
          margin: {
            top: '18pt',
            bottom: '18pt'
          },
          header: {
            background: '#f0f0f0',
            textColor: '#000000',
            fontWeight: 600,
            textAlign: 'left',
            repeatOnPages: true
          },
          body: {
            textAlign: 'left',
            zebraStriping: false,
            evenRowBackground: '#ffffff',
            oddRowBackground: '#f9f9f9'
          },
          footer: {
            background: '#f0f0f0',
            fontWeight: 600
          },
          caption: {
            enabled: true,
            position: 'top',
            fontSize: '9pt',
            fontStyle: 'italic',
            color: '#666666',
            marginTop: '0',
            marginBottom: '6pt'
          }
        },
        compact: {
          fontSize: '10pt',
          cellPadding: '4pt',
          border: {
            width: '0.5pt',
            color: '#dddddd'
          },
          margin: {
            top: '12pt',
            bottom: '12pt'
          },
          header: {
            background: '#e8e8e8',
            textColor: '#000000',
            fontWeight: 600,
            textAlign: 'left',
            repeatOnPages: true
          },
          body: {
            textAlign: 'left',
            zebraStriping: true,
            evenRowBackground: '#ffffff',
            oddRowBackground: '#f9f9f9'
          },
          footer: {
            background: '#e8e8e8',
            fontWeight: 600
          },
          caption: {
            enabled: true,
            position: 'top',
            fontSize: '8pt',
            fontStyle: 'italic',
            color: '#666666',
            marginTop: '0',
            marginBottom: '6pt'
          }
        },
        scientific: {
          fontSize: '10pt',
          cellPadding: '5pt 8pt',
          border: {
            width: '0',
            color: 'transparent'
          },
          borderTop: {
            width: '1.5pt',
            color: '#000000'
          },
          borderBottom: {
            width: '1.5pt',
            color: '#000000'
          },
          headerBorderBottom: {
            width: '0.75pt',
            color: '#000000'
          },
          margin: {
            top: '18pt',
            bottom: '18pt'
          },
          header: {
            background: 'transparent',
            textColor: '#000000',
            fontWeight: 600,
            textAlign: 'left',
            repeatOnPages: true
          },
          body: {
            textAlign: 'left',
            zebraStriping: false,
            evenRowBackground: 'transparent',
            oddRowBackground: 'transparent'
          },
          footer: {
            background: 'transparent',
            fontWeight: 400
          },
          caption: {
            enabled: true,
            position: 'top',
            fontSize: '9pt',
            fontStyle: 'normal',
            color: '#000000',
            marginTop: '0',
            marginBottom: '6pt'
          }
        }
      },
      
      images: {
        maxWidth: '100%',
        alignment: 'center',
        margin: {
          top: '18pt',
          bottom: '18pt'
        },
        caption: {
          enabled: true,
          position: 'bottom',
          fontSize: '9pt',
          fontStyle: 'italic',
          color: '#666666',
          marginTop: '8pt'
        }
      },
      
      spacing: {
        paragraph: '12pt',
        list: '18pt',
        listIndent: '1.5em',
        blockquote: '18pt',
        codeBlock: '12pt',
        horizontalRule: '24pt',
        formula: '18pt',
        admonition: '18pt'
      },
      
      lists: {
        unordered: {
          marker: '•',
          indent: '1.5em'
        },
        ordered: {
          style: 'decimal',
          format: '{number}.'
        }
      }
    };
  }

  normalizeLayoutShorthand(parsed) {
    if (!this.isObject(parsed)) {
      return parsed;
    }

    const normalized = { ...parsed };

    if (typeof parsed.page === 'string') {
      normalized.page = {
        size: parsed.page
      };
    }

    if (Array.isArray(parsed.margin) && parsed.margin.length >= 4) {
      const [top, right, bottom, left] = parsed.margin;
      normalized.page = this.deepMerge(normalized.page || {}, {
        margins: {
          top,
          right,
          bottom,
          left,
          firstPageTop: top
        }
      });
    }

    if (parsed['font-size'] !== undefined) {
      normalized.typography = this.deepMerge(normalized.typography || {}, {
        body: {
          fontSize: parsed['font-size']
        }
      });
    }

    if (parsed['line-height'] !== undefined) {
      normalized.typography = this.deepMerge(normalized.typography || {}, {
        body: {
          lineHeight: parsed['line-height']
        }
      });
    }

    if (typeof parsed.columns === 'number') {
      normalized.columns = {
        enabled: parsed.columns > 1,
        count: parsed.columns
      };
    }

    if (typeof parsed.header === 'string') {
      normalized.header = {
        enabled: true,
        center: parsed.header
      };
    }

    if (typeof parsed.footer === 'string') {
      normalized.footer = {
        enabled: true,
        center: parsed.footer
      };
    }

    delete normalized.margin;
    delete normalized['font-size'];
    delete normalized['line-height'];
    delete normalized['table-style'];
    delete normalized['figure-style'];

    return normalized;
  }

  /**
   * Parse layout from markdown code block
   */
  parseFromMarkdown(markdown) {
    try {
      if (!window.jsyaml) {
        console.error('js-yaml not loaded');
        this.currentLayout = this.getDefaultLayout();
        return this.currentLayout;
      }

      const matches = Array.from(markdown.matchAll(/```layout\s*\n([\s\S]*?)\n```/g));
      const lastMatch = matches[matches.length - 1];
      if (lastMatch && lastMatch[1]) {
        const parsed = jsyaml.load(lastMatch[1]);
        if (parsed) {
          // Deep merge with defaults
          const normalized = this.normalizeLayoutShorthand(parsed);
          this.currentLayout = this.deepMerge(this.getDefaultLayout(), normalized);
          return this.currentLayout;
        }
      }
    } catch (error) {
      console.error('Error parsing layout from code block:', error);
    }
    
    // Return defaults if parsing fails
    this.currentLayout = this.getDefaultLayout();
    return this.currentLayout;
  }

  /**
   * Update layout in markdown code block (append at end)
   */
  updateInMarkdown(markdown, layout) {
    try {
      if (!window.jsyaml) {
        console.error('js-yaml not loaded');
        return markdown;
      }

      const cleaned = markdown.replace(/```layout\s*\n[\s\S]*?\n```\s*$/g, '').trimEnd();
      const yaml = jsyaml.dump(layout, {
        indent: 2,
        lineWidth: 80,
        noRefs: true
      }).trim();

      const separator = cleaned ? '\n\n' : '';
      return cleaned + separator + '```layout\n' + yaml + '\n```\n';
    } catch (error) {
      console.error('Error updating layout in code block:', error);
      return markdown;
    }
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Get current layout
   */
  getLayout() {
    return this.currentLayout;
  }

  /**
   * Set current layout
   */
  setLayout(layout) {
    this.currentLayout = layout;
  }
}

// Export singleton
export const documentLayout = new DocumentLayout();
