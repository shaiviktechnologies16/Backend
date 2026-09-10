export class HandleEvolutionWebhookUseCase {
  constructor({
    whatsappConnectionRepository,
    platformWhatsappConnectionRepository,
  }) {
    this.whatsappConnectionRepository = whatsappConnectionRepository;
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;
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
      normalizedEvent === "MESSAGE_UPSERT"
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
