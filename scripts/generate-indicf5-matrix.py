import os
import sys
import time
import json
import soundfile as sf
import numpy as np

from indic_f5_mlx import load_indicf5, generate

TEST_CASES = [
    {
        "id": "indicf5_case1_short_script",
        "description": "Short conversational sentence in Telugu script",
        "text": "నమస్కారం! మీరు ఎలా ఉన్నారు?",
    },
    {
        "id": "indicf5_case2_long_script",
        "description": "Long sentence in Telugu script",
        "text": "మన జీవితంలో విజయం అనేది ఒక్కరోజులో వచ్చేది కాదు, ప్రతిరోజూ మనం చేసే చిన్న చిన్న ప్రయత్నాలే భవిష్యత్తులో మన విజయానికి బలమైన పునాది అవుతాయి.",
    },
    {
        "id": "indicf5_case3_short_latin",
        "description": "Short Telugu written in Latin characters",
        "text": "Namaskaram! Meeru ela unnaru?",
    },
    {
        "id": "indicf5_case4_long_latin",
        "description": "Long Telugu written in Latin characters",
        "text": "Mana jeevithamlo vijayam anedhi okkarojulo vacchedi kaadu, prathiroju manam chese chinna chinna prayathnale mana vijayaniki punadi avuthayi.",
    },
]

def main():
    out_dir = "test_outputs/indicf5"
    os.makedirs(out_dir, exist_ok=True)

    print("Loading IndicF5 model...")
    model, _ = load_indicf5()
    print("IndicF5 model loaded successfully.")

    ref_audio = "local-tts/reference_24k_mono.wav"
    ref_text = """హాయ్ ఫ్రెండ్స్!
మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి."""

    results = []

    for tc in TEST_CASES:
        print(f"\n--- Running {tc['id']}: {tc['description']} ---")
        print(f"Text: \"{tc['text']}\"")

        t0 = time.time()
        try:
            audio = generate(
                model=model,
                ref_audio_path=ref_audio,
                ref_text=ref_text,
                text=tc['text'],
                steps=16,
                cfg_strength=2.0,
                sway_sampling_coef=-1.0,
                target_rms=0.1,
            )
            elapsed = time.time() - t0
            dur = len(audio) / 24000.0
            out_file = os.path.join(out_dir, f"{tc['id']}.wav")
            sf.write(out_file, audio, 24000)

            print(f"✓ Generated {dur:.2f}s of audio in {elapsed:.2f}s (RTF: {elapsed/max(0.1, dur):.2f}) -> {out_file}")
            results.append({
                "id": tc['id'],
                "file": out_file,
                "duration_sec": dur,
                "elapsed_sec": elapsed,
                "status": "success"
            })
        except Exception as e:
            print(f"✗ Failed: {e}")
            results.append({
                "id": tc['id'],
                "error": str(e),
                "status": "error"
            })

    with open(os.path.join(out_dir, "summary.json"), "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()

