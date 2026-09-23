import logging
from typing import List
from backend.services.firewall.interfaces import DetectorInterface
from backend.services.firewall.models import FirewallDecision, DetectionResult
from backend.services.firewall.policy import PolicyEngine
from backend.services.firewall.aggregator import RiskAggregator

logger = logging.getLogger(__name__)

class SemanticFirewall:
    def __init__(self, detectors: List[DetectorInterface]):
        self.detectors = detectors
        self.policy_engine = PolicyEngine()
        self.aggregator = RiskAggregator()

    async def analyze(self, content: str, source_type: str) -> FirewallDecision:
        results = {}
        combined_metadata = {}
        
        if not self.detectors:
            return self.policy_engine.evaluate(0, "No active detectors", {})
            
        for detector in self.detectors:
            try:
                result: DetectionResult = await detector.analyze(content, source_type)
                results[detector.name] = result
                combined_metadata[detector.name] = {
                    "type": detector.detector_type,
                    "metadata": result.metadata
                }
            except Exception as e:
                logger.error(f"Detector {detector.name} failed: {e}")
                # Fail safely: log and continue. We don't block on detector failure for MVP.
                combined_metadata[detector.name] = {
                    "type": detector.detector_type,
                    "error": "detector_failed", 
                    "details": str(e)
                }

        final_score, primary_reason, agg_meta = self.aggregator.aggregate(results)
        
        for d_name, d_meta in agg_meta.items():
            if d_name in combined_metadata:
                combined_metadata[d_name].update(d_meta)

        return self.policy_engine.evaluate(
            risk_score=final_score,
            reason=primary_reason,
            metadata=combined_metadata
        )
