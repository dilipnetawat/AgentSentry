import React, { useEffect, useState } from 'react';
import { fetchAllAlerts } from '../services/api';
import type { Alert } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { AlertTriangle, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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
        title="Alerts" 
        description="High-priority alerts requiring immediate attention."
        icon={<AlertTriangle size={24} />}
        actions={
          <div className="flex items-center gap-4">
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => Math.max(0, p - 1))} 
              disabled={page === 0 || loading}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-secondary">Page {page + 1}</span>
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => p + 1)} 
              disabled={alerts.length < LIMIT || loading}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      
      {error && <div className="form-error mb-4">{error}</div>}

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-surface flex-1 overflow-hidden flex flex-col mb-8"
      >
        {loading ? (
          <div className="p-8"><SkeletonTable rows={10} columns={5} /></div>
        ) : alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-state-icon" />
            <p>No active alerts found</p>
          </div>
        ) : (
          <div className="table-container border-0 rounded-none flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Agent ID</th>
                  <th>Event ID</th>
                  <th>Timestamp</th>
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
                    <td className="capitalize text-secondary">{alert.status}</td>
                    <td className="mono text-xs">{alert.agent_id}</td>
                    <td className="mono text-xs text-tertiary">{alert.security_event_id}</td>
                    <td className="text-xs text-tertiary">{new Date(alert.created_at).toLocaleString()}</td>
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
