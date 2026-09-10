import re
from typing import Dict


class AcronymNormalizer:
    """
    Configurable English Acronym & Initialism Normalizer.
    Translates acronyms (AI, API, UI, UX, TTS, STT, RAG, SaaS, etc.) into natural
    English phonetic representations before Romanized Telugu normalization.
    """

    # Configurable English Acronym Lexicon
    ACRONYM_LEXICON: Dict[str, str] = {
        "AI": "ay eye",
        "API": "ay pee eye",
        "UI": "you eye",
        "UX": "you ex",
        "TTS": "T-T-S",
        "STT": "S-T-T",
        "RAG": "rag",
        "SaaS": "sass",
        "SAAS": "sass",
        "CEO": "see ee oh",
        "CTO": "see tee oh",
        "CFO": "see eff oh",
        "HR": "aitch ar", "URL": "yoo ar el",
        "URI": "yoo ar eye",
        "SQL": "sequel",
        "PDF": "P-D-F",
        "HTTP": "H-T-T-P",
        "HTTPS": "H-T-T-P-S",
        "IP": "I-P",
        "DB": "D-B",
        "LLM": "L-L-M",
        "MLX": "M-L-X",
        "Qwen": "Qwen",
        "WhatsApp": "WhatsApp",
    }

    @classmethod
    def get_acronym_pronunciation(cls, token: str) -> str:
        clean = token.strip()
        # Direct lookup preserving case e.g. AI, API, SaaS, WhatsApp
        if clean in cls.ACRONYM_LEXICON:
            return cls.ACRONYM_LEXICON[clean]

        upper = clean.upper()
        if upper in cls.ACRONYM_LEXICON:
            return cls.ACRONYM_LEXICON[upper]

        # Safe fallback for short uppercase acronyms e.g. ABC -> A-B-C
        if clean.isupper() and 2 <= len(clean) <= 4:
            return "-".join(list(clean))

        return clean

    @classmethod
    def normalize_acronyms_in_text(cls, text: str) -> str:
        def replace_match(match):
            word = match.group(0)
            return cls.get_acronym_pronunciation(word)

        # Match standalone acronym words preserving hyphenation/punctuation
        acronym_pattern = re.compile(r"\b[A-Z]{2,4}\b|\bSaaS\b|\bWhatsApp\b|\bQwen\b")
        return acronym_pattern.sub(replace_match, text)

