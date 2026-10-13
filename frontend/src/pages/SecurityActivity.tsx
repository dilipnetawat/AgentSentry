import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  fetchAllEvents, 
  explainSecurityEvent, 
  parseEventMetadata,
  type SecurityEvent, 
  type AIEventExplanation
} from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge, DecisionBadge, type BadgeVariant } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { 
  Activity as ActivityIcon,
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Search,
  RefreshCw,
  Clock,
  Bot,
  SlidersHorizontal
} from 'lucide-react';

const getSeverityVariant = (severity: string): BadgeVariant => {
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

export const SecurityActivity: React.FC = () => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BLOCK' | 'ALLOW' | 'QUARANTINE'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Event Forensics Modal
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [forensicData, setForensicData] = useState<AIEventExplanation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forensicError, setForensicError] = useState<string | null>(null);
  const [techDetailsExpanded, setTechDetailsExpanded] = useState(false);

  const LIMIT = 25;

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const eventsData = await fetchAllEvents(LIMIT, page * LIMIT);
      setEvents(eventsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load telemetry', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenForensics = async (event: SecurityEvent) => {
    setSelectedEvent(event);
    setForensicData(null);
    setForensicError(null);
    setTechDetailsExpanded(false);
    setIsAnalyzing(true);
    try {
      const result = await explainSecurityEvent(event.id);
      setForensicData(result);
    } catch (err: any) {
      setForensicError(err.message || 'AI Forensic service currently unreachable.');
      showToast('AI Forensic explanation unavailable', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        ev.id.toLowerCase().includes(query) ||
        ev.agent_id.toLowerCase().includes(query) ||
        ev.event_type.toLowerCase().includes(query) ||
        ev.source.toLowerCase().includes(query) ||
        (ev.evidence?.reason && String(ev.evidence.reason).toLowerCase().includes(query)) ||
        (ev.evidence?.content_snippet && String(ev.evidence.content_snippet).toLowerCase().includes(query));

      const evAction = (ev.action || '').toUpperCase();
      const matchesAction =
        actionFilter === 'ALL' ||
        (actionFilter === 'BLOCK' && (evAction.includes('BLOCK') || evAction.includes('DENY'))) ||
        (actionFilter === 'ALLOW' && evAction.includes('ALLOW')) ||
        (actionFilter === 'QUARANTINE' && evAction.includes('QUARANTINE'));

      const matchesSeverity =
        severityFilter === 'ALL' ||
        (ev.severity || '').toUpperCase() === severityFilter;

      return matchesSearch && matchesAction && matchesSeverity;
    });
  }, [events, searchQuery, actionFilter, severityFilter]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Activity Telemetry" 
        description="Chronological stream of real security and operational events across protected agent runtimes."
        icon={<ActivityIcon size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh telemetry stream"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
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
                disabled={events.length < LIMIT || loading}
                title="Next page"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        }
      />

      {/* Filter Control Bar */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="search-bar w-full max-w-sm">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search by Event ID, reason, snippet, agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-text-primary focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-text-muted">Decision:</span>
              <select
                className="bg-surface-elevated border border-border rounded px-2 py-1 text-xs text-text-primary"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
              >
                <option value="ALL">All Decisions</option>
                <option value="BLOCK">Blocked</option>
                <option value="QUARANTINE">Quarantined</option>
                <option value="ALLOW">Allowed</option>
              </select>
            </div>

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
          </div>
        </div>
      </div>

      {/* Chronological Telemetry Table */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {events.length === 0
              ? 'No security events recorded. Test prompts in Playground to generate live activity.'
              : 'No activity matches the selected filter criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Event Description</th>
                  <th>Agent / Source</th>
                  <th>Decision</th>
                  <th>Risk Score</th>
                  <th className="text-right">Forensic Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const { category, detector } = parseEventMetadata(event);

                  return (
                    <tr key={event.id}>
                      <td>
                        <div className="text-xs text-text-secondary font-mono flex items-center gap-1">
                          <Clock size={12} className="text-text-muted" />
                          <span>{formatTimeAgo(event.created_at)}</span>
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <Badge variant={getSeverityVariant(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div className="text-xs font-semibold text-text-primary">
                          {formatReadableTitle(event)}
                        </div>
                        <div className="text-[11px] text-text-muted line-clamp-1 max-w-md">
                          {event.evidence?.reason || `Category: ${category} via ${detector}`}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-text-secondary">
                          <Bot size={13} className="text-text-muted" />
                          <span>{event.agent_id ? event.agent_id.slice(0, 8) : 'Runtime'}</span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{event.source}</span>
                      </td>
                      <td>
                        <DecisionBadge decision={event.action} showIcon />
                      </td>
                      <td>
                        <span className={`font-mono font-bold text-xs ${
                          event.risk_score >= 70 
                            ? 'text-color-critical'
                            : event.risk_score >= 30
                            ? 'text-color-warning'
                            : 'text-color-safe'
                        }`}>
                          {event.risk_score} / 100
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1"
                          onClick={() => handleOpenForensics(event)}
                          title="Generate AI forensic explanation"
                        >
                          <Sparkles size={12} className="text-primary" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title="Security Event Telemetry & Forensic Audit"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Top metadata strip */}
            <div className="p-3 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-text-muted block">Event Identifier</span>
                <span className="font-mono font-bold text-text-primary">{selectedEvent.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getSeverityVariant(selectedEvent.severity)}>{selectedEvent.severity.toUpperCase()}</Badge>
                <DecisionBadge decision={selectedEvent.action} showIcon />
              </div>
            </div>

            {/* Execution Sequence (Rendered only from actual recorded fields) */}
            <div className="p-3.5 rounded bg-surface border border-border space-y-3">
              <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider">
                Execution Pipeline Sequence
              </h4>
              <div className="space-y-2">
                {/* Stage 1: Ingestion */}
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">Input Ingestion Received</div>
                    <div className="text-text-muted text-[11px]">
                      Source: <span className="font-mono text-text-secondary">{selectedEvent.source}</span> &bull; Target Agent: <span className="font-mono text-text-secondary">{selectedEvent.agent_id}</span>
                    </div>
                  </div>
                </div>

                {/* Stage 2: Security Checks */}
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-accent-cyan/20 text-accent-cyan flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">Dual-Engine Security Inspection</div>
                    <div className="text-text-muted text-[11px]">
                      Deterministic Pattern Matcher + FastEmbed ONNX Embedding Centroid Evaluation
                    </div>
                  </div>
                </div>

                {/* Stage 3: Policy Decision */}
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-color-safe flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">Policy Gate Evaluation</div>
                    <div className="text-text-muted text-[11px]">
                      Risk Score: <span className="font-mono font-bold text-text-primary">{selectedEvent.risk_score}</span> &bull; Enforcement Decision: <span className="font-bold text-text-primary">{selectedEvent.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Forensic Explanation */}
            {isAnalyzing ? (
              <div className="p-4 rounded bg-surface-elevated border border-border text-center text-text-muted">
                <Sparkles size={16} className="animate-spin text-primary mx-auto mb-1" />
                <span>Generating AI forensic explanation from active security provider...</span>
              </div>
            ) : forensicError ? (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {forensicError}
              </div>
            ) : forensicData ? (
              <div className="p-3.5 rounded bg-surface-elevated border border-primary/40 space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                    <Sparkles size={14} className="text-primary" />
                    <span>Forensic Analysis ({forensicData.threat_name})</span>
                  </span>
                  <Badge variant="safe">Provider: {forensicData.provider}</Badge>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Attacker Intent:</span>
                  <p className="text-text-primary leading-relaxed bg-surface p-2 rounded border border-border">
                    {forensicData.attacker_intent}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Technical Explanation:</span>
                  <p className="text-text-secondary leading-relaxed bg-surface p-2 rounded border border-border">
                    {forensicData.technical_explanation}
                  </p>
                </div>
                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Mitigation Guidance:</span>
                  <p className="text-text-secondary leading-relaxed bg-surface p-2 rounded border border-border">
                    {forensicData.mitigation_guidance}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Evidence & Snippet */}
            {selectedEvent.evidence?.content_snippet && (
              <div>
                <span className="text-text-muted font-semibold block mb-1">Captured Payload Excerpt (Redacted):</span>
                <pre className="p-2.5 rounded bg-surface border border-border font-mono text-[11px] text-text-secondary overflow-x-auto whitespace-pre-wrap">
                  {selectedEvent.evidence.content_snippet}
                </pre>
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
                  <span>Raw Evidence &amp; Event Metadata</span>
                </div>
                <span className="text-text-muted text-[11px] font-mono">
                  {techDetailsExpanded ? 'Collapse [-]' : 'Expand [+]'}
                </span>
              </button>

              {techDetailsExpanded && (
                <div className="p-3 bg-surface space-y-2 border-t border-border font-mono text-[11px]">
                  <pre className="p-2 rounded bg-surface-elevated text-text-secondary overflow-x-auto">
                    {JSON.stringify(selectedEvent.evidence || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default SecurityActivity;
