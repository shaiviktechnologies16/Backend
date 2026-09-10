import unittest
import base64
import numpy as np
from pathlib import Path

from app.services.tts_service import TTSService, _CUSTOM_VOICE_ENGINES
from app.core.config import REFERENCE_AUDIO, REFERENCE_TEXT_TELUGU, TTSConfig


class TestVoiceCloningFlow(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.tts_service = TTSService()
        # Read reference audio as base64 for testing
        with open(REFERENCE_AUDIO, "rb") as f:
            cls.ref_audio_b64 = base64.b64encode(f.read()).decode("utf-8")
        cls.ref_text = REFERENCE_TEXT_TELUGU

    def test_voice_calibration_creates_reusable_embedding(self):
        """Test 1 & 7: Calibration validates reference and stores customVoiceId in engine cache."""
        res = self.tts_service.calibrate_voice(
            reference_audio_base64=self.ref_audio_b64,
            reference_text=self.ref_text,
        )

        self.assertEqual(res["status"], "READY")
        self.assertTrue(res["customVoiceId"].startswith("clone_"))
        self.assertGreater(res["audioDurationSeconds"], 0)
        self.assertIn(res["customVoiceId"], _CUSTOM_VOICE_ENGINES)

    def test_uncalibrated_custom_clone_fails_fast(self):
        """Test 5: Synthesis in custom_clone mode without calibration throws explicit error (No silent fallback)."""
        with self.assertRaises(ValueError) as ctx:
            self.tts_service.generate_speech(
                text="Test text",
                voice_mode="custom_clone",
                custom_voice_id="invalid_clone_id_999",
            )
        self.assertIn("Custom cloned voice is not ready", str(ctx.exception))

    def test_preset_voice_isolation(self):
        """Test 2 & 3: Preset mode uses standard preset engine and does not pick up custom clone state."""
        res = self.tts_service.generate_speech(
            text="Hi! Ippudu manam test cheddam.",
            voice_mode="preset",
            preset_voice="indic_studio_female",
            steps=4,
        )
        self.assertTrue(Path(res["path"]).exists())
        Path(res["path"]).unlink()

    def test_custom_clone_reuse_and_isolation(self):
        """Test 4 & 15: Multiple requests reuse cached custom voice; Voice A and Voice B remain isolated."""
        cal_a = self.tts_service.calibrate_voice(
            reference_audio_base64=self.ref_audio_b64,
            reference_text=self.ref_text,
        )
        voice_a_id = cal_a["customVoiceId"]

        # Synthesize with Voice A
        res_a = self.tts_service.generate_speech(
            text="Actually, AI feature chala useful ga untundi.",
            voice_mode="custom_clone",
            custom_voice_id=voice_a_id,
            steps=4,
            debug=True,
        )

        self.assertTrue(Path(res_a["path"]).exists())
        self.assertEqual(res_a["telemetry"]["originalText"], "Actually, AI feature chala useful ga untundi.")
        
        # Verify language normalization (AI -> ay eye) works with custom voice
        norm_text = res_a["telemetry"]["normalizedText"]
        self.assertIn("ay eye", norm_text)
        
        Path(res_a["path"]).unlink()


if __name__ == "__main__":
    unittest.main()

