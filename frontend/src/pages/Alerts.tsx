import React, { useEffect, useState } from 'react';
import { fetchAllAlerts, updateAlertStatus, triageAlert } from '../services/api';
import type { Alert, AIAlertTriageResult } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Check, Clock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const getSeverityVariant = (severity: string): BadgeVariant => {
  const s = severity.toLowerCase();
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  if (s === 'safe') return 'safe';
  return 'default';
};

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const { showToast } = useToast();
  const LIMIT = 50;

  // AI Triage Modal state
  const [activeTriageAlert, setActiveTriageAlert] = useState<Alert | null>(null);
  const [triageResult, setTriageResult] = useState<AIAlertTriageResult | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAlerts(LIMIT, page * LIMIT);
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    setActionLoadingId(alertId);
    try {
      const updated = await updateAlertStatus(alertId, newStatus);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: updated.status } : a));
      showToast(`Alert marked as ${newStatus}`, 'success');
      if (activeTriageAlert && activeTriageAlert.id === alertId) {
        setActiveTriageAlert(prev => prev ? { ...prev, status: updated.status } : null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update alert status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenTriage = async (alert: Alert) => {
    setActiveTriageAlert(alert);
    setTriageResult(null);
    setIsTriaging(true);
    try {
      const result = await triageAlert(alert.id);
      setTriageResult(result);
    } catch (err: any) {
      showToast(err.message || 'AI Triage unavailable', 'error');
    } finally {
      setIsTriaging(false);
    }
  };

  const closeTriageModal = () => {
    setActiveTriageAlert(null);
    setTriageResult(null);
  };

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="Security Alerts Console" 
        description="High-priority alerts and incident notices requiring operator triage."
        icon={<AlertTriangle size={20} />}
        actions={
          <div className="flex items-center gap-3">
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => Math.max(0, p - 1))} 
              disabled={page === 0 || loading}
              aria-label="Previous Page"
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-medium text-secondary" style={{ minWidth: '60px', textAlign: 'center' }}>
              Page {page + 1}
            </span>
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => p + 1)} 
              disabled={alerts.length < LIMIT || loading}
              aria-label="Next Page"
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        }
      />
      
      {error && <div className="form-error">{error}</div>}

      <motion.section 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="glass-surface table-panel flex-1 overflow-hidden flex flex-col mb-8"
      >
        <div className="workspace-section-heading">
          <div>
            <span className="workspace-eyebrow">INCIDENT TRIAGE</span>
            <h2>Dispatched Threat Alerts</h2>
          </div>
          <Badge variant="default">{alerts.length} alerts</Badge>
        </div>

        {loading ? (
          <div className="p-6"><SkeletonTable rows={8} columns={6} /></div>
        ) : alerts.length === 0 ? (
          <div className="workspace-empty">
            <CheckCircle2 size={32} style={{ color: 'var(--color-safe)' }} />
            <strong>No active alerts found</strong>
            <span>All monitored AI agents are currently operating within established safety baselines.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Agent ID</th>
                  <th>Linked Event ID</th>
                  <th>Dispatch Timestamp</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id}>
                    <td>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <span
                        className="mono font-semibold"
                        style={{
                          color: alert.status === 'open'
                            ? 'var(--color-critical)'
                            : alert.status === 'acknowledged'
                              ? 'var(--color-medium)'
                              : 'var(--color-safe)'
                        }}
                      >
                        {alert.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="mono text-xs text-primary">
                      {alert.agent_id}
                    </td>
                    <td className="mono text-xs text-tertiary">
                      {alert.security_event_id}
                    </td>
                    <td className="text-xs text-secondary">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
                          onClick={() => handleOpenTriage(alert)}
                          title="Run AI Incident Triage"
                        >
                          <Sparkles size={12} className="text-accent" />
                          <span>AI Triage</span>
                        </button>

                        {alert.status === 'open' && (
                          <button
                            className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                            onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}
                            disabled={actionLoadingId === alert.id}
                            title="Acknowledge alert"
                          >
                            <Clock size={12} />
                            <span>Ack</span>
                          </button>
                        )}

                        {alert.status !== 'resolved' && (
                          <button
                            className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                            style={{ color: 'var(--color-safe)' }}
                            onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                            disabled={actionLoadingId === alert.id}
                            title="Resolve alert"
                          >
                            <Check size={12} />
                            <span>Resolve</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* AI Incident Triage Modal */}
      <Modal
        isOpen={Boolean(activeTriageAlert)}
        onClose={closeTriageModal}
        title="AI Incident Triage Analysis"
        actions={
          activeTriageAlert && (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-tertiary mono">
                Alert: {activeTriageAlert.id.slice(0, 14)}...
              </span>
              <div className="flex items-center gap-2">
                {activeTriageAlert.status !== 'resolved' && (
                  <button
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    onClick={() => handleUpdateStatus(activeTriageAlert.id, 'resolved')}
                    disabled={actionLoadingId === activeTriageAlert.id}
                  >
                    <Check size={13} />
                    <span>Resolve Alert</span>
                  </button>
                )}
                <button className="btn btn-secondary text-xs py-1.5 px-3" onClick={closeTriageModal}>
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        {isTriaging ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Sparkles size={28} className="text-accent animate-pulse" />
            <span className="text-sm font-medium text-secondary">Analyzing threat telemetry with AI...</span>
            <span className="text-xs text-tertiary">Evaluating incident context, threat vectors, and mitigation playbook</span>
          </div>
        ) : triageResult ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs text-tertiary">Assessment:</span>
                <Badge variant={getSeverityVariant(triageResult.risk_assessment)}>
                  {triageResult.risk_assessment.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tertiary">Provider:</span>
                <span className="mono text-xs text-primary capitalize font-medium">{triageResult.provider}</span>
                <span className="text-xs text-tertiary">({(triageResult.confidence_score * 100).toFixed(0)}% conf)</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                Executive Analysis Summary
              </span>
              <p className="text-sm text-secondary bg-surface p-3 rounded-lg border border-subtle m-0 leading-relaxed">
                {triageResult.analysis_summary}
              </p>
            </div>

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                Recommended Action
              </span>
              <div className="p-3 rounded-lg border border-subtle flex items-center gap-2.5" style={{ background: 'var(--color-indigo-bg)', borderColor: 'var(--color-indigo-border)' }}>
                <ShieldAlert size={16} style={{ color: 'var(--color-indigo)' }} />
                <strong className="text-primary text-sm font-medium">{triageResult.recommended_action}</strong>
              </div>
            </div>

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-2">
                Containment Playbook Steps
              </span>
              <ul className="flex flex-col gap-2 p-0 m-0 list-none">
                {triageResult.containment_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-secondary p-2 rounded bg-surface border border-subtle">
                    <span className="mono text-accent font-bold" style={{ minWidth: '18px' }}>{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="workspace-empty py-8">
            <AlertTriangle size={24} className="text-tertiary" />
            <span>No triage results generated.</span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Alerts;
