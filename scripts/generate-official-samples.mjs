import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FishAudioProvider } from "../src/providers/tts/fish-audio/fish-audio.provider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const TARGET_SENTENCE = "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం. మీకు నేను ఎలా సహాయం చేయగలను?";
const REF_AUDIO_PATH = path.join(__dirname, "../local-tts/reference_24k_mono.wav");
const REF_TRANSCRIPT = "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం.";

async function run() {
  console.log("=== Fish Audio Official Verification Generation ===");
  console.log("Target Sentence:", TARGET_SENTENCE);
  console.log("Model:", process.env.FISH_AUDIO_MODEL || "fish-audio/s2.1-pro-free:free");
  console.log("Speech URL:", process.env.FISH_AUDIO_API_URL || process.env.OPENROUTER_SPEECH_URL);

  const provider = new FishAudioProvider();

  // 1. Audio A: Without reference audio
  console.log("\n[1/2] Generating Audio A (Normal / Preset - No Reference Audio)...");
  const resA = await provider.synthesize(TARGET_SENTENCE, {
    voiceMode: "preset",
  });
  const pathA = path.join(__dirname, "../fish_audio_telugu_target_noref.mp3");
  await fs.writeFile(pathA, resA.audio);
  console.log(`Audio A generated successfully:`);
  console.log(`- Path: ${pathA}`);
  console.log(`- Size: ${resA.audio.length} bytes`);
  console.log(`- Format: ${resA.format}`);

  // 2. Audio B: With reference audio
  console.log("\n[2/2] Generating Audio B (Cloned - With Reference Audio & Transcript)...");
  const refBuffer = await fs.readFile(REF_AUDIO_PATH);
  const refBase64 = refBuffer.toString("base64");

  const resB = await provider.synthesize(TARGET_SENTENCE, {
    voiceMode: "custom_clone",
    referenceAudioBase64: refBase64,
    referenceText: REF_TRANSCRIPT,
  });
  const pathB = path.join(__dirname, "../fish_audio_telugu_target_withref.mp3");
  await fs.writeFile(pathB, resB.audio);
  console.log(`Audio B generated successfully:`);
  console.log(`- Path: ${pathB}`);
  console.log(`- Size: ${resB.audio.length} bytes`);
  console.log(`- Format: ${resB.format}`);

  console.log("\n=== Generation Complete ===");
}

run().catch((err) => {
  console.error("Error during generation:", err);
  process.exit(1);
});
