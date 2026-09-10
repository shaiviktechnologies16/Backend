import { AppError } from "../../../../common/errors/AppError.js";
import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const REQUEST_TIMEOUT_MS = 10000;
const MAX_RESPONSE_SIZE = 1024 * 1024;

function isPrivateIPv4(address) {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIPv6(address) {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateAddress(address) {
  const version = net.isIP(address);

  if (version === 4) {
    return isPrivateIPv4(address);
  }

  if (version === 6) {
    return isPrivateIPv6(address);
  }

  return false;
}

async function validateUrl(targetUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new AppError(
      "Agent tool URL is invalid.",
      400,
      "AGENT_TOOL_URL_INVALID",
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AppError(
      "Agent tool URL must use HTTP or HTTPS.",
      400,
      "AGENT_TOOL_URL_PROTOCOL_INVALID",
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "metadata.google.internal" ||
    hostname === "metadata.google" ||
    hostname === "169.254.169.254"
  ) {
    throw new AppError(
      "Agent tool URL targets a restricted host.",
      403,
      "AGENT_TOOL_URL_BLOCKED",
    );
  }

  if (net.isIP(hostname) && isPrivateAddress(hostname)) {
    throw new AppError(
      "Agent tool URL targets a private or restricted IP address.",
      403,
      "AGENT_TOOL_URL_BLOCKED",
    );
  }

  if (!net.isIP(hostname)) {
    let addresses;

    try {
      addresses = await dns.lookup(hostname, {
        all: true,
      });
    } catch {
      throw new AppError(
        "Unable to resolve agent tool host.",
        502,
        "AGENT_TOOL_HOST_RESOLUTION_FAILED",
      );
    }

    for (const { address } of addresses) {
      if (isPrivateAddress(address)) {
        throw new AppError(
          "Agent tool URL resolves to a private or restricted IP address.",
          403,
          "AGENT_TOOL_URL_BLOCKED",
        );
      }
    }
  }

  return parsedUrl;
}

async function readResponseBody(response) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  const chunks = [];
  let totalSize = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    totalSize += value.byteLength;

    if (totalSize > MAX_RESPONSE_SIZE) {
      await reader.cancel();

      throw new AppError(
        "Agent tool response is too large.",
        502,
        "AGENT_TOOL_RESPONSE_TOO_LARGE",
      );
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(totalSize);

  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return decoder.decode(combined);
}

function resolveCredentialHeaders(headers, credential) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      typeof value === "string"
        ? value.replaceAll("{{credential}}", credential)
        : value,
    ]),
  );
}

export class AgentToolExecutorService {
  constructor({
    workspaceApiKeyRepository,
    encryptionService,
    captureLeadUseCase,
  }) {
    this.workspaceApiKeyRepository = workspaceApiKeyRepository;
    this.encryptionService = encryptionService;
    this.captureLeadUseCase = captureLeadUseCase;
  }

  async execute(tool, arguments_ = {}, context = {}) {
    console.log("[TOOL EXECUTOR INPUT]", {
      toolName: tool?.name,
      toolType: tool?.type,
      configuration: tool?.configuration,
      arguments_,
      argumentsType: typeof arguments_,
      context,
    });
    if (tool.type !== "HTTP") {
      throw new AppError(
        `Unsupported agent tool type: ${tool.type}`,
        400,
        "UNSUPPORTED_AGENT_TOOL_TYPE",
      );
    }

    const configuration = tool.configuration ?? {};

    const parameters = {
      ...(configuration.parameters?.properties
        ? Object.fromEntries(
            Object.keys(configuration.parameters.properties).map((key) => [
              key,
              arguments_[key],
            ]),
          )
        : {}),
    };

    if (configuration.action === "CAPTURE_LEAD") {
      console.log("CAPTURE_LEAD TOOL EXECUTION", {
        context,
        parameters,
      });

      const lead = await this.captureLeadUseCase.execute({
        agentId: context.agentId,
        conversationId: context.conversationId ?? null,
        visitorId: context.visitorId ?? null,
        name: parameters.name ?? null,
        phone: parameters.phone ?? null,
        email: parameters.email ?? null,
        requirement: parameters.requirement ?? null,
        source: parameters.source ?? "AI_AGENT",
        status: parameters.status ?? "NEW",
        metadata: parameters.metadata ?? {},
      });

      console.log("CAPTURE_LEAD RESULT", lead);

      return lead;
    }

    const method = (configuration.method ?? "GET").toUpperCase();

    if (!ALLOWED_METHODS.has(method)) {
      throw new AppError(
        `HTTP method "${method}" is not allowed.`,
        400,
        "AGENT_TOOL_METHOD_NOT_ALLOWED",
      );
    }

    const url = configuration.url;

    if (!url) {
      throw new AppError(
        "Agent tool URL is required.",
        400,
        "AGENT_TOOL_URL_REQUIRED",
      );
    }

    await validateUrl(url);

    let headers = configuration.headers ?? {};

    if (tool.credentialId) {
      const credential = await this.workspaceApiKeyRepository.findById(
        tool.credentialId,
      );

      if (!credential) {
        throw new AppError(
          "Workspace API key not found.",
          404,
          "API_KEY_NOT_FOUND",
        );
      }

      let decryptedCredential;

      try {
        decryptedCredential = this.encryptionService.decrypt(
          credential.encryptedValue,
        );
      } catch {
        throw new AppError(
          "Unable to decrypt workspace API key.",
          500,
          "API_KEY_DECRYPTION_FAILED",
        );
      }

      headers = resolveCredentialHeaders(headers, decryptedCredential);
    }

    let requestUrl = url;

    const requestOptions = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    if (method === "GET" || method === "DELETE") {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(parameters)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }

      const query = searchParams.toString();

      if (query) {
        requestUrl += `${requestUrl.includes("?") ? "&" : "?"}${query}`;
      }
    } else {
      requestOptions.body = JSON.stringify(parameters);
    }

    let response;

    try {
      response = await fetch(requestUrl, requestOptions);
    } catch (error) {
      if (error?.name === "TimeoutError") {
        throw new AppError(
          "Agent tool request timed out.",
          504,
          "AGENT_TOOL_REQUEST_TIMEOUT",
        );
      }

      throw new AppError(
        "Unable to connect to agent tool.",
        502,
        "AGENT_TOOL_REQUEST_FAILED",
      );
    }

    if (!response.ok) {
      throw new AppError(
        `Agent tool returned status ${response.status}.`,
        502,
        "AGENT_TOOL_RESPONSE_ERROR",
      );
    }

    const responseBody = await readResponseBody(response);

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        return responseBody ? JSON.parse(responseBody) : null;
      } catch {
        throw new AppError(
          "Agent tool returned invalid JSON.",
          502,
          "AGENT_TOOL_INVALID_JSON",
        );
      }
    }

    return responseBody;
  }
}
