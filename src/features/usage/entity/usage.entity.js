import crypto from "crypto";

export class Usage {
  constructor({
    id = crypto.randomUUID(),
    agentId,
    conversationId,
    visitorId = null,
    organizationId = null,
    networkIdentityHash = null,
    modelName = null,
    costUsd = 0,
    inputTokens = 0,
    outputTokens = 0,
    totalTokens = 0,
    responseTimeMs = 0,
    status = "SUCCESS",
    errorCode = null,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.agentId = agentId;
    this.conversationId = conversationId;
    this.visitorId = visitorId;
    this.organizationId = organizationId;
    this.networkIdentityHash = networkIdentityHash;
    this.modelName = modelName;
    this.costUsd = costUsd;
    this.inputTokens = inputTokens;
    this.outputTokens = outputTokens;
    this.totalTokens = totalTokens;
    this.responseTimeMs = responseTimeMs;
    this.status = status;
    this.errorCode = errorCode;
    this.createdAt = createdAt;
  }
}
