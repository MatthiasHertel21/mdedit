/**
 * Editor Module
 * Handles CodeMirror editor initialization and configuration
 */

const mermaidKeywords = {
  diagrams: ["flowchart", "sequenceDiagram", "classDiagram", "stateDiagram", "erDiagram", "gantt", "pie", "journey", "gitGraph", "mindmap", "timeline"],
  flowchart: ["TD", "TB", "BT", "RL", "LR"],
  arrows: ["-->", "---", "-.->", "==>", "~~>", "-.-", "==="],
  shapes: ["[Rectangle]", "(Rounded)", "([Stadium])", "[[Subroutine]]", "[(Database)]", ">Asymmetric]", "{Diamond}", "{{Hexagon}}", "[/Parallelogram/]", "[\\Parallelogram\\]", "[/Trapezoid\\]", "[\\Trapezoid/]"],
  participant: ["participant", "actor", "boundary", "control", "entity", "database", "collections", "queue"],
  sequence: ["activate", "deactivate", "Note", "loop", "alt", "opt", "par", "and", "rect", "end"],
  class: ["class", "<<interface>>", "<<abstract>>", "<<enumeration>>"],
  state: ["state", "[*]", "-->", "note"],
  er: ["||--o{", "}o--||", "||--|{", "}|--||", "o{--||", "||--{o", "|{--||", "||--{|"],
  common: ["title", "style", "class", "click", "callback", "link", "classDef", "direction"]
};

const customHint = (editor, settings) => {
  if (!settings.mermaidCompletion) {
    return null;
  }

  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const token = editor.getTokenAt(cursor);
  
  let inMermaid = false;
  let mermaidType = null;
  
  for (let i = cursor.line; i >= 0; i--) {
    const checkLine = editor.getLine(i);
    if (checkLine.trim().startsWith("```mermaid")) {
      inMermaid = true;
      break;
    }
    if (checkLine.trim() === "```") {
      break;
    }
  }
  
  if (!inMermaid) {
    return null;
  }
  
  for (let i = cursor.line; i >= 0; i--) {
    const checkLine = editor.getLine(i).trim();
    if (checkLine.startsWith("```mermaid")) continue;
    if (checkLine.startsWith("```")) break;
    
    for (const type of mermaidKeywords.diagrams) {
      if (checkLine.includes(type)) {
        mermaidType = type;
        break;
      }
    }
    if (mermaidType) break;
  }
  
  const word = token.string.trim();
  const start = token.start;
  const end = token.end;
  
  let suggestions = [];
  
  if (line.trim() === word || line.trimStart() === word) {
    suggestions = mermaidKeywords.diagrams.filter(k => k.toLowerCase().startsWith(word.toLowerCase()));
  } else {
    if (mermaidType === "flowchart") {
      suggestions = [...mermaidKeywords.flowchart, ...mermaidKeywords.arrows, ...mermaidKeywords.common];
    } else if (mermaidType === "sequenceDiagram") {
      suggestions = [...mermaidKeywords.participant, ...mermaidKeywords.sequence, ...mermaidKeywords.common];
    } else if (mermaidType === "classDiagram") {
      suggestions = [...mermaidKeywords.class, ...mermaidKeywords.common];
    } else if (mermaidType === "stateDiagram") {
      suggestions = [...mermaidKeywords.state, ...mermaidKeywords.common];
    } else if (mermaidType === "erDiagram") {
      suggestions = [...mermaidKeywords.er, ...mermaidKeywords.common];
    } else {
      suggestions = [...mermaidKeywords.common];
    }
    
    suggestions = suggestions.filter(k => k.toLowerCase().startsWith(word.toLowerCase()));
  }
  
  if (suggestions.length === 0) {
    return null;
  }
  
  return {
    list: suggestions.map(text => ({
      text: text,
      displayText: text,
      className: "mermaid-hint"
    })),
    from: window.CodeMirror.Pos(cursor.line, start),
    to: window.CodeMirror.Pos(cursor.line, end)
  };
};

export const initEditor = (hostElement, settings, callbacks = {}) => {
  const textarea = document.createElement("textarea");
  hostElement.appendChild(textarea);
  
  const editor = window.CodeMirror.fromTextArea(textarea, {
    mode: settings.syntaxHighlight ? "markdown" : null,
    lineWrapping: true,
    lineNumbers: settings.lineNumbers,
    extraKeys: {
      "Ctrl-Space": "autocomplete"
    },
    hintOptions: {
      hint: (cm) => customHint(cm, settings)
    }
  });

  editor.setSize(null, "100%");

  if (callbacks.onChange) {
    editor.on("change", callbacks.onChange);
  }

  if (callbacks.onScroll) {
    editor.on("scroll", callbacks.onScroll);
  }

  if (callbacks.onCursorActivity) {
    editor.on("cursorActivity", callbacks.onCursorActivity);
  }

  if (callbacks.onSelection) {
    // Track last selection to avoid duplicate calls
    let lastSelection = "";
    let lastFromLine = 0;
    let lastToLine = 0;
    
    const handleSelection = () => {
      const selection = editor.getSelection();
      const from = editor.getCursor("from");
      const to = editor.getCursor("to");
      const fromLine = from.line + 1;
      const toLine = to.line + 1;
      
      // Only trigger if selection actually changed
      if (selection !== lastSelection || fromLine !== lastFromLine || toLine !== lastToLine) {
        lastSelection = selection;
        lastFromLine = fromLine;
        lastToLine = toLine;
        
        if (selection && selection.trim().length > 0) {
          callbacks.onSelection(selection.trim(), fromLine, toLine);
        } else {
          callbacks.onSelection("", 0, 0);
        }
      }
    };
    
    // Only trigger on mouseup and keyup, not on every cursor activity
    const wrapper = editor.getWrapperElement();
    wrapper.addEventListener("mouseup", handleSelection);
    wrapper.addEventListener("keyup", (e) => {
      // Only trigger on Shift+Arrow keys (text selection) or mouse
      if (e.shiftKey || e.key === "Escape") {
        handleSelection();
      }
    });
  }

  return editor;
};

export const getEditorValue = (editor) => editor ? editor.getValue() : "";

export const setEditorValue = (editor, value) => {
  if (editor) {
    editor.setValue(value || "");
  }
};

export const getEditorScrollTop = (editor) => {
  if (!editor) return 0;
  const info = editor.getScrollInfo();
  return info.top;
};

export const setEditorScrollTop = (editor, top) => {
  if (editor) {
    editor.scrollTo(null, top);
  }
};

export const refreshEditor = (editor) => {
  if (editor && typeof editor.refresh === "function") {
    editor.refresh();
  }
};

export const updateEditorOptions = (editor, settings) => {
  if (!editor) return;
  
  editor.setOption("mode", settings.syntaxHighlight ? "markdown" : null);
  editor.setOption("lineNumbers", settings.lineNumbers);
  editor.setOption("hintOptions", {
    hint: (cm) => customHint(cm, settings)
  });
};
