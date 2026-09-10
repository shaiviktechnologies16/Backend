import time

import soundfile as sf

from indic_f5_mlx import load_indicf5, generate


model, _ = load_indicf5()

reference_audio = "reference_24k_mono.wav"

reference_text = """హాయ్ ఫ్రెండ్స్!

మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి.

ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి.
మీ లక్ష్యం"""

text = """నమస్కారం. ఇది ఒక తెలుగు వాయిస్ పరీక్ష."""


for steps in [2, 4, 6, 8]:
    start = time.perf_counter()

    audio = generate(
        model=model,
        ref_audio_path=reference_audio,
        ref_text=reference_text,
        text=text,
        steps=steps,
        cfg_strength=2.0,
        sway_sampling_coef=-1.0,
        target_rms=0.1,
    )

    elapsed = time.perf_counter() - start
    duration = len(audio) / 24000
    rtf = elapsed / duration if duration > 0 else 0

    print(
        f"steps={steps} "
        f"generation={elapsed:.2f}s "
        f"audio={duration:.2f}s "
        f"RTF={rtf:.2f}"
    )

    sf.write(
        f"benchmark_{steps}.wav",
        audio,
        24000,
    )