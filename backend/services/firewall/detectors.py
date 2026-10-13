import logging
from typing import List, Tuple
from backend.services.firewall.interfaces import DetectorInterface
from backend.services.firewall.models import DetectionResult
from backend.services.firewall.local_engine import LocalSecurityEngine

logger = logging.getLogger(__name__)

class RuleBasedDetector(DetectorInterface):
    """
    Modular RuleBasedDetector wrapping the LocalSecurityEngine.
    Enforces deterministic normalization, multi-category heuristics,
    category grouping, and transparent risk scoring.
    """
    @property
    def detector_type(self) -> str:
        return "rule_based"

    def __init__(self, max_length: int = 50000):
        self.engine = LocalSecurityEngine.get_instance()
        # Maintain compatibility property
        self.rules = self.engine.rules

    def _normalize(self, text: str) -> str:
        """Backward-compatible normalization method."""
        normalized = self.engine.normalizer.normalize(text)
        return normalized.lowered_text

    async def analyze(self, content: str, source_type: str = "direct") -> DetectionResult:
        """
        Analyzes content using the deterministic Local Security Engine.
        """
        local_result = await self.engine.analyze(content, source_type=source_type)

        metadata = dict(local_result.metadata)
        metadata["rules_matched"] = local_result.matched_rules
        metadata["coverage_limitation"] = local_result.coverage_limitation
        metadata["risk_band"] = local_result.risk_band
        metadata["recommended_action"] = local_result.recommended_action

        return DetectionResult(
            detected=local_result.detected,
            risk_score=local_result.risk_score,
            category=local_result.category,
            reason=local_result.reason,
            matched_indicators=local_result.matched_indicators,
            metadata=metadata
        )
