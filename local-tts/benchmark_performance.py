import sys
import time
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import TTSConfig
from app.services.tts_service import TTSService

TEST_PROMPTS = [
    (
        50,
        "Hi! Ippudu manam oka important topic gurinchi matladukundam."
    ),
    (
        100,
        "Hi! Ippudu manam oka important topic gurinchi matladukundam. Actually, ee feature chala useful ga untundi."
    ),
    (
        125,
        "“First reel ela undali?” “Ela start cheyyali?” “Em cheppali?” Ila chaala scripts chusaka… “finally, ikkada unna. ❤️”"
    ),
    (
        250,
        "Hi! Ippudu manam oka important topic gurinchi matladukundam. Actually, ee feature chala useful ga untundi, especially businesses ki. Meeru ready ga unnara? Let us try this new AI voice synthesis system! High quality voice output guaranteed."
    ),
    (
        500,
        "Hi! Ippudu manam oka important topic gurinchi matladukundam. Actually, ee feature chala useful ga untundi, especially businesses ki. Meeru ready ga unnara? Let us try this new AI voice synthesis system! High quality voice output guaranteed. Customer service and automated notifications can now sound completely natural and engaging. All team members can create custom audio content in minutes. First reel ela undali? Ela start cheyyali? Em cheppali? Ila chaala scripts chusaka, finally, ikkada unna."
    ),
]


def run_benchmarks():
    print("==================================================")
    print("STARTING TTS PERFORMANCE BENCHMARK SUITE")
    print("==================================================")

    # Instantiate TTS Service
    print("Initializing TTSService...")
    init_start = time.perf_counter()
    service = TTSService()
    init_time = time.perf_counter() - init_start
    print(f"TTSService initialized in {init_time:.2f}s")
    print("--------------------------------------------------")

    benchmark_results = []

    for char_target, prompt_text in TEST_PROMPTS:
        char_len = len(prompt_text)
        print(f"\n[BENCHMARK] Target: ~{char_target} chars | Actual: {char_len} chars")
        print(f"Prompt: {prompt_text}")

        # Run warm model test
        res = service.generate_speech(
            text=prompt_text,
            steps=TTSConfig.GENERATION_STEPS,
            debug=True,
        )

        audio_path = res["path"]
        duration = res["audioDurationSeconds"]
        proc_time = res["processingTimeSeconds"]
        segments = res["totalGroups"]
        rtf = proc_time / duration if duration > 0 else 0.0

        telemetry = res.get("telemetry", {})
        timing = telemetry.get("timing", {})

        print(f"  -> Result: {proc_time:.2f}s total | Audio: {duration:.2f}s | RTF: {rtf:.3f} | Segments: {segments}")
        print(f"  -> Detail: Prep={timing.get('textPreprocessingMs', 0)}ms, Seg={timing.get('segmentationMs', 0)}ms, Plan={timing.get('prosodyPlanningMs', 0)}ms, Stitch={timing.get('audioStitchingMs', 0)}ms, WAV={timing.get('wavEncodingMs', 0)}ms")

        # Cleanup generated audio file
        if audio_path.exists():
            audio_path.unlink()

        benchmark_results.append({
            "targetChars": char_target,
            "actualChars": char_len,
            "segments": segments,
            "audioDurationSec": duration,
            "processingTimeSec": proc_time,
            "rtf": rtf,
        })

    print("\n==================================================")
    print("BENCHMARK SUMMARY MATRIX")
    print("==================================================")
    print(f"{'Target Chars':<14} | {'Actual Chars':<14} | {'Segments':<10} | {'Audio (s)':<10} | {'Latency (s)':<12} | {'RTF':<8}")
    print("-" * 78)
    for r in benchmark_results:
        print(f"{r['targetChars']:<14} | {r['actualChars']:<14} | {r['segments']:<10} | {r['audioDurationSec']:<10.2f} | {r['processingTimeSec']:<12.2f} | {r['rtf']:<8.3f}")
    print("==================================================")

if __name__ == "__main__":
    run_benchmarks()

