import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FishAudioProvider,
  REFERENCE_TEXT,
} from "../src/providers/tts/fish-audio/fish-audio.provider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const TARGET_TELUGU_TEXT = "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం. మీకు నేను ఎలా సహాయం చేయగలను?";

const REF_A_PATH = path.join(__dirname, "../local-tts/reference.wav");
const REF_A_TRANSCRIPT = REFERENCE_TEXT;

const REF_B_PATH = path.join(__dirname, "../telugu_test.wav");
const REF_B_TRANSCRIPT = `హాయ్! ఈరోజు మనం ఒక కొత్త విషయం తెలుసుకుందాం.

మనకు ఎంత పెద్ద లక్ష్యం ఉన్నా...
ప్రతిరోజూ చేసే చిన్న ప్రయత్నాలే మన విజయానికి బాట వేస్తాయి.

కాబట్టి నమ్మకంతో ముందుకు సాగండి!`;

async function main() {
  console.log("===============================================================");
  console.log("TASK 4 — CONTROLLED COMPARISON EXPERIMENT");
  console.log("===============================================================");
  console.log("Target Telugu Sentence:", TARGET_TELUGU_TEXT);
  console.log("Model: fish-audio/s2.1-pro-free:free via OpenRouter\n");

  const provider = new FishAudioProvider();

  // -------------------------------------------------------------
  // EXPERIMENT A: Reference A (reference.wav) + Verified Full Transcript
  // -------------------------------------------------------------
  console.log("--- Generating Sample A (Reference A: reference.wav + Full Verified Transcript) ---");
  const startA = Date.now();
  const resA = await provider.synthesize(TARGET_TELUGU_TEXT, {
    voiceMode: "custom_clone",
  });
  const latencyA = Date.now() - startA;
  const pathA = path.join(__dirname, "../controlled_comparison_A_reference_wav.mp3");
  await fs.writeFile(pathA, resA.audio);
  console.log(`✓ Generated Sample A in ${latencyA}ms:`);
  console.log(`  File: ${pathA}`);
  console.log(`  Bytes: ${resA.audio.length}, Format: ${resA.format}, Source: ${resA.referenceSource}\n`);

  // -------------------------------------------------------------
  // EXPERIMENT B: Reference B (telugu_test.wav) + Verified Transcript
  // -------------------------------------------------------------
  console.log("--- Generating Sample B (Reference B: telugu_test.wav + Verified Transcript) ---");
  const refBBuffer = await fs.readFile(REF_B_PATH);
  const refBBase64 = refBBuffer.toString("base64");
  const startB = Date.now();
  const resB = await provider.synthesize(TARGET_TELUGU_TEXT, {
    voiceMode: "custom_clone",
    referenceAudioBase64: refBBase64,
    referenceText: REF_B_TRANSCRIPT,
  });
  const latencyB = Date.now() - startB;
  const pathB = path.join(__dirname, "../controlled_comparison_B_telugu_test.mp3");
  await fs.writeFile(pathB, resB.audio);
  console.log(`✓ Generated Sample B in ${latencyB}ms:`);
  console.log(`  File: ${pathB}`);
  console.log(`  Bytes: ${resB.audio.length}, Format: ${resB.format}, Source: ${resB.referenceSource}\n`);

  // -------------------------------------------------------------
  // EXPERIMENT C: Unconditioned Baseline (No reference audio)
  // -------------------------------------------------------------
  console.log("--- Generating Sample C (Unconditioned Baseline: No reference audio) ---");
  const startC = Date.now();
  const resC = await provider.synthesize(TARGET_TELUGU_TEXT, {
    unconditioned: true,
  });
  const latencyC = Date.now() - startC;
  const pathC = path.join(__dirname, "../controlled_comparison_C_unconditioned.mp3");
  await fs.writeFile(pathC, resC.audio);
  console.log(`✓ Generated Sample C in ${latencyC}ms:`);
  console.log(`  File: ${pathC}`);
  console.log(`  Bytes: ${resC.audio.length}, Format: ${resC.format}, Source: ${resC.referenceSource}\n`);

  console.log("===============================================================");
  console.log("CONTROLLED COMPARISON COMPLETE");
  console.log("===============================================================");
}

main().catch((err) => {
  console.error("Controlled comparison failed:", err);
  process.exit(1);
});
