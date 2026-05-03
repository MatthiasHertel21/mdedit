/**
 * Collab Module - Real-time collaborative editing
 * Handles WebSocket connection, member presence, snapshots, and chat
 */

export class CollabManager {
  constructor(pasteId, sessionId) {
    this.pasteId = pasteId;
    this.sessionId = sessionId;
    this.socket = null;
    this.memberId = null;
    this.fantasyName = null;
    this.avatarColor = null;
    this.members = new Map();
    this.isConnected = false;
    this.eventListeners = new Map();
    this.snapshotQueue = [];
    this.lastSnapshotTime = 0;
  }

  // Register event listener
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  // Emit event
  emit(eventType, data) {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(cb => cb(data));
  }

  // Check if paste has password protection
  async checkPasswordProtection() {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/settings`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.hasPassword;
    } catch (e) {
      console.error("Error checking password protection:", e);
      return false;
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      return res.ok;
    } catch (e) {
      console.error("Error verifying password:", e);
      return false;
    }
  }

  // Join collab session
  async join(password = null) {
    try {
      // Verify password if needed
      const needsPassword = await this.checkPasswordProtection();
      if (needsPassword && password) {
        const verified = await this.verifyPassword(password);
        if (!verified) {
          this.emit("error", { message: "Invalid password" });
          return false;
        }
      }

      // Register member
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });

      if (!res.ok) {
        this.emit("error", { message: "Failed to join collaboration" });
        return false;
      }

      const { memberId, fantasyName, avatarColor } = await res.json();
      this.memberId = memberId;
      this.fantasyName = fantasyName;
      this.avatarColor = avatarColor;

      // Connect WebSocket
      this.connectWebSocket();
      return true;
    } catch (e) {
      console.error("Error joining collab:", e);
      this.emit("error", { message: e.message });
      return false;
    }
  }

  // Connect WebSocket
  connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/pastes/${this.pasteId}/collab/ws?memberId=${encodeURIComponent(this.memberId)}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnected = true;
      this.emit("connected", { memberId: this.memberId, fantasyName: this.fantasyName });

      // Load members
      this.loadMembers();
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.emit("error", { message: "Connection error" });
    };

    this.socket.onclose = () => {
      this.isConnected = false;
      this.emit("disconnected");
    };
  }

  // Handle incoming WebSocket message
  handleMessage(msg) {
    switch (msg.type) {
      case "member-joined":
        this.members.set(msg.memberId, {
          id: msg.memberId,
          fantasyName: msg.fantasyName,
          avatarColor: msg.avatarColor
        });
        this.emit("member-joined", msg);
        break;

      case "member-left":
        this.members.delete(msg.memberId);
        this.emit("member-left", msg);
        break;

      case "edit":
        this.emit("remote-edit", {
          content: msg.content,
          memberId: msg.memberId
        });
        break;

      case "cursor":
        this.emit("remote-cursor", {
          position: msg.position,
          memberId: msg.memberId
        });
        break;

      case "chat": {
        const member = this.members.get(msg.memberId);
        this.emit("chat-message", {
          threadId: msg.threadId,
          memberId: msg.memberId,
          memberName: msg.memberName || member?.fantasyName || member?.fantasy_name || "Anonymous",
          content: msg.content,
          timestamp: msg.timestamp
        });
        break;
      }

      case "chat-thread-created":
        this.emit("chat-thread-created", {
          threadId: msg.threadId,
          title: msg.title,
          timestamp: msg.timestamp
        });
        break;

      default:
        console.warn("Unknown message type:", msg.type);
    }
  }

  // Load current members
  async loadMembers() {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/members`);
      if (!res.ok) return;

      const { members } = await res.json();
      members.forEach(m => {
        this.members.set(m.id, {
          ...m,
          fantasyName: m.fantasyName || m.fantasy_name,
          avatarColor: m.avatarColor || m.avatar_color
        });
      });

      this.emit("members-loaded", { members: Array.from(this.members.values()) });
    } catch (e) {
      console.error("Error loading members:", e);
    }
  }

  // Send edit
  sendEdit(markdown) {
    if (!this.isConnected) return;
    
    this.socket.send(JSON.stringify({
      type: "edit",
      content: markdown
    }));

    // Queue snapshot
    const now = Date.now();
    if (now - this.lastSnapshotTime > 30000) {
      this.saveSnapshot(markdown);
      this.lastSnapshotTime = now;
    }
  }

  // Save snapshot
  async saveSnapshot(markdown) {
    try {
      // Snapshot is saved server-side via collab message
      // This is just tracking on client
      this.snapshotQueue.push({ markdown, timestamp: new Date() });
    } catch (e) {
      console.error("Error saving snapshot:", e);
    }
  }

  // Send cursor position
  sendCursor(position) {
    if (!this.isConnected) return;

    this.socket.send(JSON.stringify({
      type: "cursor",
      position
    }));
  }

  // Get snapshots
  async getSnapshots() {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/snapshots`);
      if (!res.ok) return [];

      const { snapshots } = await res.json();
      return snapshots;
    } catch (e) {
      console.error("Error loading snapshots:", e);
      return [];
    }
  }

  // Restore from snapshot
  async restoreSnapshot(snapshotId) {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId })
      });

      if (!res.ok) {
        this.emit("error", { message: "Failed to restore snapshot" });
        return false;
      }

      this.emit("snapshot-restored", { snapshotId });
      return true;
    } catch (e) {
      console.error("Error restoring snapshot:", e);
      return false;
    }
  }

  // Create chat thread
  async createChatThread(title) {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/chat/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });

      if (!res.ok) {
        this.emit("error", { message: "Failed to create thread" });
        return null;
      }

      const { threadId } = await res.json();
      return threadId;
    } catch (e) {
      console.error("Error creating chat thread:", e);
      return null;
    }
  }

  // Get chat threads
  async getChatThreads() {
    try {
      const res = await fetch(`/api/pastes/${this.pasteId}/collab/chat/threads`);
      if (!res.ok) return [];

      const { threads } = await res.json();
      return threads;
    } catch (e) {
      console.error("Error loading chat threads:", e);
      return [];
    }
  }

  // Get chat messages
  async getChatMessages(threadId) {
    try {
      const res = await fetch(
        `/api/pastes/${this.pasteId}/collab/chat/threads/${threadId}/messages`
      );
      if (!res.ok) return [];

      const { messages } = await res.json();
      return messages;
    } catch (e) {
      console.error("Error loading chat messages:", e);
      return [];
    }
  }

  // Send chat message
  async sendChatMessage(threadId, message) {
    try {
      const res = await fetch(
        `/api/pastes/${this.pasteId}/collab/chat/threads/${threadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: this.memberId,
            message
          })
        }
      );

      return res.ok;
    } catch (e) {
      console.error("Error sending chat message:", e);
      return false;
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.members.clear();
  }

  // Get all members (including self)
  getAllMembers() {
    const all = Array.from(this.members.values());
    if (this.memberId) {
      all.unshift({
        id: this.memberId,
        fantasyName: this.fantasyName,
        avatarColor: this.avatarColor,
        isMe: true
      });
    }
    return all;
  }
}
