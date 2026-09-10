from pathlib import Path
from threading import Lock
import logging
import re
import time
import uuid

import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from indic_f5_mlx import load_indicf5, generate


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("indicf5")


app = FastAPI(
    title="Local Telugu TTS",
    version="1.0.0",
)


BASE_DIR = Path(__file__).resolve().parent
REFERENCE_AUDIO = BASE_DIR / "reference_24k_mono.wav"
OUTPUT_DIR = BASE_DIR / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# IMPORTANT:
# This MUST be the exact transcript spoken in reference_24k.wav.
# Do NOT put the user's requested TTS text here.
REFERENCE_TEXT = """హాయ్ ఫ్రెండ్స్! నా పేరు రాకేష్. ఈరోజు మనం ఒక ముఖ్యమైన విషయం గురించి మాట్లాడుకుందాం."""

SAMPLE_RATE = 24000

# Chunking
MIN_CHUNK_LENGTH = 120
MAX_CHUNK_LENGTH = 280

# TTS quality / speed
GENERATION_STEPS = 4
CFG_STRENGTH = 2.0
SWAY_SAMPLING_COEF = -1.0
TARGET_RMS = 0.1

# Keep pauses natural but short.
CHUNK_PAUSE_SECONDS = 0.12

# Safety
MAX_TEXT_LENGTH = 10000

generation_lock = Lock()


logger.info("Loading IndicF5 model...")

model, _ = load_indicf5()

logger.info("IndicF5 model loaded successfully.")


class TTSRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_TEXT_LENGTH,
    )


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Normalize excessive spaces while preserving paragraphs.
    lines = []

    for line in text.split("\n"):
        line = re.sub(r"[ \t]+", " ", line).strip()

        if line:
            lines.append(line)

    return "\n".join(lines)


def split_sentences(text: str) -> list[str]:
    """
    Telugu-aware sentence splitting.

    Supports:
    . ! ?
    Telugu danda: ।
    Multiple punctuation.
    """

    text = text.strip()

    if not text:
        return []

    sentences = re.split(
        r"(?<=[.!?।])\s+",
        text,
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


def split_by_punctuation(
    text: str,
    max_length: int,
) -> list[str]:
    """
    Break long sentences around natural punctuation.
    """

    if len(text) <= max_length:
        return [text.strip()]

    parts = re.split(
        r"(?<=[,;:၊])\s+",
        text,
    )

    chunks: list[str] = []
    current = ""

    for part in parts:
        part = part.strip()

        if not part:
            continue

        candidate = (
            f"{current} {part}".strip()
            if current
            else part
        )

        if len(candidate) <= max_length:
            current = candidate
            continue

        if current:
            chunks.append(current)

        current = part

    if current:
        chunks.append(current)

    return chunks


def split_by_words(
    text: str,
    max_length: int,
) -> list[str]:
    """
    Final fallback for unusually long text.
    """

    if len(text) <= max_length:
        return [text.strip()]

    words = text.split()

    chunks: list[str] = []
    current = ""

    for word in words:
        candidate = (
            f"{current} {word}".strip()
            if current
            else word
        )

        if len(candidate) <= max_length:
            current = candidate
        else:
            if current:
                chunks.append(current)

            current = word

    if current:
        chunks.append(current)

    return chunks


def create_chunks(text: str) -> list[str]:
    """
    Create natural TTS chunks.

    Priority:
    1. Paragraph
    2. Sentence
    3. Punctuation
    4. Words
    """

    text = normalize_text(text)

    if not text:
        return []

    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(r"\n+", text)
        if paragraph.strip()
    ]

    chunks: list[str] = []

    for paragraph in paragraphs:

        sentences = split_sentences(paragraph)

        for sentence in sentences:

            punctuation_chunks = split_by_punctuation(
                sentence,
                MAX_CHUNK_LENGTH,
            )

            for part in punctuation_chunks:

                word_chunks = split_by_words(
                    part,
                    MAX_CHUNK_LENGTH,
                )

                chunks.extend(
                    chunk
                    for chunk in word_chunks
                    if chunk.strip()
                )

    # Merge very small chunks with the next chunk where possible.
    optimized: list[str] = []

    for chunk in chunks:

        chunk = chunk.strip()

        if not chunk:
            continue

        if (
            optimized
            and len(optimized[-1]) < MIN_CHUNK_LENGTH
            and len(optimized[-1]) + len(chunk) + 1
            <= MAX_CHUNK_LENGTH
        ):
            optimized[-1] = (
                f"{optimized[-1]} {chunk}"
            )
        else:
            optimized.append(chunk)

    return optimized


def add_pause(audio: np.ndarray) -> np.ndarray:
    pause_samples = int(
        SAMPLE_RATE * CHUNK_PAUSE_SECONDS
    )

    if pause_samples <= 0:
        return audio

    pause = np.zeros(
        pause_samples,
        dtype=np.float32,
    )

    return np.concatenate(
        [audio, pause]
    )


def generate_audio_chunk(
    text: str,
) -> np.ndarray:

    logger.info(
        "Generating chunk | characters=%d | steps=%d | text=%s",
        len(text),
        GENERATION_STEPS,
        text[:80],
    )

    audio = generate(
        model=model,
        ref_audio_path=str(REFERENCE_AUDIO),
        ref_text=REFERENCE_TEXT,
        text=text,
        steps=GENERATION_STEPS,
        cfg_strength=CFG_STRENGTH,
        sway_sampling_coef=SWAY_SAMPLING_COEF,
        target_rms=TARGET_RMS,
    )

    return np.asarray(
        audio,
        dtype=np.float32,
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": "IndicF5",
        "language": "te",
        "ready": model is not None,
    }


@app.post("/tts")
async def text_to_speech(
    request: TTSRequest,
):
    text = normalize_text(request.text)

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text is required.",
        )

    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Text exceeds the maximum "
                f"length of {MAX_TEXT_LENGTH} characters."
            ),
        )

    if not REFERENCE_AUDIO.exists():
        raise HTTPException(
            status_code=500,
            detail="Reference audio not found.",
        )

    if (
        not REFERENCE_TEXT.strip()
        or REFERENCE_TEXT.startswith("<EXACT")
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                "REFERENCE_TEXT must contain "
                "the exact transcript of reference_24k.wav."
            ),
        )

    chunks = create_chunks(text)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Unable to create TTS chunks.",
        )

    output_file = (
        OUTPUT_DIR
        / f"{uuid.uuid4()}.wav"
    )

    logger.info(
        "TTS generation started | "
        "characters=%d | chunks=%d | steps=%d",
        len(text),
        len(chunks),
        GENERATION_STEPS,
    )

    start_time = time.perf_counter()

    try:
        generated_audio: list[np.ndarray] = []

        with generation_lock:

            for index, chunk in enumerate(
                chunks,
                start=1,
            ):
                chunk_start = time.perf_counter()

                logger.info(
                    "Processing chunk %d/%d | characters=%d",
                    index,
                    len(chunks),
                    len(chunk),
                )

                audio = generate_audio_chunk(
                    chunk
                )

                if audio.size == 0:
                    raise RuntimeError(
                        f"Empty audio generated for chunk {index}."
                    )

                if index < len(chunks):
                    audio = add_pause(audio)

                generated_audio.append(audio)

                chunk_elapsed = (
                    time.perf_counter()
                    - chunk_start
                )

                audio_duration = (
                    len(audio)
                    / SAMPLE_RATE
                )

                logger.info(
                    "Chunk %d/%d completed | "
                    "generation=%.2fs | "
                    "audio=%.2fs",
                    index,
                    len(chunks),
                    chunk_elapsed,
                    audio_duration,
                )

        final_audio = np.concatenate(
            generated_audio
        )

        # Prevent clipping.
        peak = np.max(
            np.abs(final_audio)
        )

        if peak > 0.99:
            final_audio = (
                final_audio / peak
            ) * 0.98

        sf.write(
            str(output_file),
            final_audio,
            SAMPLE_RATE,
            subtype="PCM_16",
        )

        elapsed = (
            time.perf_counter()
            - start_time
        )

        audio_duration = (
            len(final_audio)
            / SAMPLE_RATE
        )

        logger.info(
            "TTS generation completed | "
            "chunks=%d | "
            "generation=%.2fs | "
            "audio_duration=%.2fs | "
            "output=%s",
            len(chunks),
            elapsed,
            audio_duration,
            output_file.name,
        )

        return FileResponse(
            path=output_file,
            media_type="audio/wav",
            filename="speech.wav",
        )

    except HTTPException:
        raise

    except Exception as error:

        if output_file.exists():
            output_file.unlink()

        logger.exception(
            "TTS generation failed"
        )

        raise HTTPException(
            status_code=500,
            detail="TTS generation failed.",
        ) from error