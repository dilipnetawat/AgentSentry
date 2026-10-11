import React, { useEffect, useState } from 'react';
import { fetchHoneyTokens, rotateHoneyToken, createHoneyToken, fetchRecentAgents } from '../services/api';
import type { HoneyToken, Agent } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { Database, RefreshCw, Lock, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const HoneyTokens: React.FC = () => {
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

  const { showToast } = useToast();

  const loadData = async () => {
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
    } catch (err: any) {
      setError(err.message || 'Failed to load HoneyTokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      showToast(result.message || 'Token rotated successfully', 'success');
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
      showToast('Please select an agent to bind this HoneyToken', 'error');
      return;
    }
    setIsDeploying(true);
    try {
      await createHoneyToken(deployAgentId, deployScope, deployTokenType);
      showToast('Canary HoneyToken deployed successfully', 'success');
      setDeployModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deploy HoneyToken', 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="HoneyToken Decoy Credential Vault" 
        description="Active decoy traps deployed across agent execution environments to detect unauthorized exfiltration."
        icon={<Database size={20} />}
        actions={
          <button
            className="btn btn-primary btn-accent text-xs flex items-center gap-1.5"
            onClick={() => setDeployModalOpen(true)}
          >
            <Plus size={14} />
            <span>Deploy HoneyToken</span>
          </button>
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
            <span className="workspace-eyebrow">DECOY MESH</span>
            <h2>Active Canary Traps</h2>
          </div>
          <Badge variant="default">{tokens.length} configured</Badge>
        </div>

        {loading ? (
          <div className="p-6"><SkeletonTable rows={4} columns={5} /></div>
        ) : tokens.length === 0 ? (
          <div className="workspace-empty">
            <KeyRound size={32} />
            <strong>No HoneyTokens configured</strong>
            <span>Create a canary token via the button above or execute the HoneyToken Guided Security Demo scenario.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scope / Token Type</th>
                  <th>Credential Value (Redacted)</th>
                  <th>Status</th>
                  <th>Deployment Timestamp</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(token => (
                  <tr key={token.id}>
                    <td>
                      <div>
                        <strong className="text-primary font-medium" style={{ display: 'block' }}>
                          {token.scope} / {token.token_type}
                        </strong>
                        <span className="mono text-xs text-tertiary mt-1" style={{ display: 'block' }}>
                          {token.id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="mono text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded" 
                        style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
                        title="Raw decoy credentials are cryptographic secrets and remain masked"
                      >
                        <Lock size={11} />
                        <span>••••••••••••••••</span>
                      </span>
                    </td>
                    <td>
                      <Badge variant={token.status === 'active' ? 'safe' : 'default'}>
                        {token.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-xs text-secondary">
                      {new Date(token.created_at).toLocaleString()}
                    </td>
                    <td className="text-right">
                      {token.status === 'active' && (
                        <button 
                          className="btn btn-secondary text-xs py-1"
                          onClick={() => handleRotateClick(token.id)}
                          title="Rotate this decoy credential"
                        >
                          <RefreshCw size={12} />
                          <span>Rotate Token</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* Deploy HoneyToken Modal */}
      <Modal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        title="Deploy Canary HoneyToken Trap"
      >
        <form onSubmit={handleDeployToken} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="honeytoken-agent-select">Target Agent Fleet Member</label>
            {agents.length === 0 ? (
              <p className="text-xs text-tertiary m-0">No agents registered yet. Register an agent first.</p>
            ) : (
              <select
                id="honeytoken-agent-select"
                value={deployAgentId}
                onChange={(e) => setDeployAgentId(e.target.value)}
                required
              >
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-tertiary mt-1">
              Select the autonomous agent workspace to protect with this canary decoy credential.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="honeytoken-scope-select">Injection Scope</label>
            <select
              id="honeytoken-scope-select"
              value={deployScope}
              onChange={(e) => setDeployScope(e.target.value)}
            >
              <option value="system_prompt">System Prompt / Instructions</option>
              <option value="rag_context">RAG Knowledge Base / Vector Docs</option>
              <option value="api_keys">Environment Variables / Config</option>
              <option value="file_system">Agent Scratch File System</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="honeytoken-type-select">Canary Credential Type</label>
            <select
              id="honeytoken-type-select"
              value={deployTokenType}
              onChange={(e) => setDeployTokenType(e.target.value)}
            >
              <option value="api_key">Synthetic SaaS API Key (ak_live_...)</option>
              <option value="jwt_token">Synthetic Service Account JWT</option>
              <option value="database_url">Database Connection String</option>
              <option value="aws_secret">AWS Access Key Pair</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="btn btn-secondary text-xs py-2 px-3"
              onClick={() => setDeployModalOpen(false)}
              disabled={isDeploying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-accent text-xs py-2 px-3 flex items-center gap-1.5"
              disabled={isDeploying || agents.length === 0}
            >
              <ShieldCheck size={14} />
              <span>{isDeploying ? 'Deploying Canary...' : 'Deploy Canary Token'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Rotate Confirmation Modal */}
      <Modal
        isOpen={rotateModalOpen}
        onClose={() => setRotateModalOpen(false)}
        title="Confirm HoneyToken Rotation"
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setRotateModalOpen(false)} disabled={actionLoading}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={confirmRotate} disabled={actionLoading}>
              {actionLoading ? 'Rotating Secret...' : 'Rotate Token'}
            </button>
          </>
        }
      >
        <p className="m-0 text-sm">
          Are you sure you want to rotate this decoy credential?
        </p>
        <p className="mt-2 text-tertiary m-0 text-xs leading-relaxed">
          The current canary will be immediately invalidated and marked as revoked. A fresh 
          cryptographic canary token will be generated and seeded into the active decoy mesh.
        </p>
      </Modal>
    </div>
  );
};

export default HoneyTokens;
