import time

import mlx.core as mx
import numpy as np
import soundfile as sf

from indic_f5_mlx import load_indicf5
from f5_tts_mlx.generate import split_sentences, estimated_duration


REFERENCE_AUDIO = "reference_24k_mono.wav"

REFERENCE_TEXT = """హాయ్ ఫ్రెండ్స్!

మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి.

ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి.
మీ లక్ష్యం"""

TEXT = """హాయ్ ఫ్రెండ్స్! నా పేరు రాకేష్.

మన జీవితంలో విజయం అనేది ఒక్కరోజులో వచ్చేది కాదు. ప్రతిరోజూ మనం చేసే చిన్న చిన్న ప్రయత్నాలే… భవిష్యత్తులో మన విజయానికి బలమైన పునాది అవుతాయి.

కొన్నిసార్లు మనం ఎంత కష్టపడినా వెంటనే ఫలితం కనిపించకపోవచ్చు. అలాంటి సమయంలో నిరాశ చెందకుండా, మన ప్రయత్నాన్ని కొనసాగించడం చాలా ముఖ్యం.

ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి. మీ లక్ష్యాన్ని స్పష్టంగా గుర్తించండి. దాన్ని సాధించడానికి అవసరమైన ప్రతి చిన్న అడుగును నిజాయితీగా వేయండి.

ఇతరులతో మనల్ని మనం పోల్చుకోవడం కంటే… నిన్నటి మనతో ఈరోజు మనం ఎంత మెరుగయ్యామో చూసుకోవడం చాలా ముఖ్యం.

మధ్యలో ఎన్ని సమస్యలు వచ్చినా ఆగిపోకండి. నెమ్మదిగా ముందుకు వెళ్లినా పరవాలేదు… కానీ మీ ప్రయాణాన్ని మాత్రం ఆపకండి.

మీ కల ఎంత పెద్దదైనా సరే, దాన్ని సాధించే శక్తి మీలోనే ఉంది.

మీపై నమ్మకం ఉంచండి. కష్టపడండి. ఓపికగా ముందుకు సాగండి. ఎందుకంటే… మీ కలను నిజం చేసేది ఇంకెవరో కాదు — మీరే!"""


model, _ = load_indicf5()

import soundfile as sf

audio_np, sr = sf.read(REFERENCE_AUDIO)

if sr != 24000:
    raise ValueError(f"Reference must be 24 kHz, got {sr}")

audio_np = audio_np.astype(np.float32)
audio = mx.array(audio_np)[None]

ref_samples = audio.shape[1]
frames_per_sec = 24000 / 256


def generate_grouped(group_size: int, steps: int):
    sentences = split_sentences(TEXT)

    pieces = []

    start_time = time.perf_counter()

    for i in range(0, len(sentences), group_size):
        group = sentences[i:i + group_size]
        text = " ".join(group)

        duration = estimated_duration(
            mx.array(audio_np),
            REFERENCE_TEXT,
            text,
            1.0,
        )

        dur = int(
            duration * frames_per_sec
        )

        wave, _ = model.sample(
            cond=audio,
            text=[REFERENCE_TEXT + " " + text],
            duration=dur,
            steps=steps,
            cfg_strength=2.0,
            sway_sampling_coef=-1.0,
        )

        wave = wave[ref_samples:]

        mx.eval(wave)

        pieces.append(
            np.array(wave)
            .reshape(-1)
            .astype(np.float32)
        )

        print(
            f"group={i // group_size + 1} "
            f"sentences={len(group)} "
            f"chars={len(text)} "
            f"duration={duration:.2f}s"
        )

    output = np.concatenate(pieces)

    elapsed = (
        time.perf_counter()
        - start_time
    )

    audio_duration = (
        len(output) / 24000
    )

    print(
        f"\nGROUP SIZE {group_size}"
    )
    print(
        f"generation={elapsed:.2f}s"
    )
    print(
        f"audio={audio_duration:.2f}s"
    )
    print(
        f"RTF={elapsed / audio_duration:.2f}"
    )

    sf.write(
        f"grouped_{group_size}.wav",
        output,
        24000,
    )


generate_grouped(
    group_size=8,
    steps=6,
)