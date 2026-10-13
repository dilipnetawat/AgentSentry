import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  apiFetch, 
  createAgent, 
  isolateAgent, 
  restoreAgent,
  type Agent 
} from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { 
  Bot, 
  Plus, 
  Search, 
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';

export const Agents: React.FC = () => {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ISOLATED'>('ALL');

  // Register Agent Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Kill Switch Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
  const [actionType, setActionType] = useState<'isolate' | 'restore'>('isolate');
  const [actionLoading, setActionLoading] = useState(false);

  const LIMIT = 50;

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/agents?limit=${LIMIT}&offset=${page * LIMIT}`);
      setAgents(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve agent fleet.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;
    setIsRegistering(true);
    try {
      const created = await createAgent(agentName.trim());
      showToast(`Agent "${created.name}" registered in fleet.`, 'success');
      setModalOpen(false);
      setAgentName('');
      await loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Failed to register agent', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const promptAction = (agent: Agent, type: 'isolate' | 'restore') => {
    setTargetAgent(agent);
    setActionType(type);
    setConfirmModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!targetAgent) return;
    setActionLoading(true);
    try {
      if (actionType === 'isolate') {
        await isolateAgent(targetAgent.id);
        showToast(`Agent "${targetAgent.name}" isolated. Egress severed.`, 'success');
      } else {
        await restoreAgent(targetAgent.id);
        showToast(`Agent "${targetAgent.name}" restored to active status.`, 'success');
      }
      setConfirmModalOpen(false);
      await loadAgents();
    } catch (err: any) {
      showToast(err.message || `Failed to ${actionType} agent`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = 
        !searchQuery ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = 
        statusFilter === 'ALL' || 
        agent.status.toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Agent Fleet &amp; Integrations" 
        description="Monitor registered AI agents, view live risk scores, and manage automated or manual isolation kill-switches."
        icon={<Bot size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={loadAgents}
              disabled={loading}
              title="Refresh agent inventory"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={13} />
              <span>Register Agent</span>
            </button>
          </div>
        }
      />

      {error ? (
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-xs mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary text-xs" onClick={loadAgents}>Retry</button>
        </div>
      ) : null}

      {/* Filter and Search Controls */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="search-bar w-full max-w-sm">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search agents by name or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-text-primary focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Status:</span>
            <select
              className="bg-surface-elevated border border-border rounded px-2.5 py-1 text-xs text-text-primary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Agents</option>
              <option value="ACTIVE">Active</option>
              <option value="ISOLATED">Isolated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        {loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredAgents.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {agents.length === 0
              ? 'No agents currently registered in the fleet. Click "Register Agent" to add one.'
              : 'No agents match the selected search criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name</th>
                  <th>UUID</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Registered</th>
                  <th>Kill-Switch Controls</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <Link 
                        to={`/agents/${agent.id}`} 
                        className="font-semibold text-xs text-text-primary hover:text-primary flex items-center gap-1.5"
                      >
                        <Bot size={14} className="text-primary shrink-0" />
                        <span>{agent.name}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-text-muted">
                        {agent.id}
                      </span>
                    </td>
                    <td>
                      <Badge variant={agent.status === 'isolated' ? 'critical' : 'safe'}>
                        {agent.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <span className={`font-mono font-bold text-xs ${
                        agent.risk_score >= 70 
                          ? 'text-color-critical'
                          : agent.risk_score >= 30
                          ? 'text-color-warning'
                          : 'text-color-safe'
                      }`}>
                        {agent.risk_score} / 100
                      </span>
                    </td>
                    <td>
                      <div className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={11} />
                        <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      {agent.status === 'active' ? (
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1 text-color-critical border-red-500/30 hover:bg-red-500/10 flex items-center gap-1"
                          onClick={() => promptAction(agent, 'isolate')}
                          title="Isolate agent from execution and sever egress"
                        >
                          <Lock size={12} />
                          <span>Isolate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2.5 py-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1"
                          onClick={() => promptAction(agent, 'restore')}
                          title="Restore agent to operational status"
                        >
                          <Unlock size={12} />
                          <span>Restore</span>
                        </button>
                      )}
                    </td>
                    <td className="text-right">
                      <Link 
                        to={`/agents/${agent.id}`}
                        className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ArrowRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Agent Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title="Register New Autonomous Agent"
          size="md"
        >
          <form onSubmit={handleRegisterAgent} className="space-y-4 text-xs">
            <p className="text-text-secondary leading-relaxed">
              Enrolls an AI agent or integration under AgentSentry protection. The agent will be provisioned with a unique UUID and bound to the Semantic Firewall.
            </p>
            <div>
              <label className="font-semibold text-text-primary block mb-1">Agent / Service Name</label>
              <input
                type="text"
                className="w-full bg-surface-elevated border border-border rounded p-2 text-xs text-text-primary focus:outline-none focus:border-primary"
                placeholder="e.g. Finance-Analyst-Agent or Code-Auditor"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                autoFocus
                required
              />
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
                type="submit"
                className="btn btn-primary text-xs"
                disabled={isRegistering || !agentName.trim()}
              >
                {isRegistering ? 'Registering...' : 'Register Agent'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Kill Switch Confirmation Modal */}
      {confirmModalOpen && targetAgent && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmModalOpen(false)}
          title={actionType === 'isolate' ? 'Confirm Agent Isolation' : 'Confirm Agent Restoration'}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className={`p-3 rounded border flex items-start gap-2.5 ${
              actionType === 'isolate' 
                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            }`}>
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm mb-1">
                  {actionType === 'isolate' ? 'Sever Agent Egress & Tool Execution?' : 'Restore Operational Clearance?'}
                </div>
                <p className="text-xs leading-relaxed">
                  {actionType === 'isolate'
                    ? `Engaging the kill-switch will immediately halt all outbound tool execution and network egress for agent "${targetAgent.name}". Any canary access will be blocked.`
                    : `Restoring agent "${targetAgent.name}" will clear the quarantine state and re-enable tool invocation and semantic pipeline clearance.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={actionType === 'isolate' ? 'btn btn-secondary text-xs text-color-critical border-red-500/40' : 'btn btn-primary text-xs'}
                onClick={handleExecuteAction}
                disabled={actionLoading}
              >
                {actionLoading 
                  ? 'Executing...' 
                  : actionType === 'isolate' 
                  ? 'Confirm Isolation (Kill-Switch)' 
                  : 'Confirm Restoration'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Agents;
