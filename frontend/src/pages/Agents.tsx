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
        title="Agents" 
        description="Manage and monitor registered AI agents."
        icon={<Shield size={24} />}
        actions={
          <div className="flex items-center gap-4">
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => Math.max(0, p - 1))} 
              disabled={page === 0 || loading}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-secondary">Page {page + 1}</span>
            <button 
              className="btn btn-secondary p-2" 
              onClick={() => setPage(p => p + 1)} 
              disabled={agents.length < LIMIT || loading}
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      
      {error && <div className="form-error mb-4">{error}</div>}
      
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-surface flex-1 overflow-hidden flex flex-col mb-8"
      >
        {loading ? (
          <div className="p-8"><SkeletonTable rows={8} columns={5} /></div>
        ) : agents.length === 0 ? (
          <div className="empty-state">
            <Server size={48} className="empty-state-icon" />
            <p>No agents found</p>
          </div>
        ) : (
          <div className="table-container border-0 rounded-none flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name / ID</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <div>
                        <strong className="font-medium text-primary">{agent.name}</strong>
                        <div className="mono text-xs text-tertiary mt-1">{agent.id}</div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>
                        {agent.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="mono">{agent.risk_score.toFixed(2)}</td>
                    <td className="text-xs text-tertiary">{new Date(agent.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      <Link to={`/agents/${agent.id}`} className="btn btn-secondary text-xs py-1">View Details</Link>
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
