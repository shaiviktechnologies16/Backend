import { createHash } from "crypto";

import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { ValidationError } from "../../../common/errors/ValidationError.js";
import { ProviderError } from "../../../common/errors/ProviderError.js";
import { writeEvent } from "../../../common/utils/sse.js";
import { Logger } from "../../../common/utils/logger.js";

const getClientIpHash = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  const ipAddress =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.ip || req.socket?.remoteAddress || "unknown";

  const userAgent = req.headers["user-agent"] || "unknown-agent";

  const hybridClientIdentifier = `${ipAddress}|${userAgent}`;

  return createHash("sha256").update(hybridClientIdentifier).digest("hex");
};

export const createPublicChatController = ({
  publicAgentConfigUseCase,
  checkPublicChatAbuseUseCase,
  conversationService: injectedConvService = null,
  publicChatStreamUseCase = null,
}) => {
  let convService = injectedConvService;

  const getConversationService = async () => {
    if (convService) return convService;
    if (controller?.conversationService) return controller.conversationService;
    const services = await import("../../../container/services.js");
    return services.conversationService;
  };

  const checkAbuse = async (req) => {
    if (!publicAgentConfigUseCase || !checkPublicChatAbuseUseCase) {
      return;
    }

    const agent = await publicAgentConfigUseCase.execute(req.params.publicKey);

    const ipHash = getClientIpHash(req);

    await checkPublicChatAbuseUseCase.execute({
      organizationId: agent.organizationId,
      visitorId: req.visitorId ?? null,
      ipHash,
    });
  };

  const controller = {
    conversationService: injectedConvService,

    publicChat: asyncHandler(async (req, res) => {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== "string") {
        throw new ValidationError("Message is required.");
      }

      await checkAbuse(req);

      const service = await getConversationService();
      const result = await service.sendPublicMessage(
        req.params.publicKey,
        message.trim(),
        req.visitorId ?? null,
        conversationId ?? null,
        req.networkIdentityHash ?? null,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    }),

    streamPublicChat: asyncHandler(async (req, res) => {
      const requestId = createHash("md5")
        .update(`${Date.now()}-${Math.random()}`)
        .digest("hex")
        .substring(0, 12);
      req.requestId = requestId;

      const { message, conversationId, clientMessageId } = req.body;

      if (!message || typeof message !== "string") {
        throw new ValidationError("Message is required.");
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      if (res.flushHeaders) {
        res.flushHeaders();
      }

      const abortController = new AbortController();

      res.on("close", () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
      });

      res.write(": connected\n\n");

      if (res.flush) {
        res.flush();
      }

      try {
        await checkAbuse(req);

        let stream;
        if (publicChatStreamUseCase?.execute) {
          stream = publicChatStreamUseCase.execute({
            publicKey: req.params.publicKey,
            message: message.trim(),
            visitorId: req.visitorId ?? null,
            conversationId: conversationId ?? null,
            networkIdentityHash: req.networkIdentityHash ?? null,
            options: {
              signal: abortController.signal,
              requestId,
              clientMessageId: clientMessageId || null,
            },
          });
        } else {
          const service = await getConversationService();
          stream = service.streamPublicMessage(
            req.params.publicKey,
            message.trim(),
            req.visitorId ?? null,
            conversationId ?? null,
            req.networkIdentityHash ?? null,
            {
              signal: abortController.signal,
              requestId,
              clientMessageId: clientMessageId || null,
            },
          );
        }

        for await (const event of stream) {
          if (
            res.writableEnded ||
            abortController.signal.aborted ||
            res.socket?.destroyed
          ) {
            break;
          }

          if (event.type === "conversation") {
            writeEvent(res, "conversation", {
              conversationId: event.conversationId,
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "token") {
            writeEvent(res, "token", {
              content: event.content,
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "sources") {
            writeEvent(res, "sources", {
              sources: event.sources ?? [],
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "usage_limit") {
            writeEvent(res, "usage_limit", {
              usage: event.usage,
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "tool_call") {
            writeEvent(res, "tool_call", {
              toolName: event.toolName,
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "tool_result") {
            writeEvent(res, "tool_result", {
              toolName: event.toolName,
              content: event.content,
            });

            if (res.flush) res.flush();
            continue;
          }

          if (event.type === "done") {
            writeEvent(res, "done", {});

            if (res.flush) res.flush();
            continue;
          }
        }
      } catch (error) {
        if (error.name === "AbortError" || abortController.signal.aborted) {
          return;
        }

        Logger.error("Public streaming failed", {
          message: error?.message,
          name: error?.name,
          statusCode: error?.statusCode,
          errorCode: error?.errorCode,
          provider: error?.provider,
          model: error?.model,
          upstreamStatus: error?.upstreamStatus,
          isTransient: error?.isTransient,
          cause: error?.cause?.message || error?.cause,
          stack: error?.stack,
        });

        let message = "Public agent request failed.";

        if (
          error?.errorCode === "DAILY_LIMIT_REACHED" ||
          error?.statusCode === 429
        ) {
          message = error.message || "Daily message limit reached.";
        } else if (
          error?.errorCode === "PUBLIC_AGENT_NOT_FOUND" ||
          error?.statusCode === 404
        ) {
          message = "Agent not found, please contact administration.";
        } else if (
          error?.errorCode === "AGENT_NOT_PUBLIC" ||
          error?.statusCode === 403
        ) {
          message = "This agent is not publicly accessible.";
        } else if (
          error instanceof ProviderError ||
          error?.status === 500 ||
          error?.status === 502 ||
          error?.status === 503 ||
          error?.status === 504 ||
          error?.status === 520 ||
          error?.status === 524 ||
          error?.status === 530 ||
          error?.statusCode === 500 ||
          error?.statusCode === 502 ||
          error?.statusCode === 503 ||
          error?.statusCode === 504 ||
          error?.statusCode === 520 ||
          error?.statusCode === 524 ||
          error?.statusCode === 530 ||
          error?.upstreamStatus === 500 ||
          error?.upstreamStatus === 502 ||
          error?.upstreamStatus === 503 ||
          error?.upstreamStatus === 504 ||
          error?.upstreamStatus === 520 ||
          error?.upstreamStatus === 524 ||
          error?.upstreamStatus === 530 ||
          error?.errorCode === "PROVIDER_ERROR" ||
          (typeof error?.statusCode === "number" && error.statusCode >= 500 && !error?.isOperational) ||
          (typeof error?.status === "number" && error.status >= 500 && !error?.isOperational) ||
          /500|502|503|504|520|524|530|status\s*5\d\d|bad\s*gateway|service\s*(temporarily\s*)?unavailable|gateway\s*timeout|internal\s*server\s*error|cloudflare|dns|timeout|econnreset|fetch\s*failed/i.test(
            error?.message || "",
          )
        ) {
          message =
            "The AI service is temporarily unavailable. Please try again shortly.";
        } else if (error instanceof Error && error.message) {
          if (
            /500|502|503|504|520|524|530|status\s*5\d\d|internal\s*server\s*error|bad\s*gateway/i.test(
              error.message,
            )
          ) {
            message =
              "The AI service is temporarily unavailable. Please try again shortly.";
          } else {
            message = error.message;
          }
        } else if (typeof error === "string") {
          if (
            /500|502|503|504|520|524|530|status\s*5\d\d|internal\s*server\s*error|bad\s*gateway/i.test(
              error,
            )
          ) {
            message =
              "The AI service is temporarily unavailable. Please try again shortly.";
          } else {
            message = error;
          }
        }

        if (!res.writableEnded) {
          if (error?.usage) {
            writeEvent(res, "usage_limit", {
              usage: error.usage,
            });
            if (res.flush) res.flush();
          }

          writeEvent(res, "error", {
            message,
          });
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    }),

    getPublicAgentConfig: asyncHandler(async (req, res) => {
      const config = await publicAgentConfigUseCase.execute(
        req.params.publicKey,
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      );
      res.status(200).json({
        success: true,
        data: config,
      });
    }),

    getPublicAgentConfigByAgentId: asyncHandler(async (req, res) => {
      const config = await publicAgentConfigUseCase.executeByAgentId(
        req.params.agentId,
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      );
      res.status(200).json({
        success: true,
        data: config,
      });
    }),

    getPublicActiveConversation: asyncHandler(async (req, res) => {
      const { publicKey } = req.params;
      const conversationId =
        req.query.conversationId || req.headers["x-conversation-id"] || null;
      const service = await getConversationService();
      const result = await service.getPublicActiveConversation(
        publicKey,
        req.visitorId ?? null,
        req.networkIdentityHash ?? null,
        conversationId,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    }),

    getPublicConversationMessages: asyncHandler(async (req, res) => {
      const { publicKey, conversationId } = req.params;
      const service = await getConversationService();
      const result = await service.getPublicConversationMessages(
        publicKey,
        conversationId,
        req.visitorId ?? null,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    }),
  };

  return controller;
};
