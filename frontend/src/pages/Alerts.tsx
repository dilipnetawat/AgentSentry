import React, { useEffect, useState } from 'react';
import { fetchAllAlerts } from '../services/api';
import type { Alert } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
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
  const LIMIT = 50;

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
          <div className="p-6"><SkeletonTable rows={8} columns={5} /></div>
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
                      <span className="mono font-semibold" style={{ color: alert.status === 'open' ? 'var(--color-critical)' : 'var(--text-secondary)' }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default Alerts;
