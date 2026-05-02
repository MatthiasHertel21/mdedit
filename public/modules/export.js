/**
 * Export Module
 * Handles document export to various formats (DOCX, PDF, MD, HTML)
 */

export const svgToPngDataUrl = (svgEl) => new Promise((resolve) => {
  const serializer = new XMLSerializer();
  let svgText = serializer.serializeToString(svgEl);
  
  if (!svgText.includes("xmlns=")) {
    svgText = svgText.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
  }
  
  svgText = svgText.replace(/xlink:href="[^"]*"/g, '');
  
  const styles = Array.from(document.styleSheets)
    .filter(sheet => {
      try {
        return sheet.cssRules && sheet.href && sheet.href.includes(window.location.origin);
      } catch {
        return false;
      }
    })
    .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText))
    .join('\n');
  
  if (styles) {
    svgText = svgText.replace("</svg>", `<style>${styles}</style></svg>`);
  }
  
  const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgText)))}`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = svgEl.clientWidth * scale;
    canvas.height = svgEl.clientHeight * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    resolve(canvas.toDataURL("image/png"));
  };
  
  img.onerror = () => resolve(null);
  img.src = dataUrl;
});

export const serializePreviewForExport = async () => {
  const preview = document.getElementById("preview");
  if (!preview) return "";
  
  const clone = preview.cloneNode(true);
  
  const mermaidDivs = clone.querySelectorAll(".mermaid[data-processed]");
  for (const div of mermaidDivs) {
    const svg = div.querySelector("svg");
    if (svg) {
      const originalSvg = preview.querySelector(`.mermaid[data-processed] svg`);
      if (originalSvg) {
        try {
          const pngUrl = await svgToPngDataUrl(originalSvg);
          if (pngUrl) {
            const img = document.createElement("img");
            img.src = pngUrl;
            img.alt = "Mermaid diagram";
            img.style.maxWidth = "100%";
            div.innerHTML = "";
            div.appendChild(img);
            continue;
          }
        } catch (e) {
          console.warn("SVG to PNG conversion failed:", e);
        }
      }
    }
  }
  
  return clone.innerHTML;
};

export const copyRichText = async (html, text) => {
  const plain = text?.trim() ? text : html.replace(/<[^>]+>/g, " ").trim();
  if (!plain) {
    return { success: false, error: "emptyCopy" };
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
    return { success: true };
  } catch {
    return { success: false, error: "copyFailed" };
  }
};

export const copyToClipboard = async (text) => {
  if (!text) {
    return { success: false, error: "emptyCopy" };
  }
  
  const textStr = String(text).trim();
  if (!textStr) {
    return { success: false, error: "emptyCopy" };
  }
  
  try {
    await navigator.clipboard.writeText(textStr);
    return { success: true };
  } catch (error) {
    console.error("Copy failed:", error);
    return { success: false, error: "copyFailed" };
  }
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadMarkdown = (markdown) => {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, "document.md");
};
/**
 * Export all documents as a ZIP file
 */
export const exportAllAsZip = async (documents) => {
  if (!documents || documents.length === 0) {
    return { success: false, error: "noDocuments" };
  }

  try {
    const zip = new JSZip();
    const folder = zip.folder("markdown-documents");
    
    // Add each document to the ZIP
    for (const doc of documents) {
      // Sanitize filename - remove special characters
      const sanitizedTitle = doc.title
        .replace(/[<>:"/\\|?*]/g, "-")
        .replace(/\s+/g, "_")
        .substring(0, 100);
      
      const filename = `${sanitizedTitle}_${doc.id}.md`;
      folder.file(filename, doc.markdown);
    }
    
    // Add metadata file
    const metadata = {
      exportDate: new Date().toISOString(),
      documentCount: documents.length,
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        updated_at: d.updated_at
      }))
    };
    folder.file("_export_info.json", JSON.stringify(metadata, null, 2));
    
    // Generate ZIP and download
    const content = await zip.generateAsync({ type: "blob" });
    const timestamp = new Date().toISOString().split("T")[0];
    downloadBlob(content, `markdown-backup-${timestamp}.zip`);
    
    return { success: true };
  } catch (error) {
    console.error("Export all failed:", error);
    return { success: false, error: "exportFailed" };
  }
};

/**
 * Workspace Management
 */

export const getActiveWorkspace = () => {
  return localStorage.getItem("md-active-workspace") || "default";
};

export const setActiveWorkspace = (workspaceId) => {
  localStorage.setItem("md-active-workspace", workspaceId);
};

export const getAllWorkspaces = () => {
  const data = localStorage.getItem("md-workspaces");
  try {
    const workspaces = data ? JSON.parse(data) : [];
    // Ensure default workspace exists
    if (!workspaces.find(w => w.id === "default")) {
      workspaces.unshift({ id: "default", name: "Standard", created: new Date().toISOString() });
    }
    return workspaces;
  } catch {
    return [{ id: "default", name: "Standard", created: new Date().toISOString() }];
  }
};

export const saveWorkspaces = (workspaces) => {
  localStorage.setItem("md-workspaces", JSON.stringify(workspaces));
};

export const createWorkspace = (name) => {
  const workspaces = getAllWorkspaces();
  const id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const workspace = {
    id,
    name,
    created: new Date().toISOString()
  };
  workspaces.push(workspace);
  saveWorkspaces(workspaces);
  return workspace;
};

export const renameWorkspace = (workspaceId, newName) => {
  const workspaces = getAllWorkspaces();
  const workspace = workspaces.find(w => w.id === workspaceId);
  if (workspace) {
    workspace.name = newName;
    saveWorkspaces(workspaces);
    return true;
  }
  return false;
};

export const deleteWorkspace = (workspaceId) => {
  if (workspaceId === "default") return false; // Can't delete default
  
  const workspaces = getAllWorkspaces().filter(w => w.id !== workspaceId);
  saveWorkspaces(workspaces);
  
  // Delete all documents in this workspace
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`md-ws-${workspaceId}-`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Switch to default if this was active
  if (getActiveWorkspace() === workspaceId) {
    setActiveWorkspace("default");
  }
  
  return true;
};

/**
 * Get document count for a specific workspace
 */
export const getWorkspaceDocumentCount = (workspaceId) => {
  let count = 0;
  const prefix = `md-ws-${workspaceId}-doc-`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      count++;
    }
  }
  return count;
};

/**
 * Save document to local storage for auto-sync (workspace-aware)
 */
export const saveToLocalStorage = (id, markdown, title) => {
  try {
    const workspace = getActiveWorkspace();
    const key = `md-ws-${workspace}-doc-${id}`;
    const data = {
      id,
      markdown,
      title,
      syncedAt: new Date().toISOString(),
      workspace
    };
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    return false;
  }
};

/**
 * Get all locally synced documents for active workspace
 */
export const getAllLocalDocuments = () => {
  const workspace = getActiveWorkspace();
  const docs = [];
  try {
    const prefix = `md-ws-${workspace}-doc-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const doc = JSON.parse(data);
            docs.push(doc);
          } catch (e) {
            console.warn(`Failed to parse document ${key}:`, e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to get local documents:", error);
  }
  return docs;
};

/**
 * Clear all locally synced documents for active workspace
 */
export const clearLocalSync = () => {
  try {
    const workspace = getActiveWorkspace();
    const keysToRemove = [];
    const prefix = `md-ws-${workspace}-doc-`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error("Failed to clear local sync:", error);
    return false;
  }
};