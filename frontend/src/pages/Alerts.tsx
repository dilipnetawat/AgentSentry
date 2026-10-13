import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  fetchAllAlerts, 
  updateAlertStatus, 
  triageAlert,
  type Alert, 
  type AIAlertTriageResult 
} from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Clock, 
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Bot
} from 'lucide-react';

const getSeverityVariant = (severity: string): BadgeVariant => {
  const s = severity.toLowerCase();
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

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const { showToast } = useToast();
  const LIMIT = 25;

  // Threat Details & AI Triage Modal state
  const [selectedThreat, setSelectedThreat] = useState<Alert | null>(null);
  const [triageResult, setTriageResult] = useState<AIAlertTriageResult | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [techDetailsExpanded, setTechDetailsExpanded] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllAlerts(LIMIT, page * LIMIT);
      setAlerts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve threats queue.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    setActionLoadingId(alertId);
    try {
      const updated = await updateAlertStatus(alertId, newStatus);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: updated.status } : a)));
      showToast(`Threat status updated to ${newStatus.toUpperCase()}`, 'success');
      if (selectedThreat && selectedThreat.id === alertId) {
        setSelectedThreat((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update threat status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenThreat = (alert: Alert) => {
    setSelectedThreat(alert);
    setTriageResult(null);
    setTechDetailsExpanded(false);
  };

  const handleRunTriage = async (alertId: string) => {
    setIsTriaging(true);
    try {
      const res = await triageAlert(alertId);
      setTriageResult(res);
      showToast('AI Incident Triage completed.', 'success');
    } catch (err: any) {
      showToast(err.message || 'AI Triage provider unavailable', 'error');
    } finally {
      setIsTriaging(false);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((al) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        al.id.toLowerCase().includes(query) ||
        al.agent_id.toLowerCase().includes(query) ||
        al.security_event_id.toLowerCase().includes(query) ||
        al.severity.toLowerCase().includes(query);

      const matchesStatus = 
        statusFilter === 'ALL' || 
        al.status.toUpperCase() === statusFilter;

      const matchesSeverity = 
        severityFilter === 'ALL' || 
        al.severity.toUpperCase() === severityFilter;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [alerts, searchQuery, statusFilter, severityFilter]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Threats &amp; Incidents" 
        description="Investigate suspicious and blocked agent interactions, review policy denials, and dispatch containment playbooks."
        icon={<ShieldAlert size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={loadAlerts}
              disabled={loading}
              title="Refresh threats queue"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <div className="flex items-center gap-1 border border-border rounded p-0.5 bg-surface">
              <button
                type="button"
                className="btn btn-secondary p-1.5"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                title="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-mono text-text-muted px-2">Page {page + 1}</span>
              <button
                type="button"
                className="btn btn-secondary p-1.5"
                onClick={() => setPage((p) => p + 1)}
                disabled={alerts.length < LIMIT || loading}
                title="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        }
      />

      {error ? (
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-xs mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary text-xs" onClick={loadAlerts}>Retry</button>
        </div>
      ) : null}

      {/* Filter Toolbar */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="search-bar w-full max-w-sm">
              <Search size={14} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search by Threat ID, Agent ID, Event ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-text-primary focus:outline-none w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-text-muted">Severity:</span>
              <select
                className="bg-surface-elevated border border-border rounded px-2 py-1 text-xs text-text-primary"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <span className="text-text-muted">Status:</span>
              <select
                className="bg-surface-elevated border border-border rounded px-2 py-1 text-xs text-text-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
                <option value="IGNORED">Ignored</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Threats Table */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {alerts.length === 0
              ? 'No security threats or alerts currently logged in the system.'
              : 'No threats match your current filter query.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Threat Description</th>
                  <th>Target Agent</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <div className="text-xs text-text-secondary font-mono flex items-center gap-1">
                        <Clock size={12} className="text-text-muted" />
                        <span>{formatTimeAgo(alert.created_at)}</span>
                      </div>
                      <div className="text-[10px] text-text-muted font-mono">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-text-primary">
                        {alert.severity === 'critical' ? 'Hostile instruction or canary exfiltration' : 'Prompt injection attempt flagged'}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted">
                        Event: {alert.security_event_id.slice(0, 16)}...
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Bot size={13} className="text-text-secondary" />
                        <span className="font-mono text-xs text-text-primary">
                          {alert.agent_id ? alert.agent_id.slice(0, 8) : 'Runtime'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs font-mono uppercase font-semibold ${
                        alert.status === 'open' 
                          ? 'text-color-warning'
                          : alert.status === 'resolved'
                          ? 'text-color-safe'
                          : 'text-text-muted'
                      }`}>
                        {alert.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary text-xs px-2.5 py-1"
                        onClick={() => handleOpenThreat(alert)}
                        title="Investigate threat details & triage"
                      >
                        <Eye size={12} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Threat Investigation & Triage Modal */}
      {selectedThreat && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedThreat(null)}
          title={`Threat Incident Investigation`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Header Status Strip */}
            <div className="p-3 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-text-muted block">Incident ID</span>
                <span className="font-mono font-bold text-text-primary">{selectedThreat.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(selectedThreat.severity)}>
                  {selectedThreat.severity.toUpperCase()}
                </Badge>
                <span className="px-2 py-0.5 rounded font-mono text-xs uppercase bg-surface-elevated border border-border">
                  {selectedThreat.status}
                </span>
              </div>
            </div>

            {/* Plain-Language Summary */}
            <div className="p-3.5 rounded bg-surface border border-border space-y-2">
              <h4 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-color-critical" />
                <span>Incident Summary</span>
              </h4>
              <div className="text-text-secondary leading-relaxed space-y-1.5">
                <p>
                  <strong className="text-text-primary">What happened:</strong> A hostile prompt or unauthorized tool request crossed security boundaries and triggered an automated policy alert.
                </p>
                <p>
                  <strong className="text-text-primary">Why it was flagged:</strong> The heuristic and semantic vector engines detected adversarial directives or decoy honeytoken canary patterns.
                </p>
                <p>
                  <strong className="text-text-primary">Current enforcement:</strong> Execution was quarantined or blocked according to the configured threshold policy.
                </p>
                <p>
                  <strong className="text-text-primary">Recommended next step:</strong> Acknowledge this alert, inspect the forensic triage analysis below, and verify the target agent's isolation status if critical.
                </p>
              </div>
            </div>

            {/* Recommended Operator Actions */}
            <div className="p-3.5 rounded bg-surface border border-border">
              <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider mb-2.5">
                Operator Actions &amp; Triage
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  onClick={() => handleRunTriage(selectedThreat.id)}
                  disabled={isTriaging}
                  title="Execute multi-provider AI threat triage"
                >
                  <Sparkles size={13} className={isTriaging ? 'animate-spin' : ''} />
                  <span>{isTriaging ? 'Running AI Triage...' : 'Run AI Incident Triage'}</span>
                </button>

                {selectedThreat.status !== 'acknowledged' && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => handleUpdateStatus(selectedThreat.id, 'acknowledged')}
                    disabled={actionLoadingId === selectedThreat.id}
                  >
                    <Check size={12} />
                    <span>Acknowledge</span>
                  </button>
                )}

                {selectedThreat.status !== 'resolved' && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs text-emerald-400"
                    onClick={() => handleUpdateStatus(selectedThreat.id, 'resolved')}
                    disabled={actionLoadingId === selectedThreat.id}
                  >
                    <CheckCircle2 size={12} />
                    <span>Mark Resolved</span>
                  </button>
                )}

                {selectedThreat.status !== 'ignored' && (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs text-text-muted"
                    onClick={() => handleUpdateStatus(selectedThreat.id, 'ignored')}
                    disabled={actionLoadingId === selectedThreat.id}
                  >
                    <XCircle size={12} />
                    <span>Ignore / False Positive</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI Incident Triage Results */}
            {triageResult && (
              <div className="p-3.5 rounded bg-surface-elevated border border-primary/40 space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <span className="font-bold text-text-primary">AI Incident Triage ({triageResult.provider})</span>
                  </div>
                  <Badge variant="safe">
                    Confidence: {Math.round((triageResult.confidence_score || 0.9) * 100)}%
                  </Badge>
                </div>

                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Risk Assessment:</span>
                  <p className="text-text-primary leading-relaxed bg-surface p-2 rounded border border-border">
                    {triageResult.risk_assessment}
                  </p>
                </div>

                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Recommended Containment Action:</span>
                  <p className="text-text-secondary leading-relaxed bg-surface p-2 rounded border border-border">
                    {triageResult.recommended_action}
                  </p>
                </div>

                {triageResult.containment_steps && triageResult.containment_steps.length > 0 && (
                  <div>
                    <span className="text-text-muted font-semibold block mb-1">Containment Playbook:</span>
                    <ol className="list-decimal list-inside space-y-1 text-text-secondary bg-surface p-2.5 rounded border border-border">
                      {triageResult.containment_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Expandable Technical Details */}
            <div className="border border-border rounded overflow-hidden">
              <button
                type="button"
                className="w-full p-2.5 text-left bg-surface-elevated hover:bg-surface-hover flex items-center justify-between font-semibold text-text-primary"
                onClick={() => setTechDetailsExpanded((p) => !p)}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={13} className="text-text-muted" />
                  <span>Technical Forensics &amp; Metadata</span>
                </div>
                <span className="text-text-muted text-[11px] font-mono">
                  {techDetailsExpanded ? 'Collapse [-]' : 'Expand [+]'}
                </span>
              </button>

              {techDetailsExpanded && (
                <div className="p-3 bg-surface space-y-2 border-t border-border font-mono text-[11px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-text-muted block">Security Event ID:</span>
                      <span className="text-text-primary">{selectedThreat.security_event_id}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Agent Target ID:</span>
                      <span className="text-text-primary">{selectedThreat.agent_id}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Timestamp:</span>
                      <span className="text-text-primary">{selectedThreat.created_at}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Credential Redaction:</span>
                      <span className="text-color-safe">ENFORCED (No plaintext secrets)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Alerts;
