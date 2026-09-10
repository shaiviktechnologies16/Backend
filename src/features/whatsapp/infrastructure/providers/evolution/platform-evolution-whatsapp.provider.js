import { AppError } from "../../../../../common/errors/AppError.js";

export class PlatformEvolutionWhatsappProvider {
  constructor({ evolutionApiClient }) {
    this.evolutionApiClient = evolutionApiClient;
  }

  async createInstance({ instanceName, webhookUrl = null }) {
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

  async fetchInstance(instanceName) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    return this.evolutionApiClient.fetchInstance(instanceName);
  }

  async getQrCode(instanceName) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    return this.evolutionApiClient.getQrCode(instanceName);
  }

  async getConnectionState(instanceName) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    return this.evolutionApiClient.getConnectionState(instanceName);
  }

  async setWebhook(instanceName, webhookUrl) {
    if (!instanceName) {
      throw new AppError(
        "Evolution instance name is required.",
        400,
        "EVOLUTION_INSTANCE_NAME_REQUIRED",
      );
    }

    if (!webhookUrl) {
      throw new AppError(
        "Evolution webhook URL is required.",
        400,
        "EVOLUTION_WEBHOOK_URL_REQUIRED",
      );
    }

    return this.evolutionApiClient.setWebhook(instanceName, webhookUrl);
  }

  async getWebhook(instanceName) {
    return this.evolutionApiClient.getWebhook(instanceName);
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

  async logout(instanceName) {
    return this.evolutionApiClient.logoutInstance(instanceName);
  }

  async deleteInstance(instanceName) {
    return this.evolutionApiClient.deleteInstance(instanceName);
  }
}
