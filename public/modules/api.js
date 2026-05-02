/**
 * API & Persistence Module
 * Handles all API calls and data persistence
 */

export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async fetchPastes() {
    const response = await fetch(`${this.baseUrl}/pastes`);
    if (!response.ok) throw new Error('Failed to fetch pastes');
    return response.json();
  }

  async fetchPaste(id) {
    const response = await fetch(`${this.baseUrl}/pastes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch paste');
    return response.json();
  }

  async createPaste(markdown, title) {
    const response = await fetch(`${this.baseUrl}/pastes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, title })
    });
    if (!response.ok) throw new Error('Failed to create paste');
    return response.json();
  }

  async updatePaste(id, markdown, title) {
    const response = await fetch(`${this.baseUrl}/pastes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, title })
    });
    if (!response.ok) throw new Error('Failed to update paste');
    return response.json();
  }

  async deletePaste(id) {
    const response = await fetch(`${this.baseUrl}/pastes/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete paste');
    return response.json();
  }

  async exportDocx(markdown, title, html) {
    const response = await fetch(`${this.baseUrl}/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, title, html })
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }
}

export const deriveTitle = (markdown) => {
  if (!markdown || typeof markdown !== "string") return "Untitled";
  const match = markdown.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
};

export const saveHistoryOrder = (order) => {
  localStorage.setItem("md-history-order", JSON.stringify(order));
};

export const loadHistoryOrder = () => {
  const data = localStorage.getItem("md-history-order");
  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
