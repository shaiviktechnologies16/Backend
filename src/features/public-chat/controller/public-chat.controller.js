import { createHash } from "crypto";

import { asyncHandler } from "../../../common/utils/asyncHandler.js";
import { conversationService } from "../../../container/services.js";
import { ValidationError } from "../../../common/errors/ValidationError.js";
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
}) => {
  const checkAbuse = async (req) => {
    const agent = await publicAgentConfigUseCase.execute(req.params.publicKey);

    const ipHash = getClientIpHash(req);

    const result = await checkPublicChatAbuseUseCase.execute({
      organizationId: agent.organizationId,
      visitorId: req.visitorId ?? null,
      ipHash,
    });
  };

  return {
    publicChat: asyncHandler(async (req, res) => {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== "string") {
        throw new ValidationError("Message is required.");
      }

      await checkAbuse(req);

      const result = await conversationService.sendPublicMessage(
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

      const { message, conversationId } = req.body;

      if (!message || typeof message !== "string") {
        throw new ValidationError("Message is required.");
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

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

        const stream = conversationService.streamPublicMessage(
          req.params.publicKey,
          message.trim(),
          req.visitorId ?? null,
          conversationId ?? null,
          req.networkIdentityHash ?? null,
          { signal: abortController.signal, requestId },
        );

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

        Logger.error("Public streaming failed", error);

        let message = "Public agent request failed.";

        if (error instanceof Error) {
          message = error.message;
        } else if (typeof error === "string") {
          message = error;
        } else if (error && typeof error === "object") {
          message =
            typeof error.message === "string"
              ? error.message
              : typeof error.error === "string"
                ? error.error
                : "Public agent request failed.";
        }

        if (!res.writableEnded) {
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

      res.status(200).json({
        success: true,
        data: config,
      });
    }),

    getPublicAgentConfigByAgentId: asyncHandler(async (req, res) => {
      const config = await publicAgentConfigUseCase.executeByAgentId(
        req.params.agentId,
      );

      res.status(200).json({
        success: true,
        data: config,
      });
    }),

    getPublicActiveConversation: asyncHandler(async (req, res) => {
      const { publicKey } = req.params;
      const result = await conversationService.getPublicActiveConversation(
        publicKey,
        req.visitorId ?? null,
        req.networkIdentityHash ?? null,
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    }),

    getPublicConversationMessages: asyncHandler(async (req, res) => {
      const { publicKey, conversationId } = req.params;
      const result = await conversationService.getPublicConversationMessages(
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
};
