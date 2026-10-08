import { isHumanHandoverIntent } from "../../../conversation/service/message-intent.service.js";

export class HandleEvolutionWebhookUseCase {
  constructor({
    whatsappConnectionRepository,
    platformWhatsappConnectionRepository,
    conversationRepository = null,
    messageRepository = null,
    conversationService = null,
    whatsappProvider = null,
    agentRepository = null,
  }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;
    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.conversationService = conversationService;
    this.whatsappProvider = whatsappProvider;
    this.agentRepository = agentRepository;
  }

  async execute(payload) {
    const event = payload?.event;

    const instanceName =
      payload?.instance ||
      payload?.instanceName ||
      payload?.data?.instance ||
      payload?.data?.instanceName;

    if (!instanceName) {
      return {
        handled: false,
        reason: "INSTANCE_NAME_NOT_FOUND",
      };
    }

    let connectionType = "WORKSPACE";

    let connection =
      await this.platformWhatsappConnectionRepository.findByEvolutionInstanceName(
        instanceName,
      );

    if (connection) {
      connectionType = "PLATFORM";
    } else {
      connection =
        await this.whatsappConnectionRepository.findByEvolutionInstanceName(
          instanceName,
        );
    }

    if (!connection) {
      return {
        handled: false,
        reason: "WHATSAPP_CONNECTION_NOT_FOUND",
        instanceName,
      };
    }

    if (connection.provider !== "EVOLUTION") {
      return {
        handled: false,
        reason: "INVALID_WHATSAPP_PROVIDER",
      };
    }

    const normalizedEvent = String(event || "").toUpperCase();

    if (
      normalizedEvent === "CONNECTION_UPDATE" ||
      normalizedEvent === "CONNECTION.UPDATE"
    ) {
      return this.handleConnectionUpdate(
        connection,
        instanceName,
        payload,
        connectionType,
      );
    }

    if (
      normalizedEvent === "MESSAGES_UPSERT" ||
      normalizedEvent === "MESSAGE_UPSERT" ||
      normalizedEvent === "MESSAGES.UPSERT"
    ) {
      return this.handleMessagesUpsert(
        connection,
        instanceName,
        payload,
        connectionType,
      );
    }
    return {
      handled: false,
      reason: "EVENT_NOT_HANDLED",
      event,
      connectionType,
    };
  }

  async handleMessagesUpsert(
    connection,
    instanceName,
    payload,
    connectionType,
  ) {
    const data = payload?.data || payload;
    const messageObj = data?.message || data;
    const key = data?.key || messageObj?.key;

    if (!key || key.fromMe) {
      return { handled: true, reason: "IGNORED_OUTGOING_OR_NO_KEY" };
    }

    const remoteJid = key.remoteJid || "";
    if (remoteJid.includes("@g.us")) {
      return { handled: true, reason: "IGNORED_GROUP_CHAT" };
    }

    let rawPhone = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
    if (!rawPhone) {
      return { handled: false, reason: "PHONE_NUMBER_NOT_EXTRACTED" };
    }
    const phoneNumber = `+${rawPhone}`;

    const textContent =
      messageObj?.conversation ||
      messageObj?.extendedTextMessage?.text ||
      messageObj?.buttonsResponseMessage?.selectedButtonId ||
      messageObj?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      "";

    if (!textContent || !textContent.trim()) {
      return { handled: true, reason: "NO_TEXT_CONTENT" };
    }

    const userPrompt = textContent.trim();
    const visitorId = `wa_${rawPhone}`;
    const projectId = connection.projectId;
    const agentId = connection.agentId;

    if (!projectId || !this.conversationRepository) {
      return {
        handled: false,
        reason: "PROJECT_OR_CONVERSATION_REPO_NOT_CONFIGURED",
      };
    }

    let conversation = null;

    if (typeof this.conversationRepository.findAllByProject === "function") {
      const conversations =
        await this.conversationRepository.findAllByProject(projectId);
      conversation =
        conversations.find((c) => c.visitorId === visitorId) || null;
    }

    if (!conversation) {
      const { Conversation } =
        await import("../../../conversation/entity/conversation.entity.js");
      const newConv = new Conversation({
        visitorId,
        projectId,
        agentId,
        title: `WhatsApp: ${phoneNumber}`,
      });
      conversation = await this.conversationRepository.create(newConv);
    }

    const isHandoverTriggered = isHumanHandoverIntent(userPrompt);

    if (isHandoverTriggered && !conversation.isHandover) {
      if (this.conversationService?.toggleHandoverMode) {
        conversation = await this.conversationService.toggleHandoverMode({
          conversationId: conversation.id,
          isHandover: true,
        });
      } else {
        conversation.setHandoverMode(true);
        await this.conversationRepository.update(conversation);
      }

      if (
        this.whatsappProvider &&
        typeof this.whatsappProvider.sendMessage === "function"
      ) {
        await this.whatsappProvider.sendMessage(
          connection,
          phoneNumber,
          "A human support agent has been notified and will respond to your chat shortly.",
        );
      }

      return {
        handled: true,
        reason: "HANDOVER_TRIGGERED",
        conversationId: conversation.id,
        phoneNumber,
      };
    }

    if (conversation.isHandover) {
      console.log(
        "[WHATSAPP HANDOVER MODE ACTIVE] Skipping AI bot response for:",
        phoneNumber,
      );
      return {
        handled: true,
        reason: "HANDOVER_MODE_ACTIVE_SKIPPED_AI",
        conversationId: conversation.id,
        phoneNumber,
      };
    }

    if (this.conversationService) {
      try {
        const aiResponse = await this.conversationService.sendMessagePublic({
          conversationId: conversation.id,
          content: userPrompt,
          agentId,
          projectId,
        });

        const replyText =
          aiResponse?.reply || aiResponse?.message?.content || "";

        if (
          replyText &&
          this.whatsappProvider &&
          typeof this.whatsappProvider.sendMessage === "function"
        ) {
          await this.whatsappProvider.sendMessage(
            connection,
            phoneNumber,
            replyText,
          );
        }

        return {
          handled: true,
          conversationId: conversation.id,
          reply: replyText,
        };
      } catch (err) {
        console.error("[WHATSAPP AI BOT ERROR]:", err.message);
        return {
          handled: false,
          error: err.message,
        };
      }
    }

    return { handled: true, reason: "CONVERSATION_SERVICE_NOT_INJECTED" };
  }

  async handleConnectionUpdate(
    connection,
    instanceName,
    payload,
    connectionType,
  ) {
    const state =
      payload?.data?.state ||
      payload?.data?.status ||
      payload?.state ||
      payload?.status;

    const normalizedState = String(state || "").toLowerCase();

    const updates = {};

    if (normalizedState === "open") {
      updates.status = "CONNECTED";
      updates.lastConnectedAt = new Date();

      let phoneNumber =
        payload?.data?.wuid ||
        payload?.data?.ownerJid ||
        payload?.data?.wid?.user ||
        payload?.wuid ||
        payload?.ownerJid ||
        payload?.wid?.user ||
        payload?.data?.phoneNumber ||
        payload?.data?.number ||
        payload?.phoneNumber ||
        payload?.number;

      if (phoneNumber) {
        phoneNumber = String(phoneNumber)
          .replace("@s.whatsapp.net", "")
          .replace(/\D/g, "");

        if (phoneNumber) {
          updates.phoneNumber = phoneNumber;
        }
      }

      console.log("[PLATFORM WHATSAPP CONNECTION OPEN]", {
        instanceName,
        connectionId: connection.id,
        connectionType,
        phoneNumber: updates.phoneNumber ?? null,
        status: updates.status,
      });
    }

    if (normalizedState === "connecting") {
      if (connection.status !== "CONNECTED") {
        updates.status = "CONNECTING";
      }

      console.log("[PLATFORM WHATSAPP CONNECTION CONNECTING]", {
        instanceName,
        connectionId: connection.id,
        connectionType,
        currentStatus: connection.status,
        resultingStatus:
          connection.status === "CONNECTED" ? "CONNECTED" : "CONNECTING",
      });
    }

    if (
      normalizedState === "close" ||
      normalizedState === "closed" ||
      normalizedState === "disconnected"
    ) {
      updates.status = "DISCONNECTED";

      console.log("[PLATFORM WHATSAPP CONNECTION DISCONNECTED]", {
        instanceName,
        connectionId: connection.id,
        connectionType,
      });
    }

    if (Object.keys(updates).length === 0) {
      return {
        handled: true,
        reason: "NO_CONNECTION_STATE_CHANGE",
        state,
        connectionType,
      };
    }

    const repository =
      connectionType === "PLATFORM"
        ? this.platformWhatsappConnectionRepository
        : this.whatsappConnectionRepository;

    console.log("[EVOLUTION CONNECTION UPDATE]", {
      connectionId: connection.id,
      instanceName,
      connectionType,
      state,
      normalizedState,
      updates,
    });

    const updatedConnection = await repository.update(connection.id, updates);

    console.log("[EVOLUTION CONNECTION UPDATED]", {
      connectionId: updatedConnection?.id,
      status: updatedConnection?.status,
      phoneNumber: updatedConnection?.phoneNumber,
      lastConnectedAt: updatedConnection?.lastConnectedAt,
    });

    return {
      handled: true,
      connectionType,
      connection: updatedConnection,
    };
  }
}
