import re
from typing import List, Tuple
from backend.services.firewall.interfaces import DetectorInterface
from backend.services.firewall.models import DetectionResult

class RuleBasedDetector(DetectorInterface):
    @property
    def detector_type(self) -> str:
        return "rule_based"

    def __init__(self):
        # Format: (Pattern, Score, Category)
        self.rules: List[Tuple[re.Pattern, int, str]] = [
            # 1. Instruction override
            (re.compile(r"\bignore\s+(?:all\s+)?previous\s+instructions\b"), 80, "instruction_override"),
            (re.compile(r"\bdisregard\s+(?:all\s+)?(?:system\s+)?instructions\b"), 80, "instruction_override"),
            (re.compile(r"\bforget\s+(?:all\s+)?previous\s+instructions\b"), 80, "instruction_override"),
            
            # 2. Role/system manipulation
            (re.compile(r"\byou\s+are\s+now\b"), 60, "role_manipulation"),
            (re.compile(r"\bact\s+as\s+system\b"), 70, "role_manipulation"),
            (re.compile(r"\bsystem\s+message\s*:"), 70, "role_manipulation"),
            (re.compile(r"\bdeveloper\s+message\s*:"), 70, "role_manipulation"),
            
            # 3. Prompt extraction
            (re.compile(r"\breveal\s+your\s+system\s+prompt\b"), 80, "prompt_extraction"),
            (re.compile(r"\bshow\s+your\s+hidden\s+instructions\b"), 80, "prompt_extraction"),
            (re.compile(r"\bdisclose\s+your\s+instructions\b"), 80, "prompt_extraction"),
            
            # 4. Data exfiltration
            (re.compile(r"\bsend\s+the\s+data\s+to\b"), 50, "data_exfiltration"),
            (re.compile(r"\bupload\s+the\s+contents\b"), 50, "data_exfiltration"),
            (re.compile(r"\bforward\s+confidential\s+information\b"), 70, "data_exfiltration"),
            (re.compile(r"\bexpose\s+secrets\b"), 70, "data_exfiltration"),
            
            # 5. Dangerous tool/action requests
            (re.compile(r"\bdelete\s+files\b"), 70, "dangerous_action"),
            (re.compile(r"\bexecute\s+this\s+command\b"), 70, "dangerous_action"),
            (re.compile(r"\brun\s+shell\s+command\b"), 70, "dangerous_action"),
            (re.compile(r"\baccess\s+credentials\b"), 70, "dangerous_action"),
            
            # 6. Instruction smuggling patterns
            (re.compile(r"\b(now|instead|however)\s*,\s*(?:please\s+)?(?:output|print|give\s+me)\b"), 30, "instruction_smuggling"),
            (re.compile(r"^\s*(?:task|objective|goal)\s*:\s*", re.MULTILINE), 20, "instruction_smuggling"),
            (re.compile(r"===+\s*.*?\s*===+"), 10, "instruction_smuggling")
        ]

    def _normalize(self, text: str) -> str:
        text = text.lower()
        # Collapse multiple spaces and tabs into a single space, but leave newlines intact
        text = re.sub(r"[ \t]+", " ", text)
        # Remove zero-width characters used for obfuscation
        text = re.sub(r"[\u200b\u200c\u200d\uFEFF]", "", text)
        return text.strip()

    async def analyze(self, content: str, source_type: str) -> DetectionResult:
        if not content.strip():
            return DetectionResult(
                detected=False,
                risk_score=0,
                category="safe",
                reason="Empty input",
                matched_indicators=[],
                metadata={}
            )
            
        # Truncate to reasonable length to avoid ReDoS or memory issues (e.g. 50k chars)
        content_to_analyze = content[:50000]
        normalized_content = self._normalize(content_to_analyze)
        
        total_score = 0
        matched_indicators = []
        categories = set()
        
        for pattern, score, category in self.rules:
            if pattern.search(normalized_content):
                total_score += score
                matched_indicators.append(pattern.pattern)
                categories.add(category)
                
        if total_score == 0:
            return DetectionResult(
                detected=False,
                risk_score=0,
                category="safe",
                reason="No suspicious patterns found",
                matched_indicators=[],
                metadata={}
            )
            
        # Multiple independent categories increase confidence
        if len(categories) > 1:
            total_score += 15 * (len(categories) - 1)
            
        final_score = min(total_score, 100)
        primary_category = list(categories)[0] if len(categories) == 1 else "mixed"
        
        return DetectionResult(
            detected=True,
            risk_score=final_score,
            category=primary_category,
            reason=f"Matched {len(matched_indicators)} indicators across {len(categories)} categories",
            matched_indicators=matched_indicators,
            metadata={"categories": list(categories)}
        )
