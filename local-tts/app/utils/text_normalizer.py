import re
from typing import Dict, List, Tuple
from app.utils.language_span_detector import LanguageSpanDetector, SpanType, LanguageSpan, SentenceLanguage
from app.utils.english_pronunciation_processor import EnglishPronunciationProcessor
from app.utils.acronym_normalizer import AcronymNormalizer

# High-precision Romanized Telugu to Telugu Script dictionary
ROMANIZED_TO_TELUGU_DICT: Dict[str, str] = {
    "idhi": "ఇది",
    "idi": "ఇది",
    "adi": "అది",
    "adhi": "అది",
    "nenu": "నేను",
    "nenuu": "నేనూ",
    "manam": "మనం",
    "meeru": "మీరు",
    "ela": "ఎలా",
    "yela": "ఎలా",
    "enti": "ఏంటి",
    "enduku": "ఎందుకు",
    "ippudu": "ఇప్పుడు",
    "chesina": "చేసిన",
    "chesanu": "చేసాను",
    "chestunnanu": "చేస్తున్నాను",
    "chestunna": "చేస్తున్నాను",
    "chestunnam": "చేస్తున్నాం",
    "chestunnamu": "చేస్తున్నాం",
    "cheddam": "చేద్దాం",
    "chuddam": "చూద్దాం",
    "matladukundam": "మాట్లాడుకుందాం",
    "bagundi": "బాగుంది",
    "chala": "చాలా",
    "avuthundi": "అవుతుంది",
    "avutundi": "అవుతుంది",
    "kavali": "కావాలి",
    "cheyyali": "చేయ్యాలి",
    "cheyyachu": "చేయ్యొచ్చు",
    "vachindi": "వచ్చింది",
    "vellali": "వెళ్ళాలి",
    "roju": "రోజు",
    "ivala": "ఇవాళ",
    "eeroju": "ఈరోజు",
    "ee": "ఈ",
    "aa": "ఆ",
    "unnaru": "ఉన్నారు",
    "unnara": "ఉన్నారా",
    "unnaya": "ఉన్నాయా",
    "kuda": "కూడా",
    "kudaa": "కూడా",
    "cheyyandi": "చేయండి",
    "gurinchi": "గురించి",
    "mana": "మన",
    "meeku": "మీకు",
    "maku": "మాకు",
    "naa": "నా",
    "na": "నా",
    "neeku": "నీకు",
    "naku": "నాకు",
    "undhi": "ఉంది",
    "undi": "ఉంది",
    "ayindi": "అయింది",
    "aindi": "అయింది",
    "kadu": "కాదు",
    "ledu": "లేదు",
    "ledhu": "లేదు",
    "mari": "మరి",
    "sare": "సరే",
    "alage": "అలాగే",
    "avunu": "అవును",
    "kaani": "కానీ",
    "kani": "కానీ",
    "cheppa": "చెప్పా",
    "cheppandi": "చెప్పండి",
    "telugu": "తెలుగు",
    "basha": "భాష",
    "bhasha": "భాష",
    "oka": "ఒక",
    "ki": "కి",
    "ni": "ని",
    "tho": "తో",
    "lo": "లో",
    "nundi": "నుండి",
    "untundi": "ఉంటుంది",
    "ga": "గా",
}


class TextNormalizer:
    @staticmethod
    def normalize(text: str) -> Tuple[str, List[Dict]]:
        classification = LanguageSpanDetector.classify_sentence(text)
        normalized_tokens: List[str] = []
        span_debug: List[Dict] = []

        for span in classification.spans:
            norm_val = span.text

            if span.span_type == SpanType.ENGLISH_ACRONYM:
                norm_val = AcronymNormalizer.get_acronym_pronunciation(span.text)

            elif span.span_type == SpanType.ENGLISH_WORD:
                norm_val = EnglishPronunciationProcessor.process_word(span.text)

            elif span.span_type == SpanType.ROMANIZED_TELUGU:
                lower = span.text.lower()
                if lower in ROMANIZED_TO_TELUGU_DICT:
                    norm_val = ROMANIZED_TO_TELUGU_DICT[lower]
                else:
                    norm_val = span.text

            elif span.span_type == SpanType.TECHNICAL_ACRONYM:
                norm_val = AcronymNormalizer.get_acronym_pronunciation(span.text)

            elif span.span_type == SpanType.NUMBER_CURRENCY:
                norm_val = TextNormalizer._normalize_number_or_currency(span.text)

            normalized_tokens.append(norm_val)

            span_debug.append({
                "original": span.text,
                "normalized": norm_val,
                "type": span.span_type.value,
                "confidence": span.confidence,
                "sentenceLanguage": classification.language.value,
            })

        normalized_text = "".join(normalized_tokens)
        return normalized_text, span_debug

    @staticmethod
    def _normalize_number_or_currency(token: str) -> str:
        if "₹" in token or "rs" in token.lower() or "rupees" in token.lower():
            nums = re.findall(r"\d+", token)
            if nums:
                return f"{nums[0]} రూపాయలు"

        nums = re.findall(r"\d+", token)
        if nums:
            num = int(nums[0])
            if num == 100:
                return "వంద"
            if num == 1000:
                return "వేయి"

        return token
