import json
import logging
from pathlib import Path

logger = logging.getLogger("indicf5.config")

BASE_DIR = Path(__file__).resolve().parents[2]

REFERENCE_AUDIO = BASE_DIR / "reference_24k_mono.wav"
OUTPUT_DIR = BASE_DIR / "outputs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_FILE = OUTPUT_DIR / "tts_config.json"


REFERENCE_TEXT_TELUGU = """హాయ్ ఫ్రెండ్స్!
మన జీవితంలో చిన్న చిన్న మార్పులే… పెద్ద విజయాలకు కారణం అవుతాయి.
ప్రతిరోజూ ఒక కొత్త విషయం నేర్చుకోండి.
మీ లక్ష్యం"""

REFERENCE_TEXT_ENGLISH = """Hi friends!
Mana jeevitamlo chinna chinna marpule pedda vijayalaki karanamavutayi.
Pratirooju oka kotta vishayam nerchukondi.
Mee lakshyam"""

REFERENCE_TEXT = REFERENCE_TEXT_TELUGU


def _load_initial_config() -> dict:
    defaults = {
        "SAMPLE_RATE": 24000,
        "GENERATION_STEPS": 6,
        "CFG_STRENGTH": 2.0,
        "SWAY_SAMPLING_COEF": -1.0,
        "TARGET_RMS": 0.1,
        "SENTENCES_PER_GROUP": 5,
        "MAX_TEXT_LENGTH": 2000,
        "CHUNK_PAUSE_SECONDS": 0.18,
        "HOST": "127.0.0.1",
        "PORT": 8001,
    }
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                defaults.update(saved)
        except Exception as e:
            logger.warning(f"Could not load initial tts_config.json: {e}")
    return defaults


_init_cfg = _load_initial_config()


class TTSConfig:
    SAMPLE_RATE: int = int(_init_cfg["SAMPLE_RATE"])
    GENERATION_STEPS: int = int(_init_cfg["GENERATION_STEPS"])
    CFG_STRENGTH: float = float(_init_cfg["CFG_STRENGTH"])
    SWAY_SAMPLING_COEF: float = float(_init_cfg["SWAY_SAMPLING_COEF"])
    TARGET_RMS: float = float(_init_cfg["TARGET_RMS"])
    SENTENCES_PER_GROUP: int = int(_init_cfg["SENTENCES_PER_GROUP"])
    MAX_TEXT_LENGTH: int = int(_init_cfg["MAX_TEXT_LENGTH"])
    CHUNK_PAUSE_SECONDS: float = float(_init_cfg["CHUNK_PAUSE_SECONDS"])
    HOST: str = str(_init_cfg["HOST"])
    PORT: int = int(_init_cfg["PORT"])

    @classmethod
    def to_dict(cls) -> dict:
        return {
            "SAMPLE_RATE": cls.SAMPLE_RATE,
            "GENERATION_STEPS": cls.GENERATION_STEPS,
            "CFG_STRENGTH": cls.CFG_STRENGTH,
            "SWAY_SAMPLING_COEF": cls.SWAY_SAMPLING_COEF,
            "TARGET_RMS": cls.TARGET_RMS,
            "SENTENCES_PER_GROUP": cls.SENTENCES_PER_GROUP,
            "MAX_TEXT_LENGTH": cls.MAX_TEXT_LENGTH,
            "CHUNK_PAUSE_SECONDS": cls.CHUNK_PAUSE_SECONDS,
            "HOST": cls.HOST,
            "PORT": cls.PORT,
        }

    @classmethod
    def update_from_dict(cls, new_data: dict, save: bool = True):
        if "SAMPLE_RATE" in new_data and new_data["SAMPLE_RATE"] is not None:
            cls.SAMPLE_RATE = int(new_data["SAMPLE_RATE"])
        if "GENERATION_STEPS" in new_data and new_data["GENERATION_STEPS"] is not None:
            cls.GENERATION_STEPS = int(new_data["GENERATION_STEPS"])
        if "CFG_STRENGTH" in new_data and new_data["CFG_STRENGTH"] is not None:
            cls.CFG_STRENGTH = float(new_data["CFG_STRENGTH"])
        if "SWAY_SAMPLING_COEF" in new_data and new_data["SWAY_SAMPLING_COEF"] is not None:
            cls.SWAY_SAMPLING_COEF = float(new_data["SWAY_SAMPLING_COEF"])
        if "TARGET_RMS" in new_data and new_data["TARGET_RMS"] is not None:
            cls.TARGET_RMS = float(new_data["TARGET_RMS"])
        if "SENTENCES_PER_GROUP" in new_data and new_data["SENTENCES_PER_GROUP"] is not None:
            cls.SENTENCES_PER_GROUP = int(new_data["SENTENCES_PER_GROUP"])
        if "MAX_TEXT_LENGTH" in new_data and new_data["MAX_TEXT_LENGTH"] is not None:
            cls.MAX_TEXT_LENGTH = int(new_data["MAX_TEXT_LENGTH"])
        if "CHUNK_PAUSE_SECONDS" in new_data and new_data["CHUNK_PAUSE_SECONDS"] is not None:
            cls.CHUNK_PAUSE_SECONDS = float(new_data["CHUNK_PAUSE_SECONDS"])
        if "HOST" in new_data and new_data["HOST"] is not None:
            cls.HOST = str(new_data["HOST"])
        if "PORT" in new_data and new_data["PORT"] is not None:
            cls.PORT = int(new_data["PORT"])

        if save:
            cls.save_config()

    @classmethod
    def save_config(cls):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(cls.to_dict(), f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save TTSConfig: {e}")

    @classmethod
    def load_config(cls):
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cls.update_from_dict(data, save=False)
            except Exception as e:
                logger.error(f"Failed to load TTSConfig from disk: {e}")


# Load saved config on import if present
TTSConfig.load_config()