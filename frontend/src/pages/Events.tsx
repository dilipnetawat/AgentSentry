import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchAllEvents, explainSecurityEvent, parseEventMetadata } from '../services/api';
import type { SecurityEvent, AIEventExplanation } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge, DecisionBadge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  Search
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

const Events: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const { showToast } = useToast();
  const LIMIT = 50;

  // AI Forensic Modal state
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [forensicData, setForensicData] = useState<AIEventExplanation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllEvents(LIMIT, page * LIMIT);
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleOpenForensics = async (event: SecurityEvent) => {
    setSelectedEvent(event);
    setForensicData(null);
    setIsAnalyzing(true);
    try {
      const result = await explainSecurityEvent(event.id);
      setForensicData(result);
    } catch (err: any) {
      showToast(err.message || 'AI Forensic analysis unavailable', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeForensicModal = () => {
    setSelectedEvent(null);
    setForensicData(null);
  };

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        ev.id.toLowerCase().includes(query) ||
        ev.agent_id.toLowerCase().includes(query) ||
        ev.event_type.toLowerCase().includes(query) ||
        ev.source.toLowerCase().includes(query) ||
        (ev.evidence?.reason && String(ev.evidence.reason).toLowerCase().includes(query));

      const matchesAction = 
        actionFilter === 'ALL' || 
        ev.action.toUpperCase().includes(actionFilter);

      const matchesSeverity = 
        severityFilter === 'ALL' || 
        ev.severity.toUpperCase() === severityFilter;

      return matchesSearch && matchesAction && matchesSeverity;
    });
  }, [events, searchQuery, actionFilter, severityFilter]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Security Events Investigation" 
        description="Immutable audit trail of semantic firewall inspections, honeypot tripwires, and automated enforcement events."
        icon={<ShieldAlert size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button 
                className="btn btn-secondary p-2" 
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0 || loading}
                aria-label="Previous Page"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-mono text-tertiary px-1">
                Page {page + 1}
              </span>
              <button 
                className="btn btn-secondary p-2" 
                onClick={() => setPage(p => p + 1)} 
                disabled={events.length < LIMIT || loading}
                aria-label="Next Page"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        }
      />
      
      {error && <div className="form-error">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search events by Agent ID, type, source, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="tab-group">
            {['ALL', 'BLOCK', 'QUARANTINE', 'ALLOW'].map((action) => (
              <button
                key={action}
                type="button"
                className={`tab-btn ${actionFilter === action ? 'active' : ''}`}
                onClick={() => setActionFilter(action)}
              >
                {action}
              </button>
            ))}
          </div>

          <select
            className="filter-select text-xs"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by Severity"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Security Events Table Panel */}
      <section className="glass-surface table-panel">
        <div className="panel-header">
          <div>
            <h2 className="text-sm font-semibold">Audit Stream Records</h2>
            <p className="text-xs text-tertiary">Cryptographically backed event log with deterministic threat scoring.</p>
          </div>
          <Badge variant="default">{filteredEvents.length} events</Badge>
        </div>

        {loading ? (
          <div className="p-4"><SkeletonTable rows={8} columns={7} /></div>
        ) : filteredEvents.length === 0 ? (
          <div className="workspace-empty">
            <CheckCircle2 size={32} style={{ color: 'var(--color-safe)' }} />
            <strong>No matching security events recorded</strong>
            <span>{searchQuery || actionFilter !== 'ALL' ? 'Adjust your filters or query.' : 'Run a test in the Playground to generate live events.'}</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Event Type / Agent</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Detector Module</th>
                  <th>Action</th>
                  <th>Risk Score</th>
                  <th>Observed Timestamp</th>
                  <th className="text-right">Forensic Inspection</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map(event => {
                  const { category, detector } = parseEventMetadata(event);
                  return (
                    <tr key={event.id}>
                      <td>
                        <div>
                          <strong className="text-primary font-medium block">
                            {event.event_type.replace("semantic_firewall_detection", "Firewall Detection").replace(/_/g, ' ')}
                          </strong>
                          <span className="mono text-xs text-tertiary mt-1 block">
                            Agent: {event.agent_id ? event.agent_id.slice(0, 12) + '...' : 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="text-secondary capitalize">
                        {category ? category.replace(/_/g, ' ') : 'General'}
                      </td>
                      <td>
                        <Badge variant={getSeverityVariant(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="mono text-xs text-secondary">
                        {detector || 'Pipeline'}
                      </td>
                      <td>
                        <DecisionBadge decision={event.action} />
                      </td>
                      <td className="mono font-semibold" style={{ color: event.risk_score > 60 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                        {event.risk_score.toFixed(1)}
                      </td>
                      <td className="text-xs text-secondary">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-secondary text-xs"
                          onClick={() => handleOpenForensics(event)}
                          title="Generate AI Forensic Explanation"
                        >
                          <Sparkles size={12} className="text-accent" />
                          <span>Forensics</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI Forensic Analysis Modal */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={closeForensicModal}
        title="Security Event Forensic Report"
        actions={
          <div className="flex items-center justify-between w-full">
            <span className="mono text-xs text-tertiary">
              UUID: {selectedEvent?.id}
            </span>
            <button className="btn btn-secondary text-xs" onClick={closeForensicModal}>
              Close Report
            </button>
          </div>
        }
      >
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Sparkles size={28} className="text-accent animate-pulse" />
            <span className="text-sm font-semibold text-primary">Generating Forensic Explanation...</span>
            <span className="text-xs text-tertiary">Correlating detector telemetry, MITRE vectors, and payload tokens</span>
          </div>
        ) : forensicData ? (
          <div className="flex flex-col gap-3 text-xs">
            {/* Header info */}
            <div className="p-3 rounded bg-surface border border-light flex items-center justify-between">
              <div>
                <span className="text-tertiary block text-xs">Threat Classification:</span>
                <strong className="text-sm text-primary font-semibold">{forensicData.threat_name}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(forensicData.severity_rating)}>
                  {forensicData.severity_rating.toUpperCase()}
                </Badge>
                <span className="mono text-tertiary capitalize">({forensicData.provider})</span>
              </div>
            </div>

            {/* Attacker intent */}
            <div>
              <span className="text-tertiary font-bold uppercase tracking-wider block mb-1">
                Attacker Intent &amp; Objective
              </span>
              <p className="m-0 p-3 rounded bg-surface border border-light text-secondary leading-relaxed">
                {forensicData.attacker_intent}
              </p>
            </div>

            {/* Technical Explanation */}
            <div>
              <span className="text-tertiary font-bold uppercase tracking-wider block mb-1">
                Technical Forensic Breakdown
              </span>
              <p className="m-0 p-3 rounded bg-surface border border-light text-secondary leading-relaxed">
                {forensicData.technical_explanation}
              </p>
            </div>

            {/* IOCs */}
            {forensicData.iocs_identified && forensicData.iocs_identified.length > 0 && (
              <div>
                <span className="text-tertiary font-bold uppercase tracking-wider block mb-1">
                  Indicators of Compromise (IOCs)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {forensicData.iocs_identified.map((ioc, idx) => (
                    <span
                      key={idx}
                      className="mono text-xs px-2 py-0.5 rounded bg-surface border border-light text-primary"
                    >
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Mitigation */}
            <div>
              <span className="text-tertiary font-bold uppercase tracking-wider block mb-1">
                Recommended Mitigation Guidance
              </span>
              <div className="p-3 rounded border border-light flex items-start gap-2" style={{ background: 'var(--color-safe-bg)', borderColor: 'var(--color-safe-border)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-safe)', marginTop: '2px', flexShrink: 0 }} />
                <span className="text-secondary leading-relaxed">{forensicData.mitigation_guidance}</span>
              </div>
            </div>

            {/* Captured Evidence Snippet */}
            {selectedEvent?.evidence?.content_snippet && (
              <div>
                <span className="text-tertiary font-bold uppercase tracking-wider block mb-1">
                  Captured Untrusted Payload Snippet
                </span>
                <pre className="mono text-xs p-3 rounded bg-surface border border-light text-tertiary overflow-x-auto m-0 whitespace-pre-wrap">
                  {selectedEvent.evidence.content_snippet}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="workspace-empty py-6">
            <AlertTriangle size={24} className="text-tertiary" />
            <span>Forensic report could not be derived for this event.</span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Events;
