import axios from "axios";
import envConfig from "../../../../../config/env.config.js";

export class EvolutionApiClient {
  constructor() {
    console.log("[EVOLUTION CONFIG]", {
      baseUrl: envConfig.evolution.baseUrl,
      hasApiKey: Boolean(envConfig.evolution.apiKey),
      apiKeyLength: envConfig.evolution.apiKey?.length,
    });
    this.client = axios.create({
      baseURL: envConfig.evolution.baseUrl,
      headers: {
        apikey: envConfig.evolution.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  async createInstance({ instanceName, webhookUrl = null }) {
    try {
      const response = await this.client.post("/instance/create", {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: webhookUrl
          ? {
              url: webhookUrl,
              byEvents: false,
              base64: false,
              events: [
                "QRCODE_UPDATED",
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
              ],
            }
          : undefined,
      });

      return response.data;
    } catch (error) {
      console.error("[EVOLUTION CREATE INSTANCE ERROR]", {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        hasApiKey: Boolean(error.config?.headers?.apikey),
      });

      throw error;
    }
  }

  async fetchInstances() {
    const response = await this.client.get("/instance/fetchInstances");
    return response.data;
  }

  async fetchInstance(instanceName) {
    const response = await this.client.get(
      `/instance/fetchInstances?instanceName=${encodeURIComponent(
        instanceName,
      )}`,
    );

    return response.data;
  }

  async getConnectionState(instanceName) {
    const response = await this.client.get(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );

    return response.data;
  }

  async getQrCode(instanceName) {
    if (!instanceName) {
      throw new Error("Evolution instance name is required.");
    }

    const response = await this.client.get(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );

    return response.data;
  }

  async sendText({ instanceName, number, text }) {
    try {
      const response = await this.client.post(
        `/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          number,
          text,
        },
      );

      return response.data;
    } catch (error) {
      console.error(
        "[EVOLUTION SEND TEXT ERROR]",
        JSON.stringify(
          {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method,
            requestBody: error.config?.data,
          },
          null,
          2,
        ),
      );

      throw error;
    }
  }

  async sendMedia({
    instanceName,
    number,
    media,
    mediatype = "document",
    mimetype = "application/pdf",
    fileName = "Invoice.pdf",
    caption = "",
  }) {
    try {
      const response = await this.client.post(
        `/message/sendMedia/${encodeURIComponent(instanceName)}`,
        {
          number,
          mediatype,
          mimetype,
          media,
          fileName,
          caption,
        },
      );

      return response.data;
    } catch (error) {
      console.error(
        "[EVOLUTION SEND MEDIA ERROR]",
        JSON.stringify(
          {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method,
          },
          null,
          2,
        ),
      );

      throw error;
    }
  }

  async setWebhook(instanceName, webhookUrl) {
    const response = await this.client.post(
      `/webhook/set/${encodeURIComponent(instanceName)}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: [
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
          ],
        },
      },
    );

    return response.data;
  }

  async getWebhook(instanceName) {
    const response = await this.client.get(
      `/webhook/find/${encodeURIComponent(instanceName)}`,
    );

    return response.data;
  }

  async logoutInstance(instanceName) {
    const response = await this.client.delete(
      `/instance/logout/${encodeURIComponent(instanceName)}`,
    );

    return response.data;
  }

  async deleteInstance(instanceName) {
    const response = await this.client.delete(
      `/instance/delete/${encodeURIComponent(instanceName)}`,
    );

    return response.data;
  }
}
