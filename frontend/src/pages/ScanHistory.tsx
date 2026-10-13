import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAllEvents, 
  type SecurityEvent, 
  parseEventMetadata 
} from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Badge, DecisionBadge } from '../components/Badge';
import { SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { 
  History, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  RefreshCw,
  Clock,
  Play
} from 'lucide-react';

const LIMIT = 25;

export const ScanHistory: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedScan, setSelectedScan] = useState<SecurityEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllEvents(LIMIT, page * LIMIT);
      setEvents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve scan history.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const query = searchQuery.toLowerCase();
      const content = ev.evidence?.content_snippet?.toLowerCase() || '';
      const reason = ev.evidence?.reason?.toLowerCase() || '';
      const action = ev.action.toLowerCase();
      const type = ev.event_type.toLowerCase();

      const matchesSearch = 
        !searchQuery || 
        content.includes(query) || 
        reason.includes(query) || 
        action.includes(query) || 
        type.includes(query) ||
        ev.id.toLowerCase().includes(query);

      const matchesStatus = 
        statusFilter === 'ALL' || 
        ev.action.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const handleTestInPlayground = (scan: SecurityEvent) => {
    const promptText = scan.evidence?.content_snippet || '';
    navigate('/playground', { state: { prefilledPrompt: promptText } });
  };

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Scan History" 
        description="Searchable, immutable audit trail of past prompts and documents evaluated by the security pipeline."
        icon={<History size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={loadEvents}
              disabled={loading}
              title="Refresh scan history"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <div className="flex items-center gap-1 border border-border rounded p-0.5 bg-surface">
              <button
                type="button"
                className="btn btn-secondary p-1.5"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                title="Previous page"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-mono text-text-muted px-2">Page {page + 1}</span>
              <button
                type="button"
                className="btn btn-secondary p-1.5"
                onClick={() => setPage(p => p + 1)}
                disabled={events.length < LIMIT || loading}
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
          <button type="button" className="btn btn-secondary text-xs" onClick={loadEvents}>Retry</button>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="search-bar w-full max-w-sm">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search by prompt excerpt, reason, event ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-text-primary focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Decision:</span>
            <select
              className="bg-surface-elevated border border-border rounded px-2.5 py-1 text-xs text-text-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Decisions</option>
              <option value="BLOCK">Blocked</option>
              <option value="QUARANTINE">Quarantined</option>
              <option value="ALLOW">Allowed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scans Table */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {events.length === 0
              ? 'No historical prompt scans found in audit database.'
              : 'No scans match the current search filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scan Time</th>
                  <th>Prompt Excerpt</th>
                  <th>Decision</th>
                  <th>Risk Score</th>
                  <th>Detection Reason</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((scan) => {
                  const { category } = parseEventMetadata(scan);
                  const promptSnippet = scan.evidence?.content_snippet || 'No raw content excerpt stored';

                  return (
                    <tr key={scan.id}>
                      <td>
                        <div className="text-xs text-text-secondary font-mono flex items-center gap-1">
                          <Clock size={12} className="text-text-muted" />
                          <span>{new Date(scan.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-text-primary line-clamp-1 max-w-sm">
                          {promptSnippet}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          Scan ID: {scan.id.slice(0, 16)}...
                        </div>
                      </td>
                      <td>
                        <DecisionBadge decision={scan.action} showIcon />
                      </td>
                      <td>
                        <span className={`font-mono font-bold text-xs ${
                          scan.risk_score >= 70 
                            ? 'text-color-critical'
                            : scan.risk_score >= 30
                            ? 'text-color-warning'
                            : 'text-color-safe'
                        }`}>
                          {scan.risk_score} / 100
                        </span>
                      </td>
                      <td>
                        <div className="text-xs text-text-secondary line-clamp-1 max-w-xs">
                          {scan.evidence?.reason || category || 'Rule heuristic pass'}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1"
                          onClick={() => setSelectedScan(scan)}
                          title="Inspect full scan telemetry"
                        >
                          <Eye size={12} />
                          <span>Details</span>
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

      {/* Scan Details Modal */}
      {selectedScan && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedScan(null)}
          title={`Scan Audit Record: ${selectedScan.id.slice(0, 18)}...`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <span className="text-[11px] text-text-muted block">Scan Timestamp</span>
                <span className="font-mono font-bold text-text-primary">{selectedScan.created_at}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedScan.severity.toLowerCase() as any}>{selectedScan.severity.toUpperCase()}</Badge>
                <DecisionBadge decision={selectedScan.action} showIcon />
              </div>
            </div>

            <div>
              <span className="font-semibold text-text-primary block mb-1">Evaluated Prompt Excerpt (Redacted):</span>
              <pre className="p-3 rounded bg-surface-elevated border border-border font-mono text-[11px] text-text-secondary overflow-x-auto whitespace-pre-wrap max-h-48">
                {selectedScan.evidence?.content_snippet || 'No raw content snippet recorded.'}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded bg-surface border border-border">
                <span className="text-text-muted block mb-0.5">Aggregated Risk Score:</span>
                <span className="font-mono font-bold text-sm text-text-primary">{selectedScan.risk_score} / 100</span>
              </div>
              <div className="p-2.5 rounded bg-surface border border-border">
                <span className="text-text-muted block mb-0.5">Target Agent Boundary:</span>
                <span className="font-mono font-bold text-sm text-text-primary">{selectedScan.agent_id.slice(0, 12)}...</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-text-primary block mb-1">Detection Reason &amp; Classification:</span>
              <p className="p-2.5 rounded bg-surface border border-border text-text-secondary leading-relaxed">
                {selectedScan.evidence?.reason || 'Evaluation completed without heuristic pattern triggers.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-primary text-xs flex items-center gap-1.5"
                onClick={() => handleTestInPlayground(selectedScan)}
              >
                <Play size={12} fill="currentColor" />
                <span>Re-test in Playground</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setSelectedScan(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default ScanHistory;
