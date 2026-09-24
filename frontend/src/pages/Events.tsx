import React, { useEffect, useState } from 'react';
import { fetchAllEvents } from '../services/api';
import type { SecurityEvent } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { parseEventMetadata } from './Dashboard';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { ShieldAlert, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
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

const Events: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchAllEvents(LIMIT, page * LIMIT);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="Security Events Audit Log" 
        description="Chronological telemetry records of prompt evaluations, canary traps, and firewall enforcement."
        icon={<ShieldAlert size={20} />}
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
              disabled={events.length < LIMIT || loading}
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
            <span className="workspace-eyebrow">AUDIT STREAM</span>
            <h2>Security Event Telemetry</h2>
          </div>
          <Badge variant="default">{events.length} records</Badge>
        </div>

        {loading ? (
          <div className="p-6"><SkeletonTable rows={8} columns={7} /></div>
        ) : events.length === 0 ? (
          <div className="workspace-empty">
            <CheckCircle2 size={32} style={{ color: 'var(--color-safe)' }} />
            <strong>No security events logged</strong>
            <span>Trigger a scenario in the Guided Security Demo to generate cryptographic telemetry entries.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Detector Module</th>
                  <th>Enforcement Action</th>
                  <th>Risk Score</th>
                  <th>Event Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => {
                  const { category, detector } = parseEventMetadata(event);
                  const isBlocked = event.action.includes('BLOCK') || event.action.includes('QUARANTINE');
                  return (
                    <tr key={event.id}>
                      <td>
                        <strong className="text-primary font-medium" style={{ display: 'block' }}>
                          {event.event_type.replace("semantic_firewall_detection", "Firewall Detection").replace(/_/g, ' ')}
                        </strong>
                        <span className="mono text-xs text-tertiary" style={{ display: 'block' }}>
                          Agent: {event.agent_id.slice(0, 10)}...
                        </span>
                      </td>
                      <td className="text-secondary" style={{ textTransform: 'capitalize' }}>
                        {category.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <Badge variant={getSeverityVariant(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="mono text-xs text-secondary">
                        {detector}
                      </td>
                      <td>
                        <Badge variant={isBlocked ? 'critical' : 'safe'}>
                          {event.action}
                        </Badge>
                      </td>
                      <td className="mono font-semibold" style={{ color: event.risk_score > 60 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                        {event.risk_score.toFixed(2)}
                      </td>
                      <td className="text-xs text-secondary">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default Events;
