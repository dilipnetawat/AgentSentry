import re
import unicodedata
import base64
import urllib.parse
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

# Zero-width and invisible control characters often used to evade keyword matching
ZERO_WIDTH_PATTERN = re.compile(r"[\u200b\u200c\u200d\uFEFF\u00ad\u200e\u200f\u202a-\u202e]")

# Leetspeak substitution dictionary
LEET_MAP = str.maketrans({
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "@": "a",
    "5": "s",
    "$": "s",
    "7": "t",
    "8": "b",
    "!": "i",
    "+": "t",
    "(": "c",
    "|": "i"
})

# Base64 candidate regex: at least 16 continuous Base64 characters with optional padding
BASE64_CANDIDATE_REGEX = re.compile(r"(?:^|[\s:;,])([A-Za-z0-9+/]{16,}={0,2})(?:[\s:;,\.]|$)")

# Keywords that indicate meaningful leetspeak unmasking
SUSPICIOUS_KEYWORD_INDICATORS = {
    "ignore", "disregard", "system", "prompt", "secret", "delete", "execute", "bypass", "admin"
}

@dataclass
class NormalizedInput:
    original_text: str
    normalized_text: str
    lowered_text: str
    unleeted_text: str
    transformations_applied: List[str] = field(default_factory=list)
    decoded_payloads: List[Dict[str, str]] = field(default_factory=list)
    is_truncated: bool = False
    original_length: int = 0
    effective_length: int = 0

class InputNormalizer:
    """
    Deterministic input normalizer for Local Security Engine.
    Safely preprocesses inputs to defeat zero-width evasion, Unicode homoglyphs,
    URL percent-encoding, Leetspeak, and Base64 encapsulation.
    """
    def __init__(self, max_length: int = 50000):
        self.max_length = max_length

    def normalize(self, text: str) -> NormalizedInput:
        if not isinstance(text, str):
            text = str(text) if text is not None else ""

        original_text = text
        original_length = len(text)
        transformations: List[str] = []
        decoded_payloads: List[Dict[str, str]] = []
        is_truncated = False

        # 1. Length enforcement (prevent ReDoS or resource exhaustion)
        if len(text) > self.max_length:
            text = text[:self.max_length]
            is_truncated = True
            transformations.append(f"truncated_to_{self.max_length}_chars")

        # 2. Zero-width character stripping
        if ZERO_WIDTH_PATTERN.search(text):
            text = ZERO_WIDTH_PATTERN.sub("", text)
            transformations.append("zero_width_stripped")

        # 3. Unicode NFKC normalization (normalizes fullwidth and compatibility homoglyphs)
        nfkc_text = unicodedata.normalize("NFKC", text)
        if nfkc_text != text:
            text = nfkc_text
            transformations.append("unicode_nfkc_normalized")

        # 4. URL percent-decoding detection
        if "%" in text:
            try:
                unquoted = urllib.parse.unquote(text)
                if unquoted != text:
                    text = unquoted
                    transformations.append("url_percent_decoded")
            except Exception:
                pass

        # 5. Whitespace and newline collapsing
        # Normalizes multiple spaces and tabs to a single space, preserves single linebreaks
        cleaned_whitespace = re.sub(r"[ \t]+", " ", text)
        cleaned_whitespace = re.sub(r"\r\n", "\n", cleaned_whitespace)
        if cleaned_whitespace != text:
            text = cleaned_whitespace
            transformations.append("whitespace_collapsed")

        # 6. Base64 payload inspection (safely decodes without executing)
        b64_matches = BASE64_CANDIDATE_REGEX.findall(text)
        for cand in b64_matches[:5]:  # limit to top 5 candidates to prevent DoS
            try:
                cand_clean = cand.strip()
                # Ensure length is multiple of 4 with padding if needed
                missing_padding = len(cand_clean) % 4
                if missing_padding:
                    cand_clean += "=" * (4 - missing_padding)
                decoded_bytes = base64.b64decode(cand_clean, validate=False)
                decoded_str = decoded_bytes.decode("utf-8", errors="strict").strip()
                # Ensure the decoded string contains printable words
                if len(decoded_str) >= 4 and all(32 <= ord(c) < 127 or c in "\n\t" for c in decoded_str):
                    decoded_payloads.append({
                        "encoded_snippet": cand[:32] + ("..." if len(cand) > 32 else ""),
                        "decoded_payload": decoded_str[:200]
                    })
                    if "base64_payload_extracted" not in transformations:
                        transformations.append("base64_payload_extracted")
            except Exception:
                continue

        # 7. Lowercase representation for case-insensitive matching
        lowered_text = text.lower().strip()

        # 8. Leetspeak unmasking check
        unleeted_candidate = lowered_text.translate(LEET_MAP)
        if unleeted_candidate != lowered_text:
            if "leetspeak_unmasked" not in transformations:
                transformations.append("leetspeak_unmasked")

        return NormalizedInput(
            original_text=original_text,
            normalized_text=text.strip(),
            lowered_text=lowered_text,
            unleeted_text=unleeted_candidate,
            transformations_applied=transformations,
            decoded_payloads=decoded_payloads,
            is_truncated=is_truncated,
            original_length=original_length,
            effective_length=len(text.strip())
        )
