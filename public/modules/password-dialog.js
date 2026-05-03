/**
 * Password Dialog Module - Manage document password protection
 */

export class PasswordDialog {
  constructor(pasteId, callbacks = {}) {
    this.pasteId = pasteId;
    this.callbacks = callbacks;
    this.isOpen = false;
    this.currentPassword = null;
    this.hasExistingPassword = false;
  }

  // Open dialog (for setting password)
  open() {
    this.isOpen = true;

    // Create dialog HTML
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "passwordDialogOverlay";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "passwordDialog";

    modal.innerHTML = `
      <div class="modal-header">
        <h2 data-i18n="passwordDialogTitle">Passwortschutz</h2>
        <button class="icon" aria-label="Schließen" data-i18n-aria="close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="password-dialog-content">
          <label class="setting">
            <input type="checkbox" id="passwordProtectionToggle" />
            <div class="setting-text">
              <div class="setting-title" data-i18n="passwordProtectionActive">Passwortschutz aktivieren</div>
              <div class="setting-subtitle" data-i18n="passwordProtectionDesc">Nutzer müssen das Passwort eingeben, um das Dokument zu öffnen</div>
            </div>
          </label>

          <div id="passwordInputSection" class="password-input-section hidden">
            <label for="passwordInput" data-i18n="passwordInputLabel">Passwort</label>
            <input type="password" id="passwordInput" class="password-input" placeholder="Passwort eingeben" data-i18n-placeholder="passwordInputPlaceholder" />
            <input type="password" id="passwordConfirm" class="password-input" placeholder="Passwort wiederholen" data-i18n-placeholder="passwordConfirmPlaceholder" />
            <div id="passwordMatchError" class="error-text hidden" data-i18n="passwordMismatch">Passwörter stimmen nicht überein</div>
          </div>

          <div class="permissions-block">
            <h3 data-i18n="userPermissions">Nutzer mit Link dürfen:</h3>
            <label class="setting">
              <input type="checkbox" id="canRead" checked />
              <span data-i18n="permissionRead">Lesen</span>
            </label>
            <label class="setting">
              <input type="checkbox" id="canWrite" checked />
              <span data-i18n="permissionWrite">Schreiben</span>
            </label>
          </div>

          <div class="password-dialog-actions">
            <button id="passwordSaveBtn" class="primary-btn" data-i18n="save">Speichern</button>
            <button id="passwordRemoveBtn" class="btn-secondary hidden" data-i18n="removePassword">Passwort entfernen</button>
            <button id="passwordCancelBtn" class="btn-secondary" data-i18n="cancel">Abbrechen</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  overlay.addEventListener("click", () => this.close());

    // Event listeners
    const closeBtn = modal.querySelector(".modal-header .icon");
    closeBtn.addEventListener("click", () => this.close());

    const cancelBtn = modal.querySelector("#passwordCancelBtn");
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = modal.querySelector("#passwordSaveBtn");
    saveBtn.addEventListener("click", () => this.save());

    const removeBtn = modal.querySelector("#passwordRemoveBtn");
    removeBtn.addEventListener("click", () => this.removePassword());

    const toggleCheckbox = modal.querySelector("#passwordProtectionToggle");
    const inputSection = modal.querySelector("#passwordInputSection");
    toggleCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        inputSection.classList.remove("hidden");
      } else {
        inputSection.classList.add("hidden");
      }
      this.updateRemoveButtonState();
    });

    // Load current settings
    this.loadSettings();

    // Apply i18n
    if (window.applyI18nToElement) {
      window.applyI18nToElement(modal);
    }
  }

  // Load current password settings
  async loadSettings() {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/settings`);
      if (!res.ok) return;

      const settings = await res.json();
      const toggle = document.querySelector("#passwordProtectionToggle");
      const inputSection = document.querySelector("#passwordInputSection");
      
      if (settings.hasPassword) {
        this.hasExistingPassword = true;
        toggle.checked = true;
        inputSection.classList.remove("hidden");
      }

      document.querySelector("#canRead").checked = !!settings.canRead;
      document.querySelector("#canWrite").checked = !!settings.canWrite;

      this.updateRemoveButtonState();
    } catch (e) {
      console.error("Error loading password settings:", e);
    }
  }

  // Update remove button visibility
  updateRemoveButtonState() {
    const toggle = document.querySelector("#passwordProtectionToggle");
    const removeBtn = document.querySelector("#passwordRemoveBtn");
    
    if (toggle.checked && this.hasExistingPassword) {
      removeBtn.classList.remove("hidden");
    } else {
      removeBtn.classList.add("hidden");
    }
  }

  // Save password
  async save() {
    const toggle = document.querySelector("#passwordProtectionToggle");
    const passwordInput = document.querySelector("#passwordInput");
    const passwordConfirm = document.querySelector("#passwordConfirm");
    const errorText = document.querySelector("#passwordMatchError");
    const saveBtn = document.querySelector("#passwordSaveBtn");

    // Validate
    if (toggle.checked) {
      if (!passwordInput.value || !passwordConfirm.value) {
        errorText.classList.remove("hidden");
        errorText.textContent = window.t?.("passwordRequired") || "Passwort erforderlich";
        return;
      }

      if (passwordInput.value !== passwordConfirm.value) {
        errorText.classList.remove("hidden");
        return;
      }
    }

    errorText.classList.add("hidden");
    const canRead = document.querySelector("#canRead")?.checked ?? true;
    const canWrite = document.querySelector("#canWrite")?.checked ?? true;

    // Save to server
    saveBtn.disabled = true;
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: toggle.checked ? passwordInput.value : null,
          canRead,
          canWrite
        })
      });

      if (!res.ok) {
        alert(window.t?.("saveFailed") || "Speichern fehlgeschlagen");
        return;
      }

      if (this.callbacks.onSave) {
        this.callbacks.onSave();
      }

      this.hasExistingPassword = toggle.checked;
      this.close();
    } catch (e) {
      console.error("Error saving password:", e);
      alert(window.t?.("error") || "Fehler");
    } finally {
      saveBtn.disabled = false;
    }
  }

  // Remove password
  async removePassword() {
    if (!confirm(window.t?.("removePasswordConfirm") || "Passwortschutz entfernen?")) {
      return;
    }

    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: null, canRead: true, canWrite: true })
      });

      if (!res.ok) {
        alert(window.t?.("removeFailed") || "Entfernen fehlgeschlagen");
        return;
      }

      if (this.callbacks.onRemove) {
        this.callbacks.onRemove();
      }

      this.hasExistingPassword = false;
      this.close();
    } catch (e) {
      console.error("Error removing password:", e);
    }
  }

  // Close dialog
  close() {
    const overlay = document.querySelector("#passwordDialogOverlay");
    const modal = document.querySelector("#passwordDialog");
    
    if (overlay) overlay.remove();
    if (modal) modal.remove();
    
    this.isOpen = false;
  }
}
