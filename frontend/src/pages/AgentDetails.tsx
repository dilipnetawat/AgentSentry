import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isolateAgent, restoreAgent, fetchAgentDetails } from '../services/api';
import type { Agent } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { SkeletonText } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import { SpotlightCard } from '../components/SpotlightCard';
import { ArrowLeft, Shield, AlertTriangle, Fingerprint, Activity, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'isolate' | 'restore'>('isolate');
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const loadAgent = async () => {
      try {
        if (!id) return;
        const data = await fetchAgentDetails(id);
        setAgent(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };
    loadAgent();
  }, [id]);

  const confirmAction = async () => {
    if (!agent) return;
    setActionLoading(true);
    try {
      if (modalAction === 'isolate') {
        await isolateAgent(agent.id);
        showToast('Agent isolated successfully', 'success');
      } else {
        await restoreAgent(agent.id);
        showToast('Agent restored successfully', 'success');
      }
      // Refresh
      const data = await fetchAgentDetails(agent.id);
      setAgent(data);
    } catch (err: any) {
      showToast(err.message || `Failed to ${modalAction} agent.`, 'error');
    } finally {
      setActionLoading(false);
      setModalOpen(false);
    }
  };

  const openModal = (action: 'isolate' | 'restore') => {
    setModalAction(action);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <SkeletonText width="200px" className="mb-4" />
        <SkeletonText width="300px" className="mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-surface p-6"><SkeletonText width="100%" /><SkeletonText width="100%" /></div>
          <div className="glass-surface p-6"><SkeletonText width="100%" /><SkeletonText width="100%" /></div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="dashboard-container">
        <button onClick={() => navigate('/agents')} className="btn btn-secondary mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="empty-state">
          <Shield size={48} className="empty-state-icon" />
          <p>{error || 'Agent not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <button onClick={() => navigate('/agents')} className="btn btn-secondary mb-6 text-sm">
        <ArrowLeft size={16} /> Back to Agents
      </button>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8 pb-6 border-b border-[var(--border-light)]"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-medium m-0">{agent.name}</h2>
            <Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>
              {agent.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-tertiary mono">
            <Fingerprint size={14} /> ID: {agent.id}
          </div>
        </div>
        <div>
          {agent.status === 'active' && (
            <button 
              className="btn btn-danger flex items-center gap-2"
              onClick={() => openModal('isolate')}
            >
              <AlertTriangle size={16} /> Isolate Agent
            </button>
          )}
          {agent.status === 'isolated' && (
            <button 
              className="btn btn-primary flex items-center gap-2 text-black"
              style={{ color: '#000' }}
              onClick={() => openModal('restore')}
            >
              <Shield size={16} /> Restore Agent
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <SpotlightCard className="p-5 flex flex-col justify-between h-full" glowColor={agent.risk_score > 70 ? "rgba(239, 68, 68, 0.2)" : agent.risk_score > 30 ? "rgba(249, 115, 22, 0.2)" : "rgba(255, 255, 255, 0.1)"}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-secondary" />
            <h3 className="text-xs font-medium text-tertiary uppercase tracking-wider m-0">Final Risk Score</h3>
          </div>
          <div className={`text-3xl font-bold ${agent.risk_score > 70 ? 'text-critical' : agent.risk_score > 30 ? 'text-high' : 'text-primary'}`}>
            {agent.risk_score.toFixed(2)}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <Fingerprint size={16} className="text-secondary" />
            <h3 className="text-xs font-medium text-tertiary uppercase tracking-wider m-0">Semantic Similarity</h3>
          </div>
          <div className={`text-2xl font-semibold ${agent.semantic_similarity === undefined ? 'text-tertiary' : 'text-primary'}`}>
            {agent.semantic_similarity !== undefined ? agent.semantic_similarity.toFixed(4) : 'N/A'}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-secondary" />
            <h3 className="text-xs font-medium text-tertiary uppercase tracking-wider m-0">Confidence</h3>
          </div>
          <div className={`text-2xl font-semibold ${agent.confidence === undefined ? 'text-tertiary' : 'text-primary'}`}>
            {agent.confidence !== undefined ? `${(agent.confidence * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </SpotlightCard>
        
        <SpotlightCard className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-secondary" />
            <h3 className="text-xs font-medium text-tertiary uppercase tracking-wider m-0">Detector Status</h3>
          </div>
          <div className={`text-lg font-medium ${!agent.detector_status ? 'text-tertiary' : 'text-primary'}`}>
            {agent.detector_status ? agent.detector_status : 'Unavailable'}
          </div>
        </SpotlightCard>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-surface p-6 mb-8"
      >
        <h3 className="text-lg font-medium flex items-center gap-2 mb-4 mt-0"><Clock size={18} /> System Information</h3>
        <div className="flex items-center justify-between py-3 border-b border-[var(--border-light)]" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <span className="text-sm text-secondary">Registered At</span>
          <span className="text-sm font-medium">{new Date(agent.created_at).toLocaleString()}</span>
        </div>
      </motion.div>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => !actionLoading && setModalOpen(false)} 
        title={`Confirm ${modalAction === 'isolate' ? 'Isolation' : 'Restoration'}`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={actionLoading}>Cancel</button>
            <button className={`btn ${modalAction === 'isolate' ? 'btn-danger' : 'btn-primary'}`} onClick={confirmAction} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : (modalAction === 'isolate' ? 'Isolate Agent' : 'Restore Agent')}
            </button>
          </>
        }
      >
        <p className="m-0 text-sm">Are you sure you want to {modalAction} <strong className="text-primary">{agent.name}</strong>?</p>
        <p className="mt-2 text-sm text-tertiary m-0">
          {modalAction === 'isolate' 
            ? 'This action will prevent the agent from performing protected operations.' 
            : 'This action will allow the agent to perform protected operations again.'}
        </p>
      </Modal>
    </div>
  );
};

export default AgentDetails;
