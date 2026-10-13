import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  isolateAgent, 
  restoreAgent, 
  fetchAgentDetails,
  fetchAgentEvents,
  fetchHoneyTokens,
  type Agent,
  type SecurityEvent,
  type HoneyToken
} from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { SkeletonCard } from '../components/SkeletonLoader';
import { Badge, DecisionBadge } from '../components/Badge';
import { 
  ArrowLeft, 
  Bot, 
  ShieldAlert, 
  AlertTriangle, 
  KeyRound, 
  Activity, 
  Lock, 
  Unlock, 
  Wrench,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kill Switch Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'isolate' | 'restore'>('isolate');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [agentData, eventsData, allTokens] = await Promise.allSettled([
        fetchAgentDetails(id),
        fetchAgentEvents(id),
        fetchHoneyTokens()
      ]);

      if (agentData.status === 'fulfilled') setAgent(agentData.value);
      else throw new Error('Agent not found');

      if (eventsData.status === 'fulfilled') setEvents(eventsData.value);
      if (allTokens.status === 'fulfilled') {
        setTokens(allTokens.value.filter((t) => t.agent_id === id));
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve agent details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmAction = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      if (modalAction === 'isolate') {
        await isolateAgent(agent.id);
        showToast(`Kill-Switch engaged. Agent "${agent.name}" is now isolated.`, 'success');
      } else {
        await restoreAgent(agent.id);
        showToast(`Agent "${agent.name}" restored to active status.`, 'success');
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || `Failed to ${modalAction} agent.`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="dashboard-container">
        <button type="button" onClick={() => navigate('/agents')} className="btn btn-secondary mb-4 text-xs">
          <ArrowLeft size={13} />
          <span>Back to Agents</span>
        </button>
        <div className="dashboard-card border border-border bg-surface p-8 text-center text-xs text-text-muted">
          <ShieldAlert size={32} className="mx-auto text-color-critical mb-2" />
          <div className="font-bold text-text-primary text-sm mb-1">{error || 'Agent Not Found'}</div>
          <p>The requested agent UUID does not exist or you do not have permission to view it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top Breadcrumb & Return Action */}
      <div className="mb-4">
        <button type="button" onClick={() => navigate('/agents')} className="btn btn-secondary text-xs">
          <ArrowLeft size={13} />
          <span>Back to Agent Fleet</span>
        </button>
      </div>

      {/* Header Profile Banner */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded bg-surface-elevated border border-border text-primary">
            <Bot size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text-primary">{agent.name}</h1>
              <Badge variant={agent.status === 'isolated' ? 'critical' : 'safe'}>
                {agent.status.toUpperCase()}
              </Badge>
            </div>
            <div className="text-xs text-text-muted font-mono">
              UUID: {agent.id} &bull; Registered {new Date(agent.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div>
          {agent.status === 'active' ? (
            <button
              type="button"
              className="btn btn-secondary text-xs text-color-critical border-red-500/40 hover:bg-red-500/10 flex items-center gap-1.5"
              onClick={() => { setModalAction('isolate'); setModalOpen(true); }}
            >
              <Lock size={13} />
              <span>Engage Kill-Switch (Isolate)</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 flex items-center gap-1.5"
              onClick={() => { setModalAction('restore'); setModalOpen(true); }}
            >
              <Unlock size={13} />
              <span>Restore Operational Status</span>
            </button>
          )}
        </div>
      </div>

      {/* Permissions & Security Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="dashboard-card border border-border bg-surface p-5 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 border-b border-border pb-2">
            <Wrench size={15} className="text-primary" />
            <span>Integration Permissions &amp; Boundary Access</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded bg-surface-elevated border border-border">
              <span className="font-semibold text-text-primary block mb-0.5">What this integration can access:</span>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Inbound prompts evaluated through the Semantic Firewall, FastEmbed ONNX embedding inspection, and authorized MCP read-only server tools.
              </p>
            </div>

            <div className="p-2.5 rounded bg-surface-elevated border border-border">
              <span className="font-semibold text-color-safe block mb-0.5 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>What actions are permitted:</span>
              </span>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Authorized diagnostic queries, benign research prompts with aggregated risk score &lt; 30, and allowlisted GitHub read operations.
              </p>
            </div>

            <div className="p-2.5 rounded bg-surface-elevated border border-border">
              <span className="font-semibold text-color-critical block mb-0.5 flex items-center gap-1">
                <XCircle size={12} />
                <span>What actions are blocked:</span>
              </span>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Arbitrary shell scripts (<code className="font-mono text-red-300">rm -rf, sudo, exec</code>), canary honeytoken exfiltration, system prompt leakage, and prompts scoring &ge; 70.
              </p>
            </div>

            <div className="p-2 rounded bg-surface border border-border text-[11px] text-text-muted">
              <strong>Controlling Policy:</strong> Governed by AgentSentry Risk Aggregator &amp; Strict Allowlist Gateway.
            </div>
          </div>
        </div>

        {/* Bound HoneyTokens Canary Decoys */}
        <div className="dashboard-card border border-border bg-surface p-5 rounded-lg space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <KeyRound size={15} className="text-accent-cyan" />
              <span>Bound Canary HoneyTokens ({tokens.length})</span>
            </h3>
            <Link to="/honeytokens" className="text-xs text-primary hover:underline">
              Manage Tokens
            </Link>
          </div>

          {tokens.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No honeytokens currently provisioned for this agent. Deploy a decoy trap from the Honey Tokens console.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tokens.map((tok) => (
                <div key={tok.id} className="p-2.5 rounded bg-surface-elevated border border-border text-xs flex items-center justify-between">
                  <div>
                    <div className="font-mono font-semibold text-text-primary">{tok.token_type.toUpperCase()}</div>
                    <div className="text-[11px] text-text-muted font-mono">Scope: {tok.scope}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={tok.is_triggered ? 'critical' : 'safe'}>
                      {tok.is_triggered ? 'TRIGGERED' : 'ARMED'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Events Recorded for this Agent */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3 border-b border-border pb-2">
          <Activity size={15} className="text-primary" />
          <span>Security Audit Events for this Agent ({events.length})</span>
        </h3>

        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-muted">
            Zero security violations or blocked actions recorded for this agent.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Event Type</th>
                  <th>Risk Score</th>
                  <th>Decision</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="text-xs font-mono text-text-muted">{new Date(ev.created_at).toLocaleTimeString()}</td>
                    <td>
                      <Badge variant={ev.severity.toLowerCase() as any}>{ev.severity.toUpperCase()}</Badge>
                    </td>
                    <td className="text-xs font-mono text-text-primary">{ev.event_type}</td>
                    <td className="text-xs font-mono font-bold text-text-primary">{ev.risk_score}</td>
                    <td>
                      <DecisionBadge decision={ev.action} showIcon />
                    </td>
                    <td className="text-xs text-text-secondary line-clamp-1">
                      {ev.evidence?.reason || 'Policy threshold violation'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={modalAction === 'isolate' ? 'Engage Agent Kill-Switch' : 'Restore Agent Operational Status'}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className={`p-3 rounded border flex items-start gap-2.5 ${
              modalAction === 'isolate' 
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}>
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">
                  {modalAction === 'isolate' ? 'Sever Agent Runtime & Tool Egress?' : 'Restore Full Operational Status?'}
                </div>
                <p className="text-xs leading-relaxed">
                  {modalAction === 'isolate'
                    ? `Engaging the kill-switch will immediately halt all outbound tool execution and network egress for "${agent.name}".`
                    : `Restoring "${agent.name}" will clear the quarantine state and re-enable tool invocation and semantic pipeline clearance.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={modalAction === 'isolate' ? 'btn btn-secondary text-xs text-color-critical border-red-500/40' : 'btn btn-primary text-xs'}
                onClick={confirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Executing...' : modalAction === 'isolate' ? 'Confirm Isolation' : 'Confirm Restoration'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default AgentDetails;
