/**
 * Collab Integration Module
 * Integrates collaborative editing into the main app.js
 */

export function initCollabSupport(app, elements) {
  let collabManager = null;
  let presenceManager = null;
  let passwordDialog = null;
  let currentPasteId = null;

  // ── Collaborative Editing Initialization ──────────────────────────────────
  
  const initCollab = async (pasteId, isShared = false) => {
    currentPasteId = pasteId;
    
    if (!isShared) {
      // Private paste - no collab
      if (elements.collabPasswordBtn) {
        elements.collabPasswordBtn.style.display = "none";
      }
      return;
    }

    // Check if paste has password
    collabManager = new (await import("./modules/collab.js")).CollabManager(pasteId, app.sessionId || "");
    
    const hasPassword = await collabManager.checkPasswordProtection();
    
    if (hasPassword) {
      // Show password dialog
      const password = prompt("Dieses Dokument ist passwortgeschützt. Passwort eingeben:");
      if (!password) {
        return;
      }
      const verified = await collabManager.verifyPassword(password);
      if (!verified) {
        alert("Falsches Passwort");
        return;
      }
    }

    // Join collab session
    const joined = await collabManager.join();
    if (!joined) {
      console.error("Failed to join collab session");
      return;
    }

    // Setup presence
    if (elements.collabPresenceContainer) {
      elements.collabPresenceContainer.classList.remove("hidden");
      presenceManager = new (await import("./modules/presence.js")).PresenceManager("#collabPresenceContainer");
      
      collabManager.on("members-loaded", (data) => {
        presenceManager.updateMembers(data.members);
      });

      collabManager.on("member-joined", (data) => {
        presenceManager.addMember({
          id: data.memberId,
          fantasyName: data.fantasyName,
          avatarColor: data.avatarColor
        });
      });

      collabManager.on("member-left", (data) => {
        presenceManager.removeMember(data.memberId);
      });
    }

    // Setup password button
    if (elements.collabPasswordBtn) {
      elements.collabPasswordBtn.style.display = "inline-block";
      elements.collabPasswordBtn.addEventListener("click", () => {
        passwordDialog = new (await import("./modules/password-dialog.js")).PasswordDialog(pasteId);
        passwordDialog.open();
      });
    }

    // Setup remote edit handler
    collabManager.on("remote-edit", (data) => {
      // In production, use CRDT for merging
      // For MVP: just take server version
      console.log("Remote edit from:", data.memberId);
    });

    // Setup cursor handler
    collabManager.on("remote-cursor", (data) => {
      // Highlight cursor position temporarily
      if (window.highlightCursorPosition) {
        window.highlightCursorPosition(data.position, data.memberId);
      }
    });

    // Setup chat
    setupCollabChat(pasteId, collabManager);

    // Send edits when markdown changes
    const originalUpdateLive = window.updateLive;
    if (originalUpdateLive) {
      window.updateLive = (() => {
        const markdown = window.getEditorValue?.();
        if (markdown && collabManager) {
          collabManager.sendEdit(markdown);
        }
        if (originalUpdateLive.fn) {
          originalUpdateLive.fn();
        }
      });
    }
  };

  // ── Password Dialog Setup ─────────────────────────────────────────────────

  const setupPasswordButton = (pasteId) => {
    if (!elements.collabPasswordBtn) return;

    elements.collabPasswordBtn.style.display = "inline-block";
    elements.collabPasswordBtn.removeEventListener("click", handlePasswordButtonClick);
    elements.collabPasswordBtn.addEventListener("click", handlePasswordButtonClick);

    async function handlePasswordButtonClick() {
      const PasswordDialogClass = (await import("./modules/password-dialog.js")).PasswordDialog;
      passwordDialog = new PasswordDialogClass(pasteId, {
        onSave: () => {
          console.log("Password saved");
        },
        onRemove: () => {
          console.log("Password removed");
        }
      });
      passwordDialog.open();
    }
  };

  // ── Chat Setup ────────────────────────────────────────────────────────────

  const setupCollabChat = async (pasteId, manager) => {
    if (!elements.collabChatPanel) return;

    const threadSelect = document.querySelector("#collabThreadSelect");
    const chatMessages = document.querySelector("#collabChatMessages");
    const chatInput = document.querySelector("#collabChatInput");
    const chatSendBtn = document.querySelector("#collabChatSendBtn");
    const newThreadBtn = document.querySelector("#newCollabThreadBtn");

    // Load threads
    const threads = await manager.getChatThreads();
    threadSelect.innerHTML = threads.map(t => 
      `<option value="${t.id}">${t.title}</option>`
    ).join("");

    // Load messages when thread selected
    threadSelect.addEventListener("change", async (e) => {
      const threadId = e.target.value;
      if (!threadId) return;

      const messages = await manager.getChatMessages(threadId);
      chatMessages.innerHTML = messages.map(m => `
        <div class="collab-chat-message">
          <div class="collab-chat-author">${m.fantasy_name || "Anonymous"}</div>
          <div class="collab-chat-text">${escapeHtml(m.message)}</div>
          <div class="collab-chat-time">${new Date(m.created_at).toLocaleTimeString()}</div>
        </div>
      `).join("");
      
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // Send message
    chatSendBtn.addEventListener("click", () => {
      const threadId = threadSelect.value;
      const message = chatInput.value.trim();
      
      if (!threadId || !message) return;

      manager.sendChatMessage(threadId, message);
      chatInput.value = "";
      chatInput.focus();
    });

    // Create new thread
    newThreadBtn.addEventListener("click", async () => {
      const title = prompt("Thread-Titel:");
      if (!title) return;

      const threadId = await manager.createChatThread(title);
      if (threadId) {
        const threads = await manager.getChatThreads();
        threadSelect.innerHTML = threads.map(t => 
          `<option value="${t.id}"${t.id === threadId ? " selected" : ""}>${t.title}</option>`
        ).join("");
      }
    });

    // Listen for remote chat messages
    manager.on("chat-message", (data) => {
      if (data.threadId === threadSelect.value) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "collab-chat-message";
        msgDiv.innerHTML = `
          <div class="collab-chat-author">${data.memberName || "Anonymous"}</div>
          <div class="collab-chat-text">${escapeHtml(data.content)}</div>
          <div class="collab-chat-time">${new Date(data.timestamp).toLocaleTimeString()}</div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    });
  };

  // ── Export Functions ─────────────────────────────────────────────────────

  const escapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  return {
    initCollab,
    setupPasswordButton,
    getCollabManager: () => collabManager,
    getPresenceManager: () => presenceManager,
    disconnect: () => {
      if (collabManager) {
        collabManager.disconnect();
        collabManager = null;
      }
      if (elements.collabPresenceContainer) {
        elements.collabPresenceContainer.classList.add("hidden");
      }
      if (elements.collabPasswordBtn) {
        elements.collabPasswordBtn.style.display = "none";
      }
    }
  };
}
