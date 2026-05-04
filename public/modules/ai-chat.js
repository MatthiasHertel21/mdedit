// AI Chat Module - provider-aware assistant for Markdown editing

export class AIChat {
  constructor() {
    this.storageKey = 'ai-chat-sessions-v1';
    this.history = [];
    this.sessions = [];
    this.currentSessionId = null;
    this.messageLog = [];
    this.undoStack = [];
    this.messagesContainer = document.getElementById('aiChatMessages');
    this.input = document.getElementById('aiChatInput');
    this.sendBtn = document.getElementById('aiChatSendBtn');
    this.newChatBtn = document.getElementById('newChatBtn');
    this.clearChatBtn = document.getElementById('clearAiChatBtn');
    this.sessionSelect = document.getElementById('aiChatSessionSelect');
    this.undoBtn = document.getElementById('undoAiChangeBtn');
    this.isProcessing = false;

    this.loadState();
    if (!this.sessions.length) {
      this.createSession('Chat 1');
    }
    this.switchSession(this.currentSessionId || this.sessions[0]?.id);
    this.initEventListeners();
  }

  persistState() {
    try {
      const payload = {
        currentSessionId: this.currentSessionId,
        sessions: this.sessions
      };
      localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('AI Chat - Failed to persist sessions', error);
    }
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.sessions)) return;
      this.sessions = parsed.sessions.map((session, index) => ({
        id: session.id || `chat-restored-${Date.now()}-${index}`,
        title: session.title || `Chat ${index + 1}`,
        history: Array.isArray(session.history) ? session.history : [],
        messageLog: Array.isArray(session.messageLog) ? session.messageLog : []
      }));
      this.currentSessionId = parsed.currentSessionId || this.sessions[0]?.id || null;
    } catch (error) {
      console.warn('AI Chat - Failed to load persisted sessions', error);
      this.sessions = [];
      this.currentSessionId = null;
    }
  }

  initEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.newChatBtn?.addEventListener('click', () => this.startNewSession());
    this.clearChatBtn?.addEventListener('click', () => this.clearCurrentSession());
    this.sessionSelect?.addEventListener('change', (e) => this.switchSession(e.target.value));
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }
    
    // Global Ctrl+Z for undo AI changes
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && this.undoStack.length > 0) {
        e.preventDefault();
        this.undo();
      }
    });
  }

  createSession(title) {
    const session = {
      id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      history: [],
      messageLog: []
    };
    this.sessions.push(session);
    this.persistState();
    return session;
  }

  getCurrentSession() {
    return this.sessions.find((s) => s.id === this.currentSessionId) || null;
  }

  updateSessionUI() {
    if (!this.sessionSelect) return;
    this.sessionSelect.innerHTML = '';
    this.sessions.forEach((session) => {
      const option = document.createElement('option');
      option.value = session.id;
      option.textContent = session.title;
      if (session.id === this.currentSessionId) option.selected = true;
      this.sessionSelect.appendChild(option);
    });
    this.sessionSelect.classList.toggle('hidden', this.sessions.length <= 1);
  }

  renderCurrentSession() {
    this.messagesContainer.innerHTML = '';
    if (this.messageLog.length === 0) {
      this.showWelcomeMessage();
      return;
    }
    this.messageLog.forEach((entry) => {
      if (entry.type === 'error') {
        this.addErrorMessage(entry.content, false);
      } else {
        this.addMessage(entry.role, entry.content, false);
      }
    });
  }

  switchSession(sessionId) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    this.currentSessionId = session.id;
    this.history = session.history;
    this.messageLog = session.messageLog;
    this.updateSessionUI();
    this.renderCurrentSession();
    this.persistState();
  }

  startNewSession() {
    const title = `Chat ${this.sessions.length + 1}`;
    const session = this.createSession(title);
    this.switchSession(session.id);
    this.persistState();
    this.input?.focus();
  }

  clearCurrentSession() {
    if (this.isProcessing) {
      this.showToast('Bitte warte, bis die aktuelle Anfrage abgeschlossen ist.', 'info');
      return;
    }

    const session = this.getCurrentSession();
    if (!session) {
      return;
    }

    this.history = [];
    this.messageLog = [];
    this.undoStack = [];
    session.history = [];
    session.messageLog = [];

    if (this.undoBtn) {
      this.undoBtn.style.display = 'none';
    }

    this.renderCurrentSession();
    this.persistState();
    this.showToast('Chatverlauf geleert', 'success');
    this.input?.focus();
  }

  showWelcomeMessage() {
    if (this.history.length === 0) {
      this.messagesContainer.innerHTML = `
        <div class="ai-chat-welcome">
          <i class="fa-solid fa-robot"></i>
          <h3 data-i18n="aiChatWelcomeTitle">KI-Assistent für Markdown</h3>
          <p data-i18n="aiChatWelcomeText">
            Ich helfe dir beim Schreiben, Formatieren und Verbessern deiner Markdown-Dokumente.
            Frag mich nach Verbesserungen, Korrekturen oder lass mich Text für dich schreiben!
          </p>
        </div>
      `;
    }
  }

  getAiRequestConfig() {
    const supportedProviders = new Map([
      ['groq', { provider: 'groq', enabledId: 'aiGroqEnabled', modelId: 'aiGroqModel', keyId: 'aiGroqKey' }],
      ['gemini', { provider: 'gemini', enabledId: 'aiGeminiEnabled', modelId: 'aiGeminiModel', keyId: 'aiGeminiKey' }],
      ['openai', { provider: 'openai', enabledId: 'aiOpenAIEnabled', modelId: 'aiOpenAIModel', keyId: 'aiOpenAIKey' }],
      ['claude', { provider: 'claude', enabledId: 'aiClaudeEnabled', modelId: 'aiClaudeModel', keyId: 'aiClaudeKey' }]
    ]);

    const providerControls = Array.from(document.querySelectorAll('.ai-provider-row input[data-ai-provider]'))
      .map((input) => supportedProviders.get(input.dataset.aiProvider))
      .filter(Boolean);

    const selected = providerControls.find(({ enabledId }) => document.getElementById(enabledId)?.checked);

    if (!selected) {
      return null;
    }

    const model = document.getElementById(selected.modelId)?.value?.trim();
    const apiKey = document.getElementById(selected.keyId)?.value?.trim();

    return {
      provider: selected.provider,
      model: model || undefined,
      apiKey: apiKey || undefined
    };
  }

  async sendMessage() {
    const message = this.input.value.trim();
    if (!message || this.isProcessing) return;

    this.input.value = '';
    this.input.style.height = '50px';
    this.isProcessing = true;
    this.sendBtn.disabled = true;

    // Add user message to UI
    this.addMessage('user', message);

    // Show loading indicator
    const loadingId = this.addLoadingMessage();

    try {
      // Get current markdown content
      const currentDoc = window.editor ? window.editor.getValue() : '';
      const aiConfig = this.getAiRequestConfig();

      if (!aiConfig) {
        this.removeLoadingMessage(loadingId);
        this.showToast(window.t?.('aiProviderSelectRequired') || 'Bitte aktiviere mindestens einen KI-Anbieter.', 'error');
        return;
      }
      
      console.log('AI Chat - Sending request:', {
        provider: aiConfig.provider,
        model: aiConfig.model,
        prompt: message.substring(0, 50) + '...',
        documentLength: currentDoc.length,
        hasEditor: !!window.editor
      });

      // Call API with new structured format
      const response = await fetch('/api/chat/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          document: currentDoc,
          history: this.history,
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiConfig.apiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API error');
      }

      const data = await response.json();
      
      console.log('AI Chat - Received response:', {
        action: data.action,
        hasMarkdown: !!data.markdown,
        markdownLength: data.markdown ? data.markdown.length : 0
      });

      // Remove loading indicator
      this.removeLoadingMessage(loadingId);

      // Add to history with structured format
      this.history.push({ 
        role: 'user', 
        content: JSON.stringify({ prompt: message, document: currentDoc })
      });
      this.history.push({ 
        role: 'assistant', 
        content: JSON.stringify(data)
      });
      this.persistState();

      // Handle the response
      this.handleAIResponse(data, message);

    } catch (error) {
      console.error('Chat error:', error);
      this.removeLoadingMessage(loadingId);
      this.addErrorMessage(this.getReadableErrorMessage(error, aiConfig));
    } finally {
      this.isProcessing = false;
      this.sendBtn.disabled = false;
      this.input.focus();
    }
  }

  handleAIResponse(data, userPrompt = '') {
    const { action, markdown, message } = data;
    
    // Use new 'markdown' field, fallback to legacy 'content' field
    const content = markdown || data.content;
    const willApply = this.shouldAutoApplyResponse(userPrompt, action, content);
    const displayMessage = this.buildAssistantDisplayMessage({
      message,
      action,
      content,
      applied: willApply,
      editorAvailable: !!window.editor
    });
    
    console.log('AI Chat - Handling response:', {
      action,
      hasContent: !!content,
      contentLength: content ? content.length : 0,
      message: message ? message.substring(0, 50) + '...' : null
    });

    // Add assistant message with action/result context
    this.addMessage('assistant', displayMessage);

    // Auto-apply action if needed
    if (willApply) {
      console.log('AI Chat - Auto-applying action:', action);
      this.applyAction(action, content);
    } else if (!window.editor && action !== 'ADVICE') {
      console.warn('AI Chat - No editor available for applying action');
    }
  }

  shouldAutoApplyResponse(userPrompt, action, content) {
    if (!action || action === 'ADVICE' || !content || !window.editor) {
      return false;
    }

    return this.hasDocumentChangeIntent(userPrompt);
  }

  hasDocumentChangeIntent(userPrompt) {
    if (typeof userPrompt !== 'string') {
      return false;
    }

    return /(schreib|erstell|erzeuge|formuliere|füge|fasse|ergänz|überarbeite|verbessere|korrigier|wandle|übersetze|generier|append|insert|prepend|replace|rewrite|summari[sz]e|summary|heading|title|add|update|edit|draft|outline|überschrift|titel|zusammenfassung|gliederung|einleitung|fazit|stichpunkte|bulletpoints)/i.test(userPrompt.trim());
  }

  buildAssistantDisplayMessage({ message, action, content, applied, editorAvailable }) {
    const baseMessage = (message || 'Fertig!').trim();

    if (!action || action === 'ADVICE') {
      return baseMessage;
    }

    const status = applied
      ? 'Ins Dokument übernommen.'
      : editorAvailable
        ? 'Keine Änderung übernommen.'
        : 'Editor nicht verfügbar, daher nicht übernommen.';

    const sections = [
      baseMessage,
      '---',
      `**Aktion:** ${this.getActionLabel(action)}`,
      `**Status:** ${status}`
    ];

    if (content) {
      sections.push('', '**Vorschau:**');
      sections.push('```markdown');
      sections.push(this.getContentPreview(content));
      sections.push('```');
    }

    return sections.join('\n');
  }

  getContentPreview(content) {
    const trimmed = String(content || '').trim();
    const maxLength = 1200;
    const preview = trimmed.length > maxLength
      ? `${trimmed.slice(0, maxLength)}\n...`
      : trimmed;

    return preview.replace(/```/g, '`` `');
  }

  applyAction(action, content) {
    if (!window.editor) {
      console.error('AI Chat - No editor available');
      this.showToast('Editor nicht verfügbar', 'error');
      return;
    }

    const editor = window.editor;
    const previousState = editor.getValue();
    
    console.log('AI Chat - Applying action:', {
      action,
      contentLength: content ? content.length : 0,
      currentDocLength: previousState.length
    });

    // Save state for undo (limit to 10 changes)
    this.undoStack.push({
      state: previousState,
      timestamp: Date.now()
    });
    
    // Keep only the last 10 changes
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
    
    // Show undo button
    if (this.undoBtn) {
      this.undoBtn.style.display = '';
    }
    
    switch (action) {
      case 'REPLACE':
        editor.setValue(content);
        this.showToast('Dokument ersetzt', 'success');
        break;
        
      case 'APPEND':
        const currentValue = editor.getValue();
        editor.setValue(currentValue + '\n\n' + content);
        this.showToast('Text angehängt', 'success');
        break;
        
      case 'PREPEND':
        editor.setValue(content + '\n\n' + editor.getValue());
        this.showToast('Text vorangestellt', 'success');
        break;
        
      case 'INSERT':
        const cursor = editor.getCursor();
        editor.replaceRange(content, cursor);
        this.showToast('Text eingefügt', 'success');
        break;
    }

    // Trigger save
    if (window.triggerSave) {
      console.log('AI Chat - Triggering save');
      window.triggerSave();
    } else {
      console.warn('AI Chat - triggerSave not available');
    }
  }

  undo() {
    if (this.undoStack.length === 0) {
      console.log('AI Chat - Undo stack empty');
      return;
    }

    const lastState = this.undoStack.pop();
    
    if (!window.editor) {
      console.error('AI Chat - No editor available for undo');
      this.showToast('Editor nicht verfügbar', 'error');
      return;
    }

    console.log('AI Chat - Undoing change', {
      timestamp: lastState.timestamp,
      remaining: this.undoStack.length
    });

    window.editor.setValue(lastState.state);
    
    // Hide undo button if stack is empty
    if (this.undoStack.length === 0 && this.undoBtn) {
      this.undoBtn.style.display = 'none';
    }

    // Trigger save
    if (window.triggerSave) {
      window.triggerSave();
    }
    
    this.showToast('Änderung rückgängig gemacht', 'success');
  }

  addMessage(role, content, persist = true) {
    if (persist) {
      this.messageLog.push({ type: 'message', role, content });
      this.persistState();
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'ai-chat-avatar';
    avatar.innerHTML = role === 'user' 
      ? '<i class="fa-solid fa-user"></i>' 
      : '<i class="fa-solid fa-robot"></i>';
    
    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble';
    
    // Render markdown in assistant messages
    if (role === 'assistant') {
      if (typeof window.renderMarkdownToHtml === 'function') {
        bubble.innerHTML = window.renderMarkdownToHtml(content);
      } else {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = content;
        bubble.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
      }
    } else {
      bubble.textContent = content;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    
    // Remove welcome message if exists
    const welcome = this.messagesContainer.querySelector('.ai-chat-welcome');
    if (welcome) welcome.remove();
    
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  getActionLabel(action) {
    const labels = {
      'REPLACE': 'Gesamten Text ersetzen',
      'APPEND': 'Am Ende anfügen',
      'PREPEND': 'Am Anfang einfügen',
      'INSERT': 'An Cursor-Position einfügen'
    };
    return labels[action] || action;
  }

  addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = id;
    loadingDiv.className = 'ai-chat-loading';
    loadingDiv.innerHTML = '<i class="fa-solid fa-spinner"></i> Denkt nach...';
    
    this.messagesContainer.appendChild(loadingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    
    return id;
  }

  removeLoadingMessage(id) {
    const loading = document.getElementById(id);
    if (loading) loading.remove();
  }

  addErrorMessage(error, persist = true) {
    if (persist) {
      this.messageLog.push({ type: 'error', content: error });
      this.persistState();
    }
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-chat-error';
    errorDiv.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i> Fehler: ${error}`;
    
    this.messagesContainer.appendChild(errorDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  getReadableErrorMessage(error, aiConfig) {
    const rawMessage = error?.message || String(error || 'API error');

    if (rawMessage === 'AI service unavailable') {
      const providerLabel = aiConfig?.provider ? aiConfig.provider.toUpperCase() : 'AI';
      return `${providerLabel} ist derzeit nicht erreichbar oder nicht korrekt konfiguriert.`;
    }

    if (rawMessage === 'Invalid API key') {
      return 'Der API-Key ist ungueltig oder gesperrt.';
    }

    return rawMessage;
  }

  showToast(message, type = 'info', duration = 3000) {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }
  }

  // Public method to get current chat state
  getChatHistory() {
    return this.history;
  }

  // Public method to programmatically add a message
  async askQuestion(question) {
    this.input.value = question;
    await this.sendMessage();
  }
}
