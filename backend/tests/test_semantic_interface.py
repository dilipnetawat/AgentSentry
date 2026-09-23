import pytest
from backend.services.firewall.interfaces import SemanticDetectorInterface, DetectorInterface
from backend.services.firewall.models import DetectionResult
from backend.services.firewall.pipeline import SemanticFirewall

class MockMLDetector(SemanticDetectorInterface):
    @property
    def name(self) -> str:
        return "MockMLSemanticDetector"

    async def analyze(self, content: str, source_type: str) -> DetectionResult:
        # Mock semantic analysis
        if "semantic attack" in content.lower():
            return DetectionResult(
                detected=True,
                risk_score=65,
                category="semantic_evasion",
                reason="High embedding similarity to known attacks",
                matched_indicators=[],
                metadata={"confidence": 0.95, "model_version": "v1.0"}
            )
        return DetectionResult(
            detected=False,
            risk_score=0,
            category="safe",
            reason="No semantic matches",
            matched_indicators=[],
            metadata={"confidence": 0.99, "model_version": "v1.0"}
        )

@pytest.mark.asyncio
async def test_semantic_interface_stub():
    detector = MockMLDetector()
    assert detector.name == "MockMLSemanticDetector"
    assert detector.detector_type == "semantic"
    
    # Test safe content
    res1 = await detector.analyze("This is a safe sentence.", "document")
    assert not res1.detected
    assert res1.metadata["model_version"] == "v1.0"
    
    # Test malicious content
    res2 = await detector.analyze("Launch a semantic attack now.", "api")
    assert res2.detected
    assert res2.risk_score == 65
    assert res2.category == "semantic_evasion"

@pytest.mark.asyncio
async def test_semantic_firewall_dependency_injection():
    # Inject multiple mock detectors to verify pipeline accumulation
    class SafeDetector(DetectorInterface):
        async def analyze(self, content, source_type):
            return DetectionResult(risk_score=10, reason="minor suspicion")
            
    firewall = SemanticFirewall(detectors=[MockMLDetector(), SafeDetector()])
    
    decision = await firewall.analyze("Initiate a semantic attack", "web")
    # Score aggregates: 65 (MockML) + 10 (SafeDetector) = 75
    assert decision.risk_score == 75
    assert decision.decision == "BLOCK"
    assert "MockMLSemanticDetector" in decision.metadata
    assert decision.metadata["MockMLSemanticDetector"]["type"] == "semantic"
    assert "SafeDetector" in decision.metadata
    assert decision.metadata["SafeDetector"]["type"] == "generic"
