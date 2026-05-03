/**
 * Presence Module - Display and manage presence avatars
 */

export class PresenceManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.members = new Map();
    this.maxVisible = 5;
  }

  // Update members list
  updateMembers(members) {
    this.members.clear();
    members.forEach(m => this.members.set(m.id, m));
    this.render();
  }

  // Add member
  addMember(member) {
    this.members.set(member.id, member);
    this.render();
  }

  // Remove member
  removeMember(memberId) {
    this.members.delete(memberId);
    this.render();
  }

  // Render avatars
  render() {
    if (!this.container) return;

    this.container.innerHTML = "";

    const memberArray = Array.from(this.members.values());
    const visibleMembers = memberArray.slice(0, this.maxVisible);
    const hiddenCount = Math.max(0, memberArray.length - this.maxVisible);

    visibleMembers.forEach(member => {
      const avatar = this.createAvatar(member);
      this.container.appendChild(avatar);
    });

    if (hiddenCount > 0) {
      const moreButton = this.createMoreButton(hiddenCount);
      this.container.appendChild(moreButton);
    }
  }

  // Create avatar element
  createAvatar(member) {
    const div = document.createElement("div");
    div.className = "presence-avatar";
    div.title = member.fantasyName;
    div.style.backgroundColor = member.avatarColor;
    div.innerHTML = `<span>${member.fantasyName.charAt(0).toUpperCase()}</span>`;
    
    // Click to jump to member's cursor position
    div.addEventListener("click", () => {
      this.emit("avatar-click", { memberId: member.id });
    });

    return div;
  }

  // Create "more" button
  createMoreButton(count) {
    const div = document.createElement("div");
    div.className = "presence-more";
    div.title = `+${count} weitere Nutzer`;
    div.innerHTML = `<span>+${count}</span>`;
    return div;
  }

  // Emit event (for integration with parent)
  emit(eventType, data) {
    const event = new CustomEvent("presence:" + eventType, { detail: data });
    this.container?.dispatchEvent(event);
  }
}
