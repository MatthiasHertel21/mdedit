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
  let presenceIntervalId = null;

  const t = (key, fallback) => window.t?.(key) || fallback;

  const setCollabUiVisible = (visible) => {
    elements.collabPresenceContainer?.classList.toggle("hidden", !visible);
    if (elements.collabPasswordBtn) {
      elements.collabPasswordBtn.classList.toggle("hidden", !visible);
      elements.collabPasswordBtn.style.display = visible ? "inline-flex" : "none";
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
      window.syncRemoteCursorMembers?.(data.members);
      window.refreshRemoteCursorPresence?.();
    });
    collabManager.on("member-joined", (data) => {
      presenceManager?.addMember({
        id: data.memberId,
        fantasyName: data.fantasyName,
        avatarColor: data.avatarColor
      });
      window.refreshRemoteCursorPresence?.();
    });
    collabManager.on("member-updated", (data) => {
      presenceManager?.updateMember({
        id: data.memberId,
        fantasyName: data.fantasyName,
        avatarColor: data.avatarColor
      });
      window.refreshRemoteCursorPresence?.();
    });
    collabManager.on("member-left", (data) => {
      presenceManager?.removeMember(data.memberId);
      window.clearRemoteCursorPosition?.(data.memberId);
    });

    // Poll presence every 5 s so newly joined members appear even without WS events
    if (presenceIntervalId) window.clearInterval(presenceIntervalId);
    presenceIntervalId = window.setInterval(async () => {
      if (!collabManager) return;
      await collabManager.loadMembers();
    }, 5000);
  };

  const disconnect = () => {
    if (presenceIntervalId) {
      window.clearInterval(presenceIntervalId);
      presenceIntervalId = null;
    }
    collabManager?.disconnect();
    collabManager = null;
    presenceManager = null;
    passwordDialog = null;
    window.clearAllRemoteCursorPositions?.();
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
  };

  return {
    initCollab,
    setupPasswordButton,
    getCollabManager: () => collabManager,
    getPresenceManager: () => presenceManager,
    disconnect
  };
}
