import MarkdownIt from "https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm";
import markdownItTaskLists from "https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2.1.1/+esm";
import markdownItMultimdTable from "https://cdn.jsdelivr.net/npm/markdown-it-multimd-table@4.2.3/+esm";
import { Markmap } from "https://esm.sh/markmap-view@0.18.9";
import markdownItFootnote from "https://cdn.jsdelivr.net/npm/markdown-it-footnote@3.0.3/+esm";
import markdownItDeflist from "https://cdn.jsdelivr.net/npm/markdown-it-deflist@2.1.0/+esm";
import markdownItContainer from "https://cdn.jsdelivr.net/npm/markdown-it-container@3.0.0/+esm";
import markdownItKatex from "https://cdn.jsdelivr.net/npm/markdown-it-katex@2.0.3/+esm";
import mermaid from "https://esm.sh/mermaid@11.4.0";
import markdownItEmoji from "https://cdn.jsdelivr.net/npm/markdown-it-emoji@3.0.0/+esm";
import markdownItSub from "https://cdn.jsdelivr.net/npm/markdown-it-sub@2.0.0/+esm";
import markdownItSup from "https://cdn.jsdelivr.net/npm/markdown-it-sup@2.0.0/+esm";
import markdownItMark from "https://cdn.jsdelivr.net/npm/markdown-it-mark@3.0.1/+esm";
import markdownItAbbr from "https://cdn.jsdelivr.net/npm/markdown-it-abbr@1.0.4/+esm";
import markdownItAnchor from "https://cdn.jsdelivr.net/npm/markdown-it-anchor@8.6.7/+esm";
import markdownItToc from "https://cdn.jsdelivr.net/npm/markdown-it-toc-done-right@4.2.0/+esm";
import markdownItAttrs from "https://cdn.jsdelivr.net/npm/markdown-it-attrs@4.1.6/+esm";
import JSZip from "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm";
import { printPreview } from "./modules/print-preview.js";
import { AIChat } from "./modules/ai-chat.js";
import { documentLayout } from "./modules/document-layout.js";
import { layoutCSSGenerator } from "./modules/layout-css-generator.js";
import { ImageManager } from "./modules/image-manager.js";
import { CollabManager } from "./modules/collab.js";
import { PresenceManager } from "./modules/presence.js";
import { PasswordDialog } from "./modules/password-dialog.js";

const defaultSettings = {
  gfm: true,
  mermaid: true,
  math: true,
  footnotes: true,
  deflist: true,
  admonitions: true,
  emoji: true,
  sub: true,
  sup: true,
  mark: true,
  abbr: true,
  toc: true,
  attrs: true,
  typographer: true,
  columns: true,
  breaks: true,
  lineNumbers: true,
  lineWrapping: true,
  syntaxHighlight: true,
  hideMermaidBlocks: false,
  showStartupTips: true,
  showToasts: true,
  autoSync: false,
  syncScroll: true,
  hideLayoutBlock: false,
  allowDocumentLayouts: true,
  documentLayoutDefaultPreset: "scientific"
};

const settingsKey = "md-settings";
const themeKey = "md-theme";
const previewPresetKey = "md-preview-preset";
const customCssKey = "md-custom-css";
const layoutEditorKey = "md-layout-editor";
const localeKey = "md-locale";

const normalizePasteId = (value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return value;
  const asNumber = Number(trimmed);
  return Number.isNaN(asNumber) ? value : asNumber;
};

const normalizeWorkspaces = (workspaces) => {
  Object.values(workspaces).forEach((workspace) => {
    if (typeof workspace.pinned !== "boolean") {
      workspace.pinned = false;
    }
    if (Array.isArray(workspace.pastes)) {
      workspace.pastes = workspace.pastes.map(normalizePasteId);
    }
  });
  return workspaces;
};

const loadSettings = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey));
    return { ...defaultSettings, ...(stored || {}) };
  } catch {
    return { ...defaultSettings };
  }
};

const saveSettings = (next) => {
  localStorage.setItem(settingsKey, JSON.stringify(next));
};

let activeSettings = loadSettings();
let md = null;
let mermaidReady = false;
let previewPreset = localStorage.getItem(previewPresetKey) || "scientific";
let uiTheme = "twentyone"; // Fixed to twentyone style only
const previewPresetValues = ["scientific", "compact", "literary", "document"];
const layoutPresetCssTemplate = `/* Layout Presets (preview styles) */
.preview-content.preset-compact {
  font-size: 13px;
  line-height: 1.45;
}

.preview-content.preset-scientific {
  font-family: "Source Serif 4", "Times New Roman", serif;
  line-height: 1.6;
  font-size: 15px;
}

.preview-content.preset-literary {
  font-family: "Georgia", "Times New Roman", serif;
  line-height: 1.8;
  font-size: 16px;
}
`;
const scientificPresetCss = `
.preset-scientific h1, .preset-scientific h2, .preset-scientific h3,
.preset-scientific h4, .preset-scientific h5, .preset-scientific h6 {
  color: #000000 !important;
}

.preset-scientific .mermaid {
  filter: grayscale(100%) contrast(1.2);
}
`;

const getBaseDocumentLayoutForPreset = (preset = "scientific") => {
  const layout = documentLayout.getDefaultLayout();
  const selected = (preset || "scientific").toLowerCase();

  if (selected === "compact") {
    layout.page.margins = {
      ...layout.page.margins,
      top: "1.3cm",
      right: "1.2cm",
      bottom: "1.2cm",
      left: "1.3cm",
      firstPageTop: "1.6cm"
    };
    layout.typography.body = {
      ...layout.typography.body,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11pt',
      lineHeight: 1.1,
      textAlign: 'left',
      paragraph: {
        ...layout.typography.body.paragraph,
        firstLineIndent: '0',
        spacing: '3pt'
      }
    };
    layout.typography.headings = {
      ...layout.typography.headings,
      fontFamily: 'Arial, Helvetica, sans-serif',
      h1: { ...layout.typography.headings.h1, size: '16pt', marginTop: '0', marginBottom: '7pt', weight: 700 },
      h2: { ...layout.typography.headings.h2, size: '12.5pt', marginTop: '9pt', marginBottom: '4pt', weight: 700 },
      h3: { ...layout.typography.headings.h3, size: '10.5pt', marginTop: '6pt', marginBottom: '3pt', weight: 700 },
      h4: { ...layout.typography.headings.h4, size: '10pt', marginTop: '5pt', marginBottom: '3pt', weight: 700 }
    };
    layout.spacing = {
      ...layout.spacing,
      paragraph: '3pt',
      list: '2pt',
      listIndent: '1.25em',
      blockquote: '5pt',
      codeBlock: '5pt',
      horizontalRule: '8pt',
      formula: '5pt',
      admonition: '5pt'
    };
    layout.footer = {
      ...layout.footer,
      enabled: true,
      center: '{page}/{pages}'
    };
    layout.tableLayouts.compact = {
      ...layout.tableLayouts.compact,
      fontSize: '10pt'
    };
    layout.tableLayouts.default = layout.tableLayouts.compact;
    return layout;
  }

  if (selected === "literary") {
    layout.typography.body = {
      ...layout.typography.body,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '12pt',
      lineHeight: 1.7,
      textAlign: 'justify',
      paragraph: {
        ...layout.typography.body.paragraph,
        firstLineIndent: '12pt',
        spacing: '0pt'
      }
    };
    layout.typography.headings = {
      ...layout.typography.headings,
      fontFamily: 'Georgia, "Times New Roman", serif',
      h1: { ...layout.typography.headings.h1, size: '26pt', marginBottom: '20pt' },
      h2: { ...layout.typography.headings.h2, size: '18pt', marginTop: '22pt', marginBottom: '10pt' }
    };
    layout.page.margins = {
      ...layout.page.margins,
      top: '2.8cm',
      right: '2.4cm',
      bottom: '2.4cm',
      left: '2.8cm',
      firstPageTop: '4cm'
    };
    return layout;
  }

  layout.tableLayouts.default = layout.tableLayouts.scientific || layout.tableLayouts.default;
  return layout;
};

let customCss = localStorage.getItem(customCssKey) || "";
if (!customCss.trim()) {
  customCss = layoutPresetCssTemplate;
  localStorage.setItem(customCssKey, customCss);
}

const buildLayoutCssTemplate = (custom) => {
  const header = "/* Layout Presets (preview styles) */";
  const base = layoutPresetCssTemplate.trim();
  const customBlock = (custom || "").trim();
  if (customBlock.includes(header)) return customBlock;
  if (!customBlock) return `${base}\n\n/* Custom CSS */\n`;
  return `${base}\n\n/* Custom CSS */\n${customBlock}`;
};

const getDefaultLayoutEditorState = () => ({
  elements: {},
  page: {},
  table: {},
  tablesByPreset: {}
});

const normalizeTableState = (table) => {
  if (!table || typeof table !== "object") return {};
  const normalized = { ...table };
  if (typeof normalized.cellPadding === "string") {
    normalized.cell = {
      ...(normalized.cell || {}),
      padding: {
        top: normalized.cellPadding,
        right: normalized.cellPadding,
        bottom: normalized.cellPadding,
        left: normalized.cellPadding
      }
    };
  } else if (normalized.cellPadding && typeof normalized.cellPadding === "object") {
    normalized.cell = {
      ...(normalized.cell || {}),
      padding: { ...normalized.cellPadding }
    };
  }
  if (normalized.headerBg) {
    normalized.header = { ...normalized.header, background: normalized.headerBg };
  }
  if (normalized.stripeColor) {
    normalized.altRow = { ...normalized.altRow, background: normalized.stripeColor };
  }
  return normalized;
};

const loadLayoutEditorState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(layoutEditorKey));
    if (!stored || typeof stored !== "object") return getDefaultLayoutEditorState();

    const tablesByPreset = {};
    const rawTablesByPreset = stored.tablesByPreset || {};
    Object.entries(rawTablesByPreset).forEach(([preset, bundle]) => {
      const normalizedLayouts = {};
      const rawLayouts = bundle?.layouts || {};
      Object.entries(rawLayouts).forEach(([name, table]) => {
        normalizedLayouts[name] = normalizeTableState(table);
      });
      tablesByPreset[preset] = {
        activeLayout: bundle?.activeLayout || "default",
        pendingNewLayout: bundle?.pendingNewLayout || null,
        layouts: normalizedLayouts
      };
    });

    return {
      ...getDefaultLayoutEditorState(),
      ...stored,
      elements: stored.elements || {},
      page: stored.page || {},
      table: normalizeTableState(stored.table || {}),
      tablesByPreset
    };
  } catch {
    return getDefaultLayoutEditorState();
  }
};

const saveLayoutEditorState = () => {
  localStorage.setItem(layoutEditorKey, JSON.stringify(layoutEditorState));
};

let layoutEditorState = loadLayoutEditorState();
let layoutEditorCss = "";
let documentPresetCss = "";
let shouldFocusTableLayoutName = false;

const scopedSelector = (selector) => {
  if (!selector) return ".preview-content, .print-content";
  return `.preview-content ${selector}, .print-content ${selector}`;
};

const buildTextCssRule = (selector, attrs) => {
  if (!attrs) return "";
  const props = [];
  const addProp = (prop, value) => {
    if (value !== undefined && value !== null && value !== "") {
      props.push(`${prop}: ${value};`);
    }
  };

  addProp("font-family", attrs.fontFamily);
  addProp("font-size", attrs.fontSize);
  addProp("font-weight", attrs.fontWeight);
  addProp("color", attrs.color);
  addProp("line-height", attrs.lineHeight);
  addProp("text-align", attrs.align);
  addProp("margin-top", attrs.spacingBefore);
  addProp("margin-bottom", attrs.spacingAfter);
  addProp("text-indent", attrs.textIndent || attrs.indent);

  if (typeof attrs.italic === "boolean") {
    addProp("font-style", attrs.italic ? "italic" : "normal");
  }
  if (typeof attrs.underline === "boolean") {
    addProp("text-decoration", attrs.underline ? "underline" : "none");
  }
  if (typeof attrs.smallCaps === "boolean") {
    addProp("font-variant", attrs.smallCaps ? "small-caps" : "normal");
  }

  if (Array.isArray(attrs.borderSides) && attrs.borderSides.length) {
    addProp("border-style", "solid");
    addProp("border-color", attrs.borderColor || "#cccccc");
    addProp("border-top-width", attrs.borderSides.includes("top") ? (attrs.borderWidth || "1px") : "0");
    addProp("border-right-width", attrs.borderSides.includes("right") ? (attrs.borderWidth || "1px") : "0");
    addProp("border-bottom-width", attrs.borderSides.includes("bottom") ? (attrs.borderWidth || "1px") : "0");
    addProp("border-left-width", attrs.borderSides.includes("left") ? (attrs.borderWidth || "1px") : "0");
  }

  if (!props.length) return "";
  return `${selector} { ${props.join(" ")} }`;
};

const buildLayoutEditorCss = () => {
  const rules = [];
  const elements = layoutEditorState.elements || {};

  const addRule = (selector, attrs) => {
    const rule = buildTextCssRule(selector, attrs);
    if (rule) rules.push(rule);
  };

  // Base body text
  addRule(scopedSelector("p"), elements.body || elements["table-cell"]);
  addRule(scopedSelector(""), elements.body);

  // Headings
  [1, 2, 3, 4].forEach((level) => {
    addRule(scopedSelector(`h${level}`), elements[`h${level}`]);
  });

  // Blockquote
  addRule(scopedSelector("blockquote"), elements.blockquote);

  // Inline code and code blocks
  addRule(scopedSelector("code"), elements["inline-code"]);
  addRule(scopedSelector("pre"), elements["code-block"]);

  // Tables
  addRule(scopedSelector("table"), elements["table-cell"]);
  addRule(scopedSelector("th"), elements["table-header"]);
  addRule(scopedSelector("td"), elements["table-cell"]);
  addRule(scopedSelector("table caption"), elements["table-caption"]);

  // Captions
  addRule(scopedSelector("figcaption"), elements.caption);

  // Lists (ul/ol levels)
  const listTypes = ["ul", "ol"];
  listTypes.forEach((type) => {
    for (let level = 1; level <= 3; level += 1) {
      const key = `${type}-${level}`;
      const attrs = elements[key];
      if (!attrs) continue;
      const listSel = `${Array(level).fill(type).join(" ")}`;
      const listSelector = scopedSelector(listSel);
      const listItemSelector = scopedSelector(`${listSel} li`);

      const listProps = [];
      if (attrs.indent) listProps.push(`padding-left: ${attrs.indent};`);
      if (attrs.spacingBefore) listProps.push(`margin-top: ${attrs.spacingBefore};`);
      if (attrs.spacingAfter) listProps.push(`margin-bottom: ${attrs.spacingAfter};`);

      if (type === "ol" && attrs.olStyle) {
        listProps.push(`list-style-type: ${attrs.olStyle};`);
      }

      if (type === "ul" && attrs.ulMarker) {
        const marker = attrs.ulMarker.trim();
        const isCustomMarker = /^['"].*['"]$/.test(marker);
        if (isCustomMarker) {
          listProps.push("list-style-type: none;");
          rules.push(`${scopedSelector(`${listSel} li::marker`)} { content: ${marker}; }`);
        } else {
          listProps.push(`list-style-type: ${attrs.ulMarker};`);
        }
      }

      if (listProps.length) rules.push(`${listSelector} { ${listProps.join(" ")} }`);

      const listItemProps = [];
      if (attrs.markerSpacing) listItemProps.push(`padding-left: ${attrs.markerSpacing};`);
      const textRule = buildTextCssRule(listItemSelector, attrs);
      if (listItemProps.length) rules.push(`${listItemSelector} { ${listItemProps.join(" ")} }`);
      if (textRule) rules.push(textRule);
    }
  });

  // Table layout settings
  const preset = getCurrentLayoutPreset();
  const bundle = ensureTableBundleForPreset(layoutEditorState, preset, layoutEditorState.table);
  const tableLayouts = bundle.layouts || {};

  const buildTableTextProps = (section) => {
    if (!section || !Object.keys(section).length) return [];
    const props = [];
    if (section.fontFamily) props.push(`font-family: ${section.fontFamily};`);
    if (section.fontSize) props.push(`font-size: ${section.fontSize};`);
    if (section.fontWeight) props.push(`font-weight: ${section.fontWeight};`);
    if (section.align) props.push(`text-align: ${section.align};`);
    if (section.lineHeight) props.push(`line-height: ${section.lineHeight};`);
    if (section.color) props.push(`color: ${section.color};`);
    if (section.indentLeft !== undefined && section.indentLeft !== null && section.indentLeft !== "") {
      props.push(`text-indent: ${section.indentLeft};`);
    }
    if (section.italic !== undefined) props.push(`font-style: ${section.italic ? "italic" : "normal"};`);
    if (section.underline !== undefined) {
      props.push(`text-decoration: ${section.underline ? "underline" : "none"};`);
    }
    if (section.smallCaps !== undefined) {
      props.push(`font-variant: ${section.smallCaps ? "small-caps" : "normal"};`);
    }
    if (section.background) props.push(`background: ${section.background};`);
    return props;
  };

  const buildPaddingValue = (padding) => {
    if (!padding || typeof padding !== "object") return "";
    const { top, right, bottom, left } = padding;
    if (!top && !right && !bottom && !left) return "";
    return `${top || "0"} ${right || "0"} ${bottom || "0"} ${left || "0"}`;
  };

  const getScopedTableSelector = (layoutName, suffix = "") => {
    const tail = suffix || "";
    if (layoutName === "default") {
      return scopedSelector(`table${tail}`);
    }
    return `.preview-content table.table-layout-${layoutName}${tail}, .preview-content table[data-layout="${layoutName}"]${tail}, .print-content table.table-layout-${layoutName}${tail}, .print-content table[data-layout="${layoutName}"]${tail}`;
  };

  Object.entries(tableLayouts).forEach(([layoutName, rawTable]) => {
    const table = normalizeTableState(rawTable);
    if (!Object.keys(table).length) return;

    const tableProps = [];
    if (table.layout) tableProps.push(`table-layout: ${table.layout};`);
    if (table.width) tableProps.push(`width: ${table.width};`);
    if (table.borderWidth && table.borderStyle && table.borderColor) {
      tableProps.push(`border: ${table.borderWidth} ${table.borderStyle} ${table.borderColor};`);
      tableProps.push("border-collapse: collapse;");
    }
    if (table.alignment === "center") {
      tableProps.push("margin-left: auto; margin-right: auto;");
    } else if (table.alignment === "right") {
      tableProps.push("margin-left: auto; margin-right: 0;");
    } else if (table.alignment === "left") {
      tableProps.push("margin-left: 0; margin-right: auto;");
    }
    if (tableProps.length) rules.push(`${getScopedTableSelector(layoutName)} { ${tableProps.join(" ")} }`);

    const cellProps = [];
    const basePadding = buildPaddingValue(table.cell?.padding);
    if (basePadding) {
      cellProps.push(`padding: ${basePadding};`);
    }
    if (table.borderWidth && table.borderStyle && table.borderColor) {
      cellProps.push(`border: ${table.borderWidth} ${table.borderStyle} ${table.borderColor};`);
    }
    if (cellProps.length) {
      rules.push(`${getScopedTableSelector(layoutName, " th")} { ${cellProps.join(" ")} }`);
      rules.push(`${getScopedTableSelector(layoutName, " td")} { ${cellProps.join(" ")} }`);
    }

    if (table.header?.dedicated) {
      const headerProps = buildTableTextProps(table.header);
      if (headerProps.length) rules.push(`${getScopedTableSelector(layoutName, " th")} { ${headerProps.join(" ")} }`);
      const headerPadding = buildPaddingValue(table.header?.padding);
      if (headerPadding) rules.push(`${getScopedTableSelector(layoutName, " th")} { padding: ${headerPadding}; }`);
    }

    const cellTextProps = buildTableTextProps(table.cell);
    if (cellTextProps.length) {
      rules.push(`${getScopedTableSelector(layoutName, " td")} { ${cellTextProps.join(" ")} }`);
      if (!table.header?.dedicated) {
        rules.push(`${getScopedTableSelector(layoutName, " th")} { ${cellTextProps.join(" ")} }`);
      }
    }

    if (table.firstRow?.dedicated) {
      const firstRowProps = buildTableTextProps(table.firstRow);
      if (firstRowProps.length) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:first-child td")} { ${firstRowProps.join(" ")} }`);
      }
      const firstRowPadding = buildPaddingValue(table.firstRow?.padding);
      if (firstRowPadding) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:first-child td")} { padding: ${firstRowPadding}; }`);
      }
    }

    if (table.lastRow?.dedicated) {
      const lastRowProps = buildTableTextProps(table.lastRow);
      if (lastRowProps.length) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:last-child td")} { ${lastRowProps.join(" ")} }`);
      }
      const lastRowPadding = buildPaddingValue(table.lastRow?.padding);
      if (lastRowPadding) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:last-child td")} { padding: ${lastRowPadding}; }`);
      }
    }

    if (table.altRow?.dedicated) {
      const altRowProps = buildTableTextProps(table.altRow);
      if (altRowProps.length) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:nth-child(even) td")} { ${altRowProps.join(" ")} }`);
      }
      const altRowPadding = buildPaddingValue(table.altRow?.padding);
      if (altRowPadding) {
        rules.push(`${getScopedTableSelector(layoutName, " tbody tr:nth-child(even) td")} { padding: ${altRowPadding}; }`);
      }
    }

    const tableType = table.type || "standard";
    if (tableType === "scientific") {
      rules.push(`${getScopedTableSelector(layoutName, " th")} { border-left: none; border-right: none; }`);
      rules.push(`${getScopedTableSelector(layoutName, " td")} { border-left: none; border-right: none; }`);
      rules.push(`${getScopedTableSelector(layoutName, " thead th")} { background: transparent; border-top-width: 2px; border-bottom-width: 2px; }`);
      rules.push(`${getScopedTableSelector(layoutName, " tbody tr:last-child td")} { border-bottom-width: 2px; }`);
    } else if (tableType === "compact") {
      rules.push(`${getScopedTableSelector(layoutName, " th")}, ${getScopedTableSelector(layoutName, " td")} { padding: 4px 6px; font-size: 0.92em; }`);
    } else if (tableType === "striped") {
      rules.push(`${getScopedTableSelector(layoutName, " tbody tr:nth-child(even) td")} { background: #f5f5f5; }`);
    }
  });

  return rules.join("\n");
};

const getDocumentLayoutFromMarkdown = (markdown = getMarkdown()) => {
  return documentLayout.parseFromMarkdown(markdown || "");
};

const getEffectiveDocumentLayout = (markdown = getMarkdown(), options = {}) => {
  const fallbackPreset = options.usePreviewPreset && previewPreset && previewPreset !== "document"
    ? previewPreset
    : (activeSettings.documentLayoutDefaultPreset || "scientific");
  const baseLayout = getBaseDocumentLayoutForPreset(fallbackPreset);
  const allowLocal = options.ignorePermission ? true : activeSettings.allowDocumentLayouts !== false;

  if (!allowLocal) {
    return baseLayout;
  }

  const parsedLayout = getDocumentLayoutFromMarkdown(markdown);
  const hasLocalLayout = layoutBlockRegex.test(markdown || "");
  layoutBlockRegex.lastIndex = 0;
  if (!hasLocalLayout) {
    return baseLayout;
  }

  return documentLayout.deepMerge(baseLayout, parsedLayout);
};

const buildDocumentPresetCss = (markdown = getMarkdown()) => {
  const layout = getEffectiveDocumentLayout(markdown, { ignorePermission: false });
  const generatedCss = layoutCSSGenerator.generate(layout);
  return generatedCss.replace(/\.print-content/g, ".preview-content.preset-document");
};

const refreshDynamicStyles = (markdown = getMarkdown()) => {
  ensureCustomStyle();
  documentPresetCss = previewPreset === "document" ? buildDocumentPresetCss(markdown) : "";
  const chunks = [
    previewPreset === "scientific" ? scientificPresetCss : "",
    customCss,
    layoutEditorCss,
    documentPresetCss
  ].filter(Boolean);
  customStyleEl.textContent = chunks.join("\n\n");
};

const applyLayoutEditorCss = () => {
  layoutEditorCss = buildLayoutEditorCss();
  refreshDynamicStyles();
};

const defaultCustomCssTemplate = `/* Example: customize preview styles */
.preview-content {
  font-size: 16px;
  line-height: 1.7;
  font-family: "Inter", system-ui, sans-serif;
  color: #22536b;
}

.preview-content h1 { font-size: 28px; letter-spacing: 0.2px; }
.preview-content h2 { font-size: 22px; }
.preview-content h3 { font-size: 18px; }

.preview-content p { margin-bottom: 12px; }
.preview-content a { color: #0089cf; }
.preview-content code { background: #eaf6fd; }

.preview-content blockquote { border-left: 3px solid #0089cf; }
.preview-content table { border-color: #e1e7ec; }
.preview-content th { background: #f3fbff; }

.admonition { border-left-color: #0089cf; }
.md-columns { gap: 16px; }
.md-break { opacity: 0.7; }

/* Mermaid diagram customization */
.mermaid .node rect,
.mermaid .node circle,
.mermaid .node ellipse,
.mermaid .node polygon,
.mermaid .node path {
  fill: #d9eefb !important;
  stroke: #0089cf !important;
  stroke-width: 2px !important;
}

.mermaid .edgePath .path {
  stroke: #22536b !important;
  stroke-width: 2px !important;
}

.mermaid .cluster rect {
  fill: #f9fcfe !important;
  stroke: #0089cf !important;
}

.mermaid .label,
.mermaid .nodeLabel,
.mermaid .edgeLabel {
  color: #22536b !important;
  font-family: "Inter", system-ui, sans-serif !important;
  font-size: 13px !important;
}

.mermaid .titleText {
  fill: #22536b !important;
  font-weight: 600 !important;
}
`;

const addAdmonition = (instance, type, title) => {
  instance.use(markdownItContainer, type, {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        return `<div class="admonition admonition-${type}"><div class="admonition-title">${title}</div>`;
      }
      return "</div>";
    }
  });
};

const buildMarkdownIt = (settings) => {
  const instance = MarkdownIt({
    html: true,
    linkify: settings.gfm,
    breaks: false,
    typographer: settings.typographer,
    sourcepos: true
  });

  // Add data-sourcepos to all tokens
  const originalTokenRender = instance.renderer.renderToken.bind(instance.renderer);
  instance.renderer.renderToken = function(tokens, idx, options) {
    const token = tokens[idx];
    if (token.map && token.nesting === 1) {
      const [startLine, endLine] = token.map;
      token.attrSet('data-sourcepos', `${startLine + 1}:1-${endLine}:1`);
    }
    return originalTokenRender(tokens, idx, options);
  };

  const usePlugin = (plugin, ...args) => {
    const fn = plugin?.default || plugin;
    if (typeof fn === "function") {
      instance.use(fn, ...args);
    }
  };

  if (settings.gfm) {
    usePlugin(markdownItTaskLists, { enabled: true });
    usePlugin(markdownItMultimdTable, { multiline: true, rowspan: true, headerless: true });
  }

  if (settings.footnotes) {
    usePlugin(markdownItFootnote);
  }

  if (settings.deflist) {
    usePlugin(markdownItDeflist);
  }

  if (settings.emoji) {
    usePlugin(markdownItEmoji);
  }

  if (settings.sub) {
    usePlugin(markdownItSub);
  }

  if (settings.sup) {
    usePlugin(markdownItSup);
  }

  if (settings.mark) {
    usePlugin(markdownItMark);
  }

  if (settings.abbr) {
    usePlugin(markdownItAbbr);
  }

  if (settings.toc) {
    usePlugin(markdownItAnchor, { permalink: false });
    usePlugin(markdownItToc, { level: [1, 2, 3, 4, 5, 6], listType: "ul" });
  }

  if (settings.attrs) {
    usePlugin(markdownItAttrs);
  }

  if (settings.math) {
    usePlugin(markdownItKatex);
  }

  if (settings.admonitions) {
    addAdmonition(instance, "info", "Info");
    addAdmonition(instance, "warning", "Warning");
    addAdmonition(instance, "tip", "Hinweis");
  }

  if (settings.columns) {
    usePlugin(markdownItContainer, "columns", {
      render(tokens, idx) {
        return tokens[idx].nesting === 1 ? "<div class=\"md-columns\">" : "</div>";
      }
    });
    usePlugin(markdownItContainer, "column", {
      render(tokens, idx) {
        return tokens[idx].nesting === 1 ? "<div class=\"md-column\">" : "</div>";
      }
    });
  }

  if (settings.breaks) {
    const breakRenderer = (label, className) => (tokens, idx) =>
      tokens[idx].nesting === 1
        ? `<div class=\"md-break ${className}\" data-label=\"${label}\"></div>`
        : "";
    usePlugin(markdownItContainer, "pagebreak", { render: breakRenderer("Seitenumbruch", "md-pagebreak") });
    usePlugin(markdownItContainer, "sectionbreak", { render: breakRenderer("Abschnittsumbruch", "md-sectionbreak") });
    usePlugin(markdownItContainer, "columnbreak", { render: breakRenderer("Spaltenumbruch", "md-columnbreak") });
    usePlugin(markdownItContainer, "linebreak", { render: breakRenderer("Zeilenumbruch", "md-linebreak") });
  }

  if (settings.mermaid) {
    const fence = instance.renderer.rules.fence;
    instance.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info?.trim().toLowerCase() || "";
      if (info === "mermaid") {
        const map = token.map || [];
        const start = map[0] ? map[0] + 1 : 1;
        const end = map[1] ? map[1] : start;
        const sourcepos = `${start}:1-${end}:1`;
        return `<div class="mermaid" data-sourcepos="${sourcepos}">${token.content}</div>`;
      }
      return fence ? fence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    };
  }

  // Add data-line attribute to all elements for better sync
  const defaultRender = instance.renderer.render.bind(instance.renderer);
  instance.renderer.render = function(tokens, options, env) {
    const result = defaultRender(tokens, options, env);
    return result;
  };

  return instance;
};

const getCssVarValue = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const initMermaid = () => {
  const accent = getCssVarValue("--accent", "#0089cf");
  const accentLight = getCssVarValue("--accent-light", "#d9eefb");
  const primary = getCssVarValue("--primary", "#22536b");
  const bg = getCssVarValue("--bg", "#f9fcfe");
  const preset = previewPreset || "scientific";
  const presetMap = {
    scientific: { fontSize: 13, nodePadding: 10, fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
    compact: { fontSize: 11, nodePadding: 6, fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
    literary: { fontSize: 14, nodePadding: 12, fontFamily: "Georgia, Times New Roman, serif" },
    custom: { fontSize: 13, nodePadding: 10, fontFamily: "Inter, system-ui, -apple-system, sans-serif" }
  };
  const presetVars = presetMap[preset] || presetMap.scientific;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: {
      primaryColor: accentLight,
      primaryBorderColor: accent,
      primaryTextColor: primary,
      lineColor: accent,
      secondaryColor: accentLight,
      tertiaryColor: bg,
      fontFamily: presetVars.fontFamily,
      fontSize: presetVars.fontSize,
      nodePadding: presetVars.nodePadding
    },
    // Enable C4 diagrams and other extensions
    c4: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      c4ShapeMargin: 50,
      c4ShapePadding: 20
    }
  });
  mermaidReady = true;
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const toSafeFilename = (value, fallback) => {
  const base = slugify(value || "") || fallback;
  return base.replace(/^-+/, "").replace(/-+$/, "") || fallback;
};

const healMermaidSyntax = (code) => {
  let healed = code;
  
  // Kommentare korrigieren: # in %% umwandeln (Mermaid Syntax)
  healed = healed.replace(/#(.*)$/gm, (match, comment) => {
    return `%% ${comment.trim()}`;
  });
  
  // Typische Tippfehler korrigieren
  healed = healed.replace(/\bflowchar\b/g, "flowchart");
  healed = healed.replace(/\bsequencediagram\b/gi, "sequenceDiagram");
  healed = healed.replace(/\bclassdiagram\b/gi, "classDiagram");
  healed = healed.replace(/\bgantt\b/gi, "gantt");
  healed = healed.replace(/\berdiagram\b/gi, "erDiagram");
  healed = healed.replace(/\bstatediagram\b/gi, "stateDiagram");
  
  // WICHTIG: Labels mit Sonderzeichen in Quotes setzen
  // Mermaid hat Probleme mit Klammern, Doppelpunkten, etc. in Labels
  healed = healed.replace(/-->\s*\|\s*([^|]+?)\s*\|/g, (match, label) => {
    const trimmed = label.trim();
    // Wenn Label Klammern, Doppelpunkt oder Sonderzeichen enthält, in Quotes setzen
    if (/[():&/]/.test(trimmed) && !/^".*"$/.test(trimmed)) {
      return `-->|"${trimmed}"|`;
    }
    return `-->|${trimmed}|`;
  });
  healed = healed.replace(/->\s*\|\s*([^|]+?)\s*\|/g, (match, label) => {
    const trimmed = label.trim();
    if (/[():&/]/.test(trimmed) && !/^".*"$/.test(trimmed)) {
      return `->|"${trimmed}"|`;
    }
    return `->|${trimmed}|`;
  });
  healed = healed.replace(/---\s*\|\s*([^|]+?)\s*\|/g, (match, label) => {
    const trimmed = label.trim();
    if (/[():&/]/.test(trimmed) && !/^".*"$/.test(trimmed)) {
      return `---|"${trimmed}"|`;
    }
    return `---|${trimmed}|`;
  });
  healed = healed.replace(/-\.\s*\|\s*([^|]+?)\s*\|/g, (match, label) => {
    const trimmed = label.trim();
    if (/[():&/]/.test(trimmed) && !/^".*"$/.test(trimmed)) {
      return `-.|"${trimmed}"|`;
    }
    return `-.|${trimmed}|`;
  });
  
  // Fehlende Leerzeichen nach Pfeilen hinzufügen (nur wenn kein | folgt)
  healed = healed.replace(/-->([^\s\-|])/g, "--> $1");
  healed = healed.replace(/->([^\s\-|])/g, "-> $1");
  healed = healed.replace(/---([^\s\-|])/g, "--- $1");
  healed = healed.replace(/==([^\s=|])/g, "== $1");
  healed = healed.replace(/-\.([^\s\.|])/g, "-. $1");
  
  // Node-Labels mit Sonderzeichen in Quotes setzen
  // Behandle NodeID[Label], NodeID(Label), NodeID{Label}, NodeID>Label]
  healed = healed.replace(/(\w+)\[([^\]]+)\]/g, (match, id, label) => {
    // Wenn Label Sonderzeichen hat und nicht schon in Quotes ist
    if (/[():&/]/.test(label) && !/^".*"$/.test(label)) {
      return `${id}["${label}"]`;
    }
    return match;
  });
  healed = healed.replace(/(\w+)\(([^)]+)\)/g, (match, id, label) => {
    if (/[():&/]/.test(label) && !/^".*"$/.test(label)) {
      return `${id}("${label}")`;
    }
    return match;
  });
  healed = healed.replace(/(\w+)\{([^}]+)\}/g, (match, id, label) => {
    if (/[():&/]/.test(label) && !/^".*"$/.test(label)) {
      return `${id}{"${label}"}`;
    }
    return match;
  });
  
  // Ungültige Zeichen in Node-IDs ersetzen (nur alphanumerisch + Unterstrich erlaubt)
  const lines = healed.split('\n');
  const processedLines = lines.map(line => {
    // Flowchart node definitions: NodeID[Label] oder NodeID(Label) etc.
    if (line.match(/^\s*[\w-]+[\[\(\{<]/)) {
      return line.replace(/^(\s*)([\w.-]+)([\[\(\{<])/, (match, spaces, id, bracket) => {
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
        return spaces + cleanId + bracket;
      });
    }
    return line;
  });
  healed = processedLines.join('\n');
  
  // Leere Zeilen am Ende entfernen
  healed = healed.trim();
  
  return healed;
};

const renderMermaid = async () => {
  if (!activeSettings.mermaid) return;
  initMermaid();
  const mermaidBlocks = document.querySelectorAll(".mermaid");
  for (const block of mermaidBlocks) {
    if (block.hasAttribute("data-processed")) continue;
    const originalContent = block.textContent;
    const healedContent = healMermaidSyntax(originalContent);
    
    try {
      // Versuche erst mit geheiltem Code
      if (healedContent !== originalContent) {
        block.textContent = healedContent;
      }
      await mermaid.run({ nodes: [block] });
      
      // Add click handler to open editor
      block.style.cursor = 'pointer';
      block.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Find the mermaid block in editor
        const allBlocks = Array.from(document.querySelectorAll('.mermaid'));
        const blockIndex = allBlocks.indexOf(block);
        if (blockIndex !== -1 && findMermaidBlockInEditor(blockIndex)) {
          openMermaidEditor();
        }
      });
    } catch (error) {
      // Fehler auch nach Healing - zeige Original-Code
      block.textContent = originalContent;
      block.classList.add("mermaid-error");
      block.innerHTML = `<div class="syntax-error">
        <div class="syntax-error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="syntax-error-title">Mermaid Syntax-Fehler</div>
        <div class="syntax-error-message">${escapeHtml(error.message || "Ungültige Syntax")}</div>
        <details class="syntax-error-details">
          <summary>Diagramm-Code anzeigen</summary>
          <pre>${escapeHtml(originalContent)}</pre>
        </details>
      </div>`;
    }
  }
};

const applySettings = (nextSettings) => {
  activeSettings = { ...activeSettings, ...nextSettings };
  if (!activeSettings.allowDocumentLayouts) {
    activeSettings.hideLayoutBlock = false;
    if (previewPreset === "document") {
      previewPreset = activeSettings.documentLayoutDefaultPreset || "scientific";
      localStorage.setItem(previewPresetKey, previewPreset);
    }
  }
  saveSettings(activeSettings);
  md = buildMarkdownIt(activeSettings);
  
  // Update Editor-Optionen
  if (editorView) {
    if ('lineNumbers' in nextSettings) {
      editorView.setOption('lineNumbers', nextSettings.lineNumbers);
    }
    if ('syntaxHighlight' in nextSettings) {
      editorView.setOption('mode', nextSettings.syntaxHighlight ? 'markdown' : null);
    }
    if ('lineWrapping' in nextSettings) {
      editorView.setOption('lineWrapping', Boolean(nextSettings.lineWrapping));
    }
  }
  if ('hideLayoutBlock' in nextSettings || 'allowDocumentLayouts' in nextSettings) {
    updateLayoutBlockVisibility();
  }

  syncSettingsUI();
  applyPreviewPreset(previewPreset);
};

md = buildMarkdownIt(activeSettings);

const headingIdState = {
  ids: [],
  index: 0
};

md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const id = headingIdState.ids[headingIdState.index++] || "";
  if (id) {
    tokens[idx].attrSet("id", id);
  }
  return self.renderToken(tokens, idx, options);
};

const elements = {
  editorHost: document.getElementById("markdownEditor"),
  preview: document.getElementById("preview"),
  treeView: document.getElementById("treeView"),
  viewPreviewBtn: document.getElementById("viewPreviewBtn"),
  viewTreeBtn: document.getElementById("viewTreeBtn"),
  previewPanel: document.getElementById("previewPanel"),
  treePanel: document.getElementById("treePanel"),
  previewBody: document.getElementById("previewBody"),
  treeInline: document.getElementById("treeInline"),
  nodeContent: document.getElementById("nodeContent"),
  nodeStatsBtn: document.getElementById("nodeStatsBtn"),
  permalinkBtn: document.getElementById("permalinkBtn"),
  copyMdBtn: document.getElementById("copyMdBtn"),
  downloadMdBtn: document.getElementById("downloadMdBtn"),
  copyTextBtn: document.getElementById("copyTextBtn"),
  sharePdfBtn: document.getElementById("sharePdfBtn"),
  copyNodeMdBtn: document.getElementById("copyNodeMdBtn"),
  copyNodeTextBtn: document.getElementById("copyNodeTextBtn"),
  shareBtn: document.getElementById("shareBtn"),
  shareMenu: document.getElementById("shareMenu"),
  previewTreeToggle: document.getElementById("previewTreeToggle"),
  previewRenderToggle: document.getElementById("previewRenderToggle"),
  previewDocxBtn: document.getElementById("previewDocxBtn"),
  historyList: document.getElementById("historyList"),
  newPasteBtn: document.getElementById("newPasteBtn"),
  historySearch: document.getElementById("historySearch"),
  status: document.getElementById("status"),
  content: document.querySelector(".content"),
  editorSection: document.querySelector(".editor"),
  previewSection: document.querySelector(".right-pane"),
  editorResizer: document.querySelector(".editor-resizer"),
  treeResizer: document.querySelector(".tree-resizer"),
  sidebar: document.getElementById("sidebar"),
  footerStats: document.getElementById("footerStats"),
  previewTitle: document.getElementById("previewTitle"),
  settingsBtn: document.getElementById("settingsBtn"),
  tipsBtn: document.getElementById("tipsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  settingsOverlay: document.getElementById("settingsOverlay"),
  settingsClose: document.getElementById("settingsClose"),
  themeSelect: document.getElementById("themeSelect"),
  languageSelect: document.getElementById("languageSelect"),
  customCssInput: document.getElementById("customCssInput"),
  pinToggle: document.getElementById("pinToggle"),
  collapsedOpenItems: document.getElementById("collapsedOpenItems"),
  toastContainer: document.getElementById("toastContainer"),
  previewPresetTrigger: document.getElementById("previewPresetTrigger"),
  previewPresetMenu: document.getElementById("previewPresetMenu"),
  previewPresetLabel: document.getElementById("previewPresetLabel"),
  previewPresetItems: Array.from(document.querySelectorAll(".preview-preset-item")),
  previewPrintItem: document.getElementById("previewPrintItem"),
  tipsModal: document.getElementById("tipsModal"),
  tipsOverlay: document.getElementById("tipsOverlay"),
  tipsClose: document.getElementById("tipsClose"),
  dontShowTipsAgain: document.getElementById("dontShowTipsAgain"),
  nextTipBtn: document.getElementById("nextTipBtn"),
  resetAllDataBtn: document.getElementById("resetAllDataBtn"),
  workspaceSelect: document.getElementById("workspaceSelect"),
  newWorkspaceBtn: document.getElementById("newWorkspaceBtn"),
  renameWorkspaceBtn: document.getElementById("renameWorkspaceBtn"),
  deleteWorkspaceBtn: document.getElementById("deleteWorkspaceBtn"),
  workspaceInfo: document.getElementById("workspaceInfo"),
  exportAllBtn: document.getElementById("exportAllBtn"),
  backupZipBtn: document.getElementById("backupZipBtn"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  clearSyncBtn: document.getElementById("clearSyncBtn"),
  syncStatus: document.getElementById("syncStatus"),
  currentSpaceName: document.getElementById("currentSpaceName"),
  spacesModal: document.getElementById("spacesModal"),
  spacesOverlay: document.getElementById("spacesOverlay"),
  spacesClose: document.getElementById("spacesClose"),
  spacesGrid: document.getElementById("spacesGrid"),
  togglePrintViewBtn: document.getElementById("togglePrintViewBtn"),
  printPreviewBody: document.getElementById("printPreviewBody"),
  printPreview: document.getElementById("printPreview"),
  previewBody: document.getElementById("previewBody"),
  openLayoutConfig: document.getElementById("openLayoutConfig"),
  layoutEditorBtn: document.getElementById("layoutEditorBtn"),
  layoutEditorModal: document.getElementById("layoutEditorModal"),
  layoutEditorOverlay: document.getElementById("layoutEditorOverlay"),
  layoutEditorClose: document.getElementById("layoutEditorClose"),
  layoutEditorCancel: document.getElementById("layoutEditorCancel"),
  layoutEditorSave: document.getElementById("layoutEditorSave"),
  layoutEditorSelect: document.getElementById("layoutEditorSelect"),
  layoutEditorTabs: document.querySelectorAll(".layout-editor-tab"),
  layoutEditorTabContents: document.querySelectorAll(".layout-editor-tab-content"),
  tableLayoutProfileSelect: document.getElementById("table-layout-profile-select"),
  tableLayoutName: document.getElementById("table-layout-name"),
  tableLayoutProfileDelete: document.getElementById("table-layout-profile-delete"),
  layoutCustomCssInput: document.getElementById("layoutCustomCssInput"),
  aiChatToggle: document.getElementById("aiChatToggle"),
  aiChatPanel: document.getElementById("aiChatPanel"),
  newChatBtn: document.getElementById("newChatBtn"),
  aiChatSessionSelect: document.getElementById("aiChatSessionSelect"),
  mermaidEditorModal: document.getElementById("mermaidEditorModal"),
  mermaidEditorOverlay: document.getElementById("mermaidEditorOverlay"),
  mermaidEditorClose: document.getElementById("mermaidEditorClose"),
  mermaidDiagramType: document.getElementById("mermaidDiagramType"),
  mermaidLayoutDirection: document.getElementById("mermaidLayoutDirection"),
  mermaidCanvas: document.getElementById("mermaidCanvas"),
  mermaidPreview: document.getElementById("mermaidPreview"),
  mermaidNodeLabel: document.getElementById("mermaidNodeLabel"),
  mermaidNodeShape: document.getElementById("mermaidNodeShape"),
  mermaidNodeColor: document.getElementById("mermaidNodeColor"),
  mermaidAddNode: document.getElementById("mermaidAddNode"),
  mermaidAddEdge: document.getElementById("mermaidAddEdge"),
  mermaidDeleteSelected: document.getElementById("mermaidDeleteSelected"),
  mermaidZoomIn: document.getElementById("mermaidZoomIn"),
  mermaidZoomOut: document.getElementById("mermaidZoomOut"),
  mermaidZoomReset: document.getElementById("mermaidZoomReset")
};

let currentPasteId = null;
let currentWorkspace = "default";
let tipsData = [];
let tipsLoadedLocale = null;
let historyCache = [];
let selectedNodeId = null;
let currentView = "preview";
let printViewActive = false;
let lastSavedMarkdown = "";
let aiChat = null;
let lastHeadings = [];
let lastTree = [];
let headingMetrics = { headings: [], previewOffsets: {}, lineHeight: 20 };
let clearedForNew = false;
let outlineCache = new Map();
let historyOrder = [];
let isDragging = false;
let dragMode = null;
let startX = 0;
let startEditor = 0;
let startPreview = 0;
let startY = 0;
let startTreeHeight = 0;
const minTreeHeight = 140;
const minNodeHeight = 140;
const minCol = 220;
let editorView = null;
let treeVisible = false;
let lastStatsText = "";
let imageManager = null;
let previewSyncHighlightTimeout = null;

const sidebarPinModeKey = "sidebarPinMode";
const sidebarCollapsedKey = "sidebarCollapsed";
let sidebarPinMode = localStorage.getItem(sidebarPinModeKey) || "unpinned";
let sidebarCollapsed = localStorage.getItem(sidebarCollapsedKey) !== "false";

const updateSidebarState = () => {
  const sidebar = elements.sidebar;
  const app = sidebar?.closest(".app");
  if (!sidebar || !app) return;
  const effectiveCollapsed = sidebarPinMode === "pinned-collapsed"
    ? true
    : sidebarPinMode === "pinned-expanded"
      ? false
      : sidebarCollapsed;
  sidebar.classList.toggle("collapsed", effectiveCollapsed);
  app.classList.toggle("sidebar-collapsed", effectiveCollapsed);
  elements.pinToggle?.classList.toggle("active", sidebarPinMode !== "unpinned");
  const label = elements.pinToggle?.querySelector(".icon-label");
  if (elements.pinToggle) {
    if (sidebarPinMode === "pinned-collapsed") {
      elements.pinToggle.title = "Angepinnt (eingeklappt)";
      elements.pinToggle.setAttribute("aria-label", "Angepinnt (eingeklappt)");
      if (label) label.textContent = "Angepinnt (eingeklappt)";
    } else if (sidebarPinMode === "pinned-expanded") {
      elements.pinToggle.title = "Angepinnt (ausgeklappt)";
      elements.pinToggle.setAttribute("aria-label", "Angepinnt (ausgeklappt)");
      if (label) label.textContent = "Angepinnt (ausgeklappt)";
    } else {
      elements.pinToggle.title = "Nicht angepinnt";
      elements.pinToggle.setAttribute("aria-label", "Nicht angepinnt");
      if (label) label.textContent = "Nicht angepinnt";
    }
  }

  // Sidebar width change affects available content width; recompute split columns.
  if (typeof initColumns === "function") {
    requestAnimationFrame(() => initColumns());
    setTimeout(() => initColumns(), 220);
  }
};

const setSidebarPinMode = (mode) => {
  sidebarPinMode = mode;
  localStorage.setItem(sidebarPinModeKey, sidebarPinMode);
  updateSidebarState();
};

const setSidebarCollapsed = (value) => {
  sidebarCollapsed = value;
  localStorage.setItem(sidebarCollapsedKey, String(sidebarCollapsed));
  updateSidebarState();
};

const renderCollapsedOpenItems = () => {
  if (!elements.collapsedOpenItems) return;
  elements.collapsedOpenItems.innerHTML = "";
  const items = historyCache.slice(0, 9);
  const currentId = normalizePasteId(currentPasteId);
  if (currentId !== null && currentId !== undefined) {
    const hasCurrent = items.some((item) => normalizePasteId(item.id) === currentId);
    if (!hasCurrent) {
      const currentItem = historyCache.find((item) => normalizePasteId(item.id) === currentId);
      if (currentItem) {
        if (items.length >= 9) {
          items[items.length - 1] = currentItem;
        } else {
          items.push(currentItem);
        }
      }
    }
  }
  items.forEach((item, index) => {
    const btn = document.createElement("button");
    const isActive = normalizePasteId(item.id) === currentId;
    btn.className = "collapsed-open-item" + (isActive ? " active" : "");
    btn.textContent = String(index + 1);
    btn.title = item.title || "Untitled";
    btn.setAttribute("aria-label", item.title || "Untitled");
    btn.addEventListener("click", () => loadPaste(item.id));
    elements.collapsedOpenItems.appendChild(btn);
  });
};

const getMarkdown = () => (editorView ? editorView.getValue() : "");

const insertMarkdownAtCursor = (text) => {
  if (!editorView) return;
  const cursor = editorView.getCursor();
  editorView.replaceRange(text, cursor);
  handleEditorChange();
};

const layoutBlockRegex = /```layout\s*\n[\s\S]*?\n```/g;

const stripLayoutBlock = (text) => text.replace(layoutBlockRegex, "").trimEnd();

let layoutBlockMarker = null;
const updateLayoutBlockVisibility = () => {
  if (!editorView) return;
  if (layoutBlockMarker) {
    layoutBlockMarker.clear();
    layoutBlockMarker = null;
  }
  if (!activeSettings.allowDocumentLayouts || !activeSettings.hideLayoutBlock) return;

  const text = editorView.getValue();
  const matches = Array.from(text.matchAll(layoutBlockRegex));
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return;

  const start = lastMatch.index;
  const end = start + lastMatch[0].length;
  const from = editorView.posFromIndex(start);
  const to = editorView.posFromIndex(end);
  const placeholder = document.createElement("span");
  placeholder.className = "layout-block-placeholder";
  layoutBlockMarker = editorView.getDoc().markText(from, to, {
    replacedWith: placeholder,
    clearOnEnter: false
  });
};

const setMarkdown = (text) => {
  if (!editorView) return;
  const current = editorView.getValue();
  if (current === text) return;
  editorView.setValue(text);
  updateLayoutBlockVisibility();
};

const getEditorScrollTop = () => (editorView ? editorView.getScrollInfo().top : 0);

const setEditorScrollTop = (value) => {
  if (editorView) editorView.scrollTo(null, value);
};

let lastToast = { text: "", at: 0 };

const showToast = (message, type = "info", duration = 2400) => {
  if (!message) return;
  if (!activeSettings.showToasts) return;
  const now = Date.now();
  if (lastToast.text === message && now - lastToast.at < 800) return;
  lastToast = { text: message, at: now };
  if (!elements.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  const remove = () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 180);
  };
  setTimeout(remove, duration);
};

const setStatus = (text, type = "info") => {
  if (elements.status) {
    elements.status.textContent = text;
  }
  showToast(text, type);
};

const translations = {};
const supportedLocales = ["de", "en"];

const loadTranslations = async (locale) => {
  if (!translations[locale]) {
    try {
      const response = await fetch(`/i18n/${locale}.json`);
      if (response.ok) {
        translations[locale] = await response.json();
      } else {
        console.warn(`Failed to load translations for ${locale}`);
        if (locale !== "en") {
          await loadTranslations("en");
        }
      }
    } catch (err) {
      console.error(`Error loading translations for ${locale}:`, err);
      if (locale !== "en") {
        await loadTranslations("en");
      }
    }
  }
};

const getLocale = () => {
  const saved = localStorage.getItem(localeKey);
  if (saved && supportedLocales.includes(saved)) return saved;
  const lang = (navigator.language || "de").toLowerCase();
  const base = lang.split("-")[0];
  return supportedLocales.includes(base) ? base : "en";
};

let currentLocale = getLocale();

const t = (key) => translations[currentLocale]?.[key] || translations.en?.[key] || key;

const applyTranslations = async () => {
  await loadTranslations(currentLocale);
  if (currentLocale !== "en") {
    await loadTranslations("en");
  }
  
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("title", t(el.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  updatePreviewTitle();
  if (elements.previewPresetLabel) {
    const key = `preset${previewPreset[0].toUpperCase()}${previewPreset.slice(1)}`;
    elements.previewPresetLabel.textContent = t(key);
  }
};

const applyTheme = (theme) => {
  uiTheme = theme || "twentyone";
  document.body.dataset.theme = uiTheme;
  localStorage.setItem(themeKey, uiTheme);
  renderPreview();
};

const applyPreviewPreset = (preset) => {
  let requested = preset || "scientific";
  if (requested === "document" && activeSettings.allowDocumentLayouts === false) {
    requested = activeSettings.documentLayoutDefaultPreset || "scientific";
  }
  previewPreset = previewPresetValues.includes(requested) ? requested : "scientific";
  localStorage.setItem(previewPresetKey, previewPreset);
  const presets = ["preset-compact", "preset-scientific", "preset-literary", "preset-document"];
  [elements.preview, elements.nodeContent].forEach((el) => {
    if (!el) return;
    presets.forEach((p) => el.classList.remove(p));
    el.classList.add(`preset-${previewPreset}`);
  });
  if (elements.previewPresetLabel) {
    const key = `preset${previewPreset[0].toUpperCase()}${previewPreset.slice(1)}`;
    elements.previewPresetLabel.textContent = t(key);
  }
  refreshDynamicStyles();
  
  mermaidReady = false;
  renderPreview();
};

let customStyleEl = null;
const ensureCustomStyle = () => {
  if (customStyleEl) return;
  customStyleEl = document.createElement("style");
  customStyleEl.id = "customStyles";
  document.head.appendChild(customStyleEl);
};

const applyCustomCss = (css) => {
  customCss = buildLayoutCssTemplate(css || "");
  localStorage.setItem(customCssKey, customCss);
  refreshDynamicStyles();
};

const syncSettingsUI = () => {
  document.querySelectorAll("[data-setting]").forEach((input) => {
    const key = input.dataset.setting;
    if (key in activeSettings) {
      input.checked = Boolean(activeSettings[key]);
    }
  });
  if (elements.languageSelect) {
    const saved = localStorage.getItem(localeKey) || "auto";
    elements.languageSelect.value = saved;
  }
  if (elements.customCssInput) {
    elements.customCssInput.value = customCss || defaultCustomCssTemplate;
  }
  const documentLayoutDefaultPreset = document.getElementById("documentLayoutDefaultPreset");
  if (documentLayoutDefaultPreset) {
    documentLayoutDefaultPreset.value = activeSettings.documentLayoutDefaultPreset || "scientific";
  }
  const allowDocumentLayouts = activeSettings.allowDocumentLayouts !== false;
  const hideLayoutInput = document.querySelector('[data-setting="hideLayoutBlock"]');
  if (hideLayoutInput) {
    hideLayoutInput.disabled = !allowDocumentLayouts;
    hideLayoutInput.closest('.setting')?.classList.toggle('setting-disabled', !allowDocumentLayouts);
  }
  document.querySelectorAll('[data-document-layout-dependent="true"]').forEach((el) => {
    el.hidden = !allowDocumentLayouts;
  });
  document.querySelectorAll('[data-document-layout-option="true"]').forEach((el) => {
    el.hidden = !allowDocumentLayouts;
  });
};

const openSettings = () => {
  elements.settingsModal?.classList.remove("hidden");
  elements.settingsOverlay?.classList.remove("hidden");
  syncSettingsUI();
};

const closeSettings = () => {
  elements.settingsModal?.classList.add("hidden");
  elements.settingsOverlay?.classList.add("hidden");
};

const openLayoutEditor = () => {
  elements.layoutEditorModal?.classList.remove("hidden");
  elements.layoutEditorOverlay?.classList.remove("hidden");
  if (elements.layoutEditorSelect) {
    elements.layoutEditorSelect.value = previewPreset || "scientific";
  }
  // Sync CSS into layout editor (include preset styles)
  if (elements.layoutCustomCssInput) {
    const sourceCss = elements.customCssInput?.value || customCss || "";
    elements.layoutCustomCssInput.value = buildLayoutCssTemplate(sourceCss);
  }
  // Load current layout values
  if (elements.layoutEditorSelect?.value === "document") {
    syncDocumentPresetState();
  }
  loadLayoutEditorValues();
};

const closeLayoutEditor = () => {
  elements.layoutEditorModal?.classList.add("hidden");
  elements.layoutEditorOverlay?.classList.add("hidden");
};

const getLayoutValue = (id, fallback = "") => {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
};

const setLayoutValue = (id, value) => {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) {
    el.value = value;
  }
};

const setLayoutChecked = (id, checked) => {
  const el = document.getElementById(id);
  if (el) {
    el.checked = Boolean(checked);
  }
};

const getAlignGroupValue = (groupId, fallback = "left") => {
  const group = document.getElementById(groupId);
  const active = group?.querySelector(".layout-align-btn.active");
  return active?.dataset.align || fallback;
};

const setAlignGroupValue = (groupId, align) => {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll(".layout-align-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.align === align);
  });
};

const getCurrentLayoutPreset = () => elements.layoutEditorSelect?.value || previewPreset || "scientific";
const NEW_TABLE_LAYOUT_VALUE = "__new__";

const buildDocumentPresetState = (layout = getEffectiveDocumentLayout(getMarkdown(), { ignorePermission: true })) => {
  const documentTableLayouts = {};
  Object.entries(layout.tableLayouts || {}).forEach(([name, table]) => {
    documentTableLayouts[name] = normalizeTableState(table);
  });

  if (!Object.keys(documentTableLayouts).length) {
    documentTableLayouts.default = normalizeTableState(getTablePresetForLayout("scientific", {}));
  }

  const activeLayout = documentTableLayouts.default ? "default" : Object.keys(documentTableLayouts)[0];

  return {
    page: {
      size: layout.page?.size || "A4",
      orientation: layout.page?.orientation || "portrait",
      margins: {
        top: layout.page?.margins?.top || "2.5cm",
        right: layout.page?.margins?.right || "2cm",
        bottom: layout.page?.margins?.bottom || "2cm",
        left: layout.page?.margins?.left || "2.5cm"
      },
      mirrorMargins: layout.page?.mirrorMargins || false,
      bindingOffset: layout.page?.bindingOffset || "0",
      headerHeight: layout.header?.offset || "6mm",
      footerHeight: layout.footer?.offset || "6mm",
      headerFirst: !layout.header?.hideOnFirstPage,
      footerFirst: !layout.footer?.hideOnFirstPage,
      headerContent: {
        left: layout.header?.left || "",
        center: layout.header?.center || "",
        right: layout.header?.right || ""
      },
      footerContent: {
        left: layout.footer?.left || "",
        center: layout.footer?.center || "",
        right: layout.footer?.right || ""
      },
      columns: {
        count: String(layout.columns?.enabled ? (layout.columns?.count || 1) : 1),
        gap: layout.columns?.gap || "20pt"
      }
    },
    table: normalizeTableState(documentTableLayouts[activeLayout]),
    tableBundle: {
      activeLayout,
      pendingNewLayout: null,
      layouts: documentTableLayouts
    }
  };
};

const syncDocumentPresetState = () => {
  const documentState = buildDocumentPresetState();
  layoutEditorState.tablesByPreset = layoutEditorState.tablesByPreset || {};
  layoutEditorState.page = documentState.page;
  layoutEditorState.table = documentState.table;
  layoutEditorState.tablesByPreset.document = documentState.tableBundle;
};

const sanitizeTableLayoutName = (value) => (value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const createUniqueTableLayoutName = (bundle, seed = "new-layout") => {
  let candidate = sanitizeTableLayoutName(seed) || "new-layout";
  let counter = 2;
  while (bundle.layouts[candidate]) {
    candidate = `${sanitizeTableLayoutName(seed) || "new-layout"}-${counter}`;
    counter += 1;
  }
  return candidate;
};

const ensureTableBundleForPreset = (state, preset, fallbackTable) => {
  const key = preset || "scientific";
  state.tablesByPreset = state.tablesByPreset || {};
  const bundle = state.tablesByPreset[key] || { activeLayout: "default", pendingNewLayout: null, layouts: {} };
  bundle.layouts = bundle.layouts || {};
  bundle.pendingNewLayout = bundle.pendingNewLayout || null;

  if (!bundle.layouts.default || !Object.keys(bundle.layouts.default).length) {
    const seed = fallbackTable && Object.keys(fallbackTable).length ? fallbackTable : getTablePresetForLayout(key, {});
    bundle.layouts.default = normalizeTableState(seed);
  }

  if (!bundle.layouts[bundle.activeLayout]) {
    bundle.activeLayout = "default";
  }

  if (bundle.pendingNewLayout && !bundle.layouts[bundle.pendingNewLayout]) {
    bundle.pendingNewLayout = null;
  }

  state.tablesByPreset[key] = bundle;
  return bundle;
};

const getCurrentTableBundle = () => {
  const preset = getCurrentLayoutPreset();
  return ensureTableBundleForPreset(layoutEditorState, preset, layoutEditorState.table);
};

const getCurrentTableLayoutName = () => {
  const selected = elements.tableLayoutProfileSelect?.value;
  if (!selected || selected === NEW_TABLE_LAYOUT_VALUE) {
    return getCurrentTableBundle().activeLayout || "default";
  }
  return selected;
};

const getCurrentTableSettings = () => {
  const bundle = getCurrentTableBundle();
  const name = getCurrentTableLayoutName();
  return normalizeTableState(bundle.layouts[name] || bundle.layouts.default || {});
};

const saveCurrentTableSettingsToState = () => {
  const bundle = getCurrentTableBundle();
  const name = bundle.activeLayout || getCurrentTableLayoutName();
  bundle.layouts[name] = normalizeTableState(readTableSettings());
  bundle.activeLayout = name;
  layoutEditorState.table = bundle.layouts[name];
};

const populateTableLayoutProfileSelector = () => {
  const select = elements.tableLayoutProfileSelect;
  if (!select) return;

  const bundle = getCurrentTableBundle();
  const layoutNames = Object.keys(bundle.layouts);
  const activeName = bundle.layouts[bundle.activeLayout] ? bundle.activeLayout : (layoutNames[0] || "default");

  select.innerHTML = "";
  layoutNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });

  const createOption = document.createElement("option");
  createOption.value = NEW_TABLE_LAYOUT_VALUE;
  createOption.textContent = t("layoutTableNew");
  select.appendChild(createOption);

  select.value = activeName;
  bundle.activeLayout = activeName;
};

const readPageSettings = () => ({
  size: getLayoutValue("page-size", "A4"),
  orientation: document.querySelector(".layout-orientation-btn.active")?.dataset.orientation || "portrait",
  margins: {
    top: getLayoutValue("page-margin-top", "2.5cm"),
    right: getLayoutValue("page-margin-right", "2cm"),
    bottom: getLayoutValue("page-margin-bottom", "2cm"),
    left: getLayoutValue("page-margin-left", "2.5cm")
  },
  mirrorMargins: document.getElementById("page-book-binding")?.checked || false,
  bindingOffset: getLayoutValue("page-binding-offset", "0.5cm"),
  headerHeight: getLayoutValue("page-header-height", "1.5cm"),
  footerHeight: getLayoutValue("page-footer-height", "1.5cm"),
  headerFirst: document.getElementById("page-header-first")?.checked || false,
  footerFirst: document.getElementById("page-footer-first")?.checked || false,
  headerContent: {
    left: getLayoutValue("page-header-left", ""),
    center: getLayoutValue("page-header-center", ""),
    right: getLayoutValue("page-header-right", "")
  },
  footerContent: {
    left: getLayoutValue("page-footer-left", ""),
    center: getLayoutValue("page-footer-center", ""),
    right: getLayoutValue("page-footer-right", "")
  },
  columns: {
    count: getLayoutValue("page-columns", "1"),
    gap: getLayoutValue("page-column-gap", "1.5cm")
  }
});

const readTableSettings = () => ({
  type: getLayoutValue("table-type", "standard"),
  layout: getLayoutValue("table-layout", "auto"),
  width: getLayoutValue("table-width", "100%"),
  alignment: getLayoutValue("table-alignment", "left"),
  borderWidth: getLayoutValue("table-border-width", "1px"),
  borderStyle: getLayoutValue("table-border-style", "solid"),
  borderColor: getLayoutValue("table-border-color", "#cccccc"),
  header: {
    dedicated: document.getElementById("table-header-dedicated")?.checked ?? true,
    fontFamily: getLayoutValue("table-header-font-family", "Source Serif 4"),
    fontSize: getLayoutValue("table-header-font-size", "10pt"),
    fontWeight: getLayoutValue("table-header-font-weight", "700"),
    align: getAlignGroupValue("table-header-align-group", getLayoutValue("table-header-align", "center")),
    lineHeight: getLayoutValue("table-header-line-height", "1.4"),
    color: getLayoutValue("table-header-color", "#1a1a1a"),
    indentLeft: getLayoutValue("table-header-indent-left", "0"),
    italic: document.getElementById("table-header-italic")?.classList.contains("active") || false,
    underline: document.getElementById("table-header-underline")?.classList.contains("active") || false,
    smallCaps: document.getElementById("table-header-small-caps")?.classList.contains("active") || false,
    background: getLayoutValue("table-header-bg", "#f0f0f0"),
    padding: {
      top: getLayoutValue("table-header-padding-top", "8px"),
      right: getLayoutValue("table-header-padding-right", "8px"),
      bottom: getLayoutValue("table-header-padding-bottom", "8px"),
      left: getLayoutValue("table-header-padding-left", "8px")
    }
  },
  cell: {
    fontFamily: getLayoutValue("table-cell-font-family", "Source Serif 4"),
    fontSize: getLayoutValue("table-cell-font-size", "10pt"),
    fontWeight: getLayoutValue("table-cell-font-weight", "400"),
    align: getAlignGroupValue("table-cell-align-group", getLayoutValue("table-cell-align", "left")),
    lineHeight: getLayoutValue("table-cell-line-height", "1.4"),
    color: getLayoutValue("table-cell-color", "#1a1a1a"),
    indentLeft: getLayoutValue("table-cell-indent-left", "0"),
    italic: document.getElementById("table-cell-italic")?.classList.contains("active") || false,
    underline: document.getElementById("table-cell-underline")?.classList.contains("active") || false,
    smallCaps: document.getElementById("table-cell-small-caps")?.classList.contains("active") || false,
    background: getLayoutValue("table-cell-bg", "#ffffff"),
    padding: {
      top: getLayoutValue("table-cell-padding-top", "8px"),
      right: getLayoutValue("table-cell-padding-right", "8px"),
      bottom: getLayoutValue("table-cell-padding-bottom", "8px"),
      left: getLayoutValue("table-cell-padding-left", "8px")
    }
  },
  firstRow: {
    dedicated: document.getElementById("table-first-row-dedicated")?.checked ?? true,
    fontFamily: getLayoutValue("table-first-row-font-family", "Source Serif 4"),
    fontSize: getLayoutValue("table-first-row-font-size", "10pt"),
    fontWeight: getLayoutValue("table-first-row-font-weight", "400"),
    align: getAlignGroupValue("table-first-row-align-group", getLayoutValue("table-first-row-align", "left")),
    lineHeight: getLayoutValue("table-first-row-line-height", "1.4"),
    color: getLayoutValue("table-first-row-color", "#1a1a1a"),
    indentLeft: getLayoutValue("table-first-row-indent-left", "0"),
    italic: document.getElementById("table-first-row-italic")?.classList.contains("active") || false,
    underline: document.getElementById("table-first-row-underline")?.classList.contains("active") || false,
    smallCaps: document.getElementById("table-first-row-small-caps")?.classList.contains("active") || false,
    background: getLayoutValue("table-first-row-bg", "#ffffff"),
    padding: {
      top: getLayoutValue("table-first-row-padding-top", "8px"),
      right: getLayoutValue("table-first-row-padding-right", "8px"),
      bottom: getLayoutValue("table-first-row-padding-bottom", "8px"),
      left: getLayoutValue("table-first-row-padding-left", "8px")
    }
  },
  lastRow: {
    dedicated: document.getElementById("table-last-row-dedicated")?.checked ?? true,
    fontFamily: getLayoutValue("table-last-row-font-family", "Source Serif 4"),
    fontSize: getLayoutValue("table-last-row-font-size", "10pt"),
    fontWeight: getLayoutValue("table-last-row-font-weight", "400"),
    align: getAlignGroupValue("table-last-row-align-group", getLayoutValue("table-last-row-align", "left")),
    lineHeight: getLayoutValue("table-last-row-line-height", "1.4"),
    color: getLayoutValue("table-last-row-color", "#1a1a1a"),
    indentLeft: getLayoutValue("table-last-row-indent-left", "0"),
    italic: document.getElementById("table-last-row-italic")?.classList.contains("active") || false,
    underline: document.getElementById("table-last-row-underline")?.classList.contains("active") || false,
    smallCaps: document.getElementById("table-last-row-small-caps")?.classList.contains("active") || false,
    background: getLayoutValue("table-last-row-bg", "#ffffff"),
    padding: {
      top: getLayoutValue("table-last-row-padding-top", "8px"),
      right: getLayoutValue("table-last-row-padding-right", "8px"),
      bottom: getLayoutValue("table-last-row-padding-bottom", "8px"),
      left: getLayoutValue("table-last-row-padding-left", "8px")
    }
  },
  altRow: {
    dedicated: document.getElementById("table-alt-row-dedicated")?.checked ?? true,
    fontFamily: getLayoutValue("table-alt-row-font-family", "Source Serif 4"),
    fontSize: getLayoutValue("table-alt-row-font-size", "10pt"),
    fontWeight: getLayoutValue("table-alt-row-font-weight", "400"),
    align: getAlignGroupValue("table-alt-row-align-group", getLayoutValue("table-alt-row-align", "left")),
    lineHeight: getLayoutValue("table-alt-row-line-height", "1.4"),
    color: getLayoutValue("table-alt-row-color", "#1a1a1a"),
    indentLeft: getLayoutValue("table-alt-row-indent-left", "0"),
    italic: document.getElementById("table-alt-row-italic")?.classList.contains("active") || false,
    underline: document.getElementById("table-alt-row-underline")?.classList.contains("active") || false,
    smallCaps: document.getElementById("table-alt-row-small-caps")?.classList.contains("active") || false,
    background: getLayoutValue("table-alt-row-bg", "#f9f9f9"),
    padding: {
      top: getLayoutValue("table-alt-row-padding-top", "8px"),
      right: getLayoutValue("table-alt-row-padding-right", "8px"),
      bottom: getLayoutValue("table-alt-row-padding-bottom", "8px"),
      left: getLayoutValue("table-alt-row-padding-left", "8px")
    }
  }
});

const getTablePresetForLayout = (layoutPreset, currentTable = {}) => {
  const base = normalizeTableState(currentTable || {});
  const preset = (layoutPreset || "scientific").toLowerCase();

  if (preset === "compact") {
    return {
      ...base,
      type: "compact",
      layout: "fixed",
      width: "100%",
      alignment: "left",
      borderWidth: "0.5px",
      borderStyle: "solid",
      borderColor: "#d9d9d9",
      header: {
        ...(base.header || {}),
        dedicated: true,
        fontSize: "9pt",
        fontWeight: "600",
        align: "left",
        background: "#f3f3f3",
        padding: { ...(base.header?.padding || {}), top: "4px", right: "6px", bottom: "4px", left: "6px" }
      },
      cell: {
        ...(base.cell || {}),
        fontSize: "9pt",
        lineHeight: "1.35",
        align: "left",
        background: "#ffffff",
        padding: { ...(base.cell?.padding || {}), top: "4px", right: "6px", bottom: "4px", left: "6px" }
      },
      altRow: {
        ...(base.altRow || {}),
        dedicated: true,
        background: "#f8f8f8"
      }
    };
  }

  if (preset === "literary") {
    return {
      ...base,
      type: "standard",
      layout: "auto",
      width: "100%",
      alignment: "center",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "#cfc8bb",
      header: {
        ...(base.header || {}),
        dedicated: true,
        fontFamily: "Georgia, serif",
        fontSize: "10pt",
        fontWeight: "600",
        align: "left",
        background: "#f7f3ec",
        padding: { ...(base.header?.padding || {}), top: "8px", right: "10px", bottom: "8px", left: "10px" }
      },
      cell: {
        ...(base.cell || {}),
        fontFamily: "Georgia, serif",
        fontSize: "10pt",
        lineHeight: "1.55",
        align: "left",
        background: "#fffdfa",
        padding: { ...(base.cell?.padding || {}), top: "8px", right: "10px", bottom: "8px", left: "10px" }
      },
      altRow: {
        ...(base.altRow || {}),
        dedicated: true,
        background: "#faf7f2"
      }
    };
  }

  return {
    ...base,
    type: "scientific",
    layout: "auto",
    width: "100%",
    alignment: "left",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#000000",
    header: {
      ...(base.header || {}),
      dedicated: true,
      fontFamily: "Source Serif 4",
      fontSize: "10pt",
      fontWeight: "700",
      align: "left",
      background: "#ffffff",
      padding: { ...(base.header?.padding || {}), top: "6px", right: "8px", bottom: "6px", left: "8px" }
    },
    cell: {
      ...(base.cell || {}),
      fontFamily: "Source Serif 4",
      fontSize: "10pt",
      lineHeight: "1.4",
      align: "left",
      background: "#ffffff",
      padding: { ...(base.cell?.padding || {}), top: "5px", right: "8px", bottom: "5px", left: "8px" }
    },
    altRow: {
      ...(base.altRow || {}),
      dedicated: false,
      background: "#ffffff"
    }
  };
};

const readElementAttributesFromForm = (activeTabContent) => {
  const alignBtn = activeTabContent.querySelector(".layout-align-btn.active");
  return {
    fontFamily: activeTabContent.querySelector("#attr-font-family")?.value,
    fontSize: activeTabContent.querySelector("#attr-font-size")?.value,
    fontWeight: activeTabContent.querySelector("#attr-font-weight")?.value,
    color: activeTabContent.querySelector("#attr-color")?.value,
    lineHeight: activeTabContent.querySelector("#attr-line-height")?.value,
    spacingBefore: activeTabContent.querySelector("#attr-spacing-before")?.value,
    spacingAfter: activeTabContent.querySelector("#attr-spacing-after")?.value,
    align: alignBtn?.dataset.align,
    italic: activeTabContent.querySelector("#attr-italic")?.classList.contains("active") || false,
    underline: activeTabContent.querySelector("#attr-underline")?.classList.contains("active") || false,
    smallCaps: activeTabContent.querySelector("#attr-small-caps")?.classList.contains("active") || false,
    indent: activeTabContent.querySelector("#attr-indent")?.value,
    markerSpacing: activeTabContent.querySelector("#attr-marker-spacing")?.value,
    ulMarker: activeTabContent.querySelector("#attr-ul-marker")?.value,
    olStyle: activeTabContent.querySelector("#attr-ol-style")?.value,
    headingNumbered: activeTabContent.querySelector("#attr-heading-numbered")?.checked || false
  };
};

const setActiveTableSection = (section) => {
  const tabContent = document.querySelector('.layout-editor-tab-content[data-content="table"]');
  if (!tabContent) return;
  const listItems = tabContent.querySelectorAll(".layout-table-section-item");
  const sections = tabContent.querySelectorAll(".layout-table-section");

  listItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.tableSection === section);
  });
  sections.forEach((item) => {
    item.classList.toggle("active", item.dataset.tableSection === section);
  });
};

const updateTableDedicatedVisibility = () => {
  const tabContent = document.querySelector('.layout-editor-tab-content[data-content="table"]');
  if (!tabContent) return;
  tabContent.querySelectorAll("[data-dedicated-content]").forEach((content) => {
    const toggleId = content.dataset.dedicatedContent;
    const toggle = document.getElementById(toggleId);
    const isActive = toggle?.checked ?? true;
    content.classList.toggle("active", isActive);
  });
};

const loadLayoutEditorValues = () => {
  if (getCurrentLayoutPreset() === "document") {
    syncDocumentPresetState();
  } else {
    layoutEditorState = loadLayoutEditorState();
  }

  // Apply page settings
  const page = layoutEditorState.page || {};
  setLayoutValue("page-size", page.size || "A4");
  const orientation = page.orientation || "portrait";
  document.querySelectorAll(".layout-orientation-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.orientation === orientation);
  });
  setLayoutValue("page-margin-top", page.margins?.top || "2.5cm");
  setLayoutValue("page-margin-right", page.margins?.right || "2cm");
  setLayoutValue("page-margin-bottom", page.margins?.bottom || "2cm");
  setLayoutValue("page-margin-left", page.margins?.left || "2.5cm");
  setLayoutChecked("page-book-binding", page.mirrorMargins || false);
  setLayoutValue("page-binding-offset", page.bindingOffset || "0.5cm");
  setLayoutValue("page-header-height", page.headerHeight || "1.5cm");
  setLayoutValue("page-footer-height", page.footerHeight || "1.5cm");
  setLayoutChecked("page-header-first", page.headerFirst || false);
  setLayoutChecked("page-footer-first", page.footerFirst || false);
  setLayoutValue("page-header-left", page.headerContent?.left || "");
  setLayoutValue("page-header-center", page.headerContent?.center || "");
  setLayoutValue("page-header-right", page.headerContent?.right || "");
  setLayoutValue("page-footer-left", page.footerContent?.left || "");
  setLayoutValue("page-footer-center", page.footerContent?.center || "");
  setLayoutValue("page-footer-right", page.footerContent?.right || "");
  setLayoutValue("page-columns", page.columns?.count || "1");
  setLayoutValue("page-column-gap", page.columns?.gap || "1.5cm");

  if (bindingOffsetRow) {
    bindingOffsetRow.style.display = page.mirrorMargins ? "grid" : "none";
  }

  // Apply table settings
  const tableBundle = getCurrentTableBundle();
  populateTableLayoutProfileSelector();
  const table = getCurrentTableSettings();
  layoutEditorState.table = table;
  const currentTableLayoutName = tableBundle.activeLayout || "default";
  setLayoutValue("table-layout-name", currentTableLayoutName);
  if (elements.tableLayoutName) {
    elements.tableLayoutName.readOnly = currentTableLayoutName === "default";
    if (shouldFocusTableLayoutName && currentTableLayoutName !== "default") {
      elements.tableLayoutName.focus();
      elements.tableLayoutName.select();
      shouldFocusTableLayoutName = false;
    }
  }
  if (elements.tableLayoutProfileDelete) {
    elements.tableLayoutProfileDelete.hidden = currentTableLayoutName === "default";
  }
  setLayoutValue("table-type", table.type || "standard");
  setLayoutValue("table-layout", table.layout || "auto");
  setLayoutValue("table-width", table.width || "100%");
  setLayoutValue("table-alignment", table.alignment || "left");
  setLayoutValue("table-border-width", table.borderWidth || "1px");
  setLayoutValue("table-border-style", table.borderStyle || "solid");
  setLayoutValue("table-border-color", table.borderColor || "#cccccc");
  setLayoutValue("table-cell-padding-top", table.cell?.padding?.top || "8px");
  setLayoutValue("table-cell-padding-right", table.cell?.padding?.right || "8px");
  setLayoutValue("table-cell-padding-bottom", table.cell?.padding?.bottom || "8px");
  setLayoutValue("table-cell-padding-left", table.cell?.padding?.left || "8px");

  setLayoutChecked("table-header-dedicated", table.header?.dedicated ?? true);
  setLayoutValue("table-header-font-family", table.header?.fontFamily || "Source Serif 4");
  setLayoutValue("table-header-font-size", table.header?.fontSize || "10pt");
  setLayoutValue("table-header-font-weight", table.header?.fontWeight || "700");
  setAlignGroupValue("table-header-align-group", table.header?.align || "center");
  setLayoutValue("table-header-line-height", table.header?.lineHeight || "1.4");
  setLayoutValue("table-header-color", table.header?.color || "#1a1a1a");
  setLayoutValue("table-header-indent-left", table.header?.indentLeft || "0");
  setLayoutValue("table-header-bg", table.header?.background || "#f0f0f0");
  setLayoutValue("table-header-padding-top", table.header?.padding?.top || "8px");
  setLayoutValue("table-header-padding-right", table.header?.padding?.right || "8px");
  setLayoutValue("table-header-padding-bottom", table.header?.padding?.bottom || "8px");
  setLayoutValue("table-header-padding-left", table.header?.padding?.left || "8px");
  document.getElementById("table-header-italic")?.classList.toggle("active", Boolean(table.header?.italic));
  document.getElementById("table-header-underline")?.classList.toggle("active", Boolean(table.header?.underline));
  document.getElementById("table-header-small-caps")?.classList.toggle("active", Boolean(table.header?.smallCaps));

  setLayoutValue("table-cell-font-family", table.cell?.fontFamily || "Source Serif 4");
  setLayoutValue("table-cell-font-size", table.cell?.fontSize || "10pt");
  setLayoutValue("table-cell-font-weight", table.cell?.fontWeight || "400");
  setAlignGroupValue("table-cell-align-group", table.cell?.align || "left");
  setLayoutValue("table-cell-line-height", table.cell?.lineHeight || "1.4");
  setLayoutValue("table-cell-color", table.cell?.color || "#1a1a1a");
  setLayoutValue("table-cell-indent-left", table.cell?.indentLeft || "0");
  setLayoutValue("table-cell-bg", table.cell?.background || "#ffffff");
  document.getElementById("table-cell-italic")?.classList.toggle("active", Boolean(table.cell?.italic));
  document.getElementById("table-cell-underline")?.classList.toggle("active", Boolean(table.cell?.underline));
  document.getElementById("table-cell-small-caps")?.classList.toggle("active", Boolean(table.cell?.smallCaps));

  setLayoutChecked("table-first-row-dedicated", table.firstRow?.dedicated ?? true);
  setLayoutValue("table-first-row-font-family", table.firstRow?.fontFamily || "Source Serif 4");
  setLayoutValue("table-first-row-font-size", table.firstRow?.fontSize || "10pt");
  setLayoutValue("table-first-row-font-weight", table.firstRow?.fontWeight || "400");
  setAlignGroupValue("table-first-row-align-group", table.firstRow?.align || "left");
  setLayoutValue("table-first-row-line-height", table.firstRow?.lineHeight || "1.4");
  setLayoutValue("table-first-row-color", table.firstRow?.color || "#1a1a1a");
  setLayoutValue("table-first-row-indent-left", table.firstRow?.indentLeft || "0");
  setLayoutValue("table-first-row-bg", table.firstRow?.background || "#ffffff");
  setLayoutValue("table-first-row-padding-top", table.firstRow?.padding?.top || "8px");
  setLayoutValue("table-first-row-padding-right", table.firstRow?.padding?.right || "8px");
  setLayoutValue("table-first-row-padding-bottom", table.firstRow?.padding?.bottom || "8px");
  setLayoutValue("table-first-row-padding-left", table.firstRow?.padding?.left || "8px");
  document.getElementById("table-first-row-italic")?.classList.toggle("active", Boolean(table.firstRow?.italic));
  document.getElementById("table-first-row-underline")?.classList.toggle("active", Boolean(table.firstRow?.underline));
  document.getElementById("table-first-row-small-caps")?.classList.toggle("active", Boolean(table.firstRow?.smallCaps));

  setLayoutChecked("table-last-row-dedicated", table.lastRow?.dedicated ?? true);
  setLayoutValue("table-last-row-font-family", table.lastRow?.fontFamily || "Source Serif 4");
  setLayoutValue("table-last-row-font-size", table.lastRow?.fontSize || "10pt");
  setLayoutValue("table-last-row-font-weight", table.lastRow?.fontWeight || "400");
  setAlignGroupValue("table-last-row-align-group", table.lastRow?.align || "left");
  setLayoutValue("table-last-row-line-height", table.lastRow?.lineHeight || "1.4");
  setLayoutValue("table-last-row-color", table.lastRow?.color || "#1a1a1a");
  setLayoutValue("table-last-row-indent-left", table.lastRow?.indentLeft || "0");
  setLayoutValue("table-last-row-bg", table.lastRow?.background || "#ffffff");
  setLayoutValue("table-last-row-padding-top", table.lastRow?.padding?.top || "8px");
  setLayoutValue("table-last-row-padding-right", table.lastRow?.padding?.right || "8px");
  setLayoutValue("table-last-row-padding-bottom", table.lastRow?.padding?.bottom || "8px");
  setLayoutValue("table-last-row-padding-left", table.lastRow?.padding?.left || "8px");
  document.getElementById("table-last-row-italic")?.classList.toggle("active", Boolean(table.lastRow?.italic));
  document.getElementById("table-last-row-underline")?.classList.toggle("active", Boolean(table.lastRow?.underline));
  document.getElementById("table-last-row-small-caps")?.classList.toggle("active", Boolean(table.lastRow?.smallCaps));

  setLayoutChecked("table-alt-row-dedicated", table.altRow?.dedicated ?? true);
  setLayoutValue("table-alt-row-font-family", table.altRow?.fontFamily || "Source Serif 4");
  setLayoutValue("table-alt-row-font-size", table.altRow?.fontSize || "10pt");
  setLayoutValue("table-alt-row-font-weight", table.altRow?.fontWeight || "400");
  setAlignGroupValue("table-alt-row-align-group", table.altRow?.align || "left");
  setLayoutValue("table-alt-row-line-height", table.altRow?.lineHeight || "1.4");
  setLayoutValue("table-alt-row-color", table.altRow?.color || "#1a1a1a");
  setLayoutValue("table-alt-row-indent-left", table.altRow?.indentLeft || "0");
  setLayoutValue("table-alt-row-bg", table.altRow?.background || "#f9f9f9");
  setLayoutValue("table-alt-row-padding-top", table.altRow?.padding?.top || "8px");
  setLayoutValue("table-alt-row-padding-right", table.altRow?.padding?.right || "8px");
  setLayoutValue("table-alt-row-padding-bottom", table.altRow?.padding?.bottom || "8px");
  setLayoutValue("table-alt-row-padding-left", table.altRow?.padding?.left || "8px");
  document.getElementById("table-alt-row-italic")?.classList.toggle("active", Boolean(table.altRow?.italic));
  document.getElementById("table-alt-row-underline")?.classList.toggle("active", Boolean(table.altRow?.underline));
  document.getElementById("table-alt-row-small-caps")?.classList.toggle("active", Boolean(table.altRow?.smallCaps));

  const activeTableSection = document.querySelector(".layout-table-section-item.active")?.dataset.tableSection || "layout";
  setActiveTableSection(activeTableSection);
  updateTableDedicatedVisibility();

  // Apply current element attributes
  const activeTabContent = document.querySelector(".layout-editor-tab-content.active");
  const activeElement = activeTabContent?.querySelector(".layout-text-element-item.active");
  if (activeElement?.dataset.element) {
    loadElementAttributes(activeElement.dataset.element);
  }

  layoutEditorState.page = readPageSettings();
  saveCurrentTableSettingsToState();
  applyLayoutEditorCss();
};

const saveLayoutEditorValues = () => {
  if (getCurrentLayoutPreset() === "document") {
    layoutEditorState.page = readPageSettings();
    saveCurrentTableSettingsToState();

    const markdown = getMarkdown();
    const layout = getEffectiveDocumentLayout(markdown, { ignorePermission: true });
    const pageSettings = layoutEditorState.page;
    const tableBundle = getCurrentTableBundle();

    layout.page = {
      ...(layout.page || {}),
      size: pageSettings.size,
      orientation: pageSettings.orientation,
      margins: {
        ...(layout.page?.margins || {}),
        top: pageSettings.margins?.top,
        right: pageSettings.margins?.right,
        bottom: pageSettings.margins?.bottom,
        left: pageSettings.margins?.left
      },
      mirrorMargins: pageSettings.mirrorMargins,
      bindingOffset: pageSettings.bindingOffset
    };

    layout.header = {
      ...(layout.header || {}),
      enabled: Boolean(pageSettings.headerContent?.left || pageSettings.headerContent?.center || pageSettings.headerContent?.right),
      hideOnFirstPage: !pageSettings.headerFirst,
      left: pageSettings.headerContent?.left || "",
      center: pageSettings.headerContent?.center || "",
      right: pageSettings.headerContent?.right || "",
      offset: pageSettings.headerHeight || layout.header?.offset || "6mm"
    };

    layout.footer = {
      ...(layout.footer || {}),
      enabled: Boolean(pageSettings.footerContent?.left || pageSettings.footerContent?.center || pageSettings.footerContent?.right),
      hideOnFirstPage: !pageSettings.footerFirst,
      left: pageSettings.footerContent?.left || "",
      center: pageSettings.footerContent?.center || "",
      right: pageSettings.footerContent?.right || "",
      offset: pageSettings.footerHeight || layout.footer?.offset || "6mm"
    };

    const columnCount = Number(pageSettings.columns?.count || "1");
    layout.columns = {
      ...(layout.columns || {}),
      enabled: columnCount > 1,
      count: columnCount,
      gap: pageSettings.columns?.gap || layout.columns?.gap || "20pt"
    };

    layout.tableLayouts = {};
    Object.entries(tableBundle.layouts || {}).forEach(([name, table]) => {
      layout.tableLayouts[name] = normalizeTableState(table);
    });

    const updatedMarkdown = documentLayout.updateInMarkdown(markdown, layout);
    setMarkdown(updatedMarkdown);
    refreshDynamicStyles(updatedMarkdown);
    renderPreview();
    closeLayoutEditor();
    setStatus(t("saved"), "success");
    return;
  }

  layoutEditorState.page = readPageSettings();
  saveCurrentTableSettingsToState();
  saveLayoutEditorState();
  applyLayoutEditorCss();
  closeLayoutEditor();
};

// Load tips with locale-aware fallback (de -> tips.json, en -> tips-en.json)
const loadTips = async (force = false) => {
  const locale = currentLocale || getLocale();
  if (!force && tipsData.length > 0 && tipsLoadedLocale === locale) return tipsData;
  const tipUrl = locale === "en" ? "/tips-en.json" : "/tips.json";
  try {
    const response = await fetch(tipUrl);
    if (response.ok) {
      tipsData = await response.json();
      tipsLoadedLocale = locale;
      return tipsData;
    } else {
      // File not found or other error
      tipsData = [];
      tipsLoadedLocale = null;
    }
  } catch (error) {
    // Ignore tip load failures silently
    tipsData = [];
    tipsLoadedLocale = null;
  }
  return tipsData;
};

const displayRandomTip = async () => {
  // Load tips if not already loaded
  await loadTips();
  
  if (tipsData.length === 0) return;
  
  // Select random tip
  const randomTip = tipsData[Math.floor(Math.random() * tipsData.length)];
  
  // Get tip elements
  const tipTitleEl = document.getElementById("randomTipTitle");
  const tipTextEl = document.getElementById("randomTipText");
  const tipIconEl = document.getElementById("randomTipIcon");
  
  // Set category icon
  const categoryIcons = {
    markdown: "fa-book",
    shortcuts: "fa-keyboard",
    features: "fa-star",
    mermaid: "fa-diagram-project"
  };
  
  if (tipIconEl) {
    tipIconEl.className = `fa-solid ${categoryIcons[randomTip.category] || "fa-lightbulb"}`;
  }
  
  // Set tip content
  if (tipTitleEl) tipTitleEl.textContent = randomTip.title;
  if (tipTextEl) {
    // Clear previous content
    tipTextEl.innerHTML = "";
    
    // Add text
    const textNode = document.createTextNode(randomTip.text);
    tipTextEl.appendChild(textNode);
    
    // Add example if available
    if (randomTip.example) {
      const exampleEl = document.createElement("pre");
      exampleEl.style.cssText = "margin-top: 12px; padding: 10px; background: var(--bg-lighter); border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;";
      exampleEl.textContent = randomTip.example;
      tipTextEl.appendChild(exampleEl);
    }
  }
};

const showTipsModal = async () => {
  await loadTips();
  
  // Don't show modal if no tips are available
  if (tipsData.length === 0) {
    return;
  }
  
  await displayRandomTip();
  
  // Show modal
  elements.tipsModal?.classList.remove("hidden");
  elements.tipsOverlay?.classList.remove("hidden");
};

const closeTipsModal = () => {
  elements.tipsModal?.classList.add("hidden");
  elements.tipsOverlay?.classList.add("hidden");
  
  // Check if "don't show again" was checked
  if (elements.dontShowTipsAgain?.checked) {
    activeSettings.showStartupTips = false;
    saveSettings(activeSettings);
  }
};

// Workspace Management
const getWorkspaces = () => {
  const workspaces = localStorage.getItem("workspaces");
  const parsed = workspaces
    ? JSON.parse(workspaces)
    : { default: { name: "Standard", pastes: [], pinned: false } };
  return normalizeWorkspaces(parsed);
};

const saveWorkspaces = (workspaces) => {
  localStorage.setItem("workspaces", JSON.stringify(workspaces));
};

const loadWorkspaceSelect = () => {
  const workspaces = getWorkspaces();
  const select = elements.workspaceSelect;
  if (!select) return;
  
  select.innerHTML = "";
  Object.keys(workspaces).forEach(key => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = workspaces[key].name;
    if (key === currentWorkspace) option.selected = true;
    select.appendChild(option);
  });
  
  updateWorkspaceInfo();
};

const updateWorkspaceInfo = () => {
  const workspaces = getWorkspaces();
  const workspace = workspaces[currentWorkspace];
  if (!workspace || !elements.workspaceInfo) return;
  
  const count = workspace.pastes?.length || 0;
  elements.workspaceInfo.textContent = t("workspaceInfo")
    .replace("{name}", workspace.name)
    .replace("{count}", count);
  
  // Update current space name display
  if (elements.currentSpaceName) {
    elements.currentSpaceName.textContent = workspace.name;
  }
};

const updateWorkspacePastes = () => {
  // Sync current workspace with actual pastes from server
  const workspaces = getWorkspaces();
  const workspace = workspaces[currentWorkspace];
  if (!workspace) return;
  
  workspace.pastes = historyCache.map(p => p.id);
  saveWorkspaces(workspaces);
  updateWorkspaceInfo();
};

const switchWorkspace = (workspaceId) => {
  currentWorkspace = workspaceId;
  localStorage.setItem("currentWorkspace", workspaceId);
  loadWorkspaceSelect();
  
  // Filter history to show only pastes from this workspace
  const workspaces = getWorkspaces();
  const workspace = workspaces[workspaceId];
  if (workspace && workspace.pastes && workspace.pastes.length > 0) {
    // Load only pastes that belong to this workspace
    fetch("/api/pastes")
      .then(r => r.json())
      .then(pastes => {
        const workspacePasteIds = new Set(workspace.pastes.map(normalizePasteId));
        historyCache = pastes.filter((p) => workspacePasteIds.has(normalizePasteId(p.id)));
        historyCache = workspace.pinned ? orderByWorkspace(workspace, historyCache) : applyHistoryOrder(historyCache);
        scheduleRenderHistory();
        updateWorkspaceInfo();
        
        // Check if current paste belongs to this workspace
        if (currentPasteId && !workspacePasteIds.has(normalizePasteId(currentPasteId))) {
          // Current paste doesn't belong to this workspace
          // Load the first paste from the workspace or clear editor
          if (historyCache.length > 0) {
            loadPaste(historyCache[0].id);
          } else {
            currentPasteId = null;
            lastSavedMarkdown = "";
            setMarkdown("");
            renderPreview();
            renderTree();
          }
        }
      });
  } else {
    loadHistory();
    // If workspace is empty, clear the editor
    if (currentPasteId) {
      currentPasteId = null;
      lastSavedMarkdown = "";
      setMarkdown("");
      renderPreview();
      renderTree();
    }
  }
};

const createWorkspace = () => {
  const name = prompt(t("workspaceNewPrompt"));
  if (!name || !name.trim()) return;
  
  const workspaces = getWorkspaces();
  const id = `ws_${Date.now()}`;
  workspaces[id] = { name: name.trim(), pastes: [], pinned: false };
  saveWorkspaces(workspaces);
  
  switchWorkspace(id);
  setStatus(t("workspaceCreated"), "success");
};

const renameWorkspace = () => {
  if (currentWorkspace === "default") {
    setStatus(t("workspaceDefaultNoRename"), "error");
    return;
  }
  
  const workspaces = getWorkspaces();
  const workspace = workspaces[currentWorkspace];
  const newName = prompt(t("workspaceRenamePrompt"), workspace.name);
  if (!newName || !newName.trim()) return;
  
  workspace.name = newName.trim();
  saveWorkspaces(workspaces);
  loadWorkspaceSelect();
  setStatus(t("workspaceRenamed"), "success");
};

const deleteWorkspace = () => {
  if (currentWorkspace === "default") {
    setStatus(t("workspaceDefaultNoDelete"), "error");
    return;
  }
  
  const workspaces = getWorkspaces();
  const workspace = workspaces[currentWorkspace];
  const count = workspace.pastes?.length || 0;
  
  const confirmMsg = t("workspaceDeleteConfirm")
    .replace("{name}", workspace.name)
    .replace("{count}", count);
    
  if (!confirm(confirmMsg)) return;
  
  delete workspaces[currentWorkspace];
  saveWorkspaces(workspaces);
  
  switchWorkspace("default");
  setStatus(t("workspaceDeleted"), "success");
};

// Spaces Overview
const openSpacesOverview = async () => {
  elements.spacesModal?.classList.remove("hidden");
  elements.spacesOverlay?.classList.remove("hidden");
  await renderSpacesGrid();
};

const closeSpacesOverview = () => {
  elements.spacesModal?.classList.add("hidden");
  elements.spacesOverlay?.classList.add("hidden");
};

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const fetchAllPastes = async () => {
  const response = await fetch("/api/pastes");
  if (!response.ok) {
    throw new Error(`Failed to load pastes: ${response.status}`);
  }
  return response.json();
};

const fetchPasteDetails = async (pasteId) => {
  const response = await fetch(`/api/pastes/${pasteId}`);
  if (!response.ok) {
    throw new Error(`Failed to load paste ${pasteId}: ${response.status}`);
  }
  return response.json();
};

const extractAssetUrls = (markdown = "") => {
  const matches = markdown.match(/\/assets\/[^\s)"']+/g) || [];
  return Array.from(new Set(matches));
};

const addAssetsToZip = async (zip, assetUrls) => {
  await Promise.all(assetUrls.map(async (assetUrl) => {
    try {
      const response = await fetch(assetUrl);
      if (!response.ok) return;
      const blob = await response.blob();
      zip.file(assetUrl.replace(/^\//, ""), blob);
    } catch (error) {
      console.warn("Failed to add asset to ZIP:", assetUrl, error);
    }
  }));
};

const downloadSpaceZip = async (workspaceId) => {
  const workspaces = getWorkspaces();
  const workspace = workspaces[workspaceId];
  if (!workspace) return;

  const workspacePasteIds = new Set((workspace.pastes || []).map(normalizePasteId));
  if (!workspacePasteIds.size) {
    setStatus(t("emptyExport"), "error");
    return;
  }

  try {
    const allPastes = await fetchAllPastes();
    const selected = allPastes.filter((paste) => workspacePasteIds.has(normalizePasteId(paste.id)));
    if (!selected.length) {
      setStatus(t("emptyExport"), "error");
      return false;
    }

    const zip = new JSZip();
    const nameCounts = new Map();

    await Promise.all(selected.map(async (paste, index) => {
      try {
        const data = await fetchPasteDetails(paste.id);
        const base = toSafeFilename(data.title, `document-${index + 1}`);
        const count = (nameCounts.get(base) || 0) + 1;
        nameCounts.set(base, count);
        const filename = count > 1 ? `${base}-${count}.md` : `${base}.md`;
        zip.file(filename, data.markdown || "");
      } catch (error) {
        console.warn("Failed to add paste to ZIP:", error);
      }
    }));

    const blob = await zip.generateAsync({ type: "blob" });
    const safeSpaceName = toSafeFilename(workspace.name, "space");
    triggerBlobDownload(blob, `${safeSpaceName}.zip`);
    return true;
  } catch (error) {
    console.error("Failed to load pastes for ZIP:", error);
    setStatus(t("syncFailed"), "error");
    return false;
  }
};

const downloadBackupZip = async () => {
  const workspaces = getWorkspaces();
  setStatus(t("syncExporting"), "info");

  try {
    const allPastes = await fetchAllPastes();
    const pasteMap = new Map(allPastes.map((paste) => [normalizePasteId(paste.id), paste]));
    const pasteDetailsCache = new Map();
    const zip = new JSZip();
    const manifest = {
      exportedAt: new Date().toISOString(),
      currentWorkspace,
      workspaces,
      pasteCount: allPastes.length
    };
    const assetUrls = new Set();
    const assignedPasteIds = new Set();

    const addPasteToFolder = async (folder, pasteId, index) => {
      const normalizedPasteId = normalizePasteId(pasteId);
      if (!pasteMap.has(normalizedPasteId)) return;
      let details = pasteDetailsCache.get(normalizedPasteId);
      if (!details) {
        details = await fetchPasteDetails(normalizedPasteId);
        pasteDetailsCache.set(normalizedPasteId, details);
      }
      const filename = `${toSafeFilename(details.title, `document-${index + 1}`)}.md`;
      folder.file(filename, details.markdown || "");
      extractAssetUrls(details.markdown).forEach((url) => assetUrls.add(url));
      assignedPasteIds.add(normalizedPasteId);
    };

    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
      const folder = zip.folder(`spaces/${toSafeFilename(workspace.name, workspaceId)}`);
      const pasteIds = (workspace.pastes || []).map(normalizePasteId);
      for (let index = 0; index < pasteIds.length; index += 1) {
        await addPasteToFolder(folder, pasteIds[index], index);
      }
    }

    const unassigned = allPastes.filter((paste) => !assignedPasteIds.has(normalizePasteId(paste.id)));
    if (unassigned.length) {
      const folder = zip.folder("spaces/unassigned");
      for (let index = 0; index < unassigned.length; index += 1) {
        await addPasteToFolder(folder, unassigned[index].id, index);
      }
    }

    zip.file("backup-manifest.json", JSON.stringify(manifest, null, 2));
    await addAssetsToZip(zip, Array.from(assetUrls));

    const blob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(blob, `md-backup-${new Date().toISOString().slice(0, 10)}.zip`);
    setStatus(t("syncExportSuccess"), "success");
  } catch (error) {
    console.error("Backup ZIP failed:", error);
    setStatus(t("syncFailed"), "error");
  }
};

const renderSpacesGrid = async () => {
  if (!elements.spacesGrid) return;
  
  const workspaces = getWorkspaces();
  const allPastes = await fetch("/api/pastes").then(r => r.json());
  
  elements.spacesGrid.innerHTML = "";
  
  // Render each workspace as a column
  Object.keys(workspaces).forEach(workspaceId => {
    const workspace = workspaces[workspaceId];
    const column = document.createElement("div");
    column.className = "space-column";
    column.dataset.workspaceId = workspaceId;
    
    // Header with editable name
    const header = document.createElement("div");
    header.className = "space-header";
    
    const nameInput = document.createElement("input");
    nameInput.className = "space-name";
    nameInput.value = workspace.name;
    nameInput.readOnly = true;
    
    nameInput.addEventListener("dblclick", () => {
      if (workspaceId !== "default") {
        nameInput.readOnly = false;
        nameInput.select();
      }
    });
    
    nameInput.addEventListener("blur", () => {
      nameInput.readOnly = true;
      if (nameInput.value.trim() && nameInput.value !== workspace.name) {
        workspace.name = nameInput.value.trim();
        saveWorkspaces(workspaces);
        updateWorkspaceInfo();
      } else {
        nameInput.value = workspace.name;
      }
    });
    
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        nameInput.blur();
      } else if (e.key === "Escape") {
        nameInput.value = workspace.name;
        nameInput.blur();
      }
    });
    
    header.appendChild(nameInput);
    
    // Click on header switches workspace
    header.addEventListener("click", (e) => {
      if (e.target === nameInput && !nameInput.readOnly) return;
      if (currentWorkspace !== workspaceId) {
        switchWorkspace(workspaceId);
        closeSpacesOverview();
        setStatus(t("workspaceSwitched"), "success");
      }
    });

    const actions = document.createElement("div");
    actions.className = "space-actions";

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = `space-action-btn space-pin${workspace.pinned ? " active" : ""}`;
    pinBtn.title = "Pin";
    pinBtn.innerHTML = '<i class="fa-solid fa-thumbtack"></i>';
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      workspace.pinned = !workspace.pinned;
      saveWorkspaces(workspaces);
      renderSpacesGrid();
      if (currentWorkspace === workspaceId) {
        switchWorkspace(currentWorkspace);
      }
    });
    actions.appendChild(pinBtn);

    const zipBtn = document.createElement("button");
    zipBtn.type = "button";
    zipBtn.className = "space-action-btn space-zip";
    zipBtn.title = "ZIP";
    zipBtn.innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
    zipBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadSpaceZip(workspaceId);
    });
    actions.appendChild(zipBtn);
    
    // Delete button (not for default workspace)
    if (workspaceId !== "default") {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "space-delete";
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(t("workspaceDeleteConfirm").replace("{name}", workspace.name).replace("{count}", workspace.pastes?.length || 0))) {
          delete workspaces[workspaceId];
          saveWorkspaces(workspaces);
          if (currentWorkspace === workspaceId) {
            switchWorkspace("default");
          }
          renderSpacesGrid();
        }
      });
      actions.appendChild(deleteBtn);
    }

    header.appendChild(actions);
    
    column.appendChild(header);
    
    // Files container
    const filesContainer = document.createElement("div");
    filesContainer.className = "space-files";
    filesContainer.dataset.workspaceId = workspaceId;
    
    // Add pastes belonging to this workspace
    const workspacePasteIds = new Set((workspace.pastes || []).map(normalizePasteId));
    let workspacePastes = allPastes.filter((p) => workspacePasteIds.has(normalizePasteId(p.id)));
    if (workspace.pinned) {
      workspacePastes = orderByWorkspace(workspace, workspacePastes);
    } else {
      workspacePastes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    workspacePastes.forEach(paste => {
      const card = createSpaceFileCard(paste, workspaceId);
      filesContainer.appendChild(card);
    });
    
    // Drag and drop for reordering within workspace
    filesContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      filesContainer.classList.add("drag-over");
      const targetCard = e.target.closest(".space-file-card");
      const cards = filesContainer.querySelectorAll(".space-file-card");
      cards.forEach((card) => card.classList.remove("drop-before", "drop-after"));
      if (targetCard && filesContainer.contains(targetCard)) {
        const rect = targetCard.getBoundingClientRect();
        const before = e.clientY - rect.top < rect.height / 2;
        targetCard.classList.add(before ? "drop-before" : "drop-after");
      }
    });
    
    filesContainer.addEventListener("dragleave", (e) => {
      if (e.target === filesContainer) {
        filesContainer.classList.remove("drag-over");
      }
      const cards = filesContainer.querySelectorAll(".space-file-card");
      cards.forEach((card) => card.classList.remove("drop-before", "drop-after"));
    });
    
    filesContainer.addEventListener("drop", async (e) => {
      e.preventDefault();
      filesContainer.classList.remove("drag-over");
      const cards = filesContainer.querySelectorAll(".space-file-card");
      cards.forEach((card) => card.classList.remove("drop-before", "drop-after"));
      
      const pasteIdRaw = e.dataTransfer.getData("text/plain");
      const pasteId = normalizePasteId(pasteIdRaw);
      const sourceWorkspaceId = e.dataTransfer.getData("workspace");
      const targetCard = e.target.closest(".space-file-card");
      
      if (!pasteIdRaw) return;
      
      if (!workspaces[workspaceId].pastes) {
        workspaces[workspaceId].pastes = [];
      }
      const targetIds = workspaces[workspaceId].pastes.map(normalizePasteId);
      const fromIndex = targetIds.indexOf(pasteId);
      if (fromIndex !== -1) {
        targetIds.splice(fromIndex, 1);
      }
      let targetIndex = targetIds.length;
      if (targetCard) {
        const targetId = normalizePasteId(targetCard.dataset.pasteId);
        const rect = targetCard.getBoundingClientRect();
        const before = e.clientY - rect.top < rect.height / 2;
        const foundIndex = targetIds.indexOf(targetId);
        if (foundIndex !== -1) {
          targetIndex = before ? foundIndex : foundIndex + 1;
        }
      }
      targetIds.splice(targetIndex, 0, pasteId);
      
      // Move paste to this workspace
      if (sourceWorkspaceId !== workspaceId) {
        // Remove from source workspace
        if (sourceWorkspaceId && workspaces[sourceWorkspaceId]) {
          workspaces[sourceWorkspaceId].pastes = workspaces[sourceWorkspaceId].pastes.filter(id => normalizePasteId(id) !== pasteId);
        }
      }

      workspaces[workspaceId].pastes = targetIds;
      if (sourceWorkspaceId === workspaceId || targetCard) {
        workspaces[workspaceId].pinned = true;
      }
      
      saveWorkspaces(workspaces);
      await renderSpacesGrid();
      
      // Refresh history when the current workspace is affected
      if (sourceWorkspaceId === currentWorkspace || workspaceId === currentWorkspace) {
        switchWorkspace(currentWorkspace);
      }
    });
    
    column.appendChild(filesContainer);
    elements.spacesGrid.appendChild(column);
  });
  
  // Add "New Space" column
  const newColumn = document.createElement("div");
  newColumn.className = "space-column new-space";
  
  const addBtn = document.createElement("button");
  addBtn.className = "add-space-btn";
  addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
  addBtn.title = t("workspaceNew");
  addBtn.addEventListener("click", () => {
    const name = prompt(t("workspaceNewPrompt"));
    if (name && name.trim()) {
      const workspaces = getWorkspaces();
      const id = `ws_${Date.now()}`;
      workspaces[id] = { name: name.trim(), pastes: [], pinned: false };
      saveWorkspaces(workspaces);
      renderSpacesGrid();
    }
  });
  
  newColumn.appendChild(addBtn);
  elements.spacesGrid.appendChild(newColumn);
};

const createSpaceFileCard = (paste, workspaceId) => {
  const card = document.createElement("div");
  card.className = "space-file-card";
  card.draggable = true;
  card.dataset.pasteId = paste.id;
  
  card.innerHTML = `
    <div class="space-file-main">
      <div class="space-file-title">${escapeHtml(paste.title)}</div>
      <div class="space-file-meta">${new Date(paste.updated_at).toLocaleDateString()}</div>
    </div>
    <button class="space-file-delete" type="button" title="${t("delete")}" aria-label="${t("delete")}">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  const deleteBtn = card.querySelector(".space-file-delete");
  deleteBtn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deletePaste(paste.id);
    await renderSpacesGrid();
  });
  
  card.addEventListener("dragstart", (e) => {
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", paste.id);
    e.dataTransfer.setData("workspace", workspaceId);
  });
  
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });
  
  card.addEventListener("click", () => {
    closeSpacesOverview();
    if (currentWorkspace !== workspaceId) {
      switchWorkspace(workspaceId);
    }
    setTimeout(() => loadPaste(paste.id), 100);
  });
  
  return card;
};

const rotateWorkspace = (direction) => {
  const workspaces = getWorkspaces();
  const keys = Object.keys(workspaces);
  const currentIndex = keys.indexOf(currentWorkspace);
  
  let nextIndex;
  if (direction > 0) {
    nextIndex = (currentIndex + 1) % keys.length;
  } else {
    nextIndex = (currentIndex - 1 + keys.length) % keys.length;
  }
  
  switchWorkspace(keys[nextIndex]);
  setStatus(t("workspaceSwitched") + ": " + workspaces[keys[nextIndex]].name, "success");
};

const renderPreview = () => {
  let text = getMarkdown();
  headingIdState.ids = lastHeadings.map((h) => h.slug);
  headingIdState.index = 0;
  
  // Prüfe auf unvollständige Code-Blöcke und heile automatisch
  const incompleteCodeBlocks = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let closeBeforeLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = i + 1;
      } else {
        inCodeBlock = false;
      }
    } else if (inCodeBlock) {
      // Prüfe ob Leerzeile + # (Überschrift) kommt - dann vorher schließen
      if (line.trim() === "" && i + 1 < lines.length && lines[i + 1].trimStart().startsWith("#")) {
        closeBeforeLine = i;
        break;
      }
    }
  }
  
  let wasHealed = false;
  let healingMessage = "";
  
  if (inCodeBlock) {
    incompleteCodeBlocks.push({ line: codeBlockStart });
    
    if (closeBeforeLine > -1) {
      // Schließe vor der Leerzeile
      lines.splice(closeBeforeLine, 0, "```");
      text = lines.join("\n");
      healingMessage = `Code-Block automatisch vor Zeile ${closeBeforeLine + 1} geschlossen (Überschrift erkannt)`;
    } else {
      // Schließe am Ende
      text = text + "\n```";
      healingMessage = `Code-Block automatisch am Ende geschlossen (ab Zeile ${codeBlockStart})`;
    }
    wasHealed = true;
  }
  
  const previewText = stripLayoutBlock(text);
  if (previewPreset === "document") {
    refreshDynamicStyles(text);
  }
  elements.preview.innerHTML = md.render(previewText);
  
  // Zeige Korrekturvorschlag im Editor
  const suggestionEl = document.getElementById("editorSuggestion");
  if (wasHealed && suggestionEl) {
    suggestionEl.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${healingMessage} <button class="suggestion-apply">Übernehmen</button>`;
    suggestionEl.classList.remove("hidden");
    
    // Click-Handler für "Übernehmen"
    const applyBtn = suggestionEl.querySelector(".suggestion-apply");
    if (applyBtn) {
      applyBtn.onclick = () => {
        setMarkdown(text);
        suggestionEl.classList.add("hidden");
      };
    }
  } else if (suggestionEl) {
    suggestionEl.classList.add("hidden");
  }
  
  updatePreviewTitle();
  updateHeadingMetrics();
  const mermaidPromise = renderMermaid();
  if (mermaidPromise?.then) {
    mermaidPromise.then(() => printPreview.refresh());
  } else {
    printPreview.refresh();
  }
  const cursor = editorView?.getCursor("from");
  if (cursor) highlightPreviewForLine(cursor.line);
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const buildHeadingTree = (markdown) => {
  const headings = [];
  const regex = /^\s{0,3}(#{1,6})\s+(.+)$/gm;
  let match;
  const slugCounts = new Map();

  while ((match = regex.exec(markdown)) !== null) {
    const level = match[1].length;
    const title = match[2].replace(/\s+#+\s*$/, "").trim();
    const base = slugify(title) || "section";
    const count = (slugCounts.get(base) || 0) + 1;
    slugCounts.set(base, count);
    const slug = count > 1 ? `${base}-${count}` : base;

    headings.push({
      level,
      title,
      slug,
      start: match.index
    });
  }

  const root = { id: "root", level: 0, title: "root", start: 0, children: [] };
  const stack = [root];
  let idCounter = 0;

  headings.forEach((heading) => {
    while (stack.length && heading.level <= stack[stack.length - 1].level) {
      stack.pop();
    }
    idCounter += 1;
    const node = {
      ...heading,
      id: `${stack[stack.length - 1].id}-${idCounter}`,
      children: []
    };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });

  return { tree: root.children, headings };
};

const getLineHeight = (el) => {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight);
  if (!Number.isNaN(lineHeight)) return lineHeight;
  const fontSize = parseFloat(style.fontSize) || 14;
  return fontSize * 1.4;
};

const escapeCss = (value) => {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
};

const updateHeadingMetrics = () => {
  const markdown = getMarkdown();
  const lineHeight = editorView ? getLineHeight(editorView.getWrapperElement()) : 20;
  const headings = lastHeadings.map((heading) => {
    const before = markdown.slice(0, heading.start);
    const line = before.split("\n").length - 1;
    return { ...heading, line };
  });

  const previewOffsets = {};
  headings.forEach((heading) => {
    const el = elements.preview.querySelector(`#${escapeCss(heading.slug)}`);
    if (el) {
      previewOffsets[heading.slug] = el.offsetTop;
    }
  });

  headingMetrics = { headings, previewOffsets, lineHeight };
};

const refreshHeadingData = () => {
  const { tree, headings } = buildHeadingTree(getMarkdown());
  lastTree = tree;
  lastHeadings = headings;
  updateHeadingMetrics();
};

const buildOutline = (markdown) => {
  if (typeof markdown !== "string") return [];
  const tokens = md.parse(markdown, {});
  const headings = [];
  const slugCounts = new Map();

  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].type === "heading_open") {
      const level = Number(tokens[i].tag.replace("h", ""));
      const inline = tokens[i + 1];
      const title = inline?.content?.trim() || "(ohne Titel)";
      const base = slugify(title) || "section";
      const count = (slugCounts.get(base) || 0) + 1;
      slugCounts.set(base, count);
      const slug = count > 1 ? `${base}-${count}` : base;
      const line = tokens[i].map?.[0] ?? 0;
      headings.push({ level, title, slug, line });
    }
  }

  return headings.filter((h) => h.level <= 2);
};

const saveHistoryOrder = () => {
  localStorage.setItem("historyOrder", JSON.stringify(historyOrder));
};

const loadHistoryOrder = () => {
  try {
    const data = JSON.parse(localStorage.getItem("historyOrder") || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const applyHistoryOrder = (items) => {
  if (!historyOrder.length) return items;
  const map = new Map(items.map((item) => [item.id, item]));
  const ordered = historyOrder.map((id) => map.get(id)).filter(Boolean);
  const rest = items.filter((item) => !historyOrder.includes(item.id));
  return [...ordered, ...rest];
};

const orderByWorkspace = (workspace, items) => {
  if (!workspace?.pinned || !workspace.pastes?.length) return items;
  const order = workspace.pastes.map(normalizePasteId);
  const map = new Map(items.map((item) => [normalizePasteId(item.id), item]));
  const ordered = order.map((id) => map.get(id)).filter(Boolean);
  const orderedIds = new Set(order);
  const rest = items.filter((item) => !orderedIds.has(normalizePasteId(item.id)));
  return [...ordered, ...rest];
};

const rotateHistory = (direction) => {
  if (!historyCache.length) return;
  const idx = historyCache.findIndex((item) => item.id === currentPasteId);
  const nextIdx = idx === -1
    ? 0
    : (idx + direction + historyCache.length) % historyCache.length;
  const next = historyCache[nextIdx];
  if (next) loadPaste(next.id);
};

const jumpToSlug = (slug) => {
  const heading = headingMetrics.headings.find((h) => h.slug === slug);
  if (heading) {
    scrollToHeading(heading);
  }
};

const jumpToLine = (line) => {
  const targetLine = Math.max(0, line || 0);
  setEditorScrollTop(targetLine * headingMetrics.lineHeight);
  const currentIndex = headingMetrics.headings.findIndex((h) => h.line > targetLine) - 1;
  const idx = currentIndex >= 0 ? currentIndex : headingMetrics.headings.length - 1;
  const current = headingMetrics.headings[idx];
  const next = headingMetrics.headings[idx + 1] || null;
  if (current) {
    const start = current.line ?? 0;
    const end = next?.line ?? start + 10;
    const ratio = end > start ? (targetLine - start) / (end - start) : 0;
    scrollToHeadingWithRatio(current, next, Math.max(0, Math.min(1, ratio)));
  }
};

const togglePrintView = () => {
  printPreview.toggle();
  printViewActive = printPreview.isActive;
  elements.togglePrintViewBtn?.classList.toggle("active", printViewActive);
  elements.previewPrintItem?.classList.toggle("active", printViewActive);
  localStorage.setItem("printViewActive", printViewActive ? "true" : "false");
};

const setView = (view) => {
  currentView = view;
  localStorage.setItem("currentView", view);
  treeVisible = view === "tree";
  const chatVisible = view === "chat";
  const previewVisible = !treeVisible && !chatVisible;
  
  // Toggle panels
  elements.previewPanel?.classList.toggle("active", previewVisible);
  elements.treePanel?.classList.toggle("active", treeVisible);
  elements.aiChatPanel?.classList.toggle("active", chatVisible);
  
  // Toggle button states
  elements.viewPreviewBtn?.classList.toggle("primary", previewVisible);
  elements.viewTreeBtn?.classList.toggle("primary", treeVisible);
  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    const viewName = btn.dataset.view;
    btn.classList.toggle("active", viewName === view);
  });
  
  refreshHeadingData();
  
  if (treeVisible) {
    renderTree();
    requestAnimationFrame(highlightTreeBranchForCursor);
  } else if (chatVisible) {
    // Focus chat input
    if (aiChat) {
      document.getElementById("aiChatInput")?.focus();
    }
  } else {
    renderPreview();
  }
};

const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNodeById(node.children, id);
    if (child) return child;
  }
  return null;
};

const findNodeBySlug = (nodes, slug) => {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const child = findNodeBySlug(node.children || [], slug);
    if (child) return child;
  }
  return null;
};

const findIdPathById = (nodes, id, path = []) => {
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === id) return nextPath;
    const childPath = findIdPathById(node.children || [], id, nextPath);
    if (childPath) return childPath;
  }
  return null;
};

const getHeadingAtCursor = () => {
  if (!editorView || !headingMetrics?.headings?.length) return null;
  const cursor = editorView.getCursor("from");
  if (!cursor) return null;
  let current = headingMetrics.headings[0] || null;
  headingMetrics.headings.forEach((heading) => {
    if (heading.line <= cursor.line) current = heading;
  });
  return current;
};

const highlightTreeBranchForCursor = () => {
  const svg = elements.treeView?.querySelector("svg.tree-svg");
  if (!svg) return;
  const nodeElements = Array.from(svg.querySelectorAll(".markmap-node"));
  nodeElements.forEach((el) => el.classList.remove("tree-branch-active"));

  const currentHeading = getHeadingAtCursor();
  if (!currentHeading) return;
  const activeNode = findNodeBySlug(lastTree, currentHeading.slug);
  if (!activeNode) return;
  const idPath = findIdPathById(lastTree, activeNode.id) || [];
  if (!idPath.length) return;

  nodeElements.forEach((el) => {
    const data = el.__data__?.data || el.__data__ || null;
    if (data?.id && idPath.includes(data.id)) {
      el.classList.add("tree-branch-active");
    }
  });
};

const hyperbolicRadius = (r) => {
  const k = 3.2;
  return (Math.exp(k * r) - 1) / (Math.exp(k * r) + 1);
};

const truncateLabel = (text, max = 28) => {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const toMarkmapNode = (node) => ({
  content: node.title,
  id: node.id,
  slug: node.slug,
  level: node.level,
  start: node.start,
  children: node.children?.map(toMarkmapNode) || []
});

const getStats = (text) => {
  const chars = text.length;
  const words = (text.trim().match(/\S+/g) || []).length;
  const headingMatches = text.match(/^#{1,6}\s+.+$/gm) || [];
  const headings = headingMatches.length;
  const depth = headingMatches.reduce((max, line) => Math.max(max, line.match(/^#+/)[0].length), 0);
  return { chars, words, headings, depth };
};

const setFooterStats = (text) => {
  if (elements.footerStats) {
    elements.footerStats.textContent = text || "";
  }
};

const parseSourcepos = (value) => {
  if (!value) return null;
  const match = value.match(/(\d+):\d+-(\d+):\d+/);
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
};

const normalizeTextForMatch = (text) => text.replace(/\s+/g, " ").trim();

const normalizeTextWithMap = (text) => {
  let normalized = "";
  const map = [];
  let inWhitespace = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (inWhitespace) continue;
      normalized += " ";
      map.push(i);
      inWhitespace = true;
    } else {
      normalized += ch;
      map.push(i);
      inWhitespace = false;
    }
  }
  return { normalized, map };
};

const collectTextNodes = (element) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  let text = "";
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.textContent || "";
    const start = text.length;
    text += value;
    nodes.push({ node, start, end: text.length });
  }
  return { text, nodes };
};

const findNodeAtOffset = (nodes, offset) => {
  for (const item of nodes) {
    if (offset <= item.end) {
      return { node: item.node, offset: Math.max(0, offset - item.start) };
    }
  }
  if (nodes.length > 0) {
    const last = nodes[nodes.length - 1];
    return { node: last.node, offset: last.end - last.start };
  }
  return null;
};

const renderSelectionText = (raw) => {
  if (!raw) return "";
  if (!md) return raw;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = md.render(raw);
  return wrapper.textContent || "";
};

const getActivePreviewRoot = () => {
  if (printPreview?.isActive && elements.printPreview) {
    return elements.printPreview;
  }
  return elements.preview;
};

const clearPreviewSelection = () => {
  const root = getActivePreviewRoot();
  root?.querySelectorAll(".preview-selection").forEach((el) => {
    el.classList.remove("preview-selection");
  });
  root?.querySelectorAll(".preview-sync-highlight").forEach((el) => {
    el.classList.remove("preview-sync-highlight");
  });
  if (previewSyncHighlightTimeout) {
    clearTimeout(previewSyncHighlightTimeout);
    previewSyncHighlightTimeout = null;
  }
};

const flashPreviewSyncHighlight = (nodes, shouldScroll = false) => {
  if (!nodes || nodes.length === 0) return;
  clearPreviewSelection();
  nodes.forEach((node) => node.classList.add("preview-sync-highlight"));
  if (shouldScroll) {
    nodes[0].scrollIntoView({ block: "center", behavior: "smooth" });
  }
  previewSyncHighlightTimeout = setTimeout(() => {
    nodes.forEach((node) => node.classList.remove("preview-sync-highlight"));
    previewSyncHighlightTimeout = null;
  }, 2500);
};

const highlightPreviewForLine = (line, shouldScroll = false) => {
  const root = getActivePreviewRoot();
  if (!root) return;
  const targetLine = Number.isFinite(line) ? line + 1 : null;
  if (!targetLine) return;
  const nodes = Array.from(root.querySelectorAll("[data-sourcepos]"));
  let best = null;
  let bestSpan = Infinity;
  nodes.forEach((node) => {
    const pos = parseSourcepos(node.getAttribute("data-sourcepos"));
    if (!pos) return;
    if (targetLine >= pos.start && targetLine <= pos.end) {
      const span = pos.end - pos.start;
      if (span < bestSpan) {
        best = node;
        bestSpan = span;
      }
    }
  });
  clearPreviewSelection();
  if (best) {
    flashPreviewSyncHighlight([best], shouldScroll || currentView === "preview");
  }
};

const updatePreviewTitle = () => {
  if (!elements.previewTitle) return;
  const stats = getStats(getMarkdown());
  const label = `${t("preview")} (${stats.words} ${t("statsWords")}, ${stats.chars} ${t("statsChars")})`;
  elements.previewTitle.textContent = label;
};

const formatStatsText = (stats) =>
  `${t("statsChars")} ${stats.chars} · ${t("statsWords")} ${stats.words} · ${t("statsHeadings")} ${stats.headings} · ${t("statsDepth")} ${stats.depth}`;

const renderNodeContent = () => {
  if (!elements.nodeContent) return;
  if (!selectedNodeId) {
    elements.nodeContent.innerHTML = "<div class=\"muted\">Kein Abschnitt ausgewählt.</div>";
    elements.nodeStatsBtn?.setAttribute("title", t("statsEmpty"));
    lastStatsText = t("statsEmpty");
    setFooterStats(lastStatsText);
    return;
  }

  const node = findNodeById(lastTree, selectedNodeId);
  if (!node) {
    elements.nodeContent.innerHTML = "<div class=\"muted\">Kein Abschnitt ausgewählt.</div>";
    lastStatsText = t("statsEmpty");
    setFooterStats(lastStatsText);
    return;
  }

  const headings = lastHeadings;
  const idx = headings.findIndex((h) => h.start === node.start && h.level === node.level);
  if (idx === -1) {
    elements.nodeContent.innerHTML = "<div class=\"muted\">Kein Abschnitt ausgewählt.</div>";
    lastStatsText = t("statsEmpty");
    setFooterStats(lastStatsText);
    return;
  }

  const markdown = getMarkdown();
  let end = markdown.length;
  for (let i = idx + 1; i < headings.length; i += 1) {
    if (headings[i].level <= node.level) {
      end = headings[i].start;
      break;
    }
  }

  const chunk = markdown.slice(node.start, end).trim();
  if (chunk) {
    headingIdState.ids = [];
    headingIdState.index = 0;
    elements.nodeContent.innerHTML = md.render(chunk);
    const stats = getStats(chunk);
    lastStatsText = formatStatsText(stats);
    elements.nodeStatsBtn?.setAttribute(
      "title",
      `${t("stats")}: ${lastStatsText}`
    );
    setFooterStats(lastStatsText);
  } else {
    elements.nodeContent.innerHTML = "<div class=\"muted\">Leerer Abschnitt.</div>";
    elements.nodeStatsBtn?.setAttribute("title", t("statsEmpty"));
    lastStatsText = t("statsEmpty");
    setFooterStats(lastStatsText);
  }
};

const renderTree = () => {
  if (!treeVisible) {
    elements.treeView.innerHTML = "";
    return;
  }

  const tree = lastTree;
  elements.treeView.innerHTML = "";

  if (tree.length === 0) {
    elements.treeView.innerHTML = "<div class=\"muted\">Keine Überschriften gefunden.</div>";
    return;
  }

  const container = elements.treeView;
  const dataRoot = { id: "root", title: "root", children: tree };
  const markmapData = {
    content: dataRoot.title || "Root",
    id: dataRoot.id || "root",
    slug: dataRoot.slug || "root",
    level: dataRoot.level || 0,
    start: dataRoot.start || 0,
    children: (dataRoot.children || []).map(toMarkmapNode)
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "tree-svg");
  svg.style.width = "100%";
  svg.style.height = "100%";
  container.appendChild(svg);

  const mm = Markmap.create(svg, {
    duration: 200,
    spacingHorizontal: 120,
    spacingVertical: 10,
    zoom: true,
    pan: true
  }, markmapData);

  mm.fit();

  svg.addEventListener("click", (event) => {
    const nodeEl = event.target.closest(".markmap-node");
    const data = nodeEl?.__data__?.data || nodeEl?.__data__ || null;
    if (!data || !data.id || data.id === "root") {
      return;
    }
    selectedNodeId = data.id;
    jumpToHeading(data);
  });

  if (!selectedNodeId && tree.length > 0) {
    selectedNodeId = tree[0].id;
  }

  requestAnimationFrame(highlightTreeBranchForCursor);
};

const loadHistory = async () => {
  const res = await fetch("/api/pastes");
  const allPastes = await res.json();
  
  // Get current workspace pastes
  const workspaces = getWorkspaces();
  const workspace = workspaces[currentWorkspace];
  
  // If workspace has specific pastes, filter to those
  if (workspace && workspace.pastes && workspace.pastes.length > 0) {
    const workspacePasteIds = new Set(workspace.pastes.map(normalizePasteId));
    historyCache = allPastes.filter((p) => workspacePasteIds.has(normalizePasteId(p.id)));
    historyCache = workspace.pinned ? orderByWorkspace(workspace, historyCache) : historyCache;
  } else if (currentWorkspace === "default") {
    // Default workspace shows all pastes.
    // Merge server pastes into workspace.pastes instead of replacing, so that
    // paste IDs assigned to other workspaces are never wiped from localStorage
    // after a session reset / DB restore.
    historyCache = allPastes;
    if (allPastes.length > 0) {
      const existingIds = new Set((workspace.pastes || []).map(normalizePasteId));
      const newIds = allPastes
        .map(p => normalizePasteId(p.id))
        .filter(id => !existingIds.has(id));
      if (newIds.length > 0) {
        workspace.pastes = [...(workspace.pastes || []), ...newIds];
        saveWorkspaces(workspaces);
      }
    }
  } else {
    // Non-default workspaces without assignments should be empty
    historyCache = [];
  }
  
  historyOrder = loadHistoryOrder();
  if (!workspace?.pinned) {
    historyCache = applyHistoryOrder(historyCache);
  }
  scheduleRenderHistory();
  updateWorkspaceInfo();
};

const renderHistory = () => {
  const query = elements.historySearch.value.toLowerCase();
  const currentId = normalizePasteId(currentPasteId);
  const items = historyCache.filter((item) =>
    item.title.toLowerCase().includes(query)
  );
  elements.historyList.innerHTML = "";
  if (items.length === 0) {
    elements.historyList.innerHTML = "<div class=\"muted\">Keine Einträge.</div>";
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    const isActive = normalizePasteId(item.id) === currentId;
    row.className = "history-item" + (isActive ? " active" : "");
    row.setAttribute("draggable", "true");
    row.dataset.id = item.id;
    const expanded = outlineCache.get(item.id)?.expanded;
    if (expanded) row.classList.add("expanded");
    row.innerHTML = `
      <button class=\"delete\" title=\"${t("delete")}\" aria-label=\"${t("delete")}\">
        <i class=\"fa-solid fa-xmark\"></i>
      </button>
      <div class=\"history-content\">
        <div class=\"title\">${escapeHtml(item.title)}</div>
        <div class=\"meta\">${new Date(item.updated_at).toLocaleString()}</div>
      </div>
      <div class=\"history-outline\"></div>
    `;
    const contentEl = row.querySelector(".history-content");
    contentEl.addEventListener("click", (event) => {
      if (event.detail > 1) {
        clearTimeout(row._clickTimer);
        return;
      }
      clearTimeout(row._clickTimer);
      row._clickTimer = setTimeout(() => {
        loadPaste(item.id);
      }, 220);
    });
    row.addEventListener("dblclick", async (event) => {
      event.preventDefault();
      clearTimeout(row._clickTimer);
      const cache = outlineCache.get(item.id) || { expanded: false, outline: [] };
      cache.expanded = !cache.expanded;
      if (cache.expanded && cache.outline.length === 0) {
        try {
          const res = await fetch(`/api/pastes/${item.id}`);
          if (res.ok) {
            const data = await res.json();
            cache.outline = buildOutline(data?.markdown ?? "");
          } else {
            cache.outline = [];
          }
        } catch (error) {
          console.warn("Failed to load outline:", error);
          cache.outline = [];
        }
      }
      outlineCache.set(item.id, cache);
      scheduleRenderHistory();
    });
    const deleteBtn = row.querySelector(".delete");
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await deletePaste(item.id);
    });
    if (expanded) {
      const cache = outlineCache.get(item.id) || { expanded: false, outline: [] };
      if (cache.outline.length === 0) {
        const placeholder = document.createElement("div");
        placeholder.className = "outline-item";
        placeholder.textContent = t("outlineEmpty");
        outlineEl.appendChild(placeholder);
      }
    }

    row.addEventListener("dragstart", (event) => {
      row.classList.add("dragging");
      event.dataTransfer.setData("text/plain", item.id);
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      const rect = row.getBoundingClientRect();
      const offset = event.clientY - rect.top;
      row.classList.toggle("drop-before", offset < rect.height / 2);
      row.classList.toggle("drop-after", offset >= rect.height / 2);
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("drop-before", "drop-after");
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drop-before", "drop-after");
      const draggedId = event.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === item.id) return;
      const ids = historyCache.map((h) => h.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(item.id);
      if (from === -1 || to === -1) return;
      const rect = row.getBoundingClientRect();
      const before = event.clientY - rect.top < rect.height / 2;
      const targetIndex = before ? to : to + 1;
      ids.splice(targetIndex, 0, ids.splice(from, 1)[0]);
      historyOrder = ids;
      saveHistoryOrder();
      historyCache = applyHistoryOrder(historyCache);
      scheduleRenderHistory();
    });

    const outlineEl = row.querySelector(".history-outline");
    if (expanded) {
      const cache = outlineCache.get(item.id) || { expanded: false, outline: [] };
      const outline = cache.outline || [];
      if (outline.length === 0) {
        const placeholder = document.createElement("div");
        placeholder.className = "outline-item";
        placeholder.textContent = t("outlineEmpty");
        outlineEl.appendChild(placeholder);
      }
      outline.forEach((heading) => {
        const outlineItem = document.createElement("div");
        outlineItem.className = `outline-item level-${heading.level}`;
        outlineItem.textContent = heading.title;
        outlineItem.addEventListener("click", async (event) => {
          event.stopPropagation();
          if (currentPasteId !== item.id) {
            await loadPaste(item.id);
          }
          jumpToLine(heading.line);
        });
        outlineEl.appendChild(outlineItem);
      });
    }
    elements.historyList.appendChild(row);
  });
  renderCollapsedOpenItems();
};

let historyRenderQueued = false;
const scheduleRenderHistory = () => {
  if (historyRenderQueued) return;
  historyRenderQueued = true;
  requestAnimationFrame(() => {
    historyRenderQueued = false;
    renderHistory();
  });
};

const deletePaste = async (id) => {
  await fetch(`/api/pastes/${id}`, { method: "DELETE" });
  const normalizedId = normalizePasteId(id);
  
  // Remove from all workspaces
  const workspaces = getWorkspaces();
  Object.keys(workspaces).forEach(key => {
    if (workspaces[key].pastes) {
      workspaces[key].pastes = workspaces[key].pastes.filter(pasteId => pasteId !== normalizedId);
    }
  });
  saveWorkspaces(workspaces);
  
  if (currentPasteId === id) {
    currentPasteId = null;
    lastSavedMarkdown = "";
    setMarkdown("");
  }
  await loadHistory();
};

const loadPaste = async (id) => {
  const res = await fetch(`/api/pastes/${id}`);
  if (!res.ok) return;
  const data = await res.json();
  currentPasteId = data.id;
  // Loading an existing paste must not trigger "new document" state.
  clearedForNew = false;
  localStorage.setItem("lastPasteId", data.id);
  lastSavedMarkdown = data.markdown;
  outlineCache.set(id, {
    expanded: outlineCache.get(id)?.expanded || false,
    outline: buildOutline(data.markdown)
  });
  setMarkdown(data.markdown);
  
  // Initialize image manager for this paste
  try {
    if (imageManager) {
      imageManager.pasteId = id;
    } else if (elements.editorHost) {
      imageManager = new ImageManager(elements.editorHost, id, insertMarkdownAtCursor);
    }
  } catch (error) {
    console.warn("Failed to initialize image manager:", error);
  }
  
  refreshHeadingData();
  renderPreview();
  renderTree();
  renderHistory();
  setStatus(t("loaded"), "success");

  // Initialize collaborative editing if paste is shared
  if (data.shared && window.initCollabSupport) {
    try {
      const collabSupport = window.collabSupport || 
        (window.collabSupport = (await import("./modules/collab-integration.js")).initCollabSupport({
          sessionId: currentSessionId || ""
        }, elements));
      
      await collabSupport.initCollab(id, data.shared);
    } catch (error) {
      console.warn("Failed to initialize collab:", error);
    }
  }
};

const createOrUpdatePaste = async () => {
  const markdown = getMarkdown();
  if (!markdown.trim()) {
    setStatus(t("emptySave"), "error");
    return;
  }
  if (markdown === lastSavedMarkdown) return;
  const payload = { markdown };
  try {
    if (!currentPasteId) {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      currentPasteId = data.id;

      // Initialize image manager for new paste
      try {
        if (imageManager) {
          imageManager.pasteId = currentPasteId;
        } else if (elements.editorHost) {
          imageManager = new ImageManager(elements.editorHost, currentPasteId, insertMarkdownAtCursor);
        }
      } catch (error) {
        console.warn("Failed to initialize image manager:", error);
      }

      // Add new paste to current workspace
      const workspaces = getWorkspaces();
      const workspace = workspaces[currentWorkspace];
      if (!workspace.pastes) {
        workspace.pastes = [];
      }
      if (!workspace.pastes.includes(currentPasteId)) {
        workspace.pastes.push(currentPasteId);
        saveWorkspaces(workspaces);
      }
    } else {
      const res = await fetch(`/api/pastes/${currentPasteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
    }
    lastSavedMarkdown = markdown;
    await loadHistory();
  } catch (err) {
    console.error("Autosave failed:", err);
    setStatus(`${t("saveFailed")}: ${err.message}`, "error");
  }
};

const exportFile = async (format) => {
  const markdown = getMarkdown();
  if (!markdown.trim()) {
    setStatus(t("emptyExport"), "error");
    return false;
  }
  const html = await serializePreviewForExport();
  const paged = Boolean(printPreview?.isActive);
  const res = await fetch(`/api/export/${format}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, html, paged })
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    const fallbackRes = await fetch(`/api/export/${format}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown })
    });
    if (!fallbackRes.ok) {
      const fallbackText = await fallbackRes.text().catch(() => "");
      setStatus(`${t("exportFailed")}${fallbackText || errorText ? ": " : ""}${fallbackText || errorText}`, "error");
      return false;
    }
    const fallbackBlob = await fallbackRes.blob();
    const fallbackUrl = URL.createObjectURL(fallbackBlob);
    const fallbackLink = document.createElement("a");
    fallbackLink.href = fallbackUrl;
    fallbackLink.download = `export.${format}`;
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();
    URL.revokeObjectURL(fallbackUrl);
    return true;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `export.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
};

const downloadMarkdown = () => {
  const markdown = getMarkdown();
  if (!markdown.trim()) {
    setStatus(t("emptyExport"), "error");
    return;
  }
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "document.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const copyToClipboard = async (text) => {
  if (!text.trim()) {
    setStatus(t("emptyCopy"), "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    setStatus(t("copied"), "success");
  } catch {
    setStatus(t("copyFailed"), "error");
  }
};

const copyRichText = async (html, text) => {
  const plain = text?.trim() ? text : html.replace(/<[^>]+>/g, " ").trim();
  if (!plain) {
    setStatus(t("emptyCopy"), "error");
    return;
  }
  try {
    if (window.ClipboardItem) {
      const wrappedHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      const item = new ClipboardItem({
        "text/html": new Blob([wrappedHtml], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" })
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    setStatus(t("copied"), "success");
  } catch {
    setStatus(t("copyFailed"), "error");
  }
};

const svgToPngDataUrl = (svgEl) => new Promise((resolve) => {
  const serializer = new XMLSerializer();
  let svgText = serializer.serializeToString(svgEl);
  
  // Ensure xmlns attribute
  if (!svgText.includes("xmlns=")) {
    svgText = svgText.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
  }
  
  // Remove any external references that might cause CORS issues
  svgText = svgText.replace(/xlink:href="[^"]*"/g, '');
  
  // Embed styles inline to avoid CORS issues
  const styles = Array.from(document.styleSheets)
    .filter(sheet => {
      try {
        return sheet.cssRules;
      } catch {
        return false;
      }
    })
    .flatMap(sheet => Array.from(sheet.cssRules))
    .filter(rule => rule.selectorText && rule.selectorText.includes('mermaid'))
    .map(rule => rule.cssText)
    .join('\n');
  
  if (styles) {
    svgText = svgText.replace('</svg>', `<style>${styles}</style></svg>`);
  }
  
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  // Don't use crossOrigin for blob URLs
  // img.crossOrigin = "anonymous";
  
  img.onload = () => {
    const rect = svgEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || svgEl.viewBox?.baseVal?.width || 600));
    const height = Math.max(1, Math.round(rect.height || svgEl.viewBox?.baseVal?.height || 400));
    const canvas = document.createElement("canvas");
    canvas.width = width * 2; // 2x for better quality
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx) {
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, width * 2, height * 2);
      try {
        const dataUrl = canvas.toDataURL("image/png", 0.95);
        URL.revokeObjectURL(url);
        resolve({ dataUrl, width, height });
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    } else {
      URL.revokeObjectURL(url);
      resolve(null);
    }
  };
  img.onerror = (err) => {
    URL.revokeObjectURL(url);
    resolve(null);
  };
  img.src = url;
});

const collectPagedExportStyles = () => {
  const marker = /(pagedjs|@page|print-content|page-break|column-break|md-columns|section-break)/i;
  const chunks = [];

  document.querySelectorAll("style").forEach((styleEl) => {
    const text = styleEl.textContent || "";
    if (text && marker.test(text)) {
      chunks.push(text);
    }
  });

  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      const selected = rules
        .map((rule) => rule.cssText)
        .filter((cssText) => marker.test(cssText));
      if (selected.length) {
        chunks.push(selected.join("\n"));
      }
    } catch {
      // Ignore stylesheets with inaccessible cssRules
    }
  });

  return chunks.join("\n\n");
};

const serializePreviewForExport = async () => {
  await renderMermaid();
  const sourceRoot = getActivePreviewRoot() || elements.preview;
  const clone = sourceRoot.cloneNode(true);
  const svgs = Array.from(sourceRoot.querySelectorAll("svg"));
  const cloneSvgs = Array.from(clone.querySelectorAll("svg"));
  for (let i = 0; i < svgs.length; i += 1) {
    const result = await svgToPngDataUrl(svgs[i]);
    if (result && cloneSvgs[i]) {
      // Just ensure it has proper xmlns attribute
      const svgEl = cloneSvgs[i];
      if (!svgEl.getAttribute("xmlns")) {
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      // Ensure SVG has width/height attributes
      if (!svgEl.hasAttribute("width") || !svgEl.hasAttribute("height")) {
        const rect = svgs[i].getBoundingClientRect();
        const viewBox = svgs[i].getAttribute("viewBox");
        if (viewBox) {
          const [, , w, h] = viewBox.split(/\s+/).map(Number);
          if (w && h) {
            svgEl.setAttribute("width", Math.round(w));
            svgEl.setAttribute("height", Math.round(h));
          }
        } else if (rect.width && rect.height) {
          svgEl.setAttribute("width", Math.round(rect.width));
          svgEl.setAttribute("height", Math.round(rect.height));
        }
      }
    }
  }

  // Embed images as base64 for export
  const imgs = Array.from(clone.querySelectorAll("img"));
  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (src && src.startsWith("/assets/")) {
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let j = 0; j < bytes.byteLength; j++) {
          binary += String.fromCharCode(bytes[j]);
        }
        const base64 = btoa(binary);
        const mimeType = blob.type || "image/png";
        img.setAttribute("src", `data:${mimeType};base64,${base64}`);
      } catch (err) {
        console.warn("Failed to embed image:", src, err);
      }
    }
  }

  if (printPreview?.isActive) {
    const markdown = getMarkdown();
    const layout = getEffectiveDocumentLayout(markdown, { usePreviewPreset: true });
    const layoutCss = layoutCSSGenerator.generate(layout);
    const pagedStyles = [layoutCss, collectPagedExportStyles()]
      .filter(Boolean)
      .join("\n\n");
    if (pagedStyles) {
      return `<style data-export-paged="1">${pagedStyles}</style>${clone.outerHTML}`;
    }
    return clone.outerHTML;
  }
  return clone.innerHTML;
};

const stripMarkdown = (markdown) => markdown
  .replace(/```[\s\S]*?```/g, "")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  .replace(/\[[^\]]*\]\([^)]*\)/g, "$1")
  .replace(/^#{1,6}\s+/gm, "")
  .replace(/^>\s?/gm, "")
  .replace(/[*_~`]+/g, "")
  .replace(/\|/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const resetEditor = () => {
  currentPasteId = null;
  lastSavedMarkdown = "";
  setMarkdown("");
  selectedNodeId = null;
  refreshHeadingData();
  renderPreview();
  renderTree();
  scheduleRenderHistory();
  setStatus(t("newDoc"), "success");
};

const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const updateLive = debounce(() => {
  refreshHeadingData();
  renderPreview();
  renderTree();
}, 200);

const autosave = debounce(() => {
  createOrUpdatePaste();
}, 800);

const handleEditorChange = () => {
  const text = getMarkdown();
  updateLayoutBlockVisibility();
  if (!text.trim()) {
    clearedForNew = true;
  } else if (clearedForNew && currentPasteId) {
    currentPasteId = null;
    lastSavedMarkdown = "";
    clearedForNew = false;
    setStatus(t("newDoc"), "success");
  }
  updateLive();
  autosave();
};

let isSyncingScroll = false;

const getCurrentHeadingByEditorScroll = () => {
  const line = Math.floor(getEditorScrollTop() / headingMetrics.lineHeight);
  let current = headingMetrics.headings[0] || null;
  headingMetrics.headings.forEach((heading) => {
    if (heading.line <= line) current = heading;
  });
  const currentIndex = headingMetrics.headings.findIndex((h) => h.slug === current?.slug);
  const next = headingMetrics.headings[currentIndex + 1] || null;
  const sectionStart = current?.line ?? 0;
  const sectionEnd = next?.line ?? sectionStart + 10;
  const ratio = sectionEnd > sectionStart ? (line - sectionStart) / (sectionEnd - sectionStart) : 0;
  return { current, next, ratio };
};

const getCurrentHeadingByPreviewScroll = () => {
  const scrollTop = elements.preview.scrollTop + 8;
  let current = headingMetrics.headings[0] || null;
  headingMetrics.headings.forEach((heading) => {
    const offset = headingMetrics.previewOffsets[heading.slug];
    if (offset !== undefined && offset <= scrollTop) {
      current = heading;
    }
  });
  const currentIndex = headingMetrics.headings.findIndex((h) => h.slug === current?.slug);
  const next = headingMetrics.headings[currentIndex + 1] || null;
  const startOffset = headingMetrics.previewOffsets[current?.slug] ?? 0;
  const endOffset = headingMetrics.previewOffsets[next?.slug] ?? startOffset + 200;
  const ratio = endOffset > startOffset ? (scrollTop - startOffset) / (endOffset - startOffset) : 0;
  return { current, next, ratio };
};

const syncScroll = (source, target, mode) => {
  if (isSyncingScroll) return;
  isSyncingScroll = true;
  const info = mode === "editor" ? getCurrentHeadingByEditorScroll() : getCurrentHeadingByPreviewScroll();
  if (info?.current) {
    scrollToHeadingWithRatio(info.current, info.next, info.ratio);
  }
  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
};

const scrollToHeading = (heading) => {
  if (!heading) return;
  const line = heading.line ?? 0;
  setEditorScrollTop(line * headingMetrics.lineHeight);

  const offset = headingMetrics.previewOffsets[heading.slug];
  if (offset !== undefined) {
    elements.preview.scrollTop = offset;
  }
};

const scrollToHeadingWithRatio = (heading, nextHeading, ratio) => {
  if (!heading) return;
  const startLine = heading.line ?? 0;
  const endLine = nextHeading?.line ?? startLine + 10;
  const targetLine = startLine + ratio * (endLine - startLine);
  setEditorScrollTop(targetLine * headingMetrics.lineHeight);

  const startOffset = headingMetrics.previewOffsets[heading.slug] ?? 0;
  const endOffset = headingMetrics.previewOffsets[nextHeading?.slug] ?? startOffset + 200;
  const targetOffset = startOffset + ratio * (endOffset - startOffset);
  elements.preview.scrollTop = targetOffset;
};

const jumpToHeading = (node) => {
  const heading = headingMetrics.headings.find((h) => h.slug === node.slug);
  if (heading) {
    scrollToHeading(heading);
    if (elements.nodeContent) {
      elements.nodeContent.scrollTop = 0;
    }
  }
};

const findParentId = (nodes, childId, parentId = null) => {
  for (const node of nodes) {
    if (node.id === childId) return parentId;
    const found = findParentId(node.children, childId, node.id);
    if (found) return found;
  }
  return null;
};

window.addEventListener("resize", () => {
  renderTree();
  initColumns();
  if (editorView && typeof editorView.refresh === "function") {
    editorView.refresh();
  }
});

const setGridColumns = () => {
  elements.content.style.gridTemplateColumns = `${startEditor}px 6px ${startPreview}px`;
};

const initColumns = () => {
  if (!elements.content) return;
  const editorWidth = elements.editorSection.offsetWidth;
  const previewWidth = elements.previewSection.offsetWidth;

  startEditor = Math.max(editorWidth, minCol);
  startPreview = Math.max(previewWidth, minCol);

  setGridColumns();
  if (editorView && typeof editorView.setSize === "function") {
    editorView.setSize(null, "100%");
  }
  if (editorView && typeof editorView.refresh === "function") {
    editorView.refresh();
  }
};

const onMouseMove = (event) => {
  if (!isDragging) return;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (dragMode === "editor-preview") {
    const nextEditor = Math.max(minCol, startEditor + dx);
    const nextPreview = Math.max(minCol, startPreview - dx);
    if (nextEditor + nextPreview > minCol * 2) {
      elements.content.style.gridTemplateColumns = `${nextEditor}px 6px ${nextPreview}px`;
    }
  }

  if (dragMode === "tree-node") {
    const editorSectionHeight = elements.editorSection?.getBoundingClientRect().height || 0;
    const resizerHeight = elements.treeResizer?.getBoundingClientRect().height || 6;
    const maxTree = Math.max(minTreeHeight, editorSectionHeight - minNodeHeight - resizerHeight);
    const nextTree = Math.max(minTreeHeight, Math.min(maxTree, startTreeHeight + dy));
    if (elements.treeInline) {
      elements.treeInline.style.flex = `0 0 ${nextTree}px`;
    }
    if (elements.editorHost) {
      elements.editorHost.style.flex = "1 1 auto";
    }
  }
};

const onMouseUp = (event) => {
  if (!isDragging) return;
  isDragging = false;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;

  if (dragMode === "editor-preview") {
    startEditor = Math.max(minCol, startEditor + dx);
    startPreview = Math.max(minCol, startPreview - dx);
  }

  if (dragMode === "tree-node") {
    startTreeHeight = Math.max(minTreeHeight, startTreeHeight + dy);
  }

  dragMode = null;
  document.body.style.cursor = "";
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
  setGridColumns();
};

const startDrag = (mode) => (event) => {
  event.preventDefault();
  isDragging = true;
  dragMode = mode;
  startX = event.clientX;
  startY = event.clientY;
  document.body.style.cursor = "col-resize";
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const startTreeDrag = (event) => {
  event.preventDefault();
  isDragging = true;
  dragMode = "tree-node";
  startY = event.clientY;
  const treeRect = elements.treeInline?.getBoundingClientRect();
  startTreeHeight = treeRect?.height || 0;
  document.body.style.cursor = "row-resize";
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

// Mermaid Editor Functions
let mermaidBlockStart = -1;
let mermaidBlockEnd = -1;
let mermaidFoldMarkers = [];
let mermaidGutterMarkers = [];
let mermaidExpandedBlocks = new Set();
let mermaidSelectedNodeId = null;
let mermaidEdgeMode = false;
let mermaidEdgeStartId = null;
let mermaidDraggingNodeId = null;
let mermaidDragStartPos = null;
let mermaidIsPanning = false;
let mermaidPanStart = { x: 0, y: 0 };
let mermaidPanOrigin = { x: 0, y: 0 };
let mermaidDragOffset = { x: 0, y: 0 };
let mermaidMouseWorld = { x: 0, y: 0 };
let mermaidCanvasInitialized = false;
let mermaidHistory = [];
let mermaidHistoryIndex = -1;

const mermaidGraph = {
  type: "flowchart",
  direction: "TD",
  nodes: [],
  edges: [],
  zoom: 1,
  panX: 0,
  panY: 0
};

const cloneMermaidGraph = () => JSON.parse(JSON.stringify(mermaidGraph));

const pushMermaidHistory = () => {
  mermaidHistory = mermaidHistory.slice(0, mermaidHistoryIndex + 1);
  mermaidHistory.push({
    graph: cloneMermaidGraph(),
    selectedNodeId: mermaidSelectedNodeId
  });
  mermaidHistoryIndex = mermaidHistory.length - 1;
};

const restoreMermaidHistory = (index) => {
  const snapshot = mermaidHistory[index];
  if (!snapshot) return;
  const graph = snapshot.graph;
  mermaidGraph.type = graph.type;
  mermaidGraph.direction = graph.direction;
  mermaidGraph.nodes = graph.nodes.map(node => ({ ...node }));
  mermaidGraph.edges = graph.edges.map(edge => ({ ...edge }));
  mermaidGraph.zoom = graph.zoom;
  mermaidGraph.panX = graph.panX;
  mermaidGraph.panY = graph.panY;
  mermaidSelectedNodeId = snapshot.selectedNodeId || null;
  updateMermaidPropertyPanel();
  updateMermaidPreview();
  renderMermaidCanvas();
};

const resetMermaidGraph = (type = "flowchart") => {
  mermaidGraph.type = type;
  mermaidGraph.direction = "TD";
  mermaidGraph.nodes = [];
  mermaidGraph.edges = [];
  mermaidGraph.zoom = 1;
  mermaidGraph.panX = 0;
  mermaidGraph.panY = 0;
  mermaidSelectedNodeId = null;
  mermaidEdgeMode = false;
  mermaidEdgeStartId = null;
  mermaidHistory = [];
  mermaidHistoryIndex = -1;
};

const isInMermaidBlock = (editor, line) => {
  let inMermaid = false;
  let startLine = -1;
  let endLine = -1;
  
  // Search backwards for block start
  for (let i = line; i >= 0; i--) {
    const checkLine = editor.getLine(i);
    if (checkLine.trim().toLowerCase().startsWith("```mermaid")) {
      inMermaid = true;
      startLine = i;
      break;
    }
    if (checkLine.trim() === "```") {
      break;
    }
  }
  
  if (!inMermaid) {
    return false;
  }
  
  // Search forward for block end
  for (let i = line + 1; i < editor.lineCount(); i++) {
    const checkLine = editor.getLine(i);
    if (checkLine.trim() === "```") {
      endLine = i;
      break;
    }
  }
  
  if (endLine === -1) {
    return false;
  }
  
  mermaidBlockStart = startLine;
  mermaidBlockEnd = endLine;
  return true;
};

const findMermaidBlockInEditor = (blockIndex) => {
  if (!editorView) return false;
  
  let foundIndex = -1;
  const lineCount = editorView.lineCount();
  
  for (let i = 0; i < lineCount; i++) {
    const line = editorView.getLine(i);
    if (line && line.trim().toLowerCase().startsWith('```mermaid')) {
      foundIndex++;
      if (foundIndex === blockIndex) {
        // Found the matching block, now find its end
        isInMermaidBlock(editorView, i);
        return true;
      }
    }
  }
  return false;
};

const getMermaidBlockContent = () => {
  if (mermaidBlockStart === -1 || mermaidBlockEnd === -1) {
    return "";
  }
  
  const lines = [];
  for (let i = mermaidBlockStart + 1; i < mermaidBlockEnd; i++) {
    lines.push(editorView.getLine(i));
  }
  return lines.join("\n");
};

const setMermaidBlockContent = (content) => {
  if (mermaidBlockStart === -1 || mermaidBlockEnd === -1) {
    return;
  }
  
  const from = { line: mermaidBlockStart + 1, ch: 0 };
  const to = { line: mermaidBlockEnd, ch: 0 };
  editorView.replaceRange(content + "\n", from, to);
  
  handleEditorChange();
};

const ensureMermaidNode = (id, label = null, shape = null) => {
  let node = mermaidGraph.nodes.find(n => n.id === id);
  if (!node) {
    node = { id, label: label || id, shape: shape || "rect", fill: "", x: 0, y: 0, width: 0, height: 0 };
    mermaidGraph.nodes.push(node);
  } else if (label) {
    node.label = label;
  } else if (shape) {
    node.shape = shape;
  }
  return node;
};

const layoutMermaidNodes = () => {
  const spacingX = 180;
  const spacingY = 120;
  const baseX = 140;
  const baseY = 90;
  const direction = (mermaidGraph.direction || "TD").toUpperCase();

  if (direction === "LR" || direction === "RL") {
    mermaidGraph.nodes.forEach((node, index) => {
      const offset = index * spacingX;
      node.y = baseY;
      node.x = direction === "LR" ? baseX + offset : baseX - offset;
    });
    return;
  }

  mermaidGraph.nodes.forEach((node, index) => {
    const offset = index * spacingY;
    node.x = baseX;
    node.y = direction === "TD" ? baseY + offset : baseY - offset;
  });
};

const parseMermaidBlock = (content) => {
  resetMermaidGraph("flowchart");
  const lines = content.split("\n").map(line => line.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    ensureMermaidNode("A", "Node");
    layoutMermaidNodes();
    pushMermaidHistory();
    return;
  }
  
  const firstLine = lines[0];
  if (firstLine.toLowerCase().startsWith("flowchart")) {
    const parts = firstLine.split(/\s+/);
    if (parts[1]) {
      mermaidGraph.direction = parts[1].toUpperCase();
    }
  }
  
  const nodeRegex = /^([A-Za-z0-9_]+)\s*$/;
  const nodeLabelRegex = /^([A-Za-z0-9_]+)\s*(\[\[[^\]]+\]\]|\(\[[^\]]+\]\)|\(\([^\)]+\)\)|\[[^\]]+\]|\([^\)]+\)|\{[^\}]+\})/;
  const edgeRegex = /^([A-Za-z0-9_]+)\s*[-.]*-+>\s*([A-Za-z0-9_]+)(?:\s*:\s*(.+))?$/;
  const styleRegex = /^style\s+([A-Za-z0-9_]+)\s+(.+)$/i;
  
  lines.forEach(line => {
    if (line.startsWith("flowchart")) return;
    if (line.startsWith("%%")) return;
    
    const styleMatch = line.match(styleRegex);
    if (styleMatch) {
      const nodeId = styleMatch[1];
      const styles = styleMatch[2].split(",").map(part => part.trim());
      const node = ensureMermaidNode(nodeId);
      styles.forEach(style => {
        const [key, value] = style.split(":").map(part => part.trim());
        if (key === "fill") {
          node.fill = value;
        }
      });
      return;
    }

    const edgeMatch = line.match(edgeRegex);
    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const toId = edgeMatch[2];
      ensureMermaidNode(fromId);
      ensureMermaidNode(toId);
      mermaidGraph.edges.push({ from: fromId, to: toId, label: edgeMatch[3] || "" });
      return;
    }
    
    const labelMatch = line.match(nodeLabelRegex);
    if (labelMatch) {
      const id = labelMatch[1];
      const rawLabel = labelMatch[2];
      let label = rawLabel.slice(1, -1).trim();
      if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
        label = label.slice(1, -1).trim();
      }
      let shape = "rect";
      if (rawLabel.startsWith("((") && rawLabel.endsWith("))")) {
        shape = "circle";
        label = rawLabel.slice(2, -2).trim();
      } else if (rawLabel.startsWith("([") && rawLabel.endsWith("])") ) {
        shape = "stadium";
        label = rawLabel.slice(2, -2).trim();
      } else if (rawLabel.startsWith("(") && rawLabel.endsWith(")")) {
        shape = "round";
      } else if (rawLabel.startsWith("{") && rawLabel.endsWith("}")) {
        shape = "diamond";
      } else if (rawLabel.startsWith("[[") && rawLabel.endsWith("]]")) {
        shape = "rect";
        label = rawLabel.slice(2, -2).trim();
      }
      ensureMermaidNode(id, label || id, shape);
      return;
    }
    
    const nodeMatch = line.match(nodeRegex);
    if (nodeMatch) {
      ensureMermaidNode(nodeMatch[1]);
    }
  });
  
  if (mermaidGraph.nodes.length === 0) {
    ensureMermaidNode("A", "Node");
  }
  
  layoutMermaidNodes();
  pushMermaidHistory();
};

const generateMermaidCode = () => {
  const direction = mermaidGraph.direction || "TD";
  const lines = [`flowchart ${direction}`];
  
  mermaidGraph.nodes.forEach(node => {
    const label = (node.label || node.id).replace(/"/g, "'");
    let shapeOpen = "[";
    let shapeClose = "]";
    let quotedLabel = true;
    if (node.shape === "round") {
      shapeOpen = "(";
      shapeClose = ")";
    } else if (node.shape === "stadium") {
      shapeOpen = "([";
      shapeClose = "])";
    } else if (node.shape === "diamond") {
      shapeOpen = "{";
      shapeClose = "}";
      quotedLabel = false;
    } else if (node.shape === "circle") {
      shapeOpen = "((";
      shapeClose = "))";
      quotedLabel = false;
    }
    if (quotedLabel) {
      lines.push(`  ${node.id}${shapeOpen}"${label}"${shapeClose}`);
    } else {
      lines.push(`  ${node.id}${shapeOpen}${label}${shapeClose}`);
    }
  });
  
  mermaidGraph.edges.forEach(edge => {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  });

  mermaidGraph.nodes.forEach(node => {
    if (node.fill) {
      lines.push(`  style ${node.id} fill:${node.fill},stroke:#4b5563,stroke-width:1px`);
    }
  });
  
  return lines.join("\n");
};

const updateMermaidPreview = async () => {
  if (!elements.mermaidPreview) return;
  
  const code = generateMermaidCode();
  
  try {
    elements.mermaidPreview.innerHTML = `<div class="mermaid">${code}</div>`;
    if (window.mermaid) {
      await window.mermaid.run({
        querySelector: "#mermaidPreview .mermaid"
      });
    }
  } catch (error) {
    elements.mermaidPreview.innerHTML = `<p style='color: #dc2626;'>Error: ${error.message}</p>`;
  }
  await renderMermaidCanvas();
};

const resizeMermaidCanvas = async () => {
  if (!elements.mermaidCanvas) return;
  await renderMermaidCanvas();
};

const applyMermaidZoom = () => {
  const view = elements.mermaidCanvas?.querySelector(".mermaid");
  if (!view) return;
  view.style.transform = `scale(${mermaidGraph.zoom})`;
};

const clearMermaidSelectionHighlight = () => {
  const nodes = elements.mermaidCanvas?.querySelectorAll(".node") || [];
  nodes.forEach(node => node.classList.remove("selected"));
};

const applyMermaidSelectionHighlight = () => {
  if (!mermaidSelectedNodeId) return;
  const nodes = elements.mermaidCanvas?.querySelectorAll(".node") || [];
  nodes.forEach(node => {
    const id = node.getAttribute("id") || "";
    const text = node.querySelector("text")?.textContent?.trim() || "";
    if (id.includes(mermaidSelectedNodeId) || text === mermaidSelectedNodeId) {
      node.classList.add("selected");
    }
  });
};

const selectMermaidNodeFromElement = (nodeEl) => {
  const text = nodeEl.querySelector("text")?.textContent?.trim() || "";
  let node = mermaidGraph.nodes.find(n => n.label === text || n.id === text);
  if (!node) {
    const id = nodeEl.getAttribute("id") || "";
    node = mermaidGraph.nodes.find(n => id.includes(n.id));
  }
  if (!node) return;
  mermaidSelectedNodeId = node.id;
  updateMermaidPropertyPanel();
  clearMermaidSelectionHighlight();
  applyMermaidSelectionHighlight();
};

const renderMermaidCanvas = async () => {
  if (!elements.mermaidCanvas) return;
  const code = generateMermaidCode();
  console.log('Rendering Mermaid canvas with code:', code);
  elements.mermaidCanvas.innerHTML = `<div class="mermaid">${code}</div>`;
  if (window.mermaid) {
    try {
      initMermaid();
      const mermaidEl = elements.mermaidCanvas.querySelector('.mermaid');
      if (mermaidEl) {
        await window.mermaid.run({ nodes: [mermaidEl] });
        console.log('Mermaid canvas rendered successfully');
      }
    } catch (error) {
      console.error('Error rendering Mermaid canvas:', error);
      elements.mermaidCanvas.innerHTML = `<p style="color: red; padding: 20px;">Error: ${error.message}</p>`;
    }
  }
  applyMermaidZoom();
  clearMermaidSelectionHighlight();
  applyMermaidSelectionHighlight();
};

const setMermaidEdgeMode = (active) => {
  mermaidEdgeMode = active;
  mermaidEdgeStartId = null;
  elements.mermaidAddEdge?.classList.toggle("active", active);
  elements.mermaidCanvas?.classList.toggle("connecting", active);
  renderMermaidCanvas();
};

const updateMermaidPropertyPanel = () => {
  const labelInput = elements.mermaidNodeLabel;
  const shapeSelect = elements.mermaidNodeShape;
  const colorInput = elements.mermaidNodeColor;
  const node = mermaidGraph.nodes.find(n => n.id === mermaidSelectedNodeId);

  if (!labelInput || !shapeSelect || !colorInput) return;

  if (!node) {
    labelInput.value = "";
    shapeSelect.value = "rect";
    colorInput.value = "#ffffff";
    labelInput.disabled = true;
    shapeSelect.disabled = true;
    colorInput.disabled = true;
    return;
  }

  labelInput.disabled = false;
  shapeSelect.disabled = false;
  colorInput.disabled = false;
  labelInput.value = node.label || node.id;
  shapeSelect.value = node.shape || "rect";
  colorInput.value = node.fill || "#ffffff";
};

const openMermaidEditor = async () => {
  const content = getMermaidBlockContent();
  parseMermaidBlock(content);
  
  if (elements.mermaidDiagramType) {
    elements.mermaidDiagramType.value = "flowchart";
  }
  if (elements.mermaidLayoutDirection) {
    elements.mermaidLayoutDirection.value = mermaidGraph.direction || "TD";
  }
  
  elements.mermaidEditorModal?.classList.remove("hidden");
  elements.mermaidEditorOverlay?.classList.remove("hidden");
  updateMermaidPropertyPanel();
  await updateMermaidPreview();
};

const closeMermaidEditor = (applyChanges = true) => {
  if (applyChanges) {
    const code = generateMermaidCode();
    setMermaidBlockContent(code);
  }
  elements.mermaidEditorModal?.classList.add("hidden");
  elements.mermaidEditorOverlay?.classList.add("hidden");
  mermaidBlockStart = -1;
  mermaidBlockEnd = -1;
  mermaidSelectedNodeId = null;
  mermaidEdgeStartId = null;
  setMermaidEdgeMode(false);
};

const addMermaidNode = () => {
  let idIndex = mermaidGraph.nodes.length + 1;
  let nodeId = `N${idIndex}`;
  while (mermaidGraph.nodes.some(n => n.id === nodeId)) {
    idIndex += 1;
    nodeId = `N${idIndex}`;
  }
  
  const shape = elements.mermaidNodeShape?.value || "rect";
  const fill = elements.mermaidNodeColor?.value || "";
  const newNode = { id: nodeId, label: "Node", shape, fill, x: 0, y: 0, width: 0, height: 0 };
  mermaidGraph.nodes.push(newNode);
  mermaidSelectedNodeId = nodeId;
  pushMermaidHistory();
  updateMermaidPropertyPanel();
  updateMermaidPreview();
};

const deleteSelectedMermaidNode = () => {
  if (!mermaidSelectedNodeId) return;
  mermaidGraph.nodes = mermaidGraph.nodes.filter(n => n.id !== mermaidSelectedNodeId);
  mermaidGraph.edges = mermaidGraph.edges.filter(e => e.from !== mermaidSelectedNodeId && e.to !== mermaidSelectedNodeId);
  mermaidSelectedNodeId = null;
  pushMermaidHistory();
  updateMermaidPropertyPanel();
  updateMermaidPreview();
  renderMermaidCanvas();
};

const zoomMermaidCanvas = (delta) => {
  const next = Math.min(2.5, Math.max(0.4, mermaidGraph.zoom + delta));
  mermaidGraph.zoom = next;
  applyMermaidZoom();
};

const resetMermaidZoom = () => {
  mermaidGraph.zoom = 1;
  mermaidGraph.panX = 0;
  mermaidGraph.panY = 0;
  applyMermaidZoom();
};

const initMermaidCanvasEvents = () => {
  const canvas = elements.mermaidCanvas;
  
  canvas.addEventListener("click", (event) => {
    const nodeEl = event.target.closest(".node");
    if (!nodeEl) return;
    if (mermaidEdgeMode) {
      selectMermaidNodeFromElement(nodeEl);
      if (!mermaidEdgeStartId && mermaidSelectedNodeId) {
        mermaidEdgeStartId = mermaidSelectedNodeId;
        return;
      }
      if (mermaidEdgeStartId && mermaidSelectedNodeId && mermaidEdgeStartId !== mermaidSelectedNodeId) {
        mermaidGraph.edges.push({ from: mermaidEdgeStartId, to: mermaidSelectedNodeId, label: "" });
        mermaidEdgeStartId = null;
        pushMermaidHistory();
        updateMermaidPreview();
      }
      return;
    }
    selectMermaidNodeFromElement(nodeEl);
  });
  
  canvas.addEventListener("dblclick", (event) => {
    const nodeEl = event.target.closest(".node");
    if (!nodeEl) return;
    selectMermaidNodeFromElement(nodeEl);
    const node = mermaidGraph.nodes.find(n => n.id === mermaidSelectedNodeId);
    if (!node) return;
    const nextLabel = prompt("Node Label", node.label || node.id);
    if (nextLabel !== null && nextLabel.trim()) {
      node.label = nextLabel.trim();
      pushMermaidHistory();
      updateMermaidPropertyPanel();
      updateMermaidPreview();
    }
  });
  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.1 : -0.1;
    zoomMermaidCanvas(delta);
  }, { passive: false });
};

// Custom fold range function for Mermaid blocks
const mermaidBlockFolder = (cm, line) => {
  const lineText = cm.getLine(line);
  if (!lineText || !lineText.trim().toLowerCase().startsWith('```mermaid')) {
    return null;
  }
  
  // Find the end of the mermaid block
  const lineCount = cm.lineCount();
  for (let i = line + 1; i < lineCount; i++) {
    const checkLine = cm.getLine(i);
    if (checkLine && checkLine.trim() === '```') {
      return {
        from: window.CodeMirror.Pos(line, lineText.length),
        to: window.CodeMirror.Pos(i, 0)
      };
    }
  }
  return null;
};

// Function to fold/unfold all Mermaid blocks
const foldAllMermaidBlocks = (shouldFold = true) => {
  if (!editorView) return;
  
  const lineCount = editorView.lineCount();
  for (let i = 0; i < lineCount; i++) {
    const line = editorView.getLine(i);
    if (line && line.trim().toLowerCase().startsWith('```mermaid')) {
      if (shouldFold) {
        editorView.foldCode(i);
      } else {
        editorView.unfoldCode(i);
      }
    }
  }
};

// Bi-directional sync between editor and preview
let syncInProgress = false;

// Preview click → Editor cursor
const handlePreviewClick = (event) => {
  if (!editorView) return;
  if (syncInProgress) return;
  const root = getActivePreviewRoot();
  if (!root) return;
  
  // Don't sync if clicking on interactive elements
  if (event.target.tagName === 'A' || event.target.tagName === 'BUTTON') return;
  
  let target = event.target;
  let sourcepos = null;
  
  // Walk up to find data-sourcepos
  while (target && target !== root) {
    sourcepos = target.getAttribute("data-sourcepos");
    if (sourcepos) break;
    target = target.parentElement;
  }
  
  if (!sourcepos) return;
  
  const pos = parseSourcepos(sourcepos);
  if (!pos) return;
  
  syncInProgress = true;
  const line = pos.start - 1; // 0-indexed
  editorView.setCursor({ line, ch: 0 });
  editorView.focus();
  
  // Scroll to cursor
  setTimeout(() => {
    const coords = editorView.cursorCoords(true, "local");
    const scrollInfo = editorView.getScrollInfo();
    const centerY = scrollInfo.clientHeight / 2;
    editorView.scrollTo(null, coords.top - centerY);
    syncInProgress = false;
  }, 10);
};

// Preview selection → Editor selection
let selectionTimeout = null;
const handleSelectionChange = () => {
  if (!editorView) return;
  if (syncInProgress) return;
  const root = getActivePreviewRoot();
  if (!root) return;
  
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (selection.isCollapsed) return; // No selection
    
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    
    // Get the selected text
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    // Get start and end nodes
    let startNode = range.startContainer.nodeType === Node.TEXT_NODE 
      ? range.startContainer.parentElement 
      : range.startContainer;
    let endNode = range.endContainer.nodeType === Node.TEXT_NODE 
      ? range.endContainer.parentElement 
      : range.endContainer;
    
    // Find sourcepos
    while (startNode && startNode !== root && !startNode.hasAttribute("data-sourcepos")) {
      startNode = startNode.parentElement;
    }
    while (endNode && endNode !== root && !endNode.hasAttribute("data-sourcepos")) {
      endNode = endNode.parentElement;
    }
    
    if (!startNode || !endNode) return;
    
    const startPos = parseSourcepos(startNode.getAttribute("data-sourcepos"));
    const endPos = parseSourcepos(endNode.getAttribute("data-sourcepos"));
    
    if (!startPos || !endPos) return;
    
    syncInProgress = true;
    
    // Search for the selected text within the line range
    const startLine = startPos.start - 1;
    const endLine = endPos.end - 1;
    
    // Get all text in this range
    let found = false;
    for (let line = startLine; line <= endLine; line++) {
      const lineText = editorView.getLine(line);
      if (!lineText) continue;
      
      const index = lineText.indexOf(selectedText);
      if (index !== -1) {
        // Found exact match on this line
        editorView.setSelection(
          { line: line, ch: index },
          { line: line, ch: index + selectedText.length }
        );
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Try multi-line selection
      const allText = [];
      for (let line = startLine; line <= endLine; line++) {
        allText.push(editorView.getLine(line));
      }
      const combinedText = allText.join('\n');
      const index = combinedText.indexOf(selectedText);
      
      if (index !== -1) {
        // Calculate line and character position
        let charCount = 0;
        let foundStartLine = startLine;
        let foundStartCh = 0;
        
        for (let line = startLine; line <= endLine; line++) {
          const lineText = editorView.getLine(line);
          if (charCount + lineText.length + 1 > index) {
            foundStartLine = line;
            foundStartCh = index - charCount;
            break;
          }
          charCount += lineText.length + 1; // +1 for newline
        }
        
        // Calculate end position
        let endCharCount = charCount;
        let foundEndLine = foundStartLine;
        let foundEndCh = foundStartCh;
        const endIndex = index + selectedText.length;
        
        for (let line = foundStartLine; line <= endLine; line++) {
          const lineText = editorView.getLine(line);
          const lineLength = line === foundStartLine ? lineText.length - foundStartCh : lineText.length;
          
          if (endCharCount + lineLength >= endIndex) {
            foundEndLine = line;
            foundEndCh = line === foundStartLine ? foundStartCh + (endIndex - endCharCount) : endIndex - endCharCount;
            break;
          }
          endCharCount += lineLength + 1;
        }
        
        editorView.setSelection(
          { line: foundStartLine, ch: foundStartCh },
          { line: foundEndLine, ch: foundEndCh }
        );
        found = true;
      }
    }
    
    if (!found) {
      // Fallback: select whole lines
      const endLineText = editorView.getLine(endLine) || "";
      editorView.setSelection(
        { line: startLine, ch: 0 },
        { line: endLine, ch: endLineText.length }
      );
    }
    
    setTimeout(() => { syncInProgress = false; }, 100);
  }, 150);
};

// Editor cursor → Preview highlight
const handleEditorCursor = () => {
  if (!editorView) return;
  if (syncInProgress) return;
  
  const cursor = editorView.getCursor("from");
  highlightPreviewForLine(cursor.line, true);
  if (currentView === "tree") {
    highlightTreeBranchForCursor();
  }
};

// Editor selection → Preview highlight
let lastEditorSelection = "";
const handleEditorSelection = () => {
  if (!editorView) return;
  if (syncInProgress) return;
  
  const from = editorView.getCursor("from");
  const to = editorView.getCursor("to");
  const rawSelectedText = editorView.getSelection();
  const renderedSelectedText = normalizeTextForMatch(renderSelectionText(rawSelectedText));
  const fallbackSelectedText = normalizeTextForMatch(rawSelectedText);
  const selectedText = renderedSelectedText || fallbackSelectedText;
  
  // Avoid redundant updates
  if (selectedText === lastEditorSelection) return;
  lastEditorSelection = selectedText;
  
  if (from.line === to.line && from.ch === to.ch) {
    // Just cursor, not selection
    clearPreviewSelection();
    highlightPreviewForLine(from.line, true);
  } else {
    // Has selection - map selected editor line range to preview blocks
    if (!selectedText) return;
    
    syncInProgress = true;
    
    const startLine = from.line + 1; // 1-indexed for sourcepos
    const endLine = to.line + 1;
    const root = getActivePreviewRoot();
    if (!root) {
      setTimeout(() => { syncInProgress = false; }, 50);
      return;
    }
    const nodes = Array.from(root.querySelectorAll("[data-sourcepos]"));

    const overlapping = [];
    for (const node of nodes) {
      const pos = parseSourcepos(node.getAttribute("data-sourcepos"));
      if (!pos) continue;
      if (pos.end >= startLine && pos.start <= endLine) {
        overlapping.push(node);
      }
    }

    if (overlapping.length > 0) {
      flashPreviewSyncHighlight(overlapping, true);
      setTimeout(() => { syncInProgress = false; }, 50);
      return;
    }
    
    setTimeout(() => { syncInProgress = false; }, 50);
    
    // Fallback: just highlight the line
    highlightPreviewForLine(from.line, true);
  }
};

const initEditor = () => {
  const textarea = document.createElement("textarea");
  elements.editorHost.appendChild(textarea);
  editorView = window.CodeMirror.fromTextArea(textarea, {
    mode: activeSettings.syntaxHighlight ? "markdown" : null,
    lineWrapping: Boolean(activeSettings.lineWrapping),
    lineNumbers: activeSettings.lineNumbers,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    foldOptions: {
      rangeFinder: mermaidBlockFolder
    },
    extraKeys: {
      "Ctrl-Space": (cm) => {
        // Check if we're in a mermaid block
        const cursor = cm.getCursor();
        const inMermaidBlock = isInMermaidBlock(cm, cursor.line);
        if (inMermaidBlock) {
          openMermaidEditor();
        }
      },
      "Ctrl-Alt-M": (cm) => {
        // Toggle fold for all Mermaid blocks
        const lineCount = cm.lineCount();
        let hasUnfolded = false;
        
        // Check if any mermaid blocks are unfolded
        for (let i = 0; i < lineCount; i++) {
          const line = cm.getLine(i);
          if (line && line.trim().toLowerCase().startsWith('```mermaid')) {
            const info = cm.lineInfo(i);
            if (!info.gutterMarkers || !info.gutterMarkers["CodeMirror-foldgutter"]) {
              hasUnfolded = true;
              break;
            }
          }
        }
        
        // If any are unfolded, fold all. Otherwise unfold all.
        foldAllMermaidBlocks(hasUnfolded);
      }
    }
  });

  editorView.setSize(null, "100%");
  updateLayoutBlockVisibility();

  editorView.on("change", () => {
    handleEditorChange();
  });

  editorView.on("scroll", () => {
    if (currentView === "preview" && activeSettings.syncScroll) {
      syncScroll(editorView.getScrollerElement(), elements.preview, "editor");
    }
  });
  
  editorView.on("cursorActivity", () => {
    handleEditorCursor();
    handleEditorSelection();
  });
};

elements.preview.addEventListener("scroll", () => {
  if (currentView === "preview" && activeSettings.syncScroll) {
    syncScroll(elements.preview, editorView?.getScrollerElement(), "preview");
  }
});

// Register sync event listeners
elements.preview.addEventListener("click", handlePreviewClick);
elements.printPreview?.addEventListener("click", handlePreviewClick);
document.addEventListener("selectionchange", handleSelectionChange);

// Actions

elements.newPasteBtn.addEventListener("click", resetEditor);
elements.historySearch.addEventListener("input", renderHistory);
elements.previewDocxBtn.addEventListener("click", () => exportFile("docx"));
document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetView = btn.dataset.view;
    if (targetView) setView(targetView);
  });
});
elements.togglePrintViewBtn?.addEventListener("click", () => {
  togglePrintView();
});

elements.openLayoutConfig?.addEventListener("click", () => {
  openLayoutEditor();
});

// Ctrl+Shift+L shortcut for layout configuration
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "L") {
    e.preventDefault();
    openLayoutEditor();
  }
});

const toggleAiChat = () => {
  setView(currentView === "chat" ? "preview" : "chat");
};

// Alt+Space shortcut for AI chat
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "Space") {
    e.preventDefault();
    toggleAiChat();
  }
});
elements.previewPresetTrigger?.addEventListener("click", () => {
  elements.previewPresetMenu?.classList.toggle("hidden");
});
elements.previewPresetItems?.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.preset) {
      applyPreviewPreset(btn.dataset.preset);
    }
    elements.previewPresetMenu?.classList.add("hidden");
  });
});
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!elements.previewPresetMenu || !elements.previewPresetTrigger) return;
  if (elements.previewPresetMenu.contains(target) || elements.previewPresetTrigger.contains(target)) return;
  elements.previewPresetMenu.classList.add("hidden");
});

elements.shareBtn?.addEventListener("click", () => {
  elements.shareMenu?.classList.toggle("hidden");
});
elements.shareMenu?.addEventListener("click", () => {
  elements.shareMenu?.classList.add("hidden");
});
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!elements.shareMenu || !elements.shareBtn) return;
  if (elements.shareMenu.contains(target) || elements.shareBtn.contains(target)) return;
  elements.shareMenu.classList.add("hidden");
});

elements.permalinkBtn?.addEventListener("click", async () => {
  if (!currentPasteId) {
    setStatus(t("saveFirst"), "error");
    return;
  }

  // Make paste shared if not already
  if (!currentPasteIsShared) {
    try {
      const res = await fetch(`/api/pastes/${currentPasteId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: true })
      });
      if (res.ok) {
        currentPasteIsShared = true;
        // Show password button
        if (elements.collabPasswordBtn) {
          elements.collabPasswordBtn.style.display = "inline-block";
        }
      }
    } catch (err) {
      console.error("Failed to share paste:", err);
    }
  }

  const url = `${window.location.origin}/${currentPasteId}`;
  copyToClipboard(url);
  setStatus(t("permalinkCopied"), "success");
});

elements.copyMdBtn?.addEventListener("click", () => copyToClipboard(getMarkdown()));
elements.downloadMdBtn?.addEventListener("click", downloadMarkdown);
elements.copyTextBtn.addEventListener("click", async () => {
  const html = await serializePreviewForExport();
  copyRichText(html, elements.preview.innerText);
});
elements.sharePdfBtn?.addEventListener("click", () => exportFile("pdf"));
elements.settingsBtn?.addEventListener("click", openSettings);
elements.layoutEditorBtn?.addEventListener("click", openLayoutEditor);
elements.tipsBtn?.addEventListener("click", showTipsModal);
elements.settingsClose?.addEventListener("click", closeSettings);
elements.settingsOverlay?.addEventListener("click", closeSettings);
elements.layoutEditorClose?.addEventListener("click", closeLayoutEditor);
elements.layoutEditorCancel?.addEventListener("click", closeLayoutEditor);
elements.layoutEditorOverlay?.addEventListener("click", closeLayoutEditor);
elements.layoutEditorSave?.addEventListener("click", saveLayoutEditorValues);

// Layout Editor Tab Switching
elements.layoutEditorTabs?.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;
    
    // Update active tab
    elements.layoutEditorTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    
    // Update active content
    elements.layoutEditorTabContents?.forEach((content) => {
      if (content.dataset.content === targetTab) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
  });
});

// Layout Selection Change
elements.layoutEditorSelect?.addEventListener("change", () => {
  const selectedPreset = elements.layoutEditorSelect?.value || "scientific";
  if (selectedPreset === "document") {
    syncDocumentPresetState();
    loadLayoutEditorValues();
    return;
  }
  layoutEditorState = loadLayoutEditorState();
  const bundle = ensureTableBundleForPreset(layoutEditorState, selectedPreset, layoutEditorState.table);
  if (!bundle.layouts.default || !Object.keys(bundle.layouts.default).length) {
    bundle.layouts.default = getTablePresetForLayout(selectedPreset, {});
  }
  if (!bundle.layouts[bundle.activeLayout]) {
    bundle.activeLayout = "default";
  }
  layoutEditorState.table = bundle.layouts[bundle.activeLayout];
  saveLayoutEditorState();
  loadLayoutEditorValues();
});

elements.tableLayoutProfileSelect?.addEventListener("change", () => {
  saveCurrentTableSettingsToState();
  const bundle = getCurrentTableBundle();
  const nextName = elements.tableLayoutProfileSelect?.value || "default";

  if (nextName === NEW_TABLE_LAYOUT_VALUE) {
    if (bundle.pendingNewLayout && bundle.layouts[bundle.pendingNewLayout]) {
      bundle.activeLayout = bundle.pendingNewLayout;
    } else {
      const sourceName = bundle.activeLayout || "default";
      const source = normalizeTableState(
        bundle.layouts[sourceName] || bundle.layouts.default || getTablePresetForLayout(getCurrentLayoutPreset(), {})
      );
      const createdName = createUniqueTableLayoutName(bundle, "new-layout");
      bundle.layouts[createdName] = JSON.parse(JSON.stringify(source));
      bundle.activeLayout = createdName;
      bundle.pendingNewLayout = createdName;
      shouldFocusTableLayoutName = true;
    }
  } else {
    bundle.activeLayout = bundle.layouts[nextName] ? nextName : "default";
  }

  saveLayoutEditorState();
  loadLayoutEditorValues();
});

elements.tableLayoutName?.addEventListener("change", () => {
  const bundle = getCurrentTableBundle();
  const currentName = bundle.activeLayout || "default";
  const cleanName = sanitizeTableLayoutName(elements.tableLayoutName?.value);

  if (currentName === "default") {
    setLayoutValue("table-layout-name", "default");
    return;
  }

  if (!cleanName) {
    setLayoutValue("table-layout-name", currentName);
    return;
  }

  if (cleanName !== currentName && bundle.layouts[cleanName]) {
    window.alert(t("layoutTableErrorExists"));
    setLayoutValue("table-layout-name", currentName);
    return;
  }

  if (cleanName === currentName) {
    setLayoutValue("table-layout-name", cleanName);
    return;
  }

  const renamedLayouts = {};
  Object.entries(bundle.layouts).forEach(([name, value]) => {
    renamedLayouts[name === currentName ? cleanName : name] = value;
  });
  bundle.layouts = renamedLayouts;
  if (bundle.pendingNewLayout === currentName && cleanName !== currentName) {
    bundle.pendingNewLayout = null;
  }
  bundle.activeLayout = cleanName;
  layoutEditorState.table = bundle.layouts[cleanName];
  saveLayoutEditorState();
  loadLayoutEditorValues();
});

elements.tableLayoutProfileDelete?.addEventListener("click", () => {
  saveCurrentTableSettingsToState();
  const bundle = getCurrentTableBundle();
  const currentName = getCurrentTableLayoutName();
  if (currentName === "default") {
    window.alert(t("layoutTableErrorDeleteDefault"));
    return;
  }
  const confirmText = t("layoutTableConfirmDelete").replace("{name}", currentName);
  if (!window.confirm(confirmText)) return;

  if (bundle.pendingNewLayout === currentName) {
    bundle.pendingNewLayout = null;
  }
  delete bundle.layouts[currentName];
  bundle.activeLayout = "default";
  saveLayoutEditorState();
  loadLayoutEditorValues();
});

// Page Tab: Orientation Button Toggle
document.querySelectorAll(".layout-orientation-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".layout-orientation-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    layoutEditorState.page = readPageSettings();
    applyLayoutEditorCss();
  });
});

// Page Tab: Book Binding Checkbox
const bookBindingCheckbox = document.getElementById("page-book-binding");
const bindingOffsetRow = document.getElementById("binding-offset-row");

if (bookBindingCheckbox && bindingOffsetRow) {
  bookBindingCheckbox.addEventListener("change", () => {
    bindingOffsetRow.style.display = bookBindingCheckbox.checked ? "grid" : "none";
    layoutEditorState.page = readPageSettings();
    applyLayoutEditorCss();
  });
}

// Text Element Selection (for new layout editor structure)
document.addEventListener("click", (e) => {
  const elementItem = e.target.closest(".layout-text-element-item");
  if (elementItem) {
    // Find the active tab content
    const activeTabContent = elementItem.closest(".layout-editor-tab-content");
    
    // Update active state only within the current tab
    if (activeTabContent) {
      activeTabContent.querySelectorAll(".layout-text-element-item").forEach(item => {
        item.classList.remove("active");
      });
    }
    elementItem.classList.add("active");
    
    // Load values for selected element
    const elementType = elementItem.dataset.element;
    loadElementAttributes(elementType);
    
    // Show/hide conditional fields
    updateAttributeVisibility(elementType);
  }
});

// Table Section Selection
document.addEventListener("click", (e) => {
  const sectionItem = e.target.closest(".layout-table-section-item");
  if (sectionItem) {
    setActiveTableSection(sectionItem.dataset.tableSection);
  }
});

// Toggle button handling
document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".layout-toggle-btn");
  if (toggleBtn) {
    // Find the active tab content
    const activeTabContent = toggleBtn.closest(".layout-editor-tab-content");
    const isTextAttributes = Boolean(toggleBtn.closest(".layout-text-attributes"));
    const isTableSettings = Boolean(toggleBtn.closest(".layout-table-settings"));
    
    // Handle alignment buttons (only one active at a time)
    if (toggleBtn.classList.contains("layout-align-btn")) {
      const alignScope = toggleBtn.closest(".layout-align-scope") || activeTabContent;
      if (alignScope) {
        alignScope.querySelectorAll(".layout-align-btn").forEach(btn => {
          btn.classList.remove("active");
        });
      }
      toggleBtn.classList.add("active");
    } else {
      // Handle other toggle buttons (can be multiple active)
      toggleBtn.classList.toggle("active");
    }

    if (isTextAttributes) {
      updateAttributePreview();
    }
    if (isTableSettings) {
      saveCurrentTableSettingsToState();
      applyLayoutEditorCss();
    }
  }
  
  // Color palette handling
  const colorSwatch = e.target.closest(".color-swatch");
  if (colorSwatch) {
    const color = colorSwatch.dataset.color;
    const picker = colorSwatch.closest(".layout-color-picker");
    const colorInput = picker?.querySelector("input[type=\"color\"]");
    if (colorInput) {
      colorInput.value = color;
      if (picker.closest(".layout-text-attributes")) {
        updateAttributePreview();
      } else if (picker.closest(".layout-table-settings")) {
        saveCurrentTableSettingsToState();
        applyLayoutEditorCss();
      }
    }
  }
});

// Update preview when any attribute changes
document.addEventListener("change", (e) => {
  if (e.target.closest(".layout-text-attributes")) {
    updateAttributePreview();
  }
  if (e.target.closest(".layout-page-settings")) {
    layoutEditorState.page = readPageSettings();
    applyLayoutEditorCss();
  }
  if (e.target.closest(".layout-table-settings")) {
    saveCurrentTableSettingsToState();
    applyLayoutEditorCss();
    updateTableDedicatedVisibility();
  }
});

document.addEventListener("input", (e) => {
  if (e.target.closest(".layout-text-attributes")) {
    updateAttributePreview();
  }
  if (e.target.closest(".layout-page-settings")) {
    layoutEditorState.page = readPageSettings();
    applyLayoutEditorCss();
  }
  if (e.target.closest(".layout-table-settings")) {
    saveCurrentTableSettingsToState();
    applyLayoutEditorCss();
    updateTableDedicatedVisibility();
  }
});

const updateAttributePreview = () => {
  // Find the active tab content
  const activeTabContent = document.querySelector(".layout-editor-tab-content.active");
  if (!activeTabContent) return;
  
  const previewContent = activeTabContent.querySelector("#attr-preview-content");
  if (!previewContent) return;
  
  // Get current element type from the active tab
  const activeElement = activeTabContent.querySelector(".layout-text-element-item.active");
  const elementType = activeElement?.dataset.element || "body";
  
  const fontFamily = activeTabContent.querySelector("#attr-font-family")?.value || "Georgia, serif";
  const fontSize = activeTabContent.querySelector("#attr-font-size")?.value || "11pt";
  const fontWeight = activeTabContent.querySelector("#attr-font-weight")?.value || "400";
  const color = activeTabContent.querySelector("#attr-color")?.value || "#1a1a1a";
  const lineHeight = activeTabContent.querySelector("#attr-line-height")?.value || "1.6";
  const spacingBefore = activeTabContent.querySelector("#attr-spacing-before")?.value || "0";
  const spacingAfter = activeTabContent.querySelector("#attr-spacing-after")?.value || "12pt";
  
  // Get alignment from active button
  const activeAlignBtn = activeTabContent.querySelector(".layout-align-btn.active");
  const align = activeAlignBtn?.dataset.align || "left";
  
  // Get style toggles
  const italic = activeTabContent.querySelector("#attr-italic")?.classList.contains("active");
  const underline = activeTabContent.querySelector("#attr-underline")?.classList.contains("active");
  const smallCaps = activeTabContent.querySelector("#attr-small-caps")?.classList.contains("active");
  
  const indent = activeTabContent.querySelector("#attr-indent")?.value || "0";
  const markerSpacing = activeTabContent.querySelector("#attr-marker-spacing")?.value || "0.5em";
  const numberStyle = activeTabContent.querySelector("#attr-ol-style")?.value || "decimal";
  const headingNumbered = activeTabContent.querySelector("#attr-heading-numbered")?.checked;
  const ulMarker = activeTabContent.querySelector("#attr-ul-marker")?.value || "disc";
  const borderWidth = activeTabContent.querySelector("#attr-border-width")?.value || "1px";
  const borderColor = activeTabContent.querySelector("#attr-border-color")?.value || "#cccccc";
  const borderSides = Array.from(activeTabContent.querySelectorAll(".layout-border-btn.active"))
    .map((btn) => btn.dataset.border);

  layoutEditorState.elements[elementType] = {
    fontFamily,
    fontSize,
    fontWeight,
    color,
    lineHeight,
    spacingBefore,
    spacingAfter,
    align,
    italic,
    underline,
    smallCaps,
    indent,
    markerSpacing,
    olStyle: numberStyle,
    ulMarker,
    headingNumbered,
    borderWidth,
    borderColor,
    borderSides
  };
  applyLayoutEditorCss();

  const getSampleNumber = (style) => {
    switch (style) {
      case "decimal-leading-zero":
        return "01.";
      case "lower-alpha":
        return "a.";
      case "upper-alpha":
        return "A.";
      case "lower-roman":
        return "i.";
      case "upper-roman":
        return "I.";
      case "lower-greek":
        return "α.";
      default:
        return "1.";
    }
  };

  // Build preview content based on element type
  let previewHTML = "";
  
  if (elementType.startsWith("ul-")) {
    // Unordered list preview
    previewHTML = `<ul style="list-style-type: ${ulMarker}; padding-left: ${indent};">
      <li style="padding-left: ${markerSpacing};">${t('previewUlItem1')}</li>
      <li style="padding-left: ${markerSpacing};">${t('previewUlItem2')}</li>
      <li style="padding-left: ${markerSpacing};">${t('previewUlItem3')}</li>
    </ul>`;
  } else if (elementType.startsWith("ol-")) {
    // Ordered list preview
    previewHTML = `<ol style="list-style-type: ${numberStyle}; padding-left: ${indent};">
      <li style="padding-left: ${markerSpacing};">${t('previewOlItem1')}</li>
      <li style="padding-left: ${markerSpacing};">${t('previewOlItem2')}</li>
      <li style="padding-left: ${markerSpacing};">${t('previewOlItem3')}</li>
    </ol>`;
  } else if (elementType.startsWith("h")) {
    // Heading preview
    const level = elementType.substring(1);
    const numberPrefix = headingNumbered ? `<span class="heading-number">${getSampleNumber(numberStyle)}</span>` : "";
    previewHTML = `<h${level} class="preview-para preview-para-2">${numberPrefix}<span class="heading-text">${t('previewHeading', level)}</span></h${level}>`;
  } else if (elementType === "title") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewTitle')}</p>`;
  } else if (elementType === "subtitle") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewSubtitle')}</p>`;
  } else if (elementType === "header") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewHeader')}</p>`;
  } else if (elementType === "footer") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewFooter')}</p>`;
  } else if (elementType === "caption") {
    previewHTML = `<p class="preview-para preview-para-2"><em>${t('previewCaptionLabel')}</em> ${t('previewCaption')}</p>`;
  } else if (elementType === "table-caption") {
    previewHTML = `<p class="preview-para preview-para-2"><em>${t('previewTableCaptionLabel')}</em> ${t('previewTableCaption')}</p>`;
  } else if (elementType === "table-cell") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewTableCell')}</p>`;
  } else if (elementType === "code-block") {
    previewHTML = `<pre class="preview-para preview-para-2" style="white-space: pre; font-family: 'Courier New', monospace;"><code>function example() {
  const result = 42;
  return result;
}</code></pre>`;
  } else if (elementType === "blockquote") {
    previewHTML = `<blockquote class="preview-para preview-para-2" style="border-left: 4px solid var(--border); padding-left: 16px; margin: 0;">"${t('previewBlockquote')}"</blockquote>`;
  } else if (elementType === "inline-code") {
    previewHTML = `<p class="preview-para preview-para-2">${t('previewInlineCode', `<code style="padding: 2px 6px; border-radius: 3px; background: var(--hover-bg);">${t('previewInlineCodeSnippet')}</code>`)}</p>`;
  } else if (elementType === "table-header") {
    previewHTML = `<p class="preview-para preview-para-2" style="font-weight: 600;">${t('previewTableHeader')}</p>`;
  } else if (elementType === "footnote") {
    previewHTML = `<p class="preview-para preview-para-2" style="font-size: 0.85em;"><sup>1</sup> ${t('previewFootnote')}</p>`;
  } else {
    // Normal paragraph
    previewHTML = `<p class="preview-para preview-para-2" id="attr-preview">${t('previewPara2Body')}</p>`;
  }
  
  previewContent.innerHTML = previewHTML;
  
  // Apply common styles to all preview content
  const previewElement = previewContent.querySelector(":first-child");
  if (previewElement) {
    previewElement.style.setProperty('font-family', fontFamily, 'important');
    previewElement.style.setProperty('font-size', fontSize, 'important');
    previewElement.style.setProperty('font-weight', fontWeight, 'important');
    previewElement.style.setProperty('color', color, 'important');
    previewElement.style.setProperty('line-height', lineHeight, 'important');
    previewElement.style.setProperty('text-align', align, 'important');
    previewElement.style.setProperty('margin-top', spacingBefore, 'important');
    previewElement.style.setProperty('margin-bottom', spacingAfter, 'important');
    previewElement.style.setProperty('font-style', italic ? 'italic' : 'normal', 'important');
    previewElement.style.setProperty('text-decoration', underline ? 'underline' : 'none', 'important');
    previewElement.style.setProperty('font-variant', smallCaps ? 'small-caps' : 'normal', 'important');
    if (borderSides.length) {
      previewElement.style.setProperty('border-style', 'solid', 'important');
      previewElement.style.setProperty('border-color', borderColor, 'important');
      const sides = {
        top: borderSides.includes('top') ? borderWidth : '0',
        right: borderSides.includes('right') ? borderWidth : '0',
        bottom: borderSides.includes('bottom') ? borderWidth : '0',
        left: borderSides.includes('left') ? borderWidth : '0'
      };
      previewElement.style.setProperty('border-top-width', sides.top, 'important');
      previewElement.style.setProperty('border-right-width', sides.right, 'important');
      previewElement.style.setProperty('border-bottom-width', sides.bottom, 'important');
      previewElement.style.setProperty('border-left-width', sides.left, 'important');
    } else {
      previewElement.style.setProperty('border-width', '0', 'important');
    }

    if (elementType.startsWith("h")) {
      previewElement.style.setProperty('text-indent', indent, 'important');
      const headingNumber = previewElement.querySelector(".heading-number");
      if (headingNumber) {
        headingNumber.style.setProperty('margin-right', markerSpacing, 'important');
      }
    }
    
    // Apply to list items if it's a list
    if (elementType.startsWith("ul-") || elementType.startsWith("ol-")) {
      const listItems = previewElement.querySelectorAll("li");
      listItems.forEach(li => {
        li.style.setProperty('font-family', fontFamily, 'important');
        li.style.setProperty('font-size', fontSize, 'important');
        li.style.setProperty('font-weight', fontWeight, 'important');
        li.style.setProperty('color', color, 'important');
        li.style.setProperty('line-height', lineHeight, 'important');
        li.style.setProperty('font-style', italic ? 'italic' : 'normal', 'important');
        li.style.setProperty('text-decoration', underline ? 'underline' : 'none', 'important');
        li.style.setProperty('font-variant', smallCaps ? 'small-caps' : 'normal', 'important');
      });
    }
  }
  
  // Update context paragraphs (para-1 and para-3) with body text attributes when viewing body element
  if (elementType === "body") {
    const para1 = activeTabContent.querySelector(".preview-para-1");
    const para3 = activeTabContent.querySelector(".preview-para-3");
    
    [para1, para3].forEach(para => {
      if (para) {
        para.style.setProperty('font-family', fontFamily, 'important');
        para.style.setProperty('font-size', fontSize, 'important');
        para.style.setProperty('font-weight', fontWeight, 'important');
        para.style.setProperty('color', color, 'important');
        para.style.setProperty('line-height', lineHeight, 'important');
        para.style.setProperty('text-align', align, 'important');
        para.style.setProperty('font-style', italic ? 'italic' : 'normal', 'important');
        para.style.setProperty('text-decoration', underline ? 'underline' : 'none', 'important');
        para.style.setProperty('font-variant', smallCaps ? 'small-caps' : 'normal', 'important');
      }
    });
  } else {
    // Reset para-1 and para-3 to default muted style when viewing other elements
    const para1 = activeTabContent.querySelector(".preview-para-1");
    const para3 = activeTabContent.querySelector(".preview-para-3");
    
    [para1, para3].forEach(para => {
      if (para) {
        para.style.removeProperty('font-family');
        para.style.removeProperty('font-size');
        para.style.removeProperty('font-weight');
        para.style.removeProperty('color');
        para.style.removeProperty('line-height');
        para.style.removeProperty('text-align');
        para.style.removeProperty('font-style');
        para.style.removeProperty('text-decoration');
        para.style.removeProperty('font-variant');
      }
    });
  }
};

const updateAttributeVisibility = (elementType) => {
  // Find the active tab content
  const activeTabContent = document.querySelector(".layout-editor-tab-content.active");
  if (!activeTabContent) return;
  
  const listOnlyRow = activeTabContent.querySelector(".layout-attr-list-only");
  const ulOnlyFields = activeTabContent.querySelectorAll(".layout-attr-ul-only");
  const olOnlyFields = activeTabContent.querySelectorAll(".layout-attr-ol-only");
  const headingOnlyFields = activeTabContent.querySelectorAll(".layout-attr-heading-only");
  
  // Hide all conditional fields first
  if (listOnlyRow) listOnlyRow.style.display = "none";
  ulOnlyFields.forEach(field => field.style.display = "none");
  olOnlyFields.forEach(field => field.style.display = "none");
  headingOnlyFields.forEach(field => field.style.display = "none");
  
  // Show relevant fields based on element type
  if (elementType.startsWith("ul-")) {
    if (listOnlyRow) listOnlyRow.style.display = "";
    ulOnlyFields.forEach(field => field.style.display = "");
  } else if (elementType.startsWith("ol-")) {
    if (listOnlyRow) listOnlyRow.style.display = "";
    olOnlyFields.forEach(field => field.style.display = "");
  } else if (elementType.startsWith("h")) {
    if (listOnlyRow) listOnlyRow.style.display = "";
    olOnlyFields.forEach(field => field.style.display = "");
    headingOnlyFields.forEach(field => field.style.display = "");
  }
};

const loadElementAttributes = (elementType) => {
  const defaults = getDefaultAttributes(elementType);
  const stored = layoutEditorState.elements?.[elementType] || {};
  const merged = { ...defaults, ...stored };
  applyAttributeValues(merged);
};

const getDefaultAttributes = (elementType) => {
  const defaults = {
    fontFamily: "Georgia, serif",
    fontSize: "11pt",
    fontWeight: "400",
    align: "justify",
    color: "#1a1a1a",
    lineHeight: "1.6",
    spacingBefore: "0",
    spacingAfter: "12pt",
    borderWidth: "1px",
    borderColor: "#cccccc",
    borderSides: []
  };
  
  // Adjust defaults for specific element types
  if (elementType.startsWith("h")) {
    const level = elementType.substring(1);
    defaults.fontSize = ["24pt", "20pt", "16pt", "14pt"][level - 1] || "12pt";
    defaults.fontWeight = "700";
    defaults.spacingBefore = "18pt";
    defaults.spacingAfter = "12pt";
    defaults.align = "left";
  } else if (elementType.startsWith("ul-")) {
    const level = parseInt(elementType.substring(3));
    defaults.indent = ["1.5em", "3em", "4.5em"][level - 1] || "1.5em";
    defaults.markerSpacing = "0.5em";
    defaults.ulMarker = ["disc", "circle", "square"][level - 1] || "disc";
  } else if (elementType.startsWith("ol-")) {
    const level = parseInt(elementType.substring(3));
    defaults.indent = ["1.5em", "3em", "4.5em"][level - 1] || "1.5em";
    defaults.markerSpacing = "0.5em";
    defaults.olStyle = ["decimal", "lower-alpha", "lower-roman"][level - 1] || "decimal";
  } else if (elementType === "title") {
    defaults.fontSize = "28pt";
    defaults.fontWeight = "700";
    defaults.align = "center";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "24pt";
  } else if (elementType === "subtitle") {
    defaults.fontSize = "18pt";
    defaults.fontWeight = "400";
    defaults.align = "center";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "18pt";
  } else if (elementType === "header") {
    defaults.fontSize = "9pt";
    defaults.fontWeight = "400";
    defaults.align = "center";
    defaults.color = "#666666";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "0";
  } else if (elementType === "footer") {
    defaults.fontSize = "9pt";
    defaults.fontWeight = "400";
    defaults.align = "center";
    defaults.color = "#666666";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "0";
  } else if (elementType === "caption") {
    defaults.fontSize = "10pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#444444";
    defaults.spacingBefore = "6pt";
    defaults.spacingAfter = "12pt";
  } else if (elementType === "table-caption") {
    defaults.fontSize = "10pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#444444";
    defaults.spacingBefore = "12pt";
    defaults.spacingAfter = "6pt";
  } else if (elementType === "table-cell") {
    defaults.fontSize = "10pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#1a1a1a";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "0";
    defaults.lineHeight = "1.4";
  } else if (elementType === "code-block") {
    defaults.fontFamily = "'Courier New', Courier, monospace";
    defaults.fontSize = "9pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#2d2d2d";
    defaults.spacingBefore = "12pt";
    defaults.spacingAfter = "12pt";
    defaults.lineHeight = "1.4";
  } else if (elementType === "blockquote") {
    defaults.fontSize = "11pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#444444";
    defaults.spacingBefore = "12pt";
    defaults.spacingAfter = "12pt";
    defaults.lineHeight = "1.6";
    defaults.borderSides = ["left"];
    defaults.borderWidth = "3px";
    defaults.borderColor = "#dddddd";
  } else if (elementType === "inline-code") {
    defaults.fontFamily = "'Courier New', Courier, monospace";
    defaults.fontSize = "10pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#c7254e";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "0";
  } else if (elementType === "table-header") {
    defaults.fontSize = "10pt";
    defaults.fontWeight = "700";
    defaults.align = "center";
    defaults.color = "#1a1a1a";
    defaults.spacingBefore = "0";
    defaults.spacingAfter = "0";
    defaults.lineHeight = "1.4";
    defaults.borderSides = ["bottom"];
    defaults.borderWidth = "1px";
    defaults.borderColor = "#cccccc";
  } else if (elementType === "table-cell") {
    defaults.borderSides = ["bottom"];
    defaults.borderWidth = "1px";
    defaults.borderColor = "#e1e1e1";
  } else if (elementType === "footnote") {
    defaults.fontSize = "8pt";
    defaults.fontWeight = "400";
    defaults.align = "left";
    defaults.color = "#666666";
    defaults.spacingBefore = "6pt";
    defaults.spacingAfter = "0";
    defaults.lineHeight = "1.3";
  }
  
  return defaults;
};

const applyAttributeValues = (values) => {
  // Find the active tab content
  const activeTabContent = document.querySelector(".layout-editor-tab-content.active");
  if (!activeTabContent) return;
  
  // Apply values to form fields in the active tab
  const fontFamilyEl = activeTabContent.querySelector("#attr-font-family");
  const fontSizeEl = activeTabContent.querySelector("#attr-font-size");
  const fontWeightEl = activeTabContent.querySelector("#attr-font-weight");
  const colorEl = activeTabContent.querySelector("#attr-color");
  const lineHeightEl = activeTabContent.querySelector("#attr-line-height");
  const spacingBeforeEl = activeTabContent.querySelector("#attr-spacing-before");
  const spacingAfterEl = activeTabContent.querySelector("#attr-spacing-after");
  const borderWidthEl = activeTabContent.querySelector("#attr-border-width");
  const borderColorEl = activeTabContent.querySelector("#attr-border-color");
  
  if (values.fontFamily && fontFamilyEl) fontFamilyEl.value = values.fontFamily;
  if (values.fontSize && fontSizeEl) fontSizeEl.value = values.fontSize;
  if (values.fontWeight && fontWeightEl) fontWeightEl.value = values.fontWeight;
  if (values.color && colorEl) colorEl.value = values.color;
  if (values.lineHeight && lineHeightEl) lineHeightEl.value = values.lineHeight;
  if (values.spacingBefore && spacingBeforeEl) spacingBeforeEl.value = values.spacingBefore;
  if (values.spacingAfter && spacingAfterEl) spacingAfterEl.value = values.spacingAfter;
  if (values.borderWidth && borderWidthEl) borderWidthEl.value = values.borderWidth;
  if (values.borderColor && borderColorEl) borderColorEl.value = values.borderColor;
  
  // Set alignment buttons in the active tab
  if (values.align) {
    activeTabContent.querySelectorAll(".layout-align-btn").forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.align === values.align) {
        btn.classList.add("active");
      }
    });
  }
  
  // Reset style toggles in the active tab
  activeTabContent.querySelector("#attr-italic")?.classList.remove("active");
  activeTabContent.querySelector("#attr-underline")?.classList.remove("active");
  activeTabContent.querySelector("#attr-small-caps")?.classList.remove("active");

  activeTabContent.querySelectorAll(".layout-border-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (Array.isArray(values.borderSides) && values.borderSides.includes(btn.dataset.border)) {
      btn.classList.add("active");
    }
  });

  if (values.italic) activeTabContent.querySelector("#attr-italic")?.classList.add("active");
  if (values.underline) activeTabContent.querySelector("#attr-underline")?.classList.add("active");
  if (values.smallCaps) activeTabContent.querySelector("#attr-small-caps")?.classList.add("active");

  const headingNumberedEl = activeTabContent.querySelector("#attr-heading-numbered");
  if (headingNumberedEl && typeof values.headingNumbered === "boolean") {
    headingNumberedEl.checked = values.headingNumbered;
  }
  
  // List-specific fields in the active tab
  const indentEl = activeTabContent.querySelector("#attr-indent");
  const markerSpacingEl = activeTabContent.querySelector("#attr-marker-spacing");
  const ulMarkerEl = activeTabContent.querySelector("#attr-ul-marker");
  const olStyleEl = activeTabContent.querySelector("#attr-ol-style");
  
  if (values.indent && indentEl) indentEl.value = values.indent;
  if (values.markerSpacing && markerSpacingEl) markerSpacingEl.value = values.markerSpacing;
  if (values.ulMarker && ulMarkerEl) ulMarkerEl.value = values.ulMarker;
  if (values.olStyle && olStyleEl) olStyleEl.value = values.olStyle;
  
  // Update preview
  updateAttributePreview();
};

elements.resetAllDataBtn?.addEventListener("click", async () => {
  if (confirm(t("dataResetConfirm"))) {
    try {
      // Lösche alle localStorage Einträge
      localStorage.clear();
      // Lösche alle Pastes vom Server
      const response = await fetch("/api/pastes");
      if (response.ok) {
        const pastes = await response.json();
        for (const paste of pastes) {
          await fetch(`/api/pastes/${paste.id}`, { method: "DELETE" });
        }
      }
      setStatus(t("dataResetSuccess"), "success");
      // Seite nach kurzer Verzögerung neu laden
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      console.error("Error resetting data:", error);
      setStatus(t("dataResetFailed"), "error");
    }
  }
});

// Workspace event listeners
elements.workspaceSelect?.addEventListener("change", () => {
  switchWorkspace(elements.workspaceSelect.value);
});

elements.newWorkspaceBtn?.addEventListener("click", createWorkspace);
elements.renameWorkspaceBtn?.addEventListener("click", renameWorkspace);
elements.deleteWorkspaceBtn?.addEventListener("click", deleteWorkspace);

// Sync action event listeners
elements.exportAllBtn?.addEventListener("click", async () => {
  setStatus(t("syncExporting"), "info");
  const success = await downloadSpaceZip(currentWorkspace);
  if (success) {
    setStatus(t("syncExportSuccess"), "success");
  }
});

elements.backupZipBtn?.addEventListener("click", downloadBackupZip);

elements.syncNowBtn?.addEventListener("click", async () => {
  setStatus(t("syncInProgress"), "info");
  await loadHistory();
  const count = historyCache.length;
  setStatus(t("syncSuccess").replace("{count}", count), "success");
});

elements.clearSyncBtn?.addEventListener("click", async () => {
  if (confirm(t("syncClearConfirm"))) {
    try {
      localStorage.clear();
      setStatus(t("syncClearSuccess"), "success");
      setTimeout(() => {
        window.location.href = "/";
      }, 600);
    } catch (error) {
      console.error("Error clearing sync:", error);
      setStatus(t("syncClearFailed"), "error");
    }
  }
});

elements.tipsClose?.addEventListener("click", closeTipsModal);
elements.tipsOverlay?.addEventListener("click", closeTipsModal);
elements.nextTipBtn?.addEventListener("click", displayRandomTip);
elements.currentSpaceName?.addEventListener("click", openSpacesOverview);
elements.spacesClose?.addEventListener("click", closeSpacesOverview);
elements.spacesOverlay?.addEventListener("click", closeSpacesOverview);

// Mermaid Editor Event Listeners
elements.mermaidEditorClose?.addEventListener("click", () => closeMermaidEditor(true));
elements.mermaidEditorOverlay?.addEventListener("click", () => closeMermaidEditor(true));
elements.mermaidAddNode?.addEventListener("click", addMermaidNode);
elements.mermaidAddEdge?.addEventListener("click", () => {
  setMermaidEdgeMode(!mermaidEdgeMode);
});
elements.mermaidDeleteSelected?.addEventListener("click", deleteSelectedMermaidNode);
elements.mermaidZoomIn?.addEventListener("click", () => zoomMermaidCanvas(0.1));
elements.mermaidZoomOut?.addEventListener("click", () => zoomMermaidCanvas(-0.1));
elements.mermaidZoomReset?.addEventListener("click", resetMermaidZoom);
elements.mermaidLayoutDirection?.addEventListener("change", () => {
  mermaidGraph.direction = elements.mermaidLayoutDirection.value;
  pushMermaidHistory();
  updateMermaidPreview();
});
elements.mermaidNodeLabel?.addEventListener("input", () => {
  const node = mermaidGraph.nodes.find(n => n.id === mermaidSelectedNodeId);
  if (!node) return;
  node.label = elements.mermaidNodeLabel.value.trim() || node.id;
  pushMermaidHistory();
  updateMermaidPreview();
  renderMermaidCanvas();
});
elements.mermaidNodeShape?.addEventListener("change", () => {
  const node = mermaidGraph.nodes.find(n => n.id === mermaidSelectedNodeId);
  if (!node) return;
  node.shape = elements.mermaidNodeShape.value;
  pushMermaidHistory();
  updateMermaidPreview();
  renderMermaidCanvas();
});
elements.mermaidNodeColor?.addEventListener("input", () => {
  const node = mermaidGraph.nodes.find(n => n.id === mermaidSelectedNodeId);
  if (!node) return;
  node.fill = elements.mermaidNodeColor.value;
  pushMermaidHistory();
  updateMermaidPreview();
  renderMermaidCanvas();
});
elements.mermaidDiagramType?.addEventListener("change", () => {
  if (elements.mermaidDiagramType.value !== "flowchart") {
    elements.mermaidDiagramType.value = "flowchart";
  }
  updateMermaidPreview();
});
window.addEventListener("resize", () => {
  if (!elements.mermaidEditorModal?.classList.contains("hidden")) {
    resizeMermaidCanvas();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.tipsModal?.classList.contains("hidden")) {
    closeTipsModal();
  }
  if (!elements.mermaidEditorModal?.classList.contains("hidden")) {
    if (event.key === "Escape") {
      if (mermaidEdgeMode || mermaidEdgeStartId || mermaidDraggingNodeId || mermaidIsPanning) {
        mermaidEdgeStartId = null;
        mermaidDraggingNodeId = null;
        mermaidIsPanning = false;
        setMermaidEdgeMode(false);
        renderMermaidCanvas();
        return;
      }
      closeMermaidEditor(true);
      return;
    }
    if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (mermaidHistoryIndex > 0) {
        mermaidHistoryIndex -= 1;
        restoreMermaidHistory(mermaidHistoryIndex);
      }
      return;
    }
    if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      addMermaidNode();
    }
    if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      setMermaidEdgeMode(!mermaidEdgeMode);
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelectedMermaidNode();
    }
  }
});

elements.languageSelect?.addEventListener("change", async () => {
  const value = elements.languageSelect.value;
  if (value === "auto") {
    localStorage.removeItem(localeKey);
    currentLocale = getLocale();
  } else {
    localStorage.setItem(localeKey, value);
    currentLocale = value;
  }
  await applyTranslations();
  // Reload tips for the new locale
  tipsData = [];
  tipsLoadedLocale = null;
  if (!elements.tipsModal?.classList.contains("hidden")) {
    await displayRandomTip();
  }
  setStatus(t("loaded"), "success");
});
elements.customCssInput?.addEventListener("input", () => {
  applyCustomCss(elements.customCssInput.value);
  // Sync to layout editor if open
  if (elements.layoutCustomCssInput && !elements.layoutEditorModal?.classList.contains("hidden")) {
    elements.layoutCustomCssInput.value = buildLayoutCssTemplate(elements.customCssInput.value);
  }
});

// Sync layoutCustomCssInput to customCssInput
elements.layoutCustomCssInput?.addEventListener("input", () => {
  applyCustomCss(elements.layoutCustomCssInput.value);
  if (elements.customCssInput) {
    elements.customCssInput.value = elements.layoutCustomCssInput.value;
  }
});

elements.pinToggle?.addEventListener("click", () => {
  if (sidebarPinMode === "unpinned") {
    setSidebarCollapsed(false);
    setSidebarPinMode("pinned-expanded");
  } else if (sidebarPinMode === "pinned-expanded") {
    setSidebarCollapsed(true);
    setSidebarPinMode("pinned-collapsed");
  } else {
    setSidebarPinMode("unpinned");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSettings();
  }
  if (event.key === "F1") {
    event.preventDefault();
    window.open("/help.html", "_blank", "noopener");
  }
  if (event.key === "F2") {
    event.preventDefault();
    showTipsModal();
  }
  if (event.ctrlKey && !event.shiftKey && !event.altKey) {
    if (event.key === "0") {
      event.preventDefault();
      openSpacesOverview();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateWorkspace(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateWorkspace(-1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      rotateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      rotateHistory(1);
    }
  }
});

document.querySelectorAll(".modal-tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".modal-tabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tabPanel === target);
    });
  });
});

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("change", () => {
    const key = input.dataset.setting;
    applySettings({ [key]: input.checked });
  });
});

document.getElementById("documentLayoutDefaultPreset")?.addEventListener("change", (event) => {
  applySettings({ documentLayoutDefaultPreset: event.target.value || "scientific" });
});
elements.copyNodeMdBtn?.addEventListener("click", () => {
  const node = selectedNodeId ? findNodeById(lastTree, selectedNodeId) : null;
  if (!node) return copyToClipboard("");
  const markdown = getMarkdown();
  const idx = lastHeadings.findIndex((h) => h.start === node.start && h.level === node.level);
  if (idx === -1) return copyToClipboard("");
  let end = markdown.length;
  for (let i = idx + 1; i < lastHeadings.length; i += 1) {
    if (lastHeadings[i].level <= node.level) {
      end = lastHeadings[i].start;
      break;
    }
  }
  copyToClipboard(markdown.slice(node.start, end).trim());
});
elements.copyNodeTextBtn?.addEventListener("click", () => {
  const node = selectedNodeId ? findNodeById(lastTree, selectedNodeId) : null;
  if (!node) return copyToClipboard("");
  copyRichText(elements.nodeContent.innerHTML, elements.nodeContent.innerText);
});
elements.nodeStatsBtn?.addEventListener("mouseenter", () => {
  setFooterStats(lastStatsText);
});
elements.viewPreviewBtn?.addEventListener("click", () => {
  setView("preview");
});

elements.viewTreeBtn?.addEventListener("click", () => {
  setView("tree");
});

elements.nodeStatsBtn?.addEventListener("click", () => {
  elements.nodeStatsBtn.classList.toggle("active");
});

elements.editorResizer.addEventListener("mousedown", startDrag("editor-preview"));
elements.treeResizer?.addEventListener("mousedown", startTreeDrag);

// Init

// Initialize AI Chat
try {
  aiChat = new AIChat();
} catch (error) {
  console.warn("AI Chat initialization failed:", error);
}

elements.sidebar.addEventListener("mouseenter", () => {
  if (sidebarPinMode !== "unpinned") return;
  setSidebarCollapsed(false);
});

elements.sidebar.addEventListener("mouseleave", () => {
  if (sidebarPinMode !== "unpinned") return;
  setSidebarCollapsed(true);
});

(async () => {
  await applyTranslations();
})();
applyTheme(uiTheme);
applyPreviewPreset(previewPreset);
applyCustomCss(customCss);
applyLayoutEditorCss();
syncSettingsUI();
setFooterStats(t("statsEmpty"));
updateSidebarState();
initEditor();
initMermaidCanvasEvents();

// Export editor and save function for AI Chat
window.editor = editorView;
window.triggerSave = handleEditorChange;
window.exportFile = exportFile;
window.printPreview = printPreview;
window.showStatus = setStatus;  // For modules like ImageManager
window.getEffectiveDocumentLayout = getEffectiveDocumentLayout;
window.renderMarkdownToHtml = (text) => md.render(String(text || ""));

// Restore toggle states
const savedView = localStorage.getItem("currentView");
if (savedView && ["preview", "tree", "chat"].includes(savedView)) {
  setView(savedView);
}

const savedPrintView = localStorage.getItem("printViewActive");
if (savedPrintView === "true") {
  togglePrintView();
}

refreshHeadingData();
renderPreview();
renderTree();

// Check if there's a paste ID in the URL path (for permalinks)
const urlPath = window.location.pathname;
const urlPasteId = urlPath.length > 1 ? urlPath.slice(1) : null;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (urlPasteId && uuidPattern.test(urlPasteId)) {
  // Load the paste from the URL
  loadPaste(urlPasteId).then(() => {
    // After loading the permalink, load the full history
    loadHistory();
  });
} else {
  // Normal startup - load history and restore last viewed document
  // Restore workspace BEFORE loadHistory so the correct workspace is active from the start
  const savedWorkspace = localStorage.getItem("currentWorkspace");
  if (savedWorkspace) {
    currentWorkspace = savedWorkspace;
  }

  loadHistory().then(() => {
    loadWorkspaceSelect();
    
    // Try to restore last viewed document
    const lastPasteId = localStorage.getItem("lastPasteId");
    let pasteToLoad = null;
    
    if (lastPasteId && historyCache.length > 0) {
      // Check if last paste exists in current workspace
      const lastPaste = historyCache.find(p => normalizePasteId(p.id) === normalizePasteId(lastPasteId));
      if (lastPaste) {
        pasteToLoad = lastPaste.id;
      }
    }
    
    // Load the last paste or the most recent one
    if (pasteToLoad) {
      loadPaste(pasteToLoad);
    } else if (historyCache.length > 0) {
      loadPaste(historyCache[0].id);
    } else {
      resetEditor();
    }
    
    // Show startup tips if enabled
    if (activeSettings.showStartupTips) {
      showTipsModal();
    }
  });
}

initColumns();
