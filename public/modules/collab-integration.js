/**
 * Collab Integration Module
 * Integrates collaborative editing into the main app.js
 */

import { CollabManager } from "./collab.js";
import { PasswordDialog } from "./password-dialog.js";
import { PresenceManager } from "./presence.js";

export function initCollabSupport(app, elements) {
  let collabManager = null;
  let presenceManager = null;
  let passwordDialog = null;
  let chatSyncIntervalId = null;
  let chatMessagesSyncIntervalId = null;
  let presenceIntervalId = null;

  const t = (key, fallback) => window.t?.(key) || fallback;

  const collabToggles = () => Array.from(document.querySelectorAll(".collab-chat-toggle"));

  const setCollabUiVisible = (visible) => {
    elements.collabPresenceContainer?.classList.toggle("hidden", !visible);
    elements.collabChatPanel?.classList.toggle("hidden", !visible);
    if (elements.collabPasswordBtn) {
      elements.collabPasswordBtn.classList.toggle("hidden", !visible);
      elements.collabPasswordBtn.style.display = visible ? "inline-flex" : "none";
    }
    collabToggles().forEach((button) => button.classList.toggle("hidden", !visible));

    if (!visible && app.getCurrentView?.() === "collab") {
      app.setView?.("preview");
    }
  };

  const escapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  const showMessageDialog = ({ title, message, showCancel = false, confirmLabel, cancelLabel }) =>
    new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      const modal = document.createElement("div");
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <div class="password-dialog-content">
            <p>${escapeHtml(message)}</p>
            <div class="password-dialog-actions">
              ${showCancel ? `<button type="button" class="btn-secondary" data-dialog-cancel>${escapeHtml(cancelLabel || t("cancel", "Cancel"))}</button>` : ""}
              <button type="button" class="primary-btn" data-dialog-confirm>${escapeHtml(confirmLabel || "OK")}</button>
            </div>
          </div>
        </div>
      `;

      const cleanup = (value) => {
        overlay.remove();
        modal.remove();
        resolve(value);
      };

      overlay.addEventListener("click", () => cleanup(showCancel ? false : true));
      modal.querySelector("[data-dialog-confirm]")?.addEventListener("click", () => cleanup(true));
      modal.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => cleanup(false));

      document.body.appendChild(overlay);
      document.body.appendChild(modal);
    });

  const requestTextInput = ({ title, message, placeholder = "", type = "text", confirmLabel, cancelLabel }) =>
    new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      const modal = document.createElement("div");
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <div class="password-dialog-content">
            <label>
              <span>${escapeHtml(message)}</span>
              <input type="${escapeHtml(type)}" class="password-input" data-dialog-input placeholder="${escapeHtml(placeholder)}" />
            </label>
            <div class="password-dialog-actions">
              <button type="button" class="btn-secondary" data-dialog-cancel>${escapeHtml(cancelLabel || t("cancel", "Cancel"))}</button>
              <button type="button" class="primary-btn" data-dialog-confirm>${escapeHtml(confirmLabel || t("save", "Save"))}</button>
            </div>
          </div>
        </div>
      `;

      const input = modal.querySelector("[data-dialog-input]");

      const cleanup = (value) => {
        overlay.remove();
        modal.remove();
        resolve(value);
      };

      overlay.addEventListener("click", () => cleanup(null));
      modal.querySelector("[data-dialog-confirm]")?.addEventListener("click", () => {
        const value = input?.value?.trim();
        cleanup(value || null);
      });
      modal.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => cleanup(null));
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          modal.querySelector("[data-dialog-confirm]")?.click();
        }
      });

      document.body.appendChild(overlay);
      document.body.appendChild(modal);
      input?.focus();
    });

  const setupPasswordButton = (pasteId) => {
    if (!elements.collabPasswordBtn) return;

    elements.collabPasswordBtn.onclick = () => {
      passwordDialog = new PasswordDialog(pasteId, {
        onSave: () => console.log("Password saved"),
        onRemove: () => console.log("Password removed")
      });
      passwordDialog.open();
    };
  };

  const bindPresence = () => {
    if (!elements.collabPresenceContainer || !collabManager) return;

    presenceManager = new PresenceManager("#collabPresenceContainer");
    collabManager.on("members-loaded", (data) => {
      presenceManager?.updateMembers(data.members);
    });
    collabManager.on("member-joined", (data) => {
      presenceManager?.addMember({
        id: data.memberId,
        fantasyName: data.fantasyName,
        avatarColor: data.avatarColor
      });
    });
    collabManager.on("member-left", (data) => {
      presenceManager?.removeMember(data.memberId);
    });

    // Poll presence every 5 s so newly joined members appear even without WS events
    if (presenceIntervalId) window.clearInterval(presenceIntervalId);
    presenceIntervalId = window.setInterval(async () => {
      if (!collabManager) return;
      await collabManager.loadMembers();
    }, 5000);
  };

  const setupCollabChat = async () => {
    if (!elements.collabChatPanel || !collabManager) return;

    if (chatSyncIntervalId) {
      window.clearInterval(chatSyncIntervalId);
      chatSyncIntervalId = null;
    }
    if (chatMessagesSyncIntervalId) {
      window.clearInterval(chatMessagesSyncIntervalId);
      chatMessagesSyncIntervalId = null;
    }

    const threadSelect = document.querySelector("#collabThreadSelect");
    const chatMessages = document.querySelector("#collabChatMessages");
    const chatInput = document.querySelector("#collabChatInput");
    const chatSendBtn = document.querySelector("#collabChatSendBtn");
    const newThreadBtn = document.querySelector("#newCollabThreadBtn");

    if (!threadSelect || !chatMessages || !chatInput || !chatSendBtn || !newThreadBtn) {
      return;
    }

    const renderMessages = (messages) => {
      chatMessages.innerHTML = messages.map((message) => `
        <div class="collab-chat-message">
          <div class="collab-chat-author">${escapeHtml(message.fantasy_name || message.fantasyName || "Anonymous")}</div>
          <div class="collab-chat-text">${escapeHtml(message.message || message.content || "")}</div>
          <div class="collab-chat-time">${new Date(message.created_at || message.timestamp).toLocaleTimeString()}</div>
        </div>
      `).join("");
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const syncMessages = async (threadId) => {
      if (!threadId) return;
      const messages = await collabManager.getChatMessages(threadId);
      renderMessages(messages);
    };

    const loadThreads = async (selectedThreadId = "") => {
      const threads = await collabManager.getChatThreads();
      if (!threads.length) {
        threadSelect.innerHTML = `<option value="">${escapeHtml(t("collabNoThreads", "No threads yet"))}</option>`;
        chatMessages.innerHTML = "";
        return;
      }

      threadSelect.innerHTML = threads.map((thread) =>
        `<option value="${thread.id}"${thread.id === selectedThreadId ? " selected" : ""}>${escapeHtml(thread.title)}</option>`
      ).join("");

      const activeThreadId = selectedThreadId || threadSelect.value || threads[0].id;
      threadSelect.value = activeThreadId;
      await syncMessages(activeThreadId);
    };

    const sendMessage = async () => {
      const threadId = threadSelect.value;
      const message = chatInput.value.trim();

      if (!threadId || !message) return;

      const sent = await collabManager.sendChatMessage(threadId, message);
      if (!sent) return;

      chatInput.value = "";
      chatInput.focus();
      await syncMessages(threadId);
    };

    threadSelect.onchange = async (event) => {
      const threadId = event.target.value;
      if (!threadId) return;
      await syncMessages(threadId);
    };

    chatSendBtn.onclick = sendMessage;
    chatInput.onkeydown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };

    newThreadBtn.onclick = async () => {
      const title = await requestTextInput({
        title: t("collabChat", "Team chat"),
        message: t("collabThreadPrompt", "Thread title:"),
        confirmLabel: t("collabThreadNew", "New thread"),
        cancelLabel: t("cancel", "Cancel")
      });
      if (!title) return;

      const threadId = await collabManager.createChatThread(title);
      if (threadId) {
        await loadThreads(threadId);
      }
    };

    collabManager.on("chat-message", (data) => {
      if (data.threadId !== threadSelect.value) return;

      const msgDiv = document.createElement("div");
      msgDiv.className = "collab-chat-message";
      msgDiv.innerHTML = `
        <div class="collab-chat-author">${escapeHtml(data.memberName || "Anonymous")}</div>
        <div class="collab-chat-text">${escapeHtml(data.content)}</div>
        <div class="collab-chat-time">${new Date(data.timestamp).toLocaleTimeString()}</div>
      `;
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    collabManager.on("chat-thread-created", async (data) => {
      const shouldSelectNewThread = !threadSelect.value || threadSelect.value === data.threadId;
      await loadThreads(shouldSelectNewThread ? data.threadId : threadSelect.value);
    });

    chatSyncIntervalId = window.setInterval(() => {
      loadThreads(threadSelect.value).catch((error) => {
        console.error("Error syncing chat threads:", error);
      });
    }, 3000);

    chatMessagesSyncIntervalId = window.setInterval(() => {
      syncMessages(threadSelect.value).catch((error) => {
        console.error("Error syncing chat messages:", error);
      });
    }, 2000);

    await loadThreads();
  };

  const disconnect = () => {
    if (chatSyncIntervalId) {
      window.clearInterval(chatSyncIntervalId);
      chatSyncIntervalId = null;
    }
    if (chatMessagesSyncIntervalId) {
      window.clearInterval(chatMessagesSyncIntervalId);
      chatMessagesSyncIntervalId = null;
    }
    if (presenceIntervalId) {
      window.clearInterval(presenceIntervalId);
      presenceIntervalId = null;
    }
    collabManager?.disconnect();
    collabManager = null;
    presenceManager = null;
    passwordDialog = null;
    setCollabUiVisible(false);
  };

  const getDisplayName = () => {
    return localStorage.getItem("md-collab-display-name")?.trim() || null;
  };

  const initCollab = async (pasteId, isShared = false) => {
    disconnect();

    if (!isShared) {
      return;
    }

    // Check user setting: opt-out of collab
    const collabEnabled = localStorage.getItem("md-settings");
    try {
      const settings = collabEnabled ? JSON.parse(collabEnabled) : {};
      if (settings.collabEnabled === false) return;
    } catch { /* ignore */ }

    collabManager = new CollabManager(pasteId, app.sessionId || "");

    const hasPassword = await collabManager.checkPasswordProtection();
    let password = null;

    if (hasPassword) {
      password = await requestTextInput({
        title: t("collabPassword", "Password"),
        message: t("collabPasswordPrompt", "This document is password protected. Enter password:"),
        placeholder: t("passwordInputPlaceholder", "Enter password"),
        type: "password",
        confirmLabel: t("collabPassword", "Password"),
        cancelLabel: t("cancel", "Cancel")
      });
      if (!password) {
        disconnect();
        return;
      }

      const verified = await collabManager.verifyPassword(password);
      if (!verified) {
        await showMessageDialog({
          title: t("collabPassword", "Password"),
          message: t("collabPasswordInvalid", "Invalid password"),
          confirmLabel: "OK"
        });
        disconnect();
        return;
      }
    }

    const joined = await collabManager.join({ password, displayName: getDisplayName() });
    if (!joined) {
      await showMessageDialog({
        title: t("collabChat", "Team chat"),
        message: t("collabJoinFailed", "Could not join collaboration."),
        confirmLabel: "OK"
      });
      disconnect();
      return;
    }

    setCollabUiVisible(true);
    setupPasswordButton(pasteId);
    bindPresence();

    collabManager.on("remote-edit", (data) => {
      app.applyRemoteMarkdown?.(data.content);
    });

    collabManager.on("remote-cursor", (data) => {
      if (window.highlightCursorPosition) {
        window.highlightCursorPosition(data.position, data.memberId);
      }
    });

    await setupCollabChat();
  };

  return {
    initCollab,
    setupPasswordButton,
    getCollabManager: () => collabManager,
    getPresenceManager: () => presenceManager,
    disconnect
  };
}
