import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { 
  fetchDashboardStats, 
  fetchRecentEvents, 
  fetchRecentAlerts,
  fetchSystemStatus,
  type DashboardStats, 
  type SecurityEvent, 
  type Alert,
  type SystemStatusResponse
} from '../services/api';
import { Badge, DecisionBadge, type BadgeVariant } from '../components/Badge';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonLoader';
import { PageHeader } from '../components/PageHeader';

const getSeverityVariant = (severity?: string): BadgeVariant => {
  const s = (severity || '').toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  if (s === 'safe') return 'safe';
  return 'default';
};

const formatTimeAgo = (dateString: string) => {
  const diffSec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatReadableTitle = (event: SecurityEvent): string => {
  if (event.event_type === 'honeytoken_trigger') {
    return 'Honeytoken interaction detected';
  }
  if (event.event_type === 'semantic_firewall_detection') {
    const reason = event.evidence?.reason;
    if (typeof reason === 'string' && reason.toLowerCase().includes('override')) {
      return 'Suspicious instruction detected';
    }
    if (typeof reason === 'string' && reason.toLowerCase().includes('extraction')) {
      return 'Possible sensitive-data exposure';
    }
    return 'Suspicious instruction detected';
  }
  if (event.event_type.includes('tool') || (event.evidence?.reason && event.evidence.reason.toLowerCase().includes('tool'))) {
    return 'Unauthorized tool request blocked';
  }
  return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sysStatus, setSysStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsData, eventsData, alertsData, sysData] = await Promise.allSettled([
        fetchDashboardStats(),
        fetchRecentEvents(25, 0),
        fetchRecentAlerts(20, 0),
        fetchSystemStatus()
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (eventsData.status === 'fulfilled') setEvents(eventsData.value);
      if (alertsData.status === 'fulfilled') setAlerts(alertsData.value);
      if (sysData.status === 'fulfilled') setSysStatus(sysData.value);

      setError(null);
    } catch (err: any) {
      setError('Unable to load security telemetry from backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(() => loadData(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  // Derive authentic Security Health State
  // States: Good, Needs attention, Critical, Unknown
  const healthState = useMemo(() => {
    if (!stats || !sysStatus) {
      return {
        status: 'Unknown' as const,
        title: 'Telemetry Unavailable',
        description: 'Unable to reach backend security subsystems. Metrics cannot be verified.',
        badgeVariant: 'neutral' as BadgeVariant,
        icon: HelpCircle
      };
    }

    if (stats.isolated_agents > 0 || stats.critical_alerts > 0) {
      return {
        status: 'Critical' as const,
        title: 'Critical Threat Condition Detected',
        description: `${stats.critical_alerts} critical alert(s) open or ${stats.isolated_agents} agent(s) placed into quarantine. Immediate review required.`,
        badgeVariant: 'critical' as BadgeVariant,
        icon: ShieldAlert
      };
    }

    if (stats.open_alerts > 0 || stats.quarantined_events > 0) {
      return {
        status: 'Needs attention' as const,
        title: 'Security Events Require Review',
        description: `${stats.open_alerts} open alert(s) and ${stats.quarantined_events} quarantined item(s) awaiting SOC triage.`,
        badgeVariant: 'medium' as BadgeVariant,
        icon: AlertTriangle
      };
    }

    return {
      status: 'Good' as const,
      title: 'No Active Threats Detected',
      description: 'Zero open security alerts or isolated agents across verified monitored runtime boundaries.',
      badgeVariant: 'safe' as BadgeVariant,
      icon: ShieldCheck
    };
  }, [stats, sysStatus]);

  // Unresolved items for "Needs attention" section
  const openAlerts = useMemo(() => {
    return alerts.filter((a) => a.status === 'open');
  }, [alerts]);

  // Quarantined security events needing review
  const quarantinedEvents = useMemo(() => {
    return events.filter((e) => e.action.toUpperCase() === 'QUARANTINE');
  }, [events]);

  // Activity trends calculations (strictly from real events)
  const activityDistribution = useMemo(() => {
    let allowed = 0;
    let blocked = 0;
    let quarantined = 0;

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    events.forEach((ev) => {
      const act = ev.action.toUpperCase();
      if (act.includes('ALLOW')) allowed++;
      else if (act.includes('BLOCK') || act.includes('DENY')) blocked++;
      else if (act.includes('QUARANTINE')) quarantined++;

      const sev = (ev.severity || '').toLowerCase();
      if (sev === 'critical') severityCounts.critical++;
      else if (sev === 'high') severityCounts.high++;
      else if (sev === 'medium') severityCounts.medium++;
      else if (sev === 'low') severityCounts.low++;
    });

    const total = allowed + blocked + quarantined || 1;
    return {
      allowed,
      blocked,
      quarantined,
      totalEvents: events.length,
      allowedPct: Math.round((allowed / total) * 100),
      blockedPct: Math.round((blocked / total) * 100),
      quarantinedPct: Math.round((quarantined / total) * 100),
      severityCounts
    };
  }, [events]);

  return (
    <div className="dashboard-container">
      {/* 1. Page Header */}
      <PageHeader 
        title="Overview" 
        description="Understand the security and activity of your AI agents."
        icon={<Activity size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh security telemetry"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs"
              onClick={() => navigate('/playground')}
            >
              <Terminal size={13} />
              <span>Open Playground</span>
            </button>
          </div>
        }
      />

      {error ? (
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-xs mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary text-xs" onClick={() => loadData(false)}>Retry</button>
        </div>
      ) : null}

      {/* 2. Section A: Security Health Status */}
      <section className="mb-6">
        <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded border ${
                healthState.status === 'Good' 
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-color-safe'
                  : healthState.status === 'Critical'
                  ? 'border-red-500/30 bg-red-500/10 text-color-critical'
                  : healthState.status === 'Needs attention'
                  ? 'border-amber-500/30 bg-amber-500/10 text-color-warning'
                  : 'border-border bg-surface-elevated text-text-muted'
              }`}>
                <healthState.icon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Overall Posture:</span>
                  <Badge variant={healthState.badgeVariant}>{healthState.status.toUpperCase()}</Badge>
                </div>
                <h2 className="text-lg font-bold text-text-primary">{healthState.title}</h2>
                <p className="text-xs text-text-secondary mt-0.5 max-w-2xl">{healthState.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-text-muted block">Protected Runtime</span>
                <span className="text-xs font-mono font-semibold text-accent-cyan">
                  {sysStatus ? `${sysStatus.subsystems.database.engine} &bull; FastEmbed ONNX` : 'Connecting...'}
                </span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary text-xs"
                onClick={() => navigate('/policies')}
              >
                <span>Inspect Policies</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          {/* Supporting Health Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded bg-surface-elevated border border-border">
              <span className="text-[11px] text-text-muted block mb-1">Active Agents</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-text-primary">
                  {stats ? stats.active_agents : '-'}
                </span>
                <span className="text-xs text-text-muted">
                  / {stats ? stats.total_agents : '-'} total
                </span>
              </div>
              <span className="text-[10px] text-text-muted block mt-1">Fleet membership</span>
            </div>

            <div className="p-3 rounded bg-surface-elevated border border-border">
              <span className="text-[11px] text-text-muted block mb-1">Critical Threats</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-bold font-mono ${stats && stats.critical_alerts > 0 ? 'text-color-critical' : 'text-text-primary'}`}>
                  {stats ? stats.critical_alerts : '-'}
                </span>
                <span className="text-xs text-text-muted">
                  ({stats ? stats.open_alerts : '-'} open)
                </span>
              </div>
              <span className="text-[10px] text-text-muted block mt-1">Requiring immediate response</span>
            </div>

            <div className="p-3 rounded bg-surface-elevated border border-border">
              <span className="text-[11px] text-text-muted block mb-1">Actions Blocked</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-color-critical">
                  {stats ? stats.blocked_events : '-'}
                </span>
                <span className="text-xs text-text-muted">
                  + {stats ? stats.quarantined_events : 0} held
                </span>
              </div>
              <span className="text-[10px] text-text-muted block mt-1">Enforced by Firewall</span>
            </div>

            <div className="p-3 rounded bg-surface-elevated border border-border">
              <span className="text-[11px] text-text-muted block mb-1">Security Checks</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-text-primary">
                  {stats ? stats.total_security_events : '-'}
                </span>
                <span className="text-xs text-text-muted">records</span>
              </div>
              <span className="text-[10px] text-text-muted block mt-1">Immutable audit events</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section B: Needs Attention */}
      <section className="mb-6">
        <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <AlertTriangle size={16} className="text-color-warning" />
                <span>Needs attention</span>
                {(openAlerts.length > 0 || quarantinedEvents.length > 0) && (
                  <span className="px-1.5 py-0.2 rounded text-[11px] font-mono bg-amber-500/15 text-color-warning border border-amber-500/30">
                    {openAlerts.length + quarantinedEvents.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Unresolved alerts and quarantined requests requiring operator review.
              </p>
            </div>

            <Link to="/threats" className="text-xs text-primary hover:text-primary-bright flex items-center gap-1 font-medium">
              <span>View threat queue</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="py-4 space-y-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : openAlerts.length === 0 && quarantinedEvents.length === 0 ? (
            <div className="p-6 text-center rounded border border-border/60 bg-surface-elevated/50">
              <CheckCircle2 size={24} className="mx-auto text-color-safe mb-2 opacity-80" />
              <div className="text-xs font-semibold text-text-primary">No items currently need attention</div>
              <p className="text-[11px] text-text-muted mt-0.5 max-w-md mx-auto">
                All security alerts have been triaged, and no requests are currently held in quarantine. Telemetry monitoring is active.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Event Description</th>
                    <th>Target / Agent</th>
                    <th>Time</th>
                    <th>Outcome / State</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Open alerts */}
                  {openAlerts.slice(0, 5).map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <Badge variant={getSeverityVariant(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-text-primary">
                          {alert.severity === 'critical' ? 'Critical threat incident raised' : 'Security alert awaiting triage'}
                        </div>
                        <div className="text-[11px] font-mono text-text-muted">
                          ID: {alert.id.slice(0, 18)}...
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-text-secondary">
                          {alert.agent_id ? alert.agent_id.slice(0, 8) : 'Fleet Runtime'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Clock size={11} />
                          <span>{formatTimeAgo(alert.created_at)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-mono text-color-warning uppercase font-semibold">
                          OPEN ALERT
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1"
                          onClick={() => navigate('/threats')}
                          title="Review alert in Threats queue"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Quarantined events */}
                  {quarantinedEvents.slice(0, 5).map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <Badge variant={getSeverityVariant(ev.severity)}>
                          {ev.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-text-primary">
                          {formatReadableTitle(ev)}
                        </div>
                        <div className="text-[11px] text-text-muted line-clamp-1">
                          {ev.evidence?.reason || 'Quarantined by policy threshold evaluation'}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-text-secondary">
                          {ev.agent_id ? ev.agent_id.slice(0, 8) : 'Direct Input'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-text-muted flex items-center gap-1">
                          <Clock size={11} />
                          <span>{formatTimeAgo(ev.created_at)}</span>
                        </span>
                      </td>
                      <td>
                        <DecisionBadge decision="QUARANTINE" />
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1"
                          onClick={() => navigate('/activity')}
                          title="Inspect quarantined event details"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 4. Section C: Recent Activity & Section D: Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section C: Recent Activity (2 cols) */}
        <div className="lg:col-span-2 dashboard-card border border-border bg-surface p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <span>Recent Activity</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Chronological record of recent security decisions across monitored agents.
                </p>
              </div>

              <Link to="/activity" className="text-xs text-primary hover:text-primary-bright flex items-center gap-1 font-medium">
                <span>View all activity</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {loading ? (
              <SkeletonTable rows={4} columns={4} />
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No recent security activity recorded yet. Run a scan in Playground to generate telemetry.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Agent / Component</th>
                      <th>Decision</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 7).map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <span className="text-[11px] text-text-muted font-mono whitespace-nowrap">
                            {formatTimeAgo(ev.created_at)}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono text-xs text-text-primary">
                            {ev.agent_id ? ev.agent_id.slice(0, 8) : 'Runtime'}
                          </span>
                        </td>
                        <td>
                          <DecisionBadge decision={ev.action} showIcon />
                        </td>
                        <td>
                          <div className="text-xs text-text-secondary line-clamp-1">
                            {formatReadableTitle(ev)}
                          </div>
                          <div className="text-[11px] text-text-muted line-clamp-1">
                            Score: <span className="font-mono">{ev.risk_score}</span> &bull; {ev.evidence?.reason || 'Verified by engine'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border mt-3 flex items-center justify-between text-xs text-text-muted">
            <span>Showing latest {Math.min(7, events.length)} of {events.length} loaded records</span>
            <Link to="/activity" className="text-primary hover:underline flex items-center gap-1">
              Full Telemetry Audit <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        {/* Section D: Activity Trends (1 col) */}
        <div className="dashboard-card border border-border bg-surface p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Layers size={16} className="text-accent-cyan" />
                <span>Activity Trends</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Outcome breakdown across recent {activityDistribution.totalEvents} evaluated events.
              </p>
            </div>

            {/* Decision Distribution Progress Bar */}
            <div className="space-y-3 mb-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>Allowed (Score &lt; 30)</span>
                  </span>
                  <span className="font-mono font-semibold text-text-primary">
                    {activityDistribution.allowed} ({activityDistribution.allowedPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-surface-elevated overflow-hidden border border-border">
                  <div 
                    className="h-full bg-emerald-500 rounded transition-all duration-300"
                    style={{ width: `${activityDistribution.allowedPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    <span>Blocked (Score &gt;= 70)</span>
                  </span>
                  <span className="font-mono font-semibold text-text-primary">
                    {activityDistribution.blocked} ({activityDistribution.blockedPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-surface-elevated overflow-hidden border border-border">
                  <div 
                    className="h-full bg-red-500 rounded transition-all duration-300"
                    style={{ width: `${activityDistribution.blockedPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    <span>Quarantined (30–69)</span>
                  </span>
                  <span className="font-mono font-semibold text-text-primary">
                    {activityDistribution.quarantined} ({activityDistribution.quarantinedPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-surface-elevated overflow-hidden border border-border">
                  <div 
                    className="h-full bg-amber-500 rounded transition-all duration-300"
                    style={{ width: `${activityDistribution.quarantinedPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="border-t border-border pt-4">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
                Threats by Severity
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-surface-elevated border border-border flex items-center justify-between">
                  <span className="text-color-critical font-medium">Critical</span>
                  <span className="font-mono font-bold text-text-primary">
                    {activityDistribution.severityCounts.critical}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border flex items-center justify-between">
                  <span className="text-color-high font-medium">High</span>
                  <span className="font-mono font-bold text-text-primary">
                    {activityDistribution.severityCounts.high}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border flex items-center justify-between">
                  <span className="text-color-warning font-medium">Medium</span>
                  <span className="font-mono font-bold text-text-primary">
                    {activityDistribution.severityCounts.medium}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-elevated border border-border flex items-center justify-between">
                  <span className="text-color-low font-medium">Low</span>
                  <span className="font-mono font-bold text-text-primary">
                    {activityDistribution.severityCounts.low}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-4 text-[11px] text-text-muted">
            All metrics reflect actual database records with zero synthetic data.
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
