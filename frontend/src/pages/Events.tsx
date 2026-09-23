import React, { useEffect, useState } from 'react';
import { fetchAllEvents } from '../services/api';
import type { SecurityEvent } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { parseEventMetadata } from './Dashboard';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { ShieldAlert, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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
        title="Security Events" 
        description="Comprehensive log of all security events detected by the platform."
        icon={<ShieldAlert size={24} />}
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
              disabled={events.length < LIMIT || loading}
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
          <div className="p-8"><SkeletonTable rows={10} columns={7} /></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-state-icon" />
            <p>No security events found</p>
          </div>
        ) : (
          <div className="table-container border-0 rounded-none flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Detector</th>
                  <th>Action</th>
                  <th>Risk Score</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => {
                  const { category, detector } = parseEventMetadata(event);
                  return (
                    <tr key={event.id}>
                      <td className="capitalize font-medium">{event.event_type.replace("semantic_firewall_detection", "firewall").replace(/_/g, ' ')}</td>
                      <td className="capitalize text-secondary">{category.replace(/_/g, ' ')}</td>
                      <td>
                        <Badge variant={getSeverityVariant(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="text-xs text-secondary">{detector}</td>
                      <td>
                        <Badge variant={event.action.includes('BLOCK') ? 'critical' : 'default'}>
                          {event.action}
                        </Badge>
                      </td>
                      <td className="mono">{event.risk_score.toFixed(2)}</td>
                      <td className="text-xs text-tertiary">{new Date(event.created_at).toLocaleString()}</td>
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
