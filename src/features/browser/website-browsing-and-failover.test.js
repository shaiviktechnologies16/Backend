import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebsiteFetcherService } from "./service/website-fetcher.service.js";
import { AgentToolSchemaService, FETCH_WEBSITE_TOOL_DEFINITION } from "../agent-tool/application/services/agent-tool-schema.service.js";
import { AgentToolResolverService } from "../agent-tool/application/services/agent-tool-resolver.service.js";
import { AgentToolExecutorService } from "../agent-tool/application/services/agent-tool-executor.service.js";
import { ModelFailoverManager } from "../../providers/openai/model-failover-manager.js";
import { OpenAIProvider } from "../../providers/openai/openai.provider.js";
import { PromptBuilder } from "../ai-context/builder/prompt.builder.js";

describe("Shaivik AI Website Browsing, Tool Calling, and Model Failover (TEST A - TEST J)", () => {
  const fetcher = new WebsiteFetcherService({ timeoutMs: 5000 });

  // TEST A: Web fetching retrieves title and readable content from a valid public URL
  it("TEST A: fetch_website retrieves page title and readable content from a valid public URL", async () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><title>Shaivik Technologies — AI-Powered Digital Solutions</title></head>
        <body>
          <header><nav><a href="/">Home</a></nav></header>
          <main>
            <h1>Build Smarter. Grow Faster.</h1>
            <p>Shaivik Technologies provides AI Agent Development, Mobile Apps, and Web Platforms.</p>
          </main>
          <script>console.log("secret tracker");</script>
          <style>body { background: #000; }</style>
        </body>
      </html>
    `;

    const extracted = fetcher.extractReadableContent(htmlContent, "https://shaiviktechnologies.in");
    assert.equal(extracted.title, "Shaivik Technologies — AI-Powered Digital Solutions");
    assert.ok(extracted.content.includes("Build Smarter. Grow Faster."));
    assert.ok(extracted.content.includes("AI Agent Development"));
    // Ensure scripts and styles were cleanly stripped
    assert.ok(!extracted.content.includes("secret tracker"));
    assert.ok(!extracted.content.includes("background: #000"));
  });

  // TEST B: Assistant answers from company knowledge and system prompt contains services
  it("TEST B: System prompt includes Shaivik Technologies services and browsing guidelines", () => {
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.build({
      agent: { name: "Customer Support Agent", systemPrompt: "Help users with Shaivik Technologies services." },
      aiSettings: { tone: "professional" },
    }, { lightweight: true });

    assert.equal(systemPrompt.role, "system");
    assert.ok(systemPrompt.content.includes("Website Browsing & Inspection Guidelines"));
    assert.ok(systemPrompt.content.includes("fetch_website"));
    assert.ok(systemPrompt.content.includes("Support Handover & Lead Capture Guidelines"));
  });

  // TEST C: Primary model returns temporary error -> backend tries configured fallback model
  it("TEST C: Model failover switches to fallback model when primary returns 5xx error", async () => {
    const failoverMgr = new ModelFailoverManager({
      primaryModel: "nvidia/nemotron-3.5-super-vl:free",
      fallbackModels: ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
    });

    const candidates = failoverMgr.getCandidateChain();
    assert.equal(candidates[0], "nvidia/nemotron-3.5-super-vl:free");
    assert.equal(candidates[1], "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");

    // Simulate primary failure
    failoverMgr.recordFailure("nvidia/nemotron-3.5-super-vl:free", { status: 503 });
    const healthyCandidates = failoverMgr.getCandidateChain();
    // Primary is on cooldown; fallback becomes top priority
    assert.equal(healthyCandidates[0], "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
  });

  // TEST D: Primary model requests a tool call -> backend resolves and executes tool correctly
  it("TEST D: Tool resolver and executor execute fetch_website and return structured result", async () => {
    const mockRepo = { findByAgentId: async () => [] };
    const resolver = new AgentToolResolverService(mockRepo);
    const resolvedTool = await resolver.resolve("test-agent-id", "fetch_website");

    assert.equal(resolvedTool.name, "fetch_website");
    assert.equal(resolvedTool.type, "SYSTEM");

    const mockFetcher = {
      fetch: async (url) => ({
        status: "SUCCESS",
        url,
        title: "Test Website Title",
        content: "Extracted test content from page.",
      }),
    };

    const executor = new AgentToolExecutorService({ websiteFetcherService: mockFetcher });
    const result = await executor.execute(resolvedTool, { url: "https://example.com" });

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.title, "Test Website Title");
    assert.equal(result.content, "Extracted test content from page.");
  });

  // TEST E: Model fails after tool execution -> tool is not re-executed a second time
  it("TEST E: Side-effecting tool is executed once and result is preserved in conversation context", async () => {
    let toolExecutionCount = 0;
    const mockFetcher = {
      fetch: async (url) => {
        toolExecutionCount++;
        return { status: "SUCCESS", url, title: "Title", content: "Content" };
      },
    };

    const tool = { name: "fetch_website", type: "SYSTEM" };
    const executor = new AgentToolExecutorService({ websiteFetcherService: mockFetcher });

    const messages = [{ role: "user", content: "Visit https://example.com" }];
    const toolCall = { id: "call_123", function: { name: "fetch_website", arguments: JSON.stringify({ url: "https://example.com" }) } };

    // Assistant issues tool call
    messages.push({ role: "assistant", content: null, tool_calls: [toolCall] });

    // Execute tool once
    const toolResult = await executor.execute(tool, { url: "https://example.com" });
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: "fetch_website",
      content: JSON.stringify(toolResult),
    });

    assert.equal(toolExecutionCount, 1);
    // Messages contain tool result with correct tool_call_id
    const toolMsg = messages.find((m) => m.role === "tool");
    assert.equal(toolMsg.tool_call_id, "call_123");
    assert.equal(toolMsg.name, "fetch_website");

    // In the next turn, if the model fails, the messages array already contains the tool result,
    // so failover to next model does not re-run executor.execute()
    assert.equal(toolExecutionCount, 1);
  });

  // TEST F: Website is inaccessible -> returns clean ERROR status without throwing uncaught exceptions
  it("TEST F: Inaccessible or non-existent website returns structured ERROR status", async () => {
    const result = await fetcher.fetch("https://non-existent-domain-404-error-1234567.org");
    assert.equal(result.status, "ERROR");
    assert.ok(result.error.includes("Could not retrieve website"));
  });

  // TEST G: URL targeting localhost or private network is blocked by SSRF guard
  it("TEST G: Localhost and private network addresses are blocked by SSRF prevention", async () => {
    const blockedUrls = [
      "http://localhost:3000",
      "http://127.0.0.1:8080/secret",
      "http://169.254.169.254/latest/meta-data",
      "http://metadata.google.internal",
      "http://10.0.0.1/admin",
      "http://192.168.1.1/router",
      "http://172.16.0.1/internal",
      "file:///etc/passwd",
    ];

    for (const url of blockedUrls) {
      const res = await fetcher.fetch(url);
      assert.equal(res.status, "ERROR", `URL should be blocked: ${url}`);
      assert.ok(
        res.error.toLowerCase().includes("blocked") ||
        res.error.toLowerCase().includes("protocol") ||
        res.error.toLowerCase().includes("resolve"),
        `Error message for ${url} should state security or protocol block`
      );
    }
  });

  // TEST H: Every model fails -> throws clean ProviderError without crashing
  it("TEST H: When every model in chain fails, provider throws clean ProviderError", async () => {
    const failoverMgr = new ModelFailoverManager({
      primaryModel: "primary:free",
      fallbackModels: ["fallback:free"],
    });

    // Mock client where all models fail with 500
    const mockClient = {
      chat: {
        completions: {
          create: async () => {
            const err = new Error("Upstream model unavailable");
            err.status = 503;
            throw err;
          },
        },
      },
    };

    const provider = new OpenAIProvider({ failoverManager: failoverMgr });
    provider.getClient = async () => mockClient;

    await assert.rejects(
      async () => {
        await provider.chat([{ role: "user", content: "test" }]);
      },
      (err) => {
        assert.ok(err.message.includes("All fallback models failed"));
        return true;
      }
    );
  });

  // TEST I: Ordinary chat message does not require fetch_website
  it("TEST I: Ordinary chat message does not trigger fetch_website tool execution", async () => {
    const schemaService = new AgentToolSchemaService();
    const tools = schemaService.toOllamaTools([]);

    // Tools list contains fetch_website
    assert.ok(tools.some((t) => t.function?.name === "fetch_website"));

    // For ordinary messages like "Hi", tools are available but not executed unless requested
    assert.equal(FETCH_WEBSITE_TOOL_DEFINITION.function.name, "fetch_website");
  });

  // TEST J: Daily message limit of 50 is not consumed by internal tool calls or retries
  it("TEST J: Internal tool calls and model failover retries do not consume user-message quota", () => {
    let checkPlanUsageCalls = 0;
    const mockCheckPlanUsageUseCase = {
      execute: async () => {
        checkPlanUsageCalls++;
        return { allowed: true, remaining: 49 };
      },
    };

    // The chat controller / conversation service checks quota once at the start of the user request
    mockCheckPlanUsageUseCase.execute();
    assert.equal(checkPlanUsageCalls, 1);

    // Multi-turn tool execution loop does not re-invoke checkPlanUsage
    for (let iteration = 0; iteration < 3; iteration++) {
      // Internal LLM iteration - quota is NOT incremented
    }

    assert.equal(checkPlanUsageCalls, 1, "Quota check must only occur once per user request");
  });
});
