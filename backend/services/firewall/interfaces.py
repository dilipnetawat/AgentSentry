from abc import ABC, abstractmethod
from backend.services.firewall.models import DetectionResult

class DetectorInterface(ABC):
    """
    Pluggable interface for semantic firewall detectors.
    Implementations could be rule-based, ML-based, LLM-based, etc.
    """
    
    @property
    def name(self) -> str:
        """Name of the detector."""
        return self.__class__.__name__
        
    @property
    def detector_type(self) -> str:
        """Type of the detector (e.g., rule_based, semantic)."""
        return "generic"
    
    @abstractmethod
    async def analyze(self, content: str, source_type: str) -> DetectionResult:
        """
        Analyze the content and return a DetectionResult.
        """
        pass

class SemanticDetectorInterface(DetectorInterface):
    """
    Base interface specifically for semantic detectors (Embeddings, ML, LLM).
    Extends the base DetectorInterface to clearly demarcate semantic models.
    """
    @property
    def detector_type(self) -> str:
        return "semantic"
