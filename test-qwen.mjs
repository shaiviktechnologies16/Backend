import { OpenAI } from "openai";

if (!process.env.HF_TOKEN) {
  process.exit(0);
}

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

const chatCompletion = await client.chat.completions.create({
  model: "Qwen/Qwen3-8B:featherless-ai",
  messages: [
    {
      role: "user",
      content: "Reply exactly: Shaivik AI connected successfully",
    },
  ],
  max_tokens: 50,
  stream: false,
});

console.log(chatCompletion.choices[0].message);
