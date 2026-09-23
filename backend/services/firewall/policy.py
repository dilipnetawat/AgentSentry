from backend.services.firewall.models import FirewallDecision

class PolicyEngine:
    def evaluate(self, risk_score: int, reason: str, metadata: dict) -> FirewallDecision:
        # Based on MVP architecture thresholds
        if risk_score >= 70:
            decision = "BLOCK"
        elif risk_score >= 30:
            decision = "QUARANTINE"
        else:
            decision = "ALLOW"
            
        return FirewallDecision(
            decision=decision,
            risk_score=risk_score,
            reason=reason,
            metadata=metadata
        )
