/**
 * UI State & Settings Module
 * Manages application state, settings, themes, and UI updates
 */

export const defaultSettings = {
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
  mermaidCompletion: true,
  lineNumbers: true,
  syntaxHighlight: true,
  syncScroll: true,
  syncSelection: true,
  showStartupTips: true,
  autoSync: false
};

const settingsKey = "md-settings";
const themeKey = "md-theme";
const previewPresetKey = "md-preview-preset";
const customCssKey = "md-custom-css";
const sidebarPinModeKey = "sidebarPinMode";
const sidebarCollapsedKey = "sidebarCollapsed";

export const loadSettings = () => {
  const data = localStorage.getItem(settingsKey);
  try {
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
};

export const applySettings = (partialSettings) => {
  const current = loadSettings();
  const next = { ...current, ...partialSettings };
  saveSettings(next);
  return next;
};

export const loadTheme = () => localStorage.getItem(themeKey) || "twentyone";
export const saveTheme = (theme) => localStorage.setItem(themeKey, theme);

export const loadPreviewPreset = () => localStorage.getItem(previewPresetKey) || "scientific";
export const savePreviewPreset = (preset) => localStorage.setItem(previewPresetKey, preset);

export const loadCustomCss = () => localStorage.getItem(customCssKey) || "";
export const saveCustomCss = (css) => localStorage.setItem(customCssKey, css);

export const loadSidebarPinMode = () => localStorage.getItem(sidebarPinModeKey) || "unpinned";
export const saveSidebarPinMode = (mode) => localStorage.setItem(sidebarPinModeKey, mode);

export const loadSidebarCollapsed = () => localStorage.getItem(sidebarCollapsedKey) !== "false";
export const saveSidebarCollapsed = (value) => localStorage.setItem(sidebarCollapsedKey, String(value));

export const applyTheme = (theme) => {
  document.body.setAttribute("data-theme", theme === "classic" ? "classic" : "");
};

export const applyPreviewPreset = (preset) => {
  const previewContent = document.getElementById("preview");
  if (!previewContent) return;
  
  previewContent.classList.remove("preset-scientific", "preset-compact", "preset-literary", "preset-custom");
  if (preset && preset !== "scientific") {
    previewContent.classList.add(`preset-${preset}`);
  }
};

let customStyleEl = null;

export const ensureCustomStyle = () => {
  if (!customStyleEl) {
    customStyleEl = document.createElement("style");
    customStyleEl.id = "custom-preview-styles";
    document.head.appendChild(customStyleEl);
  }
};

export const applyCustomCss = (css) => {
  ensureCustomStyle();
  if (customStyleEl) {
    customStyleEl.textContent = css || "";
  }
};

export const showToast = (message, type = "info", duration = 2400) => {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

export const setStatus = (text, type = "info") => {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.className = `status ${type}`;
};
