import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JwtService } from "../src/common/security/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const BASE_URL = "http://127.0.0.1:3000/api/v1";
const TARGET_TEXT = "నమస్కారం! శైవిక్ ఏఐకి స్వాగతం. మీకు నేను ఎలా సహాయం చేయగలను?";

const jwt = new JwtService();
const token = jwt.generateAccessToken({
  userId: "9e1b2a9b-7b4d-406e-a42d-5ff4049c2670",
  email: "admin@ai-platform.com",
});

async function pollJob(jobId) {
  while (true) {
    const res = await fetch(`${BASE_URL}/tts/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.status === "completed") {
      return data;
    }
    if (data.status === "failed") {
      throw new Error(`Job ${jobId} failed: ${data.errorMessage}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function downloadJobAudio(jobId, destPath) {
  const res = await fetch(`${BASE_URL}/tts/jobs/${jobId}/audio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Download failed with status ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(arrayBuf));
  return arrayBuf.byteLength;
}

async function run() {
  console.log("===============================================================");
  console.log("TESTING VOICE CLONING VIA REAL RUNNING ADMIN BACKEND WORKFLOW");
  console.log("===============================================================\n");

  // -------------------------------------------------------------------------
  // WORKFLOW TEST 1: With an Uploaded Reference Audio File
  // -------------------------------------------------------------------------
  console.log("[Workflow Test 1] Submitting job WITH uploaded reference audio...");
  const sampleAudioBuf = await fs.readFile(path.join(__dirname, "../telugu_test.wav"));
  const sampleAudioB64 = sampleAudioBuf.toString("base64");
  const sampleTranscript =
    "హాయ్! ఈరోజు మనం ఒక కొత్త విషయం తెలుసుకుందాం. మనకు ఎంత పెద్ద లక్ష్యం ఉన్నా... ప్రతిరోజూ చేసే చిన్న ప్రయత్నాలే మన విజయానికి బాట వేస్తాయి. కాబట్టి నమ్మకంతో ముందుకు సాగండి!";

  const postResp1 = await fetch(`${BASE_URL}/tts/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: TARGET_TEXT,
      provider: "fish_audio",
      voiceMode: "custom_clone",
      referenceAudioBase64: sampleAudioB64,
      referenceText: sampleTranscript,
      format: "mp3",
    }),
  });

  const job1 = await postResp1.json();
  console.log(`Job 1 Created: ID = ${job1.id}, HTTP status = ${postResp1.status}`);

  console.log("Polling Job 1 for completion...");
  const completedJob1 = await pollJob(job1.id);
  console.log("Job 1 Completed:", completedJob1);

  const outPath1 = path.join(__dirname, "../admin_workflow_result_uploaded.mp3");
  const bytes1 = await downloadJobAudio(job1.id, outPath1);
  console.log(`✓ Downloaded Job 1 Audio to ${outPath1} (${bytes1} bytes)\n`);

  // -------------------------------------------------------------------------
  // WORKFLOW TEST 2: Without Upload (Using Backend/local-tts/reference.wav)
  // -------------------------------------------------------------------------
  console.log("[Workflow Test 2] Submitting job WITHOUT upload (Local Fallback)...");
  const postResp2 = await fetch(`${BASE_URL}/tts/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: TARGET_TEXT,
      provider: "fish_audio",
      voiceMode: "custom_clone",
      referenceAudioBase64: null,
      referenceText: null,
      format: "mp3",
    }),
  });

  const job2 = await postResp2.json();
  console.log(`Job 2 Created: ID = ${job2.id}, HTTP status = ${postResp2.status}`);

  console.log("Polling Job 2 for completion...");
  const completedJob2 = await pollJob(job2.id);
  console.log("Job 2 Completed:", completedJob2);

  const outPath2 = path.join(__dirname, "../admin_workflow_result_local_fallback.mp3");
  const bytes2 = await downloadJobAudio(job2.id, outPath2);
  console.log(`✓ Downloaded Job 2 Audio to ${outPath2} (${bytes2} bytes)\n`);

  console.log("===============================================================");
  console.log("ADMIN BACKEND WORKFLOW TESTS SUCCEEDED");
  console.log("===============================================================");
}

run().catch((err) => {
  console.error("Workflow test failed:", err);
  process.exit(1);
});
