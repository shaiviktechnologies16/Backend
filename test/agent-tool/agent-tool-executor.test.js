import test from "node:test";
import assert from "node:assert/strict";

import { AgentToolExecutorService } from "../../src/features/agent-tool/application/services/agent-tool-executor.service.js";

function createService() {
  return new AgentToolExecutorService({
    workspaceApiKeyRepository: {
      findById: async () => null,
    },
    encryptionService: {
      decrypt: () => {
        throw new Error("Not used");
      },
    },
  });
}

function createResponse({
  body = "",
  status = 200,
  contentType = "application/json",
} = {}) {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);

  let consumed = false;

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        if (name.toLowerCase() === "content-type") {
          return contentType;
        }

        return null;
      },
    },
    body: {
      getReader() {
        return {
          async read() {
            if (consumed) {
              return {
                value: undefined,
                done: true,
              };
            }

            consumed = true;

            return {
              value: data,
              done: false,
            };
          },

          async cancel() {},
        };
      },
    },
  };
}

test("executes HTTP tool and returns JSON response", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestUrl;
    let requestOptions;

    globalThis.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;

      return createResponse({
        body: JSON.stringify({
          company: "Shaivik Technologies",
          services: ["AI Solutions", "Mobile App Development"],
        }),
      });
    };

    const service = createService();

    const result = await service.execute({
      type: "HTTP",
      credentialId: null,
      configuration: {
        method: "GET",
        url: "https://1.1.1.1/company-services",
        headers: {},
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    });

    assert.deepEqual(result, {
      company: "Shaivik Technologies",
      services: ["AI Solutions", "Mobile App Development"],
    });

    assert.equal(requestUrl, "https://1.1.1.1/company-services");

    assert.equal(requestOptions.method, "GET");

    assert.equal(requestOptions.headers["Content-Type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("blocks localhost URLs", async () => {
  const service = createService();

  await assert.rejects(
    () =>
      service.execute({
        type: "HTTP",
        configuration: {
          method: "GET",
          url: "http://localhost:3000/api/test/company-services",
          headers: {},
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      }),
    (error) => {
      assert.equal(error.errorCode, "AGENT_TOOL_URL_BLOCKED");

      assert.equal(error.message, "Agent tool URL targets a restricted host.");

      return true;
    },
  );
});

test("returns error when external API responds with 404", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () =>
      createResponse({
        status: 404,
        body: JSON.stringify({
          message: "Not found",
        }),
      });

    const service = createService();

    await assert.rejects(
      () =>
        service.execute({
          type: "HTTP",
          configuration: {
            method: "GET",
            url: "https://1.1.1.1/company-services",
            headers: {},
            parameters: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        }),
      (error) => {
        assert.equal(error.errorCode, "AGENT_TOOL_RESPONSE_ERROR");

        assert.equal(error.message, "Agent tool returned status 404.");

        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("decrypts credential and injects it into HTTP headers", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestOptions;

    const workspaceApiKeyRepository = {
      findById: async (id) => {
        assert.equal(id, "credential-123");

        return {
          id: "credential-123",
          encryptedValue: "encrypted-value",
        };
      },
    };

    const encryptionService = {
      decrypt: (encryptedValue) => {
        assert.equal(encryptedValue, "encrypted-value");

        return "secret-api-key";
      },
    };

    globalThis.fetch = async (url, options) => {
      requestOptions = options;

      return createResponse({
        body: JSON.stringify({
          success: true,
        }),
      });
    };

    const service = new AgentToolExecutorService({
      workspaceApiKeyRepository,
      encryptionService,
    });

    const result = await service.execute({
      type: "HTTP",
      credentialId: "credential-123",
      configuration: {
        method: "GET",
        url: "https://1.1.1.1/company-services",
        headers: {
          Authorization: "Bearer {{credential}}",
        },
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    });

    assert.deepEqual(result, {
      success: true,
    });

    assert.equal(requestOptions.headers.Authorization, "Bearer secret-api-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adds GET tool arguments as query parameters", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestUrl;

    globalThis.fetch = async (url) => {
      requestUrl = url;

      return createResponse({
        body: JSON.stringify({
          success: true,
        }),
      });
    };

    const service = createService();

    await service.execute(
      {
        type: "HTTP",
        configuration: {
          method: "GET",
          url: "https://1.1.1.1/products",
          headers: {},
          parameters: {
            type: "object",
            properties: {
              productId: {
                type: "string",
              },
              category: {
                type: "string",
              },
            },
            required: ["productId"],
          },
        },
      },
      {
        productId: "123",
        category: "paint",
      },
    );

    assert.equal(
      requestUrl,
      "https://1.1.1.1/products?productId=123&category=paint",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adds POST tool arguments as JSON request body", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestUrl;
    let requestOptions;

    globalThis.fetch = async (url, options) => {
      requestUrl = url;
      requestOptions = options;

      return createResponse({
        body: JSON.stringify({
          success: true,
        }),
      });
    };

    const service = createService();

    await service.execute(
      {
        type: "HTTP",
        configuration: {
          method: "POST",
          url: "https://1.1.1.1/products",
          headers: {},
          parameters: {
            type: "object",
            properties: {
              productId: {
                type: "string",
              },
              quantity: {
                type: "number",
              },
            },
            required: ["productId"],
          },
        },
      },
      {
        productId: "123",
        quantity: 5,
      },
    );

    assert.equal(requestUrl, "https://1.1.1.1/products");

    assert.equal(requestOptions.method, "POST");

    assert.equal(requestOptions.headers["Content-Type"], "application/json");

    assert.deepEqual(JSON.parse(requestOptions.body), {
      productId: "123",
      quantity: 5,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
