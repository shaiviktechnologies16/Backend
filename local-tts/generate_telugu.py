import soundfile as sf

from indic_f5_mlx import load_indicf5, generate

model, _ = load_indicf5()

ref_audio = "reference_24k.wav"

ref_text = """హాయ్ ఫ్రెండ్స్!

మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి.

ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి.
మీ లక్ష్యంపై ఫోకస్ పెట్టండి.
ఆగకుండా ముందుకు సాగండి.

ఎందుకంటే… మీ కలను నిజం చేసేది ఇంకెవరో కాదు — మీరే!"""

text = """హాయ్! ఈరోజు మనం ఒక కొత్త విషయం తెలుసుకుందాం.

మనకు ఎంత పెద్ద లక్ష్యం ఉన్నా...
ప్రతిరోజూ చేసే చిన్న ప్రయత్నాలే మన విజయానికి బాట వేస్తాయి.

కాబట్టి నమ్మకంతో ముందుకు సాగండి!"""

audio = generate(
    model=model,
    ref_audio_path=ref_audio,
    ref_text=ref_text,
    text=text,
    steps=2,
    cfg_strength=2.0,
    sway_sampling_coef=-1.0,
    target_rms=0.1,
)

sf.write("telugu_test.wav", audio, 24000)

print("Generated: telugu_test.wav")









