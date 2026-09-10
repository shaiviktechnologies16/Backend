"""
English Transliterator Module (Legacy / Fallback)

With the updated two-level language routing architecture, TextNormalizer cleanly
preserves English words in Latin script (which IndicF5 handles natively) and translates
validated Romanized Telugu words into Indic script phonetics.

This module now acts as a pass-through to ensure English sentences and words are never
mangled by letter-by-letter regex rules.
"""

def transliterate_english_word(word: str) -> str:
    """Pass-through: English words remain intact in Latin script for natural model pronunciation."""
    return word


def transliterate_english_text_to_indic(text: str) -> str:
    """Pass-through: Preserves normalized text where English words are in Latin script
    and Telugu script phonetics are already properly formatted by TextNormalizer.
    """
    return text
