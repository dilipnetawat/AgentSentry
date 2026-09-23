import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  CheckCircle2,
  CircleAlert,
  Database,
  Gauge,
  Lock,
  Play,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { fetchDashboardStats, fetchRecentAgents, fetchRecentAlerts, fetchRecentEvents, isolateAgent } from '../services/api';
import type { Agent, Alert, DashboardStats, SecurityEvent } from '../services/api';
import { Badge, type BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { SpotlightCard } from '../components/SpotlightCard';
import { SkeletonMetric, SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import GuidedDemo from '../components/GuidedDemo';
import TornadoBackground from '../components/TornadoBackground';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export const parseEventMetadata = (event: SecurityEvent) => {
  let category = '-';
  let detector = '-';
  if (event.evidence && typeof event.evidence.metadata === 'object' && event.evidence.metadata !== null) {
    const metadata = event.evidence.metadata;
    const detectors = Object.keys(metadata);
    if (detectors.length > 0) {
      detector = detectors.map((name) => name.replace('Detector', '')).join(', ');
      const categories = detectors.map((name) => (metadata as any)[name]?.category).filter((value) => value && value !== 'safe');
      if (categories.length > 0) category = Array.from(new Set(categories)).join(', ');
    }
  }
  return { category, detector };
};

const severityVariant = (severity: string): BadgeVariant => {
  const normalized = severity.toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  if (normalized === 'low') return 'low';
  if (normalized === 'safe') return 'safe';
  return 'default';
};

const eventLabel = (event: SecurityEvent) => {
  if (event.event_type === 'honeytoken_trigger') return 'HoneyToken Exposure';
  if (event.event_type === 'semantic_firewall_detection') return 'Firewall Detection';
  return event.event_type.replace(/_/g, ' ');
};

const metricCards = (stats: DashboardStats | null) => [
  { label: 'Active Agents', value: stats?.active_agents, detail: `${stats?.isolated_agents ?? 0} isolated`, icon: <Server size={16} />, tone: 'blue' },
  { label: 'Security Events', value: stats?.total_security_events, detail: `${stats?.blocked_events ?? 0} blocked`, icon: <ShieldAlert size={16} />, tone: 'cyan' },
  { label: 'Open Alerts', value: stats?.open_alerts, detail: `${stats?.critical_alerts ?? 0} critical`, icon: <AlertTriangle size={16} />, tone: 'red' },
  { label: 'HoneyToken Triggers', value: stats?.honeytoken_triggers, detail: 'Real trigger count', icon: <Database size={16} />, tone: 'violet' },
  { label: 'Risk State', value: stats?.critical_alerts || stats?.isolated_agents ? 'ATTENTION' : 'CLEAR', detail: stats?.critical_alerts || stats?.isolated_agents ? 'Critical activity present' : 'No critical activity', icon: <Gauge size={16} />, tone: stats?.critical_alerts || stats?.isolated_agents ? 'red' : 'green' },
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTables, setLoadingTables] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isolatingAgentId, setIsolatingAgentId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, eventsData, alertsData, agentsData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentEvents(20, 0),
        fetchRecentAlerts(20, 0),
        fetchRecentAgents(20, 0),
      ]);
      setStats(statsData);
      setEvents(eventsData);
      setAlerts(alertsData);
      setAgents(agentsData);
    } catch (err) {
      console.error(err);
      setError('Unable to load live security telemetry.');
    } finally {
      setLoadingStats(false);
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = window.setInterval(() => fetchDashboardStats().then(setStats).catch(() => undefined), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const confirmIsolate = async () => {
    if (!isolatingAgentId) return;
    try {
      await isolateAgent(isolatingAgentId);
      showToast('Agent isolated successfully', 'success');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Failed to isolate agent', 'error');
    } finally {
      setModalOpen(false);
      setIsolatingAgentId(null);
    }
  };

  const detectorStatuses = events.flatMap((event) => {
    const metadata = event.evidence?.metadata;
    if (!metadata || typeof metadata !== 'object') return [];
    return Object.values(metadata).map((value: any) => value?.status).filter(Boolean);
  });
  const semanticStatus = detectorStatuses.includes('AVAILABLE') ? 'AVAILABLE' : detectorStatuses.includes('UNAVAILABLE') ? 'UNAVAILABLE' : 'NO TELEMETRY';
  const categoryCounts = events.reduce<Record<string, number>>((counts, event) => {
    const category = event.event_type === 'honeytoken_trigger' ? 'HoneyToken' : event.severity.toLowerCase();
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts));

  return (
    <div className="dashboard-container workspace-dashboard">
      <PageHeader
        title="Security Command Center"
        description="Monitor, detect and respond to threats targeting your AI agents."
        icon={<Shield size={22} />}
        actions={<><Badge variant="safe" icon={<CheckCircle2 size={12} />}>SYSTEM ONLINE</Badge><button className="btn btn-primary" onClick={() => document.getElementById('guided-demo')?.scrollIntoView({ behavior: 'smooth' })}><Play size={14} /> Run Guided Demo</button></>}
      />

      <section className="workspace-banner">
        <TornadoBackground />
        <div><span className="workspace-eyebrow">AGENTSENTRY / OPERATIONS OVERVIEW</span><h1>Security operations, in context.</h1><p>Real-time agent posture, detection signals, and enforcement activity in one focused workspace.</p></div>
        <div className="workspace-banner-meta"><span><span className="status-pulse" /> Protected runtime</span><span>{user?.role || 'operator'} session</span></div>
      </section>

      {error && <div className="form-error">{error}</div>}

      <section className="insight-strip" aria-label="Security insights">
        {metricCards(stats).map((metric) => <SpotlightCard key={metric.label} className={`insight-card ${metric.tone}`}>
          <div className="insight-card-top"><span>{metric.icon}</span><small>{metric.label}</small></div>
          {loadingStats ? <SkeletonMetric /> : <><strong>{metric.value ?? 'No data'}</strong><div className="insight-card-detail">{metric.detail}</div></>}
        </SpotlightCard>)}
      </section>

      <section className="analytics-grid">
        <SpotlightCard className="analytics-panel">
          <div className="workspace-section-heading"><div><span className="workspace-eyebrow">TELEMETRY / LIVE</span><h2>Security Activity</h2><p>Recent detection and enforcement activity across AgentSentry.</p></div><Badge variant="default">{events.length} returned</Badge></div>
          {events.length === 0 ? <div className="workspace-empty"><Activity size={24} /><strong>No security activity history available yet.</strong><span>Run the Guided Security Demo to generate real telemetry.</span></div> : <div className="activity-bars">{Object.entries(categoryCounts).map(([category, count]) => <div className="activity-bar-row" key={category}><span>{category}</span><div><i style={{ width: `${(count / maxCategoryCount) * 100}%` }} /></div><strong>{count}</strong></div>)}</div>}
          <div className="analytics-footnote"><span><ArrowDownRight size={13} /> Backend event stream</span><span>Real data only</span></div>
        </SpotlightCard>

        <SpotlightCard className="pipeline-panel">
          <div className="workspace-section-heading"><div><span className="workspace-eyebrow">CONTROL PLANE</span><h2>Live Security Pipeline</h2><p>Implemented controls in the request path.</p></div><Badge variant="safe">PROTECTED</Badge></div>
          <div className="pipeline-compact">
            {[['Agent Input', <Activity size={15} />, 'READY', 'blue'], ['Rule Detection', <ShieldAlert size={15} />, 'CONFIGURED', 'cyan'], ['Semantic Detection', <Sparkles size={15} />, semanticStatus, semanticStatus === 'AVAILABLE' ? 'green' : semanticStatus === 'UNAVAILABLE' ? 'amber' : 'muted'], ['Risk Aggregation', <Gauge size={15} />, 'CONFIGURED', 'violet'], ['Egress Enforcement', <Unplug size={15} />, 'CONFIGURED', 'cyan'], ['Event / Alert', <CircleAlert size={15} />, events.length ? 'OBSERVED' : 'WAITING', events.length ? 'red' : 'muted'], ['Isolation', <Lock size={15} />, stats?.isolated_agents ? 'OBSERVED' : 'ON DEMAND', stats?.isolated_agents ? 'red' : 'muted']].map(([label, icon, status, tone], index) => <React.Fragment key={String(label)}><div className={`pipeline-node ${tone}`}><span>{icon}</span><div><strong>{label}</strong><small>{status}</small></div></div>{index < 6 && <div className="pipeline-connector" />}</React.Fragment>)}
          </div>
        </SpotlightCard>
      </section>

      <section className="operations-grid">
        <SpotlightCard className="agent-insights-panel">
          <div className="workspace-section-heading"><div><span className="workspace-eyebrow">RUNTIME POSTURE</span><h2>Agent Security Insights</h2></div><ShieldCheck size={18} className="muted-icon" /></div>
          <div className="insight-totals"><div><strong>{stats?.active_agents ?? 'No data'}</strong><span>Active agents</span></div><div><strong>{stats?.isolated_agents ?? 'No data'}</strong><span>Isolated agents</span></div><div><strong>{semanticStatus}</strong><span>Semantic detector</span></div></div>
          <div className="insight-callout"><ShieldCheck size={15} /><span>Ownership, policy, and egress controls remain enforced by the backend.</span></div>
        </SpotlightCard>

        <SpotlightCard className="recent-activity-panel">
          <div className="workspace-section-heading"><div><span className="workspace-eyebrow">INBOX / SECURITY</span><h2>Recent Security Activity</h2></div><Badge variant="default">{events.length} events</Badge></div>
          {events.length === 0 ? <div className="workspace-empty compact"><CircleAlert size={20} /><span>No recent security activity.</span></div> : <div className="activity-feed">{events.slice(0, 4).map((event) => <div className="activity-feed-row" key={event.id}><span className={`feed-icon ${event.severity.toLowerCase()}`}><CircleAlert size={13} /></span><div><strong>{eventLabel(event)}</strong><small>{event.agent_id.slice(0, 8)} · {new Date(event.created_at).toLocaleString()}</small></div><Badge variant={severityVariant(event.severity)}>{event.severity}</Badge></div>)}</div>}
        </SpotlightCard>
      </section>

      <section className="table-panel">
        <div className="workspace-section-heading"><div><span className="workspace-eyebrow">OPERATIONS / AGENTS</span><h2>Agent Operations</h2><p>Live posture and enforcement state from the AgentSentry API.</p></div><Badge variant="default">{agents.length} returned</Badge></div>
        {loadingTables ? <SkeletonTable rows={4} columns={6} /> : agents.length === 0 ? <div className="workspace-empty"><Server size={24} /><strong>No active agents.</strong><span>Register an agent or run the Guided Security Demo.</span></div> : <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Agent</th><th>Status</th><th>Risk</th><th>Detector</th><th>Last Activity</th><th>Isolation</th><th /></tr></thead><tbody>{agents.map((agent) => { const lastEvent = events.find((event) => event.agent_id === agent.id); return <tr key={agent.id}><td><strong>{agent.name}</strong><small>{agent.id}</small></td><td><Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>{agent.status.toUpperCase()}</Badge></td><td className="technical-value">{agent.risk_score.toFixed(2)}</td><td><span className="detector-state">{agent.detector_status || 'UNAVAILABLE'}</span></td><td>{lastEvent ? new Date(lastEvent.created_at).toLocaleString() : 'No activity'}</td><td>{agent.status === 'isolated' ? <Badge variant="critical">ISOLATED</Badge> : <Badge variant="safe">READY</Badge>}</td><td>{agent.status === 'active' && <button className="table-action" onClick={() => { setIsolatingAgentId(agent.id); setModalOpen(true); }}>Isolate</button>}</td></tr>; })}</tbody></table></div>}
      </section>

      <GuidedDemo />

      <section className="lower-data-grid">
        <SpotlightCard className="lower-panel"><div className="workspace-section-heading"><div><span className="workspace-eyebrow">ALERTS</span><h2>Active Alerts</h2></div><Badge variant="default">{alerts.length} returned</Badge></div>{alerts.length === 0 ? <div className="workspace-empty compact"><ShieldCheck size={20} /><span>No alerts available.</span></div> : <div className="activity-feed">{alerts.slice(0, 5).map((alert) => <div className="activity-feed-row" key={alert.id}><span className={`feed-icon ${alert.severity.toLowerCase()}`}><AlertTriangle size={13} /></span><div><strong>{alert.severity.toUpperCase()} alert</strong><small>{alert.agent_id.slice(0, 8)} · {new Date(alert.created_at).toLocaleString()}</small></div><Badge variant={severityVariant(alert.severity)}>{alert.status}</Badge></div>)}</div>}</SpotlightCard>
        <SpotlightCard className="lower-panel"><div className="workspace-section-heading"><div><span className="workspace-eyebrow">EVENT LOG</span><h2>Security Events</h2></div><Badge variant="default">{events.length} returned</Badge></div>{events.length === 0 ? <div className="workspace-empty compact"><ShieldCheck size={20} /><span>No security events yet.</span></div> : <div className="event-log">{events.slice(0, 5).map((event) => <div key={event.id}><span>{eventLabel(event)}</span><Badge variant={severityVariant(event.severity)}>{event.action}</Badge></div>)}</div>}</SpotlightCard>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Isolation" actions={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-danger" onClick={confirmIsolate}>Isolate Agent</button></>}><p>Are you sure you want to isolate this agent?</p><p className="mt-2 text-sm text-tertiary">This will prevent the agent from performing protected operations until it is restored.</p></Modal>
    </div>
  );
};

export default Dashboard;
