import os
import logging
from typing import Optional, Dict, Any, List
from backend.services.ai.interface import BaseAIProvider
from backend.services.ai.local_provider import LocalAIProvider
from backend.services.ai.openai_provider import OpenAIProvider
from backend.services.ai.gemini_provider import GeminiAIProvider
from backend.services.ai.grok_provider import GrokAIProvider

logger = logging.getLogger(__name__)

class AIServiceManager:
    """
    Central AI Intelligence Orchestrator.
    Manages provider selection, dynamic switching, fallback logic,
    and operational health verification across all supported LLM engines.
    """

    def __init__(self):
        self._provider: Optional[BaseAIProvider] = None
        self._providers_cache: Dict[str, BaseAIProvider] = {}
        self._init_providers()

    def _init_providers(self):
        # 1. Instantiate local provider (always available)
        self._providers_cache["local"] = LocalAIProvider()

        # 2. Instantiate OpenAI provider
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        self._providers_cache["openai"] = OpenAIProvider(api_key=openai_key, model=openai_model)

        # 3. Instantiate Google Gemini provider
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()
        self._providers_cache["gemini"] = GeminiAIProvider(api_key=gemini_key, model=gemini_model)

        # 4. Instantiate xAI Grok provider
        xai_key = os.getenv("XAI_API_KEY", "").strip()
        xai_model = os.getenv("XAI_MODEL", "grok-beta").strip()
        self._providers_cache["grok"] = GrokAIProvider(api_key=xai_key, model=xai_model)

        # Set active default provider based on preference and available keys
        pref = os.getenv("AI_PROVIDER", "auto").lower().strip()
        if pref == "openai" or (pref == "auto" and openai_key):
            self._provider = self._providers_cache["openai"]
            logger.info(f"AI Service default configured: OpenAI ({openai_model})")
        elif pref == "gemini" or (pref == "auto" and gemini_key):
            self._provider = self._providers_cache["gemini"]
            logger.info(f"AI Service default configured: Google Gemini ({gemini_model})")
        elif pref == "grok" or (pref == "auto" and xai_key):
            self._provider = self._providers_cache["grok"]
            logger.info(f"AI Service default configured: xAI Grok ({xai_model})")
        else:
            self._provider = self._providers_cache["local"]
            logger.info("AI Service default running in Deterministic Local mode (agentsentry-local-v1).")

    @property
    def provider(self) -> BaseAIProvider:
        if self._provider is None:
            self._init_providers()
        return self._provider

    def get_provider(self, name: Optional[str] = None) -> BaseAIProvider:
        """Get a specific provider by name or return the active default."""
        if not name or name == "auto":
            return self.provider

        key = name.lower().strip()
        if key in ["gemini", "google_gemini"]:
            key = "gemini"
        elif key in ["grok", "xai", "xai_grok"]:
            key = "grok"
        elif key in ["openai", "gpt"]:
            key = "openai"
        elif key in ["local", "offline"]:
            key = "local"

        if key in self._providers_cache:
            return self._providers_cache[key]
        return self.provider

    async def get_status(self) -> Dict[str, Any]:
        """Provides real status check of the active default provider."""
        check = await self.provider.health_check()
        return {
            "active_provider": self.provider.provider_name,
            "active_model": self.provider.model_name,
            "health": check.get("status", "unknown"),
            "details": check.get("message", ""),
            "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
            "has_gemini_key": bool(os.getenv("GEMINI_API_KEY")),
            "has_xai_key": bool(os.getenv("XAI_API_KEY"))
        }

    async def list_providers(self) -> List[Dict[str, Any]]:
        """List all available providers with live connectivity status."""
        catalog = [
            ("local", "AgentSentry Local (Deterministic)"),
            ("openai", "OpenAI"),
            ("gemini", "Google Gemini"),
            ("grok", "xAI Grok")
        ]
        results = []
        for p_id, display_name in catalog:
            provider = self._providers_cache.get(p_id)
            if not provider:
                continue
            health = await provider.health_check()
            is_active = (provider.provider_name == self.provider.provider_name)
            
            has_key = True
            if p_id == "openai":
                has_key = bool(os.getenv("OPENAI_API_KEY"))
            elif p_id == "gemini":
                has_key = bool(os.getenv("GEMINI_API_KEY"))
            elif p_id == "grok":
                has_key = bool(os.getenv("XAI_API_KEY"))

            results.append({
                "id": p_id,
                "provider_name": provider.provider_name,
                "display_name": display_name,
                "model": provider.model_name,
                "status": health.get("status", "unknown"),
                "is_configured": has_key,
                "is_active_default": is_active,
                "latency_ms": health.get("latency_ms"),
                "message": health.get("message", "")
            })
        return results

    async def test_provider(self, name: str) -> Dict[str, Any]:
        """Perform on-demand health verification on a specific provider."""
        provider = self.get_provider(name)
        health = await provider.health_check()
        return {
            "provider": provider.provider_name,
            "model": provider.model_name,
            "status": health.get("status", "unknown"),
            "latency_ms": health.get("latency_ms"),
            "message": health.get("message", "")
        }

# Global singleton
_ai_manager_instance: Optional[AIServiceManager] = None

def get_ai_manager() -> AIServiceManager:
    global _ai_manager_instance
    if _ai_manager_instance is None:
        _ai_manager_instance = AIServiceManager()
    return _ai_manager_instance

def get_ai_service() -> BaseAIProvider:
    return get_ai_manager().provider

async def get_ai_status() -> Dict[str, Any]:
    return await get_ai_manager().get_status()
