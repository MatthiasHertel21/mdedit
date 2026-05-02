/**
 * Markdown Renderer Module
 * Handles Markdown-it configuration, plugins, and Mermaid rendering
 */

import MarkdownIt from "https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/+esm";
import markdownItTaskLists from "https://cdn.jsdelivr.net/npm/markdown-it-task-lists@2.1.1/+esm";
import markdownItMultimdTable from "https://cdn.jsdelivr.net/npm/markdown-it-multimd-table@4.2.3/+esm";
import markdownItFootnote from "https://cdn.jsdelivr.net/npm/markdown-it-footnote@3.0.3/+esm";
import markdownItDeflist from "https://cdn.jsdelivr.net/npm/markdown-it-deflist@2.1.0/+esm";
import markdownItContainer from "https://cdn.jsdelivr.net/npm/markdown-it-container@3.0.0/+esm";
import markdownItKatex from "https://cdn.jsdelivr.net/npm/markdown-it-katex@2.0.3/+esm";
import mermaid from "https://esm.sh/mermaid@10.9.0";
import markdownItEmoji from "https://cdn.jsdelivr.net/npm/markdown-it-emoji@3.0.0/+esm";
import markdownItSub from "https://cdn.jsdelivr.net/npm/markdown-it-sub@2.0.0/+esm";
import markdownItSup from "https://cdn.jsdelivr.net/npm/markdown-it-sup@2.0.0/+esm";
import markdownItMark from "https://cdn.jsdelivr.net/npm/markdown-it-mark@3.0.1/+esm";
import markdownItAbbr from "https://cdn.jsdelivr.net/npm/markdown-it-abbr@1.0.4/+esm";
import markdownItAnchor from "https://cdn.jsdelivr.net/npm/markdown-it-anchor@8.6.7/+esm";
import markdownItToc from "https://cdn.jsdelivr.net/npm/markdown-it-toc-done-right@4.2.0/+esm";
import markdownItAttrs from "https://cdn.jsdelivr.net/npm/markdown-it-attrs@4.1.6/+esm";

let mermaidReady = false;

const getCssVarValue = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const initMermaid = (previewPreset = "scientific") => {
  const accent = getCssVarValue("--accent", "#0089cf");
  const accentLight = getCssVarValue("--accent-light", "#d9eefb");
  const primary = getCssVarValue("--primary", "#22536b");
  const bg = getCssVarValue("--bg", "#f9fcfe");
  
  const presetMap = {
    scientific: { fontSize: 13, nodePadding: 10, fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
    compact: { fontSize: 11, nodePadding: 6, fontFamily: "Inter, system-ui, -apple-system, sans-serif" },
    literary: { fontSize: 14, nodePadding: 12, fontFamily: "Georgia, Times New Roman, serif" },
    custom: { fontSize: 13, nodePadding: 10, fontFamily: "Inter, system-ui, -apple-system, sans-serif" }
  };
  const presetVars = presetMap[previewPreset] || presetMap.scientific;
  
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
    }
  });
  mermaidReady = true;
};

const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

export const healMermaidSyntax = (code) => {
  let healed = code;
  
  // Comments: # -> %%
  healed = healed.replace(/#(.*)$/gm, (match, comment) => `%% ${comment.trim()}`);
  
  // Common typos
  healed = healed.replace(/\bflowchar\b/g, "flowchart");
  healed = healed.replace(/\bsequencediagram\b/gi, "sequenceDiagram");
  healed = healed.replace(/\bclassdiagram\b/gi, "classDiagram");
  healed = healed.replace(/\berdiagram\b/gi, "erDiagram");
  healed = healed.replace(/\bstatediagram\b/gi, "stateDiagram");
  
  // Fix labels with special characters
  const fixLabel = (match, label) => {
    const trimmed = label.trim();
    return /[():&/]/.test(trimmed) && !/^".*"$/.test(trimmed) 
      ? match.replace(label, `"${trimmed}"`)
      : match;
  };
  
  healed = healed.replace(/-->\s*\|\s*([^|]+?)\s*\|/g, fixLabel);
  healed = healed.replace(/->\s*\|\s*([^|]+?)\s*\|/g, fixLabel);
  healed = healed.replace(/---\s*\|\s*([^|]+?)\s*\|/g, fixLabel);
  healed = healed.replace(/-\.\s*\|\s*([^|]+?)\s*\|/g, fixLabel);
  
  // Add spaces after arrows
  healed = healed.replace(/-->([^\s\-|])/g, "--> $1");
  healed = healed.replace(/->([^\s\-|])/g, "-> $1");
  healed = healed.replace(/---([^\s\-|])/g, "--- $1");
  healed = healed.replace(/==([^\s=|])/g, "== $1");
  healed = healed.replace(/-\.([^\s\.|])/g, "-. $1");
  
  // Quote node labels with special chars
  healed = healed.replace(/(\w+)\[([^\]]+)\]/g, (match, id, label) => {
    return /[():&/]/.test(label) && !/^".*"$/.test(label) ? `${id}["${label}"]` : match;
  });
  healed = healed.replace(/(\w+)\(([^)]+)\)/g, (match, id, label) => {
    return /[():&/]/.test(label) && !/^".*"$/.test(label) ? `${id}("${label}")` : match;
  });
  healed = healed.replace(/(\w+)\{([^}]+)\}/g, (match, id, label) => {
    return /[():&/]/.test(label) && !/^".*"$/.test(label) ? `${id}{"${label}"}` : match;
  });
  
  // Clean node IDs
  const lines = healed.split('\n');
  const processedLines = lines.map(line => {
    if (line.match(/^\s*[\w-]+[\[\(\{<]/)) {
      return line.replace(/^(\s*)([\w.-]+)([\[\(\{<])/, (match, spaces, id, bracket) => {
        const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
        return spaces + cleanId + bracket;
      });
    }
    return line;
  });
  
  return processedLines.join('\n').trim();
};

export const renderMermaid = async (settings = { mermaid: true }) => {
  if (!settings || !settings.mermaid) return;
  if (!mermaidReady) initMermaid();
  
  const mermaidBlocks = document.querySelectorAll(".mermaid");
  for (const block of mermaidBlocks) {
    if (block.hasAttribute("data-processed")) continue;
    const originalContent = block.textContent;
    const healedContent = healMermaidSyntax(originalContent);
    
    try {
      if (healedContent !== originalContent) {
        block.textContent = healedContent;
      }
      await mermaid.run({ nodes: [block] });
    } catch (error) {
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

export const buildMarkdownIt = (settings) => {
  const instance = MarkdownIt({
    html: true,
    linkify: settings.gfm,
    breaks: false,
    typographer: settings.typographer
  });

  // Add sourcepos attributes to rendered HTML elements
  const defaultRender = instance.renderer.rules;
  const addSourcePos = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx];
    if (token.map && token.level === 0) {
      // Add data-sourcepos attribute: "startLine:startCol-endLine:endCol"
      const startLine = token.map[0] + 1;
      const endLine = token.map[1];
      token.attrSet('data-sourcepos', `${startLine}:0-${endLine}:0`);
    }
  };

  // Override common block-level tokens to add sourcepos
  const blockTokens = ['paragraph_open', 'heading_open', 'blockquote_open', 
                       'bullet_list_open', 'ordered_list_open', 'list_item_open',
                       'table_open', 'fence', 'code_block', 'hr', 'dl_open', 'dt_open', 'dd_open'];
  
  blockTokens.forEach(tokenType => {
    const originalRule = defaultRender[tokenType];
    instance.renderer.rules[tokenType] = (tokens, idx, options, env, renderer) => {
      addSourcePos(tokens, idx, options, env, renderer);
      if (originalRule) {
        return originalRule(tokens, idx, options, env, renderer);
      }
      return renderer.renderToken(tokens, idx, options);
    };
  });

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

  if (settings.footnotes) usePlugin(markdownItFootnote);
  if (settings.deflist) usePlugin(markdownItDeflist);
  if (settings.emoji) usePlugin(markdownItEmoji);
  if (settings.sub) usePlugin(markdownItSub);
  if (settings.sup) usePlugin(markdownItSup);
  if (settings.mark) usePlugin(markdownItMark);
  if (settings.abbr) usePlugin(markdownItAbbr);

  if (settings.toc) {
    usePlugin(markdownItAnchor, { permalink: false });
    usePlugin(markdownItToc, { level: [1, 2, 3, 4, 5, 6], listType: "ul" });
  }

  if (settings.attrs) usePlugin(markdownItAttrs);
  if (settings.math) usePlugin(markdownItKatex);

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

  return instance;
};
