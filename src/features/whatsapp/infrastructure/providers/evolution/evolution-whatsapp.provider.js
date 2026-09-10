import { AppError } from "../../../../../common/errors/AppError.js";

export class EvolutionWhatsappProvider {
  constructor({ evolutionApiClient }) {
    this.evolutionApiClient = evolutionApiClient;
  }

  async createInstance({ instanceName, webhookUrl }) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    return this.evolutionApiClient.createInstance({
      instanceName,
      webhookUrl,
    });
  }

  async fetchInstances() {
    return this.evolutionApiClient.fetchInstances();
  }

  async getConnectionState(instanceName) {
    return this.evolutionApiClient.getConnectionState(instanceName);
  }

  async getQrCode(instanceName) {
    return this.evolutionApiClient.getQrCode(instanceName);
  }

  async sendText({ instanceName, number, text }) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    if (!number) {
      throw new AppError(
        "WhatsApp recipient number is required.",
        400,
        "WHATSAPP_RECIPIENT_NUMBER_REQUIRED",
      );
    }

    if (!text) {
      throw new AppError(
        "WhatsApp message text is required.",
        400,
        "WHATSAPP_MESSAGE_TEXT_REQUIRED",
      );
    }

    return this.evolutionApiClient.sendText({
      instanceName,
      number,
      text,
    });
  }

  async sendMedia({
    instanceName,
    number,
    media,
    mediatype = "document",
    mimetype = "application/pdf",
    fileName,
    caption,
  }) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    if (!number) {
      throw new AppError(
        "WhatsApp recipient number is required.",
        400,
        "WHATSAPP_RECIPIENT_NUMBER_REQUIRED",
      );
    }

    return this.evolutionApiClient.sendMedia({
      instanceName,
      number,
      media,
      mediatype,
      mimetype,
      fileName,
      caption,
    });
  }

  async logout(instanceName) {
    return this.evolutionApiClient.logoutInstance(instanceName);
  }

  async deleteInstance(instanceName) {
    return this.evolutionApiClient.deleteInstance(instanceName);
  }
}
