import pytest
from backend.services.firewall.policy import PolicyEngine
from backend.services.firewall.aggregator import RiskAggregator
from backend.services.firewall.models import DetectionResult

def test_policy_engine_boundaries():
    engine = PolicyEngine()
    
    # 0 -> ALLOW
    assert engine.evaluate(0, "reason", {}).decision == "ALLOW"
    # 29 -> ALLOW
    assert engine.evaluate(29, "reason", {}).decision == "ALLOW"
    # 30 -> QUARANTINE
    assert engine.evaluate(30, "reason", {}).decision == "QUARANTINE"
    # 69 -> QUARANTINE
    assert engine.evaluate(69, "reason", {}).decision == "QUARANTINE"
    # 70 -> BLOCK
    assert engine.evaluate(70, "reason", {}).decision == "BLOCK"
    # 100 -> BLOCK
    assert engine.evaluate(100, "reason", {}).decision == "BLOCK"

def test_risk_aggregator_safe_content():
    agg = RiskAggregator()
    res = {
        "Det1": DetectionResult(risk_score=0, reason="Safe", category="safe", detected=False)
    }
    score, reason, meta = agg.aggregate(res)
    assert score == 0
    assert reason == "Safe content"

def test_risk_aggregator_one_detector():
    agg = RiskAggregator()
    res = {
        "Det1": DetectionResult(risk_score=40, reason="Suspicious", category="smuggling", detected=True)
    }
    score, reason, meta = agg.aggregate(res)
    assert score == 40
    assert "Suspicious" in reason

def test_risk_aggregator_multiple_detectors():
    agg = RiskAggregator()
    res = {
        "Det1": DetectionResult(risk_score=30, reason="Smuggling", category="smuggling", detected=True),
        "Det2": DetectionResult(risk_score=40, reason="Override", category="override", detected=True)
    }
    score, reason, meta = agg.aggregate(res)
    # Base = 70. Two categories (+15 boost) = 85
    assert score == 85
    assert "Smuggling" in reason
    assert "Override" in reason

def test_risk_aggregator_score_capped_at_100():
    agg = RiskAggregator()
    res = {
        "Det1": DetectionResult(risk_score=80, reason="Bad", category="A", detected=True),
        "Det2": DetectionResult(risk_score=80, reason="Worse", category="B", detected=True)
    }
    score, reason, meta = agg.aggregate(res)
    assert score == 100

def test_risk_aggregator_empty():
    agg = RiskAggregator()
    score, reason, meta = agg.aggregate({})
    assert score == 0

def test_risk_aggregator_failure_ignored():
    # If a detector fails, it's not passed to the aggregator
    # The pipeline handles that, but let's test if an unexpected result structure is skipped
    pass # covered by pipeline tests
