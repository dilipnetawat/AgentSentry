import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  fetchHoneyTokens, 
  rotateHoneyToken, 
  createHoneyToken, 
  fetchRecentAgents,
  type HoneyToken, 
  type Agent 
} from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { 
  KeyRound, 
  RefreshCw, 
  Plus, 
  Search, 
  Eye, 
  Info,
  AlertTriangle,
  Bot,
  RotateCcw
} from 'lucide-react';

export const HoneyTokens: React.FC = () => {
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRIGGERED' | 'REVOKED'>('ALL');
  
  // Rotate Modal State
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Deploy Modal State
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployAgentId, setDeployAgentId] = useState('');
  const [deployScope, setDeployScope] = useState('system_prompt');
  const [deployTokenType, setDeployTokenType] = useState('api_key');
  const [isDeploying, setIsDeploying] = useState(false);

  // View Token Details Modal
  const [viewingToken, setViewingToken] = useState<HoneyToken | null>(null);

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tokenData, agentData] = await Promise.all([
        fetchHoneyTokens(),
        fetchRecentAgents(50, 0),
      ]);
      setTokens(tokenData);
      setAgents(agentData);
      if (agentData.length > 0 && !deployAgentId) {
        setDeployAgentId(agentData[0].id);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load HoneyToken inventory');
    } finally {
      setLoading(false);
    }
  }, [deployAgentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRotateClick = (id: string) => {
    setRotatingTokenId(id);
    setRotateModalOpen(true);
  };

  const confirmRotate = async () => {
    if (!rotatingTokenId) return;
    setActionLoading(true);
    try {
      const token = tokens.find((item) => item.id === rotatingTokenId);
      if (!token) throw new Error('HoneyToken not found');
      const result = await rotateHoneyToken(token);
      showToast(result.message || 'Canary token rotated successfully. Old token revoked.', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate HoneyToken', 'error');
    } finally {
      setActionLoading(false);
      setRotateModalOpen(false);
      setRotatingTokenId(null);
    }
  };

  const handleDeployToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployAgentId) {
      showToast('Please select a target agent to plant this HoneyToken.', 'error');
      return;
    }
    setIsDeploying(true);
    try {
      await createHoneyToken(deployAgentId, deployScope, deployTokenType);
      showToast('Cryptographic canary HoneyToken deployed successfully.', 'success');
      setDeployModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deploy HoneyToken', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const agentMap = useMemo(() => {
    return new Map(agents.map(a => [a.id, a.name]));
  }, [agents]);

  const totalTokens = tokens.length;
  const activeTokens = tokens.filter(t => t.status === 'active' && !t.is_triggered).length;
  const triggeredTokens = tokens.filter(t => t.is_triggered || (t.trigger_count && t.trigger_count > 0)).length;
  const revokedTokens = tokens.filter(t => t.status === 'revoked' || t.status === 'expired').length;

  const filteredTokens = useMemo(() => {
    return tokens.filter((t) => {
      const agentName = agentMap.get(t.agent_id) || '';
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        t.id.toLowerCase().includes(query) ||
        t.agent_id.toLowerCase().includes(query) ||
        t.scope.toLowerCase().includes(query) ||
        t.token_type.toLowerCase().includes(query) ||
        agentName.toLowerCase().includes(query);

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchesStatus = t.status === 'active' && !t.is_triggered;
      } else if (statusFilter === 'TRIGGERED') {
        matchesStatus = t.is_triggered || (t.trigger_count > 0);
      } else if (statusFilter === 'REVOKED') {
        matchesStatus = t.status === 'revoked' || t.status === 'expired';
      }

      return matchesSearch && matchesStatus;
    });
  }, [tokens, searchQuery, statusFilter, agentMap]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Honey Tokens" 
        description="Honeytokens are decoy secrets or records used to help detect suspicious access and exfiltration attempts."
        icon={<KeyRound size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={loadData}
              disabled={loading}
              title="Refresh tokens"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs"
              onClick={() => setDeployModalOpen(true)}
            >
              <Plus size={13} />
              <span>Deploy HoneyToken</span>
            </button>
          </div>
        }
      />

      {error ? (
        <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-xs mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary text-xs" onClick={loadData}>Retry</button>
        </div>
      ) : null}

      {/* Explanatory Callout Banner */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6 flex items-start gap-3">
        <Info size={18} className="text-accent-cyan shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <strong className="text-text-primary">How HoneyTokens Work:</strong> Decoy credentials (API keys, DB connection URIs, JWTs) are planted inside an agent's context. When an attacker attempts prompt extraction or indirect exfiltration, outbound payloads are intercepted by the Egress Enforcement Gateway. If a canary token is detected in egress traffic, execution is severed immediately.
        </div>
      </div>

      {/* 4 Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="dashboard-card border border-border bg-surface p-4 rounded-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Total Tokens</span>
          <div className="text-2xl font-bold font-mono text-text-primary mb-1">{totalTokens}</div>
          <span className="text-[11px] text-text-muted">Total provisioned canary seeds</span>
        </div>

        <div className="dashboard-card border border-border bg-surface p-4 rounded-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Active Armed</span>
          <div className="text-2xl font-bold font-mono text-color-safe mb-1">{activeTokens}</div>
          <span className="text-[11px] text-text-muted">Currently active canary tripwires</span>
        </div>

        <div className="dashboard-card border border-border bg-surface p-4 rounded-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Triggered Incidents</span>
          <div className="text-2xl font-bold font-mono text-color-critical mb-1">{triggeredTokens}</div>
          <span className="text-[11px] text-text-muted">Exfiltration attempts detected</span>
        </div>

        <div className="dashboard-card border border-border bg-surface p-4 rounded-lg">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Revoked / Rotated</span>
          <div className="text-2xl font-bold font-mono text-text-muted mb-1">{revokedTokens}</div>
          <span className="text-[11px] text-text-muted">Retired credentials</span>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="search-bar w-full max-w-sm">
            <Search size={14} className="text-text-muted" />
            <input
              type="text"
              placeholder="Search by Token ID, Agent, scope..."
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
              <option value="ALL">All Tokens</option>
              <option value="ACTIVE">Active (Armed)</option>
              <option value="TRIGGERED">Triggered</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>
      </div>

      {/* HoneyToken Table */}
      <div className="dashboard-card border border-border bg-surface p-5 rounded-lg">
        {loading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredTokens.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            {tokens.length === 0
              ? 'No honeytokens currently configured. Deploy one to arm your agents with canary tripwires.'
              : 'No honeytokens match the selected search query.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Bound Agent</th>
                  <th>Type</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Triggers</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((token) => (
                  <tr key={token.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-text-primary">
                        {token.id.slice(0, 16)}...
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-text-secondary">
                        <Bot size={13} className="text-text-muted" />
                        <span>{agentMap.get(token.agent_id) || token.agent_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] uppercase text-accent-cyan">
                        {token.token_type}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-text-secondary">
                        {token.scope}
                      </span>
                    </td>
                    <td>
                      <Badge variant={token.is_triggered ? 'critical' : token.status === 'active' ? 'safe' : 'default'}>
                        {token.is_triggered ? 'TRIGGERED' : token.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <span className={`font-mono font-bold text-xs ${
                        token.trigger_count > 0 ? 'text-color-critical' : 'text-text-muted'
                      }`}>
                        {token.trigger_count || 0}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-text-muted font-mono">
                        {new Date(token.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="btn btn-secondary text-xs px-2 py-1"
                          onClick={() => setViewingToken(token)}
                          title="Inspect token configuration"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                        {token.status === 'active' && (
                          <button
                            type="button"
                            className="btn btn-secondary text-xs px-2 py-1 text-color-warning border-amber-500/30"
                            onClick={() => handleRotateClick(token.id)}
                            title="Rotate and revoke this canary credential"
                          >
                            <RotateCcw size={12} />
                            <span>Rotate</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deploy Token Modal */}
      {deployModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setDeployModalOpen(false)}
          title="Deploy Cryptographic Canary HoneyToken"
          size="md"
        >
          <form onSubmit={handleDeployToken} className="space-y-4 text-xs">
            <p className="text-text-secondary leading-relaxed">
              Creates a synthetic decoy credential bound to an agent's runtime context. If this credential appears in an egress payload, the agent will be placed into immediate quarantine.
            </p>

            <div>
              <label className="font-semibold text-text-primary block mb-1">Target Agent</label>
              <select
                className="w-full bg-surface-elevated border border-border rounded p-2 text-xs text-text-primary focus:outline-none"
                value={deployAgentId}
                onChange={(e) => setDeployAgentId(e.target.value)}
                required
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-text-primary block mb-1">Token Format / Type</label>
              <select
                className="w-full bg-surface-elevated border border-border rounded p-2 text-xs text-text-primary focus:outline-none"
                value={deployTokenType}
                onChange={(e) => setDeployTokenType(e.target.value)}
              >
                <option value="api_key">Synthetic API Key (tok_canary_...)</option>
                <option value="db_uri">Database Connection URI (postgres://canary:...)</option>
                <option value="jwt_bearer">Decoy JWT Bearer Token (eyJhbGci...)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-text-primary block mb-1">Placement Scope</label>
              <select
                className="w-full bg-surface-elevated border border-border rounded p-2 text-xs text-text-primary focus:outline-none"
                value={deployScope}
                onChange={(e) => setDeployScope(e.target.value)}
              >
                <option value="system_prompt">System Prompt Environment Variables</option>
                <option value="workspace_memory">Agent Memory / Vector Store Context</option>
                <option value="tool_credentials">Mock Tool Configuration Parameters</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setDeployModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-xs"
                disabled={isDeploying || !deployAgentId}
              >
                {isDeploying ? 'Deploying...' : 'Deploy Token Trap'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Inspect Token Modal */}
      {viewingToken && (
        <Modal
          isOpen={true}
          onClose={() => setViewingToken(null)}
          title={`HoneyToken Specification: ${viewingToken.id.slice(0, 16)}...`}
          size="md"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Status:</span>
                <Badge variant={viewingToken.is_triggered ? 'critical' : viewingToken.status === 'active' ? 'safe' : 'default'}>
                  {viewingToken.is_triggered ? 'TRIGGERED' : viewingToken.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Bound Agent:</span>
                <span className="font-mono text-text-primary">{agentMap.get(viewingToken.agent_id) || viewingToken.agent_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Type:</span>
                <span className="font-mono uppercase text-accent-cyan">{viewingToken.token_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Scope:</span>
                <span className="font-mono text-text-secondary">{viewingToken.scope}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Trigger Count:</span>
                <span className="font-mono font-bold text-text-primary">{viewingToken.trigger_count || 0}</span>
              </div>
            </div>

            <div>
              <span className="text-text-muted font-semibold block mb-1">Masked Secret Value (Redacted for Security):</span>
              <pre className="p-2.5 rounded bg-surface-elevated border border-border font-mono text-[11px] text-text-secondary">
                {viewingToken.value ? `${viewingToken.value.slice(0, 8)}...[REDACTED_CANARY_VALUE]` : '[REDACTED_CANARY_SECRET]'}
              </pre>
            </div>

            <div className="p-2 rounded bg-surface border border-border text-[11px] text-text-muted">
              Note: Full secret values are intentionally redacted to enforce zero token leakage across the console.
            </div>
          </div>
        </Modal>
      )}

      {/* Rotate Confirmation Modal */}
      {rotateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setRotateModalOpen(false)}
          title="Confirm Canary Token Rotation"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-color-warning" />
              <div>
                <div className="font-bold mb-1">Rotate Canary Decoy Credential?</div>
                <p className="leading-relaxed">
                  Rotating will immediately invalidate the current decoy credential and generate a fresh cryptographic replacement. Any future egress matching the old credential will still trigger security alerts.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setRotateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={confirmRotate}
                disabled={actionLoading}
              >
                {actionLoading ? 'Rotating...' : 'Confirm Rotation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default HoneyTokens;
