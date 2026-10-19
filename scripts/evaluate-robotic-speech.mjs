import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FishAudioProvider, REFERENCE_TEXT } from "../src/providers/tts/fish-audio/fish-audio.provider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const TEST_CASES = [
  {
    id: "case1_short_script",
    description: "Short conversational sentence in Telugu script",
    text: "నమస్కారం! మీరు ఎలా ఉన్నారు?",
  },
  {
    id: "case2_long_script",
    description: "Long sentence in Telugu script",
    text: "మన జీవితంలో విజయం అనేది ఒక్కరోజులో వచ్చేది కాదు, ప్రతిరోజూ మనం చేసే చిన్న చిన్న ప్రయత్నాలే భవిష్యత్తులో మన విజయానికి బలమైన పునాది అవుతాయి.",
  },
  {
    id: "case3_short_latin",
    description: "Short Telugu written in Latin characters",
    text: "Namaskaram! Meeru ela unnaru?",
  },
  {
    id: "case4_long_latin",
    description: "Long Telugu written in Latin characters",
    text: "Mana jeevithamlo vijayam anedhi okkarojulo vacchedi kaadu, prathiroju manam chese chinna chinna prayathnale mana vijayaniki punadi avuthayi.",
  },
];

async function main() {
  console.log("=== RUNNING FISH AUDIO TEST MATRIX ===");
  const provider = new FishAudioProvider();
  const outDir = path.join(__dirname, "../test_outputs/fish_audio");
  await fs.mkdir(outDir, { recursive: true });

  const results = [];

  for (const tc of TEST_CASES) {
    console.log(`\n--- Testing ${tc.id}: ${tc.description} ---`);
    console.log(`Text: "${tc.text}"`);

    // 1. With Reference Audio (Cloning)
    try {
      const t0 = Date.now();
      const resWithRef = await provider.synthesize(tc.text, {
        voiceMode: "custom_clone",
      });
      const durWithRef = Date.now() - t0;
      const fileWithRef = path.join(outDir, `${tc.id}_with_ref.mp3`);
      await fs.writeFile(fileWithRef, resWithRef.audio);
      console.log(`  [With Ref] Generated in ${durWithRef}ms, size: ${resWithRef.audio.length} bytes`);
      results.push({
        id: tc.id,
        condition: "with_reference",
        filePath: fileWithRef,
        bytes: resWithRef.audio.length,
        latencyMs: durWithRef,
      });
    } catch (err) {
      console.error(`  [With Ref] Error:`, err.message);
      results.push({ id: tc.id, condition: "with_reference", error: err.message });
    }

    // 2. Without Reference Audio (Unconditioned baseline)
    try {
      const t0 = Date.now();
      const resNoRef = await provider.synthesize(tc.text, {
        unconditioned: true,
      });
      const durNoRef = Date.now() - t0;
      const fileNoRef = path.join(outDir, `${tc.id}_unconditioned.mp3`);
      await fs.writeFile(fileNoRef, resNoRef.audio);
      console.log(`  [Unconditioned] Generated in ${durNoRef}ms, size: ${resNoRef.audio.length} bytes`);
      results.push({
        id: tc.id,
        condition: "unconditioned",
        filePath: fileNoRef,
        bytes: resNoRef.audio.length,
        latencyMs: durNoRef,
      });
    } catch (err) {
      console.error(`  [Unconditioned] Error:`, err.message);
      results.push({ id: tc.id, condition: "unconditioned", error: err.message });
    }
  }

  const summaryPath = path.join(outDir, "summary.json");
  await fs.writeFile(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${summaryPath}`);
}

main().catch(console.error);

