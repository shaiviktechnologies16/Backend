import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { performance } from "perf_hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

import { AppDataSource } from "../src/database/datasource.js";
import { conversationService } from "../src/container/services.js";

async function measure() {
  console.log("Initializing database connection...");
  const tDbStart = performance.now();
  await AppDataSource.initialize();
  console.log(`Database connected in ${(performance.now() - tDbStart).toFixed(2)}ms`);

  // Get active public agent
  const agents = await AppDataSource.query(
    "SELECT id, public_key, name, model, provider FROM agents WHERE id = 'c4cb8989-91f1-46b3-b505-3be406f3ae64'"
  );
  if (agents.length === 0) {
    console.error("No public agents found");
    process.exit(1);
  }

  const agent = agents[0];
  console.log(`\nTesting with Public Agent: "${agent.name}" (${agent.id})`);
  console.log(`Configured Model: ${agent.model}, Provider: ${agent.provider}`);
  console.log(`Public Key: ${agent.public_key}\n`);

  const testPrompts = [
    { type: "Simple Greeting", text: "hi" },
    { type: "Company Question", text: "What services do you offer?" },
  ];

  for (const prompt of testPrompts) {
    console.log(`=======================================================`);
    console.log(`BENCHMARKING: "${prompt.text}" (${prompt.type})`);
    console.log(`=======================================================`);

    const visitorId = `visitor_perf_${Date.now()}`;
    const t0 = performance.now();

    let tFirstToken = null;
    let tFirstChunk = null;
    let totalTokens = 0;
    let fullResponse = "";

    try {
      const stream = conversationService.streamPublicMessage(
        agent.public_key,
        prompt.text,
        visitorId,
        null,
        "test-hash",
        { requestId: "perf-test" }
      );

      for await (const chunk of stream) {
        if (chunk.type === "token") {
          if (!tFirstToken) {
            tFirstToken = performance.now();
            console.log(`>>> FIRST TOKEN RECEIVED at ${(tFirstToken - t0).toFixed(2)}ms`);
            console.log(`>>> First Token Content: "${chunk.content}"`);
          }
          totalTokens++;
          fullResponse += chunk.content;
        }
      }

      const tEnd = performance.now();
      console.log(`>>> STREAM COMPLETE at ${(tEnd - t0).toFixed(2)}ms`);
      console.log(`Total duration: ${(tEnd - t0).toFixed(2)}ms`);
      console.log(`Time to first token (TTFT): ${(tFirstToken - t0).toFixed(2)}ms`);
      console.log(`Response length: ${fullResponse.length} chars, total chunks: ${totalTokens}`);
      console.log(`Preview: "${fullResponse.substring(0, 100).replace(/\n+/g, " ")}..."\n`);
    } catch (err) {
      console.error("Stream failed:", err);
    }
  }

  await AppDataSource.destroy();
}

measure().catch(console.error);
