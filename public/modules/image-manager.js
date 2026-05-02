/**
 * Image Manager Module
 * Handles image upload, paste, drag & drop, and markdown integration
 */

export class ImageManager {
  constructor(editorElement, pasteId, onImageInsert) {
    this.editor = editorElement;
    this.pasteId = pasteId;
    this.onImageInsert = onImageInsert; // Callback: (markdown) => void
    this.setupDragDrop();
    this.setupPaste();
  }

  /**
   * Setup drag & drop listeners
   */
  setupDragDrop() {
    this.editor.addEventListener('dragover', (e) => this.onDragOver(e));
    this.editor.addEventListener('dragleave', (e) => this.onDragLeave(e));
    this.editor.addEventListener('drop', (e) => this.onDrop(e));
  }

  /**
   * Setup paste listener (Ctrl+V)
   */
  setupPaste() {
    this.editor.addEventListener('paste', (e) => this.onPaste(e));
  }

  onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.editor.classList.add('drag-over');
  }

  onDragLeave(e) {
    e.preventDefault();
    if (e.target === this.editor) {
      this.editor.classList.remove('drag-over');
    }
  }

  async onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.editor.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    for (const file of imageFiles) {
      await this.uploadImage(file);
    }
  }

  async onPaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        // Clipboard blobs have no filename — generate one
        const ext = item.type.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
        const namedBlob = new File([blob], `paste-${Date.now()}.${ext}`, { type: item.type });
        await this.uploadImage(namedBlob);
      }
    }
  }

  /**
   * Upload image and insert markdown
   */
  async uploadImage(file) {
    if (!this.pasteId) {
      console.warn('Cannot upload: no paste ID');
      if (window.showStatus) {
        window.showStatus('Cannot upload: paste not saved yet', 'error');
      }
      return;
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const msg = `Image too large: ${sizeMB}MB (max 10MB)`;
      console.warn(msg);
      if (window.showStatus) {
        window.showStatus(msg, 'error');
      }
      return;
    }

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      const msg = `Unsupported image format: ${file.type}`;
      console.warn(msg);
      if (window.showStatus) {
        window.showStatus(msg, 'error');
      }
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      // Chunked base64 encoding to avoid call stack overflow on large files
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const base64 = btoa(binary);

      const res = await fetch(`/api/pastes/${this.pasteId}/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          filename: file.name
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `Upload failed: HTTP ${res.status}`;
        console.error('Image upload failed:', errorMsg);
        if (window.showStatus) {
          window.showStatus(errorMsg, 'error');
        }
        return;
      }

      const result = await res.json();
      this.insertImageMarkdown(result.url, file.name);
      
      if (window.showStatus) {
        window.showStatus(`Image uploaded: ${this.sanitizeFilename(file.name)}`, 'success');
      }

    } catch (err) {
      const errorMsg = err.message || 'Image upload failed';
      console.error('Image upload failed:', err);
      if (window.showStatus) {
        window.showStatus(errorMsg, 'error');
      }
    }
  }

  /**
   * Insert markdown syntax at cursor position
   */
  insertImageMarkdown(url, filename) {
    const altText = this.sanitizeFilename(filename);
    const markdown = `![${altText}](${url})\n`;

    if (this.onImageInsert) {
      this.onImageInsert(markdown);
    }
    
    return markdown;
  }

  /**
   * Sanitize filename for alt text
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/\.[^.]+$/, '') // Remove extension
      .replace(/[^a-z0-9\s-]/gi, '') // Keep alphanumeric, space, dash
      .trim()
      .slice(0, 50);
  }

  /**
   * Parse markdown for image tags and return URLs
   */
  static extractImageUrls(markdown) {
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const urls = [];
    let match;

    while ((match = regex.exec(markdown)) !== null) {
      urls.push({
        alt: match[1],
        url: match[2]
      });
    }

    return urls;
  }
}

export default ImageManager;
