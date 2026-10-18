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

const SAMPLE_A_REF_PATH = path.join(__dirname, "../local-tts/reference.wav");
const SAMPLE_A_TRANSCRIPT = REFERENCE_TEXT;

const SAMPLE_B_REF_PATH = path.join(__dirname, "../telugu_test.wav");
const SAMPLE_B_TRANSCRIPT =
  "హాయ్! ఈరోజు మనం ఒక కొత్త విషయం తెలుసుకుందాం. మనకు ఎంత పెద్ద లక్ష్యం ఉన్నా... ప్రతిరోజూ చేసే చిన్న ప్రయత్నాలే మన విజయానికి బాట వేస్తాయి. కాబట్టి నమ్మకంతో ముందుకు సాగండి!";

async function run() {
  console.log("=================================================================");
  console.log("REQUIREMENT 4: REPRODUCIBLE FISH AUDIO VOICE CLONING DIAGNOSTIC TEST");
  console.log("=================================================================\n");
  console.log("Model:", process.env.FISH_AUDIO_MODEL || "fish-audio/s2.1-pro-free:free");
  console.log("Target Text:", TARGET_TELUGU_TEXT);
  console.log();

  const provider = new FishAudioProvider();

  // -------------------------------------------------------------
  // TEST A: local-tts/reference.wav + REFERENCE_TEXT
  // -------------------------------------------------------------
  console.log("--- TEST A: local-tts/reference.wav + REFERENCE_TEXT ---");
  const refBufA = await fs.readFile(SAMPLE_A_REF_PATH);
  console.log(`- Ref A File: ${SAMPLE_A_REF_PATH} (${refBufA.length} bytes)`);
  console.log(`- Ref A Transcript: "${SAMPLE_A_TRANSCRIPT.replace(/\n+/g, " ")}"`);

  const startA = Date.now();
  // Using local-tts/reference.wav by omitting uploaded audio or passing explicit options
  const resA = await provider.synthesize(TARGET_TELUGU_TEXT, {
    voiceMode: "custom_clone",
    // No uploaded audio -> triggers local fallback reference.wav with REFERENCE_TEXT
  });
  const latencyA = Date.now() - startA;
  const pathA = path.join(__dirname, "../diagnostic_sample_A_reference_wav.mp3");
  await fs.writeFile(pathA, resA.audio);

  console.log(`✓ Generated Test A in ${latencyA}ms:`);
  console.log(`  - Output: ${pathA}`);
  console.log(`  - Format: ${resA.format} (${resA.audio.length} bytes)`);
  console.log(`  - Reference Source: ${resA.referenceSource}`);

  // -------------------------------------------------------------
  // TEST B: telugu_test.wav + SAMPLE_B_TRANSCRIPT
  // -------------------------------------------------------------
  console.log("\n--- TEST B: telugu_test.wav + SAMPLE_B_TRANSCRIPT ---");
  const refBufB = await fs.readFile(SAMPLE_B_REF_PATH);
  const refBase64B = refBufB.toString("base64");
  console.log(`- Ref B File: ${SAMPLE_B_REF_PATH} (${refBufB.length} bytes)`);
  console.log(`- Ref B Transcript: "${SAMPLE_B_TRANSCRIPT.replace(/\n+/g, " ")}"`);

  const startB = Date.now();
  const resB = await provider.synthesize(TARGET_TELUGU_TEXT, {
    voiceMode: "custom_clone",
    referenceAudioBase64: refBase64B,
    referenceText: SAMPLE_B_TRANSCRIPT,
  });
  const latencyB = Date.now() - startB;
  const pathB = path.join(__dirname, "../diagnostic_sample_B_telugu_test.mp3");
  await fs.writeFile(pathB, resB.audio);

  console.log(`✓ Generated Test B in ${latencyB}ms:`);
  console.log(`  - Output: ${pathB}`);
  console.log(`  - Format: ${resB.format} (${resB.audio.length} bytes)`);
  console.log(`  - Reference Source: ${resB.referenceSource}`);

  console.log("\n=================================================================");
  console.log("DIAGNOSTIC TEST AUDIO GENERATION COMPLETE");
  console.log("=================================================================");
}

run().catch((err) => {
  console.error("Diagnostic test failed:", err);
  process.exit(1);
});
