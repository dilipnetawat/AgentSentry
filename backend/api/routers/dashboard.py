from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from backend.database import get_db
from backend.models.agent import Agent
from backend.models.security_event import SecurityEvent
from backend.models.alert import Alert
from backend.models.user import User
from backend.schemas.dashboard import DashboardStats
from backend.api.deps import get_current_user

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    agent_filter = True
    if current_user.role != "admin":
        agent_filter = Agent.owner_id == current_user.id
        
    # Agents (1 query)
    agent_stmt = select(
        func.count(Agent.id).label('total'),
        func.sum(case((Agent.status == "active", 1), else_=0)).label('active'),
        func.sum(case((Agent.status == "isolated", 1), else_=0)).label('isolated')
    ).where(agent_filter)
    
    agent_row = (await db.execute(agent_stmt)).first()
    total_agents = agent_row.total or 0
    active_agents = agent_row.active or 0
    isolated_agents = agent_row.isolated or 0
    
    # Events (1 query)
    event_stmt = select(
        func.count(SecurityEvent.id).label('total'),
        func.sum(case((SecurityEvent.action == "BLOCK", 1), else_=0)).label('blocked'),
        func.sum(case((SecurityEvent.action == "QUARANTINE", 1), else_=0)).label('quarantined'),
        func.sum(case((SecurityEvent.event_type == "honeytoken_trigger", 1), else_=0)).label('honeytoken')
    ).join(Agent, SecurityEvent.agent_id == Agent.id).where(agent_filter)
    
    event_row = (await db.execute(event_stmt)).first()
    total_security_events = event_row.total or 0
    blocked_events = event_row.blocked or 0
    quarantined_events = event_row.quarantined or 0
    honeytoken_triggers = event_row.honeytoken or 0
    
    # Alerts (1 query)
    alert_stmt = select(
        func.sum(case((Alert.status == "open", 1), else_=0)).label('open_alerts'),
        func.sum(case(((Alert.status == "open") & (Alert.severity == "critical"), 1), else_=0)).label('critical_alerts')
    ).join(Agent, Alert.agent_id == Agent.id).where(agent_filter)
    
    alert_row = (await db.execute(alert_stmt)).first()
    open_alerts = alert_row.open_alerts or 0
    critical_alerts = alert_row.critical_alerts or 0

    return DashboardStats(
        total_agents=total_agents,
        active_agents=active_agents,
        isolated_agents=isolated_agents,
        total_security_events=total_security_events,
        open_alerts=open_alerts,
        critical_alerts=critical_alerts,
        blocked_events=blocked_events,
        quarantined_events=quarantined_events,
        honeytoken_triggers=honeytoken_triggers
    )
