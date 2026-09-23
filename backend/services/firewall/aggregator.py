from typing import Dict, Any, Tuple
from backend.services.firewall.models import DetectionResult

class RiskAggregator:
    def aggregate(self, results: Dict[str, DetectionResult]) -> Tuple[int, str, Dict[str, Any]]:
        """
        Takes results from multiple detectors and aggregates them deterministically.
        Uses max() for scores within the same category to prevent double counting,
        then sums across independent categories, capped at 100.
        """
        if not results:
            return 0, "No active detectors", {}
            
        category_scores: Dict[str, int] = {}
        reasons = []
        combined_metadata = {}
        
        for detector_name, result in results.items():
            combined_metadata[detector_name] = {
                "risk_score": result.risk_score,
                "reason": result.reason,
                "category": getattr(result, "category", "safe"),
                "detected": getattr(result, "detected", False),
            }
            if hasattr(result, "metadata"):
                combined_metadata[detector_name].update(result.metadata)
                
            if getattr(result, "detected", False) or result.risk_score > 0:
                cat = getattr(result, "category", "safe")
                
                # Keep distinct reasons for explainability
                if result.reason and f"[{detector_name}] {result.reason}" not in reasons:
                    reasons.append(f"[{detector_name}] {result.reason}")
                
                if cat and cat != "safe":
                    if cat not in category_scores:
                        category_scores[cat] = result.risk_score
                    else:
                        # Max score for the same category
                        category_scores[cat] = max(category_scores[cat], result.risk_score)
                else:
                    # If it's a "safe" category but has risk > 0, track it uniquely
                    safe_key = f"safe_{detector_name}"
                    category_scores[safe_key] = result.risk_score

        total_score = sum(category_scores.values())

        # Cross-detector confidence boost (if multiple independent categories found)
        detected_categories = [c for c in category_scores.keys() if not c.startswith("safe_")]
        if len(detected_categories) > 1:
            total_score += 15 * (len(detected_categories) - 1)
            
        final_score = min(total_score, 100)
        
        if final_score == 0:
            primary_reason = "Safe content"
        else:
            primary_reason = " | ".join(reasons)
            
        return final_score, primary_reason, combined_metadata
