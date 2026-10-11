import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  CircleAlert,
  Database,
  Lock,
  Play,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { fetchDashboardStats, fetchRecentAgents, fetchRecentAlerts, fetchRecentEvents, isolateAgent, fetchSystemStatus } from '../services/api';
import type { Agent, Alert, DashboardStats, SecurityEvent, SystemStatusResponse } from '../services/api';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { SpotlightCard } from '../components/SpotlightCard';
import { SkeletonMetric, SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import GuidedDemo from '../components/GuidedDemo';
import GridBackground from '../components/GridBackground';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';



const eventLabel = (event: SecurityEvent) => {
  if (event.event_type === 'honeytoken_trigger') return 'HoneyToken Exposure';
  if (event.event_type === 'semantic_firewall_detection') return 'Firewall Detection';
  return event.event_type.replace(/_/g, ' ');
};

// 4 strictly real API-backed metric cards from DashboardStats
const metricCards = (stats: DashboardStats | null) => [
  { 
    label: 'Active Agents', 
    value: stats?.active_agents, 
    detail: `${stats?.isolated_agents ?? 0} isolated · ${stats?.total_agents ?? 0} total`, 
    icon: <Server size={15} />, 
    tone: 'blue' 
  },
  { 
    label: 'Security Events', 
    value: stats?.total_security_events, 
    detail: `${stats?.blocked_events ?? 0} blocked · ${stats?.quarantined_events ?? 0} quarantined`, 
    icon: <ShieldAlert size={15} />, 
    tone: 'cyan' 
  },
  { 
    label: 'Open Alerts', 
    value: stats?.open_alerts, 
    detail: `${stats?.critical_alerts ?? 0} critical priority`, 
    icon: <AlertTriangle size={15} />, 
    tone: stats?.critical_alerts ? 'red' : 'violet' 
  },
  { 
    label: 'HoneyToken Triggers', 
    value: stats?.honeytoken_triggers, 
    detail: 'Canary exposure incidents', 
    icon: <Database size={15} />, 
    tone: 'green' 
  },
];


const getTimeAgo = (dateString: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

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
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

  const loadData = async () => {
    try {
      const [statsData, eventsData, alertsData, agentsData, systemData] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentEvents(20, 0),
        fetchRecentAlerts(20, 0),
        fetchRecentAgents(20, 0),
        fetchSystemStatus().catch(() => null),
      ]);
      setStats(statsData);
      setEvents(eventsData);
      setAlerts(alertsData);
      setAgents(agentsData);
      if (systemData) setSystemStatus(systemData);
      setError(null);
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
    const interval = window.setInterval(() => {
      fetchDashboardStats().then(setStats).catch(() => undefined);
      fetchSystemStatus().then(setSystemStatus).catch(() => undefined);
    }, 30000);
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
  const semanticStatus = detectorStatuses.includes('AVAILABLE') 
    ? 'AVAILABLE' 
    : detectorStatuses.includes('UNAVAILABLE') 
      ? 'UNAVAILABLE' 
      : 'NO TELEMETRY';

  const categoryCounts = events.reduce<Record<string, number>>((counts, event) => {
    const category = event.event_type === 'honeytoken_trigger' ? 'HoneyToken' : event.severity.toLowerCase();
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const maxCategoryCount = Math.max(1, ...Object.values(categoryCounts));

  return (
    <div className="dashboard-container">
      <PageHeader
        title="Security Command Center"
        description="Real-time monitoring, telemetry analysis, and threat containment for AI agents."
        icon={<Shield size={20} />}
        actions={
          <>
            {loadingStats ? (
              <Badge variant="default">SYNCING TELEMETRY</Badge>
            ) : error ? (
              <Badge variant="critical">TELEMETRY OFFLINE</Badge>
            ) : (
              <Badge variant="safe">
                <span className="status-pulse-dot" />
                TELEMETRY SYNCED
              </Badge>
            )}
            <button 
              className="btn btn-primary btn-accent" 
              onClick={() => document.getElementById('guided-demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Play size={13} />
              <span>Run Guided Demo</span>
            </button>
          </>
        }
      />

      <section className="workspace-banner">
        <GridBackground />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span className="workspace-eyebrow">
            <ShieldCheck size={13} />
            AGENTSENTRY DEFENSE RUNTIME
          </span>
          <h2>Security operations in context.</h2>
          <p>
            Continuous inspection of agent prompt execution, decoy credential integrity, 
            and automated egress control gateways.
          </p>
        </div>
        <div className="workspace-banner-meta" style={{ position: 'relative', zIndex: 2 }}>
          <div className="status-pulse-pill">
            <span className="status-pulse-dot" />
            <span>SESSION: {user?.role?.toUpperCase() || 'OPERATOR'}</span>
          </div>
          <span className="text-tertiary" style={{ fontSize: '0.7rem' }}>
            {stats?.critical_alerts || stats?.isolated_agents 
              ? 'Security action recommended' 
              : 'Zero active isolation locks'}
          </span>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}

      {systemStatus && (
        <section
          className="system-telemetry-strip glass-surface"
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="status-pulse-pill"
              style={{
                background: ['operational', 'healthy'].includes(systemStatus.status) ? 'var(--color-safe-bg)' : 'var(--color-medium-bg)',
                borderColor: ['operational', 'healthy'].includes(systemStatus.status) ? 'var(--color-safe-border)' : 'var(--color-medium-border)',
              }}
            >
              <span
                className="status-pulse-dot"
                style={{ background: ['operational', 'healthy'].includes(systemStatus.status) ? 'var(--color-safe)' : 'var(--color-medium)' }}
              />
              <span style={{ color: ['operational', 'healthy'].includes(systemStatus.status) ? 'var(--color-safe)' : 'var(--color-medium)', fontWeight: 600 }}>
                SYSTEM {systemStatus.status.toUpperCase()}
              </span>
            </div>
            <span className="mono text-xs text-secondary">
              v{systemStatus.version} · Engine: <strong className="text-primary">{systemStatus.subsystems.database.engine}</strong> ({systemStatus.subsystems.database.status})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <Sparkles size={12} className="text-accent" />
              <span className="text-tertiary">AI Engine:</span>
              <strong className="text-primary" style={{ textTransform: 'capitalize' }}>
                {systemStatus.subsystems.ai_service.provider} ({systemStatus.subsystems.ai_service.model})
              </strong>
              <Badge variant={systemStatus.subsystems.ai_service.healthy ? 'safe' : 'default'} style={{ padding: '1px 5px', fontSize: '9px' }}>
                {systemStatus.subsystems.ai_service.healthy ? 'LIVE' : 'FALLBACK'}
              </Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <ShieldCheck size={12} style={{ color: 'var(--color-safe)' }} />
              <span className="text-tertiary">Semantic Firewall:</span>
              <strong className="text-primary">
                {systemStatus.subsystems.semantic_firewall.engine}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
              <Database size={12} style={{ color: 'var(--color-low)' }} />
              <span className="text-tertiary">Canary Decoys:</span>
              <strong className="text-primary">
                {systemStatus.subsystems.egress_gateway.active_honeytokens} Active
              </strong>
            </div>
          </div>
        </section>
      )}

      <section className="insight-strip" aria-label="Security metrics">
        {metricCards(stats).map((metric) => (
          <SpotlightCard key={metric.label} className={`insight-card ${metric.tone}`}>
            <div className="insight-card-top">
              <span className="insight-icon-box">{metric.icon}</span>
              <small>{metric.label}</small>
            </div>
            {loadingStats ? (
              <SkeletonMetric />
            ) : (
              <>
                <strong>{metric.value ?? '—'}</strong>
                <div className="insight-card-detail">{metric.detail}</div>
              </>
            )}
          </SpotlightCard>
        ))}
      </section>

      <section className="analytics-grid">
        <SpotlightCard className="analytics-panel">
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-eyebrow">OBSERVED TELEMETRY</span>
              <h2>Security Activity</h2>
              <p>Distribution of detected events across AgentSentry enforcement layers.</p>
            </div>
            <Badge variant="default">{events.length} observed</Badge>
          </div>

          {events.length === 0 ? (
            <div className="workspace-empty">
              <Activity size={24} />
              <strong>No security activity history available yet.</strong>
              <span>Run the Guided Security Demo below to generate live security telemetry.</span>
            </div>
          ) : (
            <div className="activity-bars">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div className="activity-bar-row" key={category}>
                  <span>{category}</span>
                  <div className="activity-bar-track">
                    <div 
                      className="activity-bar-fill" 
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }} 
                    />
                  </div>
                  <span className="activity-bar-count">{count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="analytics-footnote">
            <span>
              <ArrowDownRight size={13} />
              Live event stream
            </span>
            <span>Real API records only</span>
          </div>
          <div className="pipeline-ticker">
            <span className="ticker-dot" />
            <span>Pipeline active · Latest telemetry synced at {new Date().toLocaleTimeString()}</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="pipeline-panel">
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-eyebrow">ARCHITECTURE CONTROL PLANE</span>
              <h2>Active Security Pipeline</h2>
              <p>Implemented security controls governing agent requests.</p>
            </div>
            <Badge variant="safe">ACTIVE</Badge>
          </div>

          <div className="pipeline-compact">
            {[
              { label: 'Agent Input', icon: <Activity size={14} />, status: 'CONFIGURED', tone: 'blue' },
              { label: 'Rule Engine', icon: <ShieldAlert size={14} />, status: 'CONFIGURED', tone: 'cyan' },
              { 
                label: 'Semantic Detector', 
                icon: <Sparkles size={14} />, 
                status: semanticStatus, 
                tone: semanticStatus === 'AVAILABLE' ? 'green' : semanticStatus === 'UNAVAILABLE' ? 'amber' : 'violet' 
              },
              { label: 'Risk Aggregator', icon: <ShieldCheck size={14} />, status: 'CONFIGURED', tone: 'violet' },
              { label: 'Egress Gateway', icon: <Unplug size={14} />, status: 'CONFIGURED', tone: 'cyan' },
              { 
                label: 'Security Alert', 
                icon: <CircleAlert size={14} />, 
                status: events.length ? 'TRIGGERED' : 'WAITING', 
                tone: events.length ? 'red' : 'blue' 
              },
              { 
                label: 'Isolation', 
                icon: <Lock size={14} />, 
                status: stats?.isolated_agents ? 'TRIGGERED' : 'ON DEMAND', 
                tone: stats?.isolated_agents ? 'red' : 'blue' 
              }
            ].map((node, index, arr) => (
              <React.Fragment key={node.label}>
                <div className={`pipeline-node ${node.tone} ${node.status === 'TRIGGERED' ? 'filled' : ''}`}>
                  <span className="pipeline-node-icon">{node.icon}</span>
                  <div>
                    <strong>{node.label}</strong>
                    <small>{node.status}</small>
                  </div>
                </div>
                {index < arr.length - 1 && <div className="pipeline-connector" />}
              </React.Fragment>
            ))}
          </div>
          <div className="pipeline-ticker">
            <span className="ticker-dot" />
            <span>Pipeline active · Latest telemetry synced at {new Date().toLocaleTimeString()}</span>
          </div>
        </SpotlightCard>
      </section>

      <section className="operations-grid">
        <SpotlightCard className="agent-insights-panel">
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-eyebrow">AGENT FLEET POSTURE</span>
              <h2>Agent Posture &amp; Detection</h2>
            </div>
            <ShieldCheck size={18} className="text-tertiary" />
          </div>

          <div className="insight-totals">
            <div className="insight-total-card">
              <strong>{stats?.active_agents ?? '—'}</strong>
              <span>Active Agents</span>
            </div>
            <div className="insight-total-card">
              <strong>{stats?.isolated_agents ?? '—'}</strong>
              <span>Isolated Agents</span>
            </div>
            <div className="insight-total-card">
              <strong style={{ fontSize: '0.9rem' }}>{semanticStatus}</strong>
              <span>Semantic Engine</span>
            </div>
          </div>

          <div className="insight-callout">
            <ShieldCheck size={16} />
            <span>
              Deterministic risk scoring, token canary traps, and outbound egress 
              boundaries are enforced on every governed agent invocation.
            </span>
          </div>
          <div className="pipeline-ticker">
            <span className="ticker-dot" />
            <span>Pipeline active · Latest telemetry synced at {new Date().toLocaleTimeString()}</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="recent-activity-panel">
          <div className="workspace-section-heading">
            <div>
              <span className="workspace-eyebrow">AGENT INBOX</span>
              <h2>Active Threats & Alerts</h2>
            </div>
            <Badge variant="default">{(events.length + alerts.length) || 0} total</Badge>
          </div>

          {(events.length === 0 && alerts.length === 0) ? (
            <div className="workspace-empty compact">
              <CircleAlert size={20} />
              <span>No recent security activity reported.</span>
              <div className="mt-2 text-tertiary" style={{ fontSize: '0.7rem' }}>Last synced: {new Date().toLocaleTimeString()}</div>
            </div>
          ) : (
            <div className="inbox-list">
              {[
                ...alerts.map(a => ({ ...a, type: 'alert', timestamp: new Date(a.created_at).getTime() })),
                ...events.map(e => ({ ...e, type: 'event', timestamp: new Date(e.created_at).getTime() }))
              ]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 8)
                .map((item: any) => (
                  <div className="inbox-row" key={item.id}>
                    <span className={`inbox-avatar ${item.severity.toLowerCase()}`}>
                      {item.type === 'alert' ? <AlertTriangle size={14} /> : <CircleAlert size={14} />}
                    </span>
                    <div className="inbox-details">
                      <strong>
                        {item.type === 'alert' 
                          ? `${item.severity.toUpperCase()} Priority Alert` 
                          : eventLabel(item)}
                      </strong>
                      <small>
                        {item.type === 'alert' ? 'Requires operator review' : `Action: ${item.action}`} · Agent: {item.agent_id.slice(0, 8)}
                      </small>
                    </div>
                    <div className="inbox-meta">
                      <span className="inbox-time">{getTimeAgo(item.created_at)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SpotlightCard>
      </section>

      <section className="table-panel glass-surface">
        <div className="workspace-section-heading">
          <div>
            <span className="workspace-eyebrow">MONITORED RUNTIMES</span>
            <h2>Agent Operations</h2>
            <p>Live security posture, detector telemetry, and isolation state.</p>
          </div>
          <Badge variant="default">{agents.length} registered</Badge>
        </div>

        {loadingTables ? (
          <SkeletonTable rows={4} columns={6} />
        ) : agents.length === 0 ? (
          <div className="workspace-empty">
            <Server size={28} />
            <strong>No active agents found.</strong>
            <span>Register an agent or launch the Guided Security Demo to create a test subject.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Detector Status</th>
                  <th>Last Observed Event</th>
                  <th>Isolation Mode</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const lastEvent = events.find((event) => event.agent_id === agent.id);
                  return (
                    <tr key={agent.id}>
                      <td>
                        <strong>{agent.name}</strong>
                        <small className="mono text-tertiary">{agent.id}</small>
                      </td>
                      <td>
                        <Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>
                          {agent.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="technical-value">
                        {agent.risk_score.toFixed(2)}
                      </td>
                      <td>
                        <span className="detector-state">
                          {agent.detector_status || 'UNAVAILABLE'}
                        </span>
                      </td>
                      <td>
                        {lastEvent ? new Date(lastEvent.created_at).toLocaleString() : 'No activity'}
                      </td>
                      <td>
                        {agent.status === 'isolated' ? (
                          <Badge variant="critical">ISOLATED</Badge>
                        ) : (
                          <Badge variant="safe">OPERATIONAL</Badge>
                        )}
                      </td>
                      <td className="text-right">
                        {agent.status === 'active' && (
                          <button 
                            className="table-action"
                            onClick={() => {
                              setIsolatingAgentId(agent.id);
                              setModalOpen(true);
                            }}
                          >
                            Isolate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GuidedDemo />

      

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title="Confirm Agent Isolation"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={confirmIsolate}>
              Confirm Isolation
            </button>
          </>
        }
      >
        <p className="m-0">
          Are you sure you want to isolate this agent?
        </p>
        <p className="mt-2 text-tertiary m-0">
          This invokes the real AgentSentry containment API, cutting off network egress 
          and preventing the agent from executing privileged tools until restored.
        </p>
      </Modal>
    </div>
  );
};

export default Dashboard;
