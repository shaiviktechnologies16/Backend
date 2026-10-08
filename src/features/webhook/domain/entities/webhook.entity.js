export class Webhook {
  constructor({
    id = null,
    organizationId,
    url,
    secret,
    events = ["lead.created", "conversation.ended", "handover.requested"],
    isActive = true,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.url = url;
    this.secret = secret;
    this.events = Array.isArray(events) ? events : [];
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
