import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import OpenAI from "openai";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const apiKey = process.env.OPENROUTER_API_KEY;
const baseURL = "https://openrouter.ai/api/v1";

const client = new OpenAI({
  apiKey,
  baseURL,
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://shaiviktechnologies.in",
    "X-OpenRouter-Title": "Shaivik AI",
  },
});

const MULTILINGUAL_SYSTEM_PROMPT = `You are the official AI assistant for Shaivik Technologies.

Multilingual and Language Guidelines:
- Fluency & Adaptability: You support Telugu (తెలుగు), Romanized Telugu, English, and other languages fluently.
- Detect Language & Script: Detect the language and script of the latest user message and respond in that language and script by default.
- Romanized Telugu Support: If the user writes in Romanized Telugu (Telugu words typed in Latin/English alphabet, e.g., "meeru ela unnaru", "ippudu matladav ka", "nenu AI gurinchi telusukovali", "cheppandi"), understand the Romanized Telugu accurately and respond in natural Telugu script (తెలుగు లిపి) by default, unless the user explicitly requests Romanized Telugu or another language.
- Conversational Expressions: Accurately understand common Romanized Telugu expressions, idioms, informal questions, and spelling variations (such as "ippudu matladav ka", "ela unnaru", "enti", "cheppandi", etc.).
- Code-Switching: Seamlessly handle mixed Telugu and English (Telugu-English code-switching).
- Never Repeat: Never repeat a previous answer or refusal verbatim unless the user explicitly asks to repeat it.
- Direct Contextual Answers: Answer the latest user message directly while preserving relevant conversation context.
- Ambiguity & Facts: Do not claim to understand a message when its meaning is genuinely unclear. Ask a short, polite clarification question. Never invent facts when translating or interpreting ambiguous Telugu expressions.

Company Information:
Shaivik Technologies provides website development, mobile app development, e-commerce applications, food and grocery delivery applications, and AI agent development and integration.`;

const TEST_CASES = [
  {
    id: 1,
    name: "Telugu Script Greeting",
    input: "నమస్కారం, మీరు ఎలా ఉన్నారు?",
    expected: "Greeting response in Telugu script",
  },
  {
    id: 2,
    name: "Romanized Telugu Greeting",
    input: "meeru ela unnaru?",
    expected: "Greeting response in natural Telugu script",
  },
  {
    id: 3,
    name: "Conversational Romanized Telugu Follow-up",
    input: "ippudu matladav ka",
    expected: "Understands user is asking to talk now; does not repeat previous refusal",
    history: [
      { role: "user", content: "talk with me in telugu" },
      { role: "assistant", content: "క్షమించండి, కానీ నేను తెలుగులో మాట్లాడలేను. మీకు సహాయం కావాలంటే, దయచేసి ఇంగ్లీష్‌లో అడగండి." },
    ],
  },
  {
    id: 4,
    name: "Mixed Telugu/English Interest",
    input: "nenu AI gurinchi telusukovali",
    expected: "Explains AI / Shaivik AI services in natural Telugu script",
  },
  {
    id: 5,
    name: "English Company Services",
    input: "What services does Shaivik Technologies offer?",
    expected: "Lists Shaivik Technologies services in English",
  },
  {
    id: 6,
    name: "Telugu Script AI Explanation",
    input: "నాకు AI గురించి వివరించండి.",
    expected: "Explains AI in Telugu script accurately",
  },
  {
    id: 7,
    name: "Multi-turn Follow-up",
    input: "మరి మొబైల్ యాప్స్ కూడా చేస్తారా?",
    expected: "Answers about mobile apps in Telugu in context of earlier turn",
    history: [
      { role: "user", content: "Shaivik Technologies వెబ్‌సైట్లు తయారు చేస్తుందా?" },
      { role: "assistant", content: "అవును, Shaivik Technologies ప్రొఫెషనల్ వెబ్‌సైట్ డెవలప్‌మెంట్ సేవలను అందిస్తుంది." },
    ],
  },
  {
    id: 8,
    name: "Multi-turn Unrelated Shift",
    input: "మీ ఆఫీస్ టైమింగ్స్ ఏమిటి?",
    expected: "Answers the new question without repeating previous service answers",
    history: [
      { role: "user", content: "మీరు AI డెవలప్‌మెంట్ చేస్తారా?" },
      { role: "assistant", content: "అవును, మేము AI ఏజెంట్ మరియు AI ఇంటిగ్రేషన్ సేవలను అందిస్తాము." },
    ],
  },
];

async function runTestOnModel(modelName) {
  console.log(`\n=======================================================`);
  console.log(`EVALUATING MODEL: ${modelName}`);
  console.log(`=======================================================\n`);

  const results = [];

  for (const tc of TEST_CASES) {
    const messages = [
      { role: "system", content: MULTILINGUAL_SYSTEM_PROMPT },
      ...(tc.history || []),
      { role: "user", content: tc.input },
    ];

    const startedAt = Date.now();
    try {
      const response = await client.chat.completions.create({
        model: modelName,
        messages,
        max_tokens: 600,
        temperature: 0.5,
      });
      const latencyMs = Date.now() - startedAt;

      const choice = response.choices?.[0];
      const finishReason = choice?.finish_reason || "unknown";
      const reasoning = choice?.message?.reasoning || null;
      const content = choice?.message?.content || null;

      const result = {
        testId: tc.id,
        testName: tc.name,
        input: tc.input,
        model: response.model || modelName,
        status: 200,
        finishReason,
        latencyMs,
        reasoningSnippet: reasoning ? reasoning.substring(0, 100) + "..." : null,
        content: content ? content.trim() : null,
        success: Boolean(content && content.length > 0 && finishReason !== "length"),
      };

      results.push(result);
      console.log(`[Test ${tc.id}] ${tc.name}`);
      console.log(`Input: "${tc.input}"`);
      console.log(`Status: 200 | Finish: ${finishReason} | Latency: ${latencyMs}ms`);
      if (reasoning) {
        console.log(`Reasoning: ${result.reasoningSnippet}`);
      }
      console.log(`Content: ${content ? content.replace(/\n+/g, " ").substring(0, 160) : "[NULL/EMPTY]"}`);
      console.log(`Pass: ${result.success ? "YES" : "NO"}\n`);
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const result = {
        testId: tc.id,
        testName: tc.name,
        input: tc.input,
        model: modelName,
        status: err.status || 500,
        finishReason: "error",
        latencyMs,
        error: err.message,
        success: false,
      };
      results.push(result);
      console.log(`[Test ${tc.id}] ${tc.name} FAILED: ${err.message}\n`);
    }
  }

  return results;
}

async function main() {
  const modelsToTest = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-4o-mini",
  ];

  const allSummary = {};

  for (const model of modelsToTest) {
    const results = await runTestOnModel(model);
    const passed = results.filter((r) => r.success).length;
    allSummary[model] = {
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    };
  }

  console.log("\n================ OVERALL SUMMARY ================");
  for (const [model, stats] of Object.entries(allSummary)) {
    console.log(`${model}: Passed ${stats.passed}/${stats.total}`);
  }
}

main().catch(console.error);
