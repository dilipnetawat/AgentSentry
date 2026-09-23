from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_agents: int
    active_agents: int
    isolated_agents: int
    total_security_events: int
    open_alerts: int
    critical_alerts: int
    blocked_events: int
    quarantined_events: int
    honeytoken_triggers: int
