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

    console.log("[PUBLIC CHAT ABUSE]", {
      organizationId: agent.organizationId,
      visitorId: req.visitorId,
      ip: req.headers["x-forwarded-for"] || req.ip,
      ipHash,
    });

    const result = await checkPublicChatAbuseUseCase.execute({
      organizationId: agent.organizationId,
      visitorId: req.visitorId ?? null,
      ipHash,
    });

    console.log("[PUBLIC CHAT ABUSE RESULT]", result);
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
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    }),

    streamPublicChat: asyncHandler(async (req, res) => {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== "string") {
        throw new ValidationError("Message is required.");
      }

      await checkAbuse(req);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (res.flushHeaders) {
        res.flushHeaders();
      }

      try {
        res.write(": connected\n\n");

        if (res.flush) {
          res.flush();
        }

        const stream = conversationService.streamPublicMessage(
          req.params.publicKey,
          message.trim(),
          req.visitorId ?? null,
          conversationId ?? null,
        );

        for await (const event of stream) {
          if (event.type === "conversation") {
            writeEvent(res, "conversation", {
              conversationId: event.conversationId,
            });

            continue;
          }

          if (event.type === "token") {
            writeEvent(res, "token", {
              content: event.content,
            });

            continue;
          }

          if (event.type === "sources") {
            writeEvent(res, "sources", {
              sources: event.sources ?? [],
            });

            continue;
          }

          if (event.type === "usage_limit") {
            writeEvent(res, "usage_limit", {
              usage: event.usage,
            });

            continue;
          }

          if (event.type === "tool_call") {
            writeEvent(res, "tool_call", {
              toolName: event.toolName,
            });

            continue;
          }

          if (event.type === "tool_result") {
            writeEvent(res, "tool_result", {
              toolName: event.toolName,
              content: event.content,
            });

            continue;
          }

          if (event.type === "done") {
            writeEvent(res, "done", {});

            continue;
          }
        }
      } catch (error) {
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

        writeEvent(res, "error", {
          message,
        });
      } finally {
        res.end();
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
  };
};
