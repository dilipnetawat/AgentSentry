import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import type { Agent } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { Shield, ChevronLeft, ChevronRight, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
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
    loadAgents();
  }, [page]);

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="Agent Fleet Management" 
        description="Monitor registered AI agents, inspect live risk levels, and manage isolation states."
        icon={<Shield size={20} />}
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
              disabled={agents.length < LIMIT || loading}
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
            <span>Register an agent via the API or execute the Guided Security Demo.</span>
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
    </div>
  );
};

export default Agents;
