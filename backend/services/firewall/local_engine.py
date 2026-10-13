import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

from backend.services.firewall.normalizer import InputNormalizer, NormalizedInput
from backend.services.firewall.rules import build_rule_registry, SecurityRule, RuleMatch
from backend.services.firewall.scorer import TransparentRiskScorer, ScoringBreakdown

logger = logging.getLogger(__name__)

@dataclass
class LocalEngineResult:
    detected: bool
    risk_score: int
    risk_band: str
    category: str
    reason: str
    matched_indicators: List[str]
    matched_rules: List[Dict[str, Any]]
    transformations_applied: List[str]
    decoded_payloads: List[Dict[str, str]]
    recommended_action: str
    is_enforced: bool
    coverage_limitation: str
    metadata: Dict[str, Any]

class LocalSecurityEngine:
    """
    Self-contained, deterministic Local Security Engine for AgentSentry.
    Analyzes prompts entirely offline without requiring Gemini, OpenAI,
    Ollama, or any external AI inference API.
    """
    _instance: Optional["LocalSecurityEngine"] = None

    def __init__(self, max_length: int = 50000):
        self.normalizer = InputNormalizer(max_length=max_length)
        self.rules = build_rule_registry()
        self.scorer = TransparentRiskScorer()

    @classmethod
    def get_instance(cls) -> "LocalSecurityEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def analyze(self, content: str, source_type: str = "direct") -> LocalEngineResult:
        """
        Executes end-to-end local prompt security analysis:
        1. Preprocessing & Normalization
        2. Rule-based heuristic pattern matching across 7 categories
        3. Transparent risk scoring with category de-duplication
        4. Policy action determination
        """
        # Empty input handling
        if not content or not content.strip():
            return LocalEngineResult(
                detected=False,
                risk_score=0,
                risk_band="LOW",
                category="safe",
                reason="Empty input",
                matched_indicators=[],
                matched_rules=[],
                transformations_applied=[],
                decoded_payloads=[],
                recommended_action="ALLOW",
                is_enforced=True,
                coverage_limitation=self.scorer.COVERAGE_LIMITATION_DISCLAIMER,
                metadata={"categories": []}
            )

        # 1. Normalization
        normalized_input = self.normalizer.normalize(content)

        # 2. Rule Evaluation
        matches: List[RuleMatch] = []
        for rule in self.rules:
            match = rule.match(
                lowered_text=normalized_input.lowered_text,
                unleeted_text=normalized_input.unleeted_text,
                original_text=normalized_input.original_text
            )
            if match:
                matches.append(match)

        # Also inspect decoded Base64 payloads if present
        for payload_info in normalized_input.decoded_payloads:
            decoded_text = payload_info.get("decoded_payload", "").lower()
            for rule in self.rules:
                if any(p.search(decoded_text) for p in rule.patterns):
                    if not any(m.rule_id == rule.rule_id for m in matches):
                        matches.append(RuleMatch(
                            rule_id=f"{rule.rule_id}-B64",
                            category=rule.category,
                            severity=rule.severity,
                            name=f"{rule.name} (Base64 Encapsulated)",
                            description=f"{rule.description} (extracted from decoded Base64 payload)",
                            base_score=rule.base_score,
                            matched_excerpt=f"[Base64 Payload] {decoded_text[:100]}",
                            pattern_matched="BASE64_DECODED_PATTERN",
                            mitigation=rule.mitigation,
                            version=rule.version
                        ))

        # 3. Transparent Risk Scoring
        breakdown = self.scorer.calculate_score(matches, enforce_action=True)

        detected = breakdown.final_score > 0
        categories_list = list(breakdown.category_scores.keys())

        matched_indicators = [m.pattern_matched for m in matches]
        matched_rules_data = [
            {
                "rule_id": m.rule_id,
                "category": m.category,
                "severity": m.severity,
                "name": m.name,
                "description": m.description,
                "score": m.base_score,
                "matched_excerpt": m.matched_excerpt,
                "mitigation": m.mitigation,
                "version": m.version
            }
            for m in matches
        ]

        if not detected:
            reason = "No known suspicious patterns detected"
        else:
            reason = f"Matched {len(matches)} indicators across {len(categories_list)} categories"

        metadata = {
            "categories": categories_list,
            "rule_ids": [m.rule_id for m in matches],
            "transformations_applied": normalized_input.transformations_applied,
            "decoded_payloads": normalized_input.decoded_payloads,
            "scoring_breakdown": {
                "base_score": breakdown.base_aggregate_score,
                "synergy_boost": breakdown.multi_category_boost,
                "final_score": breakdown.final_score,
                "risk_band": breakdown.risk_band,
                "explanation": breakdown.score_explanation
            },
            "source_type": source_type
        }

        return LocalEngineResult(
            detected=detected,
            risk_score=breakdown.final_score,
            risk_band=breakdown.risk_band,
            category=breakdown.primary_category,
            reason=reason,
            matched_indicators=matched_indicators,
            matched_rules=matched_rules_data,
            transformations_applied=normalized_input.transformations_applied,
            decoded_payloads=normalized_input.decoded_payloads,
            recommended_action=breakdown.recommended_action,
            is_enforced=breakdown.is_enforced,
            coverage_limitation=breakdown.coverage_limitation,
            metadata=metadata
        )

    def generate_local_forensics(self, result: LocalEngineResult) -> str:
        """
        Deterministically produces human-readable threat forensics
        without making external AI provider calls.
        """
        if not result.detected:
            return (
                f"Local Security Engine Analysis: Input was screened through {len(self.rules)} deterministic "
                f"heuristic rules across 7 attack categories. Threat score: 0/100 (LOW RISK). "
                f"No known malicious patterns detected. Notice: Static heuristics do not guarantee absence of zero-day evasion."
            )

        rules_list_str = "; ".join([f"{r['rule_id']} - {r['name']}" for r in result.matched_rules])
        mitigations = list(set([r['mitigation'] for r in result.matched_rules]))
        mitigations_str = " ".join([f"• {m}" for m in mitigations])

        transformations_str = ""
        if result.transformations_applied:
            transformations_str = f" Normalization events: {', '.join(result.transformations_applied)}."

        return (
            f"Local Security Engine Forensic Breakdown [AIR-GAPPED]:\n"
            f"• Risk Verdict: {result.recommended_action} (Threat Intensity: {result.risk_score}/100, Band: {result.risk_band})\n"
            f"• Primary Vector: {result.category.replace('_', ' ').title()}\n"
            f"• Triggered Rules: {rules_list_str}.{transformations_str}\n"
            f"• Recommended Defenses:\n{mitigations_str}\n"
            f"• Engine Limitation: {result.coverage_limitation}"
        )
