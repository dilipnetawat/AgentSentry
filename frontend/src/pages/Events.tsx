import React, { useEffect, useState } from 'react';
import { fetchAllEvents, explainSecurityEvent, parseEventMetadata } from '../services/api';
import type { SecurityEvent, AIEventExplanation } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import type { BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { ShieldAlert, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const { showToast } = useToast();
  const LIMIT = 50;

  // AI Forensic Modal state
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [forensicData, setForensicData] = useState<AIEventExplanation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
          <div className="p-6"><SkeletonTable rows={8} columns={8} /></div>
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
                  <th className="text-right">Forensics</th>
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
                      <td className="text-right">
                        <button
                          className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 ml-auto"
                          onClick={() => handleOpenForensics(event)}
                          title="Run AI Forensic Analysis on this event"
                        >
                          <Sparkles size={12} className="text-accent" />
                          <span>AI Forensics</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* AI Forensic Analysis Modal */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={closeForensicModal}
        title="AI Security Event Forensic Report"
        actions={
          <div className="flex items-center justify-between w-full">
            <span className="mono text-xs text-tertiary">
              ID: {selectedEvent?.id.slice(0, 16)}...
            </span>
            <button className="btn btn-secondary text-xs py-1.5 px-3" onClick={closeForensicModal}>
              Close Report
            </button>
          </div>
        }
      >
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Sparkles size={28} className="text-accent animate-pulse" />
            <span className="text-sm font-medium text-secondary">Running deep telemetry forensic analysis...</span>
            <span className="text-xs text-tertiary">Correlating evidence snippets, MITRE classifications, and threat vectors</span>
          </div>
        ) : forensicData ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-subtle">
              <div>
                <span className="text-xs text-tertiary block mb-0.5">Threat Classification:</span>
                <strong className="text-sm text-primary font-semibold">{forensicData.threat_name}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(forensicData.severity_rating)}>
                  {forensicData.severity_rating.toUpperCase()}
                </Badge>
                <span className="mono text-xs text-secondary capitalize font-medium">({forensicData.provider})</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                Attacker Intent &amp; Objectives
              </span>
              <p className="text-sm text-secondary bg-surface p-3 rounded-lg border border-subtle m-0 leading-relaxed">
                {forensicData.attacker_intent}
              </p>
            </div>

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                Technical Forensic Breakdown
              </span>
              <p className="text-sm text-secondary bg-surface p-3 rounded-lg border border-subtle m-0 leading-relaxed">
                {forensicData.technical_explanation}
              </p>
            </div>

            {forensicData.iocs_identified && forensicData.iocs_identified.length > 0 && (
              <div>
                <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1.5">
                  Identified Indicators of Compromise (IOCs)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {forensicData.iocs_identified.map((ioc, idx) => (
                    <span
                      key={idx}
                      className="mono text-xs px-2.5 py-1 rounded bg-surface border border-subtle text-primary"
                    >
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                Recommended Mitigation
              </span>
              <div className="p-3 rounded-lg border border-subtle flex items-start gap-2.5" style={{ background: 'var(--color-safe-bg)', borderColor: 'var(--color-safe-border)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-safe)', marginTop: '2px', flexShrink: 0 }} />
                <span className="text-secondary text-xs leading-relaxed">{forensicData.mitigation_guidance}</span>
              </div>
            </div>

            {selectedEvent?.evidence?.content_snippet && (
              <div>
                <span className="text-xs text-tertiary font-semibold uppercase tracking-wider block mb-1">
                  Captured Ingestion Payload / Evidence Snippet
                </span>
                <pre className="mono text-xs p-3 rounded-lg bg-surface border border-subtle text-tertiary overflow-x-auto m-0 whitespace-pre-wrap">
                  {selectedEvent.evidence.content_snippet}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="workspace-empty py-8">
            <AlertTriangle size={24} className="text-tertiary" />
            <span>Forensic report unavailable for this event.</span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Events;
