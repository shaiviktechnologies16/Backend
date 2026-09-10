import re
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional, Dict, Any

from app.utils.english_lexicon import EnglishLexicon
from app.utils.acronym_normalizer import AcronymNormalizer


class SentenceLanguage(str, Enum):
    ENGLISH = "ENGLISH"
    TELUGU_SCRIPT = "TELUGU_SCRIPT"
    ROMANIZED_TELUGU = "ROMANIZED_TELUGU"
    MIXED = "MIXED"
    UNKNOWN = "UNKNOWN"


class SpanType(str, Enum):
    TELUGU_SCRIPT = "TELUGU_SCRIPT"
    ENGLISH_WORD = "ENGLISH_WORD"
    ENGLISH_ACRONYM = "ENGLISH_ACRONYM"
    ROMANIZED_TELUGU = "ROMANIZED_TELUGU"
    TECHNICAL_ACRONYM = "TECHNICAL_ACRONYM"
    NUMBER_CURRENCY = "NUMBER_CURRENCY"
    PUNCTUATION = "PUNCTUATION"
    WHITESPACE = "WHITESPACE"
    UNKNOWN = "UNKNOWN"


@dataclass
class LanguageSpan:
    text: str
    span_type: SpanType
    start: int
    end: int
    confidence: float = 1.0


@dataclass
class SentenceClassification:
    text: str
    language: SentenceLanguage
    confidence: float
    spans: List[LanguageSpan]
    grouped_spans: List[Dict[str, Any]]


# Explicit Romanized Telugu Lexicon (high precision)
ROMANIZED_TELUGU_LEXICON = {
    "idhi", "idi", "adi", "adhi", "ela", "enti", "enduku", "ippudu", "nenu", "nenuu",
    "manam", "meeru", "vaallu", "vallu", "vadu", "aavida", "amayi", "abbayi",
    "chesanu", "chesina", "chestunna", "chestunnanu", "cheddam", "chuddam",
    "matladukundam", "bagundi", "chala", "avuthundi", "avutundi", "kavali",
    "cheyyali", "cheyyachu", "vachindi", "vellali", "roju", "ivala", "eeroju",
    "ee", "aa", "ga", "ki", "ni", "lo", "tho", "na", "ne", "ra", "re", "yela",
    "unnaru", "unnara", "unnaya", "kuda", "cheyyandi", "gurinchi", "mana", "meeku",
    "maku", "naa", "neeku", "naku", "tana", "tanu", "tamu", "kavala", "vasta",
    "vastundi", "vastaru", "poyanu", "poyindi", "undhi", "undi", "unde", "undedi",
    "ayindi", "aindi", "kadu", "kaduu", "ledu", "ledhu", "leka", "mari", "sare",
    "alage", "avunu", "kaani", "kani", "kudaa", "antey", "ante", "cheppa",
    "cheppandi", "telugu", "basha", "bhasha", "prajalu", "oka", "nundi", "untundi",
}


class LanguageSpanDetector:
    @staticmethod
    def classify_sentence(text: str) -> SentenceClassification:
        if not text or not text.strip():
            return SentenceClassification(
                text=text,
                language=SentenceLanguage.UNKNOWN,
                confidence=1.0,
                spans=[],
                grouped_spans=[],
            )

        has_telugu_script = bool(re.search(r"[\u0C00-\u0C7F]", text))
        words = re.findall(r"[A-Za-z]+", text)

        if has_telugu_script and not words:
            spans = LanguageSpanDetector.detect_spans(text, SentenceLanguage.TELUGU_SCRIPT)
            grouped = LanguageSpanDetector._group_spans(spans)
            return SentenceClassification(
                text=text,
                language=SentenceLanguage.TELUGU_SCRIPT,
                confidence=1.0,
                spans=spans,
                grouped_spans=grouped,
            )

        if has_telugu_script and words:
            spans = LanguageSpanDetector.detect_spans(text, SentenceLanguage.MIXED)
            grouped = LanguageSpanDetector._group_spans(spans)
            return SentenceClassification(
                text=text,
                language=SentenceLanguage.MIXED,
                confidence=0.95,
                spans=spans,
                grouped_spans=grouped,
            )

        if not words:
            spans = LanguageSpanDetector.detect_spans(text, SentenceLanguage.UNKNOWN)
            grouped = LanguageSpanDetector._group_spans(spans)
            return SentenceClassification(
                text=text,
                language=SentenceLanguage.UNKNOWN,
                confidence=1.0,
                spans=spans,
                grouped_spans=grouped,
            )

        # Word Token Analysis
        eng_count = 0
        rom_te_count = 0
        acr_count = 0

        for w in words:
            if LanguageSpanDetector._is_acronym(w):
                acr_count += 1
            elif w.lower() in ROMANIZED_TELUGU_LEXICON:
                rom_te_count += 1
            elif EnglishLexicon.is_english_word(w):
                eng_count += 1
            elif LanguageSpanDetector._looks_like_romanized_telugu(w.lower()):
                rom_te_count += 1
            else:
                eng_count += 1

        if rom_te_count == 0 and (eng_count + acr_count) > 0:
            lang = SentenceLanguage.ENGLISH
            conf = 1.0
        elif rom_te_count > 0 and (eng_count + acr_count) > 0:
            lang = SentenceLanguage.MIXED
            conf = 0.95
        elif rom_te_count > 0 and (eng_count + acr_count) == 0:
            lang = SentenceLanguage.ROMANIZED_TELUGU
            conf = 0.95
        else:
            lang = SentenceLanguage.ENGLISH
            conf = 0.85

        spans = LanguageSpanDetector.detect_spans(text, sentence_lang=lang)
        grouped = LanguageSpanDetector._group_spans(spans)

        return SentenceClassification(
            text=text,
            language=lang,
            confidence=conf,
            spans=spans,
            grouped_spans=grouped,
        )

    @staticmethod
    def detect_spans(text: str, sentence_lang: Optional[SentenceLanguage] = None) -> List[LanguageSpan]:
        spans: List[LanguageSpan] = []
        if not text:
            return spans

        pattern = re.compile(
            r"([\u0C00-\u0C7F]+)|"  # Telugu script
            r"([₹$€£]\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?%?)|"  # Numbers & Currency
            r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|"  # Email
            r"(https?://\S+|www\.\S+)|"  # URL
            r"([A-Za-z]+(?:\.[A-Za-z]+)+)|"  # Acronyms with dots e.g. A.P.I.
            r"([A-Za-z]+)|"  # Words
            r"([\s]+)|"  # Whitespace
            r"([.?!…।॥,;:—\-\(\)\[\]\"'])|"  # Punctuation
            r"(.)"  # Fallback
        )

        for match in pattern.finditer(text):
            val = match.group(0)
            start, end = match.span()

            telugu_group, num_group, email_group, url_group, acr_group, word_group, ws_group, punc_group, _ = match.groups()

            if telugu_group:
                spans.append(LanguageSpan(val, SpanType.TELUGU_SCRIPT, start, end, 1.0))
            elif num_group or email_group or url_group:
                spans.append(LanguageSpan(val, SpanType.NUMBER_CURRENCY, start, end, 1.0))
            elif acr_group or (word_group and LanguageSpanDetector._is_acronym(val)):
                spans.append(LanguageSpan(val, SpanType.ENGLISH_ACRONYM, start, end, 1.0))
            elif word_group:
                lower = val.lower()
                if sentence_lang == SentenceLanguage.ENGLISH:
                    spans.append(LanguageSpan(val, SpanType.ENGLISH_WORD, start, end, 1.0))
                else:
                    if lower in ROMANIZED_TELUGU_LEXICON:
                        spans.append(LanguageSpan(val, SpanType.ROMANIZED_TELUGU, start, end, 0.98))
                    elif EnglishLexicon.is_english_word(lower):
                        spans.append(LanguageSpan(val, SpanType.ENGLISH_WORD, start, end, 0.99))
                    elif LanguageSpanDetector._looks_like_romanized_telugu(lower):
                        spans.append(LanguageSpan(val, SpanType.ROMANIZED_TELUGU, start, end, 0.90))
                    else:
                        spans.append(LanguageSpan(val, SpanType.ENGLISH_WORD, start, end, 0.70))
            elif ws_group:
                spans.append(LanguageSpan(val, SpanType.WHITESPACE, start, end, 1.0))
            elif punc_group:
                spans.append(LanguageSpan(val, SpanType.PUNCTUATION, start, end, 1.0))
            else:
                spans.append(LanguageSpan(val, SpanType.UNKNOWN, start, end, 0.50))

        return spans

    @staticmethod
    def _is_acronym(word: str) -> bool:
        if word in AcronymNormalizer.ACRONYM_LEXICON or word.upper() in AcronymNormalizer.ACRONYM_LEXICON:
            return True
        if word.isupper() and 2 <= len(word) <= 4:
            return True
        return False

    @staticmethod
    def _looks_like_romanized_telugu(word: str) -> bool:
        if len(word) < 3:
            return False
        if EnglishLexicon.is_english_word(word):
            return False
        if re.search(r"(dh|ch|th|bb|kk|tt|pp|dd|mm|nn|uu|oo|ee|aa)", word):
            return True
        if word.endswith(("du", "ru", "na", "nu", "ma", "mu", "am", "an", "lu", "ra", "ri", "da", "di")):
            return True
        return False

    @staticmethod
    def _group_spans(spans: List[LanguageSpan]) -> List[Dict[str, Any]]:
        groups: List[Dict[str, Any]] = []
        current_group_text = []
        current_type = None
        current_conf = 1.0

        for span in spans:
            if span.span_type in (SpanType.WHITESPACE, SpanType.PUNCTUATION):
                if current_group_text:
                    current_group_text.append(span.text)
                continue

            lang_label = "EN"
            if span.span_type == SpanType.ENGLISH_ACRONYM:
                lang_label = "ENGLISH_ACRONYM"
            elif span.span_type == SpanType.ROMANIZED_TELUGU:
                lang_label = "TE-LATN"
            elif span.span_type == SpanType.TELUGU_SCRIPT:
                lang_label = "TE"

            if current_type is None:
                current_type = lang_label
                current_conf = span.confidence
                current_group_text.append(span.text)
            elif current_type == lang_label:
                current_group_text.append(span.text)
                current_conf = min(current_conf, span.confidence)
            else:
                text_str = "".join(current_group_text).strip()
                if text_str:
                    groups.append({
                        "text": text_str,
                        "language": current_type,
                        "confidence": round(current_conf, 2),
                    })
                current_type = lang_label
                current_conf = span.confidence
                current_group_text = [span.text]

        if current_group_text:
            text_str = "".join(current_group_text).strip()
            if text_str:
                groups.append({
                    "text": text_str,
                    "language": current_type,
                    "confidence": round(current_conf, 2),
                })

        return groups
