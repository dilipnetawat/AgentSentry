import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, createAgent } from '../services/api';
import type { Agent } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { Shield, ChevronLeft, ChevronRight, Server, Plus, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const { showToast } = useToast();
  const LIMIT = 50;

  // Register Agent Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/agents?limit=${LIMIT}&offset=${page * LIMIT}`);
      setAgents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;
    setIsRegistering(true);
    try {
      const created = await createAgent(agentName.trim());
      showToast(`Agent "${created.name}" registered successfully`, 'success');
      setModalOpen(false);
      setAgentName('');
      await loadAgents();
    } catch (err: any) {
      showToast(err.message || 'Failed to register agent', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="Agent Fleet Management" 
        description="Monitor registered AI agents, inspect live risk levels, and manage isolation states."
        icon={<Shield size={20} />}
        actions={
          <div className="flex items-center gap-3">
            <button
              className="btn btn-primary btn-accent text-xs flex items-center gap-1.5"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={14} />
              <span>Register Agent</span>
            </button>
            <div className="flex items-center gap-1">
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
                disabled={agents.length < LIMIT || loading}
                aria-label="Next Page"
                title="Next Page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
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
            <span className="workspace-eyebrow">FLEET DIRECTORY</span>
            <h2>Registered Agent Inventory</h2>
          </div>
          <Badge variant="default">{agents.length} agents</Badge>
        </div>

        {loading ? (
          <div className="p-6"><SkeletonTable rows={8} columns={5} /></div>
        ) : agents.length === 0 ? (
          <div className="workspace-empty">
            <Server size={32} />
            <strong>No registered agents found</strong>
            <span>Register an agent using the button above or execute the Guided Security Demo.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent Name / Identity</th>
                  <th>Status</th>
                  <th>Current Risk Score</th>
                  <th>Registration Timestamp</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <div>
                        <strong className="text-primary font-medium" style={{ display: 'block' }}>
                          {agent.name}
                        </strong>
                        <span className="mono text-xs text-tertiary mt-1" style={{ display: 'block' }}>
                          {agent.id}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>
                        {agent.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="mono font-semibold" style={{ color: agent.risk_score > 60 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                      {agent.risk_score.toFixed(2)}
                    </td>
                    <td className="text-xs text-secondary">
                      {new Date(agent.created_at).toLocaleString()}
                    </td>
                    <td className="text-right">
                      <Link to={`/agents/${agent.id}`} className="btn btn-secondary text-xs">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {/* Register Agent Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Autonomous Agent"
      >
        <form onSubmit={handleRegisterAgent} className="flex flex-col gap-4">
          <div className="form-group">
            <label htmlFor="agent-name-input">Agent Name / Identifier</label>
            <input
              id="agent-name-input"
              type="text"
              placeholder="e.g. customer-support-agent, sql-analyst"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              required
              autoFocus
            />
            <span className="text-xs text-tertiary mt-1">
              The agent will be bound to your operator tenant with default active status and baseline 0.0 risk score.
            </span>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              className="btn btn-secondary text-xs py-2 px-3"
              onClick={() => setModalOpen(false)}
              disabled={isRegistering}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-accent text-xs py-2 px-3 flex items-center gap-1.5"
              disabled={isRegistering || !agentName.trim()}
            >
              <UserPlus size={14} />
              <span>{isRegistering ? 'Registering...' : 'Register Agent'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Agents;
