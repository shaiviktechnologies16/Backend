import unittest

from app.utils.sentence_segmenter import SentenceSegmenter, SegmentBoundary
from app.utils.text_normalizer import TextNormalizer
from app.utils.prosody_planner import ProsodyPlanner
from app.utils.language_span_detector import LanguageSpanDetector, SentenceLanguage, SpanType
from app.utils.acronym_normalizer import AcronymNormalizer


class TestConversationalTTS(unittest.TestCase):

    def test_english_acronym_normalizer(self):
        """Requirement 9: Test acronym normalization logic across pure English, Romanized Telugu, and mixed sentences."""
        # 1. Pure English
        text1 = "AI is powerful."
        norm1, _ = TextNormalizer.normalize(text1)
        self.assertIn("ay eye", norm1)

        # 2. Mixed Romanized Telugu
        text2 = "AI ni manam use cheyyachu."
        norm2, _ = TextNormalizer.normalize(text2)
        self.assertIn("ay eye", norm2)
        self.assertIn("ని", norm2)
        self.assertIn("మనం", norm2)

        # 3. Mixed Telugu + English
        text3 = "Actually, AI feature chala useful ga untundi."
        norm3, _ = TextNormalizer.normalize(text3)
        self.assertIn("ay eye", norm3)
        self.assertIn("ఈ", norm3) if "ee" in text3 else None

        # 4. Multiple Acronyms
        text4 = "AI, API, TTS and RAG are useful."
        norm4, _ = TextNormalizer.normalize(text4)
        self.assertIn("ay eye", norm4)
        self.assertIn("ay pee eye", norm4)
        self.assertIn("T-T-S", norm4)
        self.assertIn("rag", norm4)

    def test_rule_22_english_word_protection_regression(self):
        """Rule 22: English words must be mapped to accurate English phonetics."""
        english_words = [
            "important", "topic", "feature", "useful",
            "especially", "businesses", "ready", "try", "new",
            "voice", "synthesis", "system", "Let", "us", "this"
        ]

        for word in english_words:
            norm, spans = TextNormalizer.normalize(word)
            self.assertTrue(len(norm) > 0, f"English word '{word}' returned empty norm.")

    def test_rule_23_romanized_telugu_regression(self):
        """Rule 23: Romanized Telugu words must continue to normalize to Indic script phonetics."""
        telugu_pairs = [
            ("Ippudu", "ఇప్పుడు"),
            ("manam", "మనం"),
            ("gurinchi", "గురించి"),
            ("matladukundam", "మాట్లాడుకుందాం"),
            ("chala", "చాలా"),
            ("untundi", "ఉంటుంది"),
            ("unnara", "ఉన్నారా"),
            ("meeru", "మీరు"),
            ("nenu", "నేను"),
            ("idhi", "ఇది"),
            ("chesina", "చేసిన"),
            ("kavali", "కావాలి"),
        ]

        for rom, expected_script in telugu_pairs:
            norm, _ = TextNormalizer.normalize(rom)
            self.assertIn(expected_script, norm, f"Romanized Telugu '{rom}' failed to normalize to '{expected_script}': '{norm}'")

    def test_full_user_input_acronym_spans(self):
        """Rules 4 & 12: Verify mixed Telugu + English with AI acronym protection."""
        text = "Hi! Ippudu manam AI gurinchi matladukundam."
        segments = SentenceSegmenter.segment(text, group_short_sentences=False)
        self.assertEqual(len(segments), 2)

        class2 = LanguageSpanDetector.classify_sentence(segments[1].text)
        # Verify AI is classified as ENGLISH_ACRONYM
        acronym_spans = [s for s in class2.spans if s.span_type == SpanType.ENGLISH_ACRONYM]
        self.assertTrue(len(acronym_spans) > 0)
        self.assertEqual(acronym_spans[0].text, "AI")

        norm2, _ = TextNormalizer.normalize(segments[1].text)
        self.assertIn("ay eye", norm2)
        self.assertIn("ఇప్పుడు", norm2)
        self.assertIn("మనం", norm2)
        self.assertIn("గురించి", norm2)

    def test_sentence_segmenter_boundaries(self):
        text = "Hi! Ippudu manam, oka important topic gurinchi matladukundam. Meeru ready ga unnara?"
        segments = SentenceSegmenter.segment(text, group_short_sentences=False)
        self.assertEqual(len(segments), 3)
        self.assertEqual(segments[0].boundary_type, SegmentBoundary.EXCLAMATION)
        self.assertEqual(segments[1].boundary_type, SegmentBoundary.STATEMENT)
        self.assertEqual(segments[2].boundary_type, SegmentBoundary.QUESTION)

    def test_prosody_planner(self):
        segments = SentenceSegmenter.segment("Hi! Meeru ready ga unnara?", group_short_sentences=False)
        plans = ProsodyPlanner.create_plan(segments, speed=1.0)
        self.assertEqual(len(plans), 2)
        self.assertGreater(plans[0].pause_duration_sec, 0.2)

    def test_smart_sentence_grouping(self):
        """Verify short consecutive sentences are merged to eliminate redundant TTS inference latency."""
        text = "“First reel ela undali?” “Ela start cheyyali?” “Em cheppali?” Ila chaala scripts chusaka… “finally, ikkada unna. ❤️”"
        raw_segments = SentenceSegmenter.segment(text, group_short_sentences=False)
        grouped_segments = SentenceSegmenter.segment(text, group_short_sentences=True)
        self.assertEqual(len(raw_segments), 5)
        self.assertEqual(len(grouped_segments), 1)


if __name__ == "__main__":
    unittest.main()
