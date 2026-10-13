from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from backend.services.firewall.rules import RuleMatch

@dataclass
class ScoringBreakdown:
    category_scores: Dict[str, int]
    independent_categories_count: int
    base_aggregate_score: int
    multi_category_boost: int
    final_score: int
    risk_band: str
    primary_category: str
    matched_rules: List[RuleMatch]
    score_explanation: str
    coverage_limitation: str
    recommended_action: str
    is_enforced: bool = False

class TransparentRiskScorer:
    """
    Central, deterministic risk scoring function for Local Security Engine.
    Groups findings to prevent double-counting within categories,
    applies multi-category synergy weighting, and caps score strictly at 100.
    """
    BAND_LOW_MAX = 29
    BAND_SUSPICIOUS_MAX = 69

    COVERAGE_LIMITATION_DISCLAIMER = (
        "Coverage Notice: Local heuristic analysis evaluates inputs against a deterministic registry "
        "of known attack signatures and structural markers. It does not prove that an input is completely safe "
        "from novel zero-day prompt evasion techniques or highly complex semantic obfuscations."
    )

    def calculate_score(
        self,
        matches: List[RuleMatch],
        enforce_action: bool = True
    ) -> ScoringBreakdown:
        if not matches:
            return ScoringBreakdown(
                category_scores={},
                independent_categories_count=0,
                base_aggregate_score=0,
                multi_category_boost=0,
                final_score=0,
                risk_band="LOW",
                primary_category="safe",
                matched_rules=[],
                score_explanation="No known suspicious patterns detected. Risk score: 0/100.",
                coverage_limitation=self.COVERAGE_LIMITATION_DISCLAIMER,
                recommended_action="ALLOW",
                is_enforced=enforce_action
            )

        # 1. Group rules by category to prevent artificial inflation from redundant rules
        category_matches: Dict[str, List[RuleMatch]] = {}
        for m in matches:
            category_matches.setdefault(m.category, []).append(m)

        # 2. Within each category, take max(base_score) and add modest boost for multiple distinct rules
        category_scores: Dict[str, int] = {}
        category_top_rules: Dict[str, RuleMatch] = {}
        for cat, rule_list in category_matches.items():
            top_rule = max(rule_list, key=lambda r: r.base_score)
            distinct_rule_ids = set(r.rule_id for r in rule_list)
            intra_boost = 20 * (len(distinct_rule_ids) - 1)
            category_scores[cat] = min(top_rule.base_score + intra_boost, 100)
            category_top_rules[cat] = top_rule

        # 3. Sum across distinct categories
        base_sum = sum(category_scores.values())

        # 4. Independent category synergy boost (presence of multiple independent attack categories)
        num_categories = len(category_scores)
        boost = 15 * (num_categories - 1) if num_categories > 1 else 0
        total_score = base_sum + boost

        # 5. Cap score at 100
        final_score = min(max(0, total_score), 100)

        # 6. Map to risk band & recommended action
        if final_score <= self.BAND_LOW_MAX:
            risk_band = "LOW"
            recommended_action = "ALLOW"
        elif final_score <= self.BAND_SUSPICIOUS_MAX:
            risk_band = "SUSPICIOUS"
            recommended_action = "QUARANTINE"
        else:
            risk_band = "HIGH"
            recommended_action = "BLOCK"

        # Determine primary category
        if num_categories == 1:
            primary_category = list(category_scores.keys())[0]
        else:
            primary_category = "mixed"

        # 7. Formulate readable explanation
        rule_summaries = [f"{r.rule_id} ({r.category}: {r.base_score} pts)" for r in matches]
        explanation = (
            f"Detected {len(matches)} rule pattern(s) across {num_categories} category(ies): "
            f"{', '.join(rule_summaries)}. Base category score: {base_sum} pts."
        )
        if boost > 0:
            explanation += f" Multi-category synergy boost: +{boost} pts."
        explanation += f" Final risk score: {final_score}/100 [{risk_band} RISK]."

        return ScoringBreakdown(
            category_scores=category_scores,
            independent_categories_count=num_categories,
            base_aggregate_score=base_sum,
            multi_category_boost=boost,
            final_score=final_score,
            risk_band=risk_band,
            primary_category=primary_category,
            matched_rules=matches,
            score_explanation=explanation,
            coverage_limitation=self.COVERAGE_LIMITATION_DISCLAIMER,
            recommended_action=recommended_action,
            is_enforced=enforce_action
        )
