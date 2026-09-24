import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isolateAgent, restoreAgent, fetchAgentDetails } from '../services/api';
import type { Agent } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { SkeletonText } from '../components/SkeletonLoader';
import { Badge } from '../components/Badge';
import { SpotlightCard } from '../components/SpotlightCard';
import { ArrowLeft, Shield, AlertTriangle, Fingerprint, Activity, Clock, Sparkles } from 'lucide-react';
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
        <SkeletonText width="160px" className="mb-4" />
        <SkeletonText width="320px" className="mb-6" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="glass-surface p-6"><SkeletonText width="100%" /><SkeletonText width="60%" className="mt-2" /></div>
          <div className="glass-surface p-6"><SkeletonText width="100%" /><SkeletonText width="60%" className="mt-2" /></div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="dashboard-container">
        <button onClick={() => navigate('/agents')} className="btn btn-secondary mb-6 text-xs">
          <ArrowLeft size={14} />
          <span>Back to Agents</span>
        </button>
        <div className="workspace-empty glass-surface p-8">
          <Shield size={36} />
          <strong>{error || 'Agent not found'}</strong>
          <span>The requested agent profile could not be retrieved from the database.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="mb-4">
        <button onClick={() => navigate('/agents')} className="btn btn-secondary text-xs">
          <ArrowLeft size={14} />
          <span>Back to Agents</span>
        </button>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-surface p-6 mb-6 flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold m-0 text-primary">{agent.name}</h1>
            <Badge variant={agent.status === 'isolated' ? 'critical' : agent.status === 'active' ? 'safe' : 'default'}>
              {agent.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-tertiary mono">
            <Fingerprint size={14} />
            <span>ID: {agent.id}</span>
          </div>
        </div>

        <div>
          {agent.status === 'active' && (
            <button 
              className="btn btn-danger"
              onClick={() => openModal('isolate')}
            >
              <AlertTriangle size={15} />
              <span>Isolate Agent</span>
            </button>
          )}
          {agent.status === 'isolated' && (
            <button 
              className="btn btn-primary btn-accent"
              onClick={() => openModal('restore')}
            >
              <Shield size={15} />
              <span>Restore Agent</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* 4 Distinct Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Metric 1: Final Risk Score */}
        <SpotlightCard 
          className="p-5 flex flex-col justify-between" 
          glowColor={agent.risk_score > 70 ? "rgba(244, 63, 94, 0.2)" : agent.risk_score > 30 ? "rgba(249, 115, 22, 0.2)" : "rgba(255, 255, 255, 0.08)"}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity size={15} className="text-tertiary" />
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Final Risk Score</span>
          </div>
          <div className="mono font-bold" style={{ fontSize: '2rem', color: agent.risk_score > 70 ? 'var(--color-critical)' : agent.risk_score > 30 ? 'var(--color-high)' : 'var(--text-primary)' }}>
            {agent.risk_score.toFixed(2)}
          </div>
          <span className="text-tertiary" style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
            Deterministic score (0.00 – 100.00)
          </span>
        </SpotlightCard>

        {/* Metric 2: Semantic Similarity — Cosine Similarity */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-tertiary" />
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Semantic Similarity — Cosine Similarity</span>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.75rem', color: agent.semantic_similarity !== undefined ? 'var(--color-accent)' : 'var(--text-tertiary)' }}>
            {agent.semantic_similarity !== undefined ? agent.semantic_similarity.toFixed(4) : 'N/A'}
          </div>
          <span className="text-tertiary" style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
            {agent.semantic_similarity !== undefined ? 'Calculated via vector embeddings' : 'Requires semantic detector telemetry'}
          </span>
        </SpotlightCard>

        {/* Metric 3: Confidence */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={15} className="text-tertiary" />
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Confidence</span>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.75rem', color: agent.confidence !== undefined ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {agent.confidence !== undefined ? `${(agent.confidence * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <span className="text-tertiary" style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
            {agent.confidence !== undefined ? 'Statistical detection confidence' : 'No confidence score returned'}
          </span>
        </SpotlightCard>
        
        {/* Metric 4: Detector Status */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-tertiary" />
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Detector Status</span>
          </div>
          <div className="mono font-bold" style={{ fontSize: '1.35rem', color: agent.detector_status === 'AVAILABLE' ? 'var(--color-safe)' : agent.detector_status === 'UNAVAILABLE' ? 'var(--color-medium)' : 'var(--text-tertiary)' }}>
            {agent.detector_status || 'Unavailable'}
          </div>
          <span className="text-tertiary" style={{ fontSize: '0.7rem', marginTop: '0.4rem' }}>
            Active detector state from backend
          </span>
        </SpotlightCard>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-surface p-6 mb-8"
      >
        <div className="workspace-section-heading">
          <div>
            <span className="workspace-eyebrow">METADATA AUDIT</span>
            <h2 className="flex items-center gap-2 m-0 text-base">
              <Clock size={16} />
              <span>System &amp; Registration Information</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-sm text-secondary">Created / Registered At</span>
          <span className="text-sm font-medium text-primary mono">{new Date(agent.created_at).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-sm text-secondary">Cryptographic Agent ID</span>
          <span className="text-sm font-medium text-primary mono">{agent.id}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-secondary">Enforcement Boundary</span>
          <Badge variant={agent.status === 'isolated' ? 'critical' : 'safe'}>
            {agent.status === 'isolated' ? 'EGRESS BLOCKED · ISOLATED' : 'ACTIVE EGRESS POLICY'}
          </Badge>
        </div>
      </motion.div>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => !actionLoading && setModalOpen(false)} 
        title={`Confirm Agent ${modalAction === 'isolate' ? 'Isolation' : 'Restoration'}`}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </button>
            <button 
              className={`btn ${modalAction === 'isolate' ? 'btn-danger' : 'btn-primary btn-accent'}`} 
              onClick={confirmAction} 
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : (modalAction === 'isolate' ? 'Confirm Isolation' : 'Confirm Restoration')}
            </button>
          </>
        }
      >
        <p className="m-0 text-sm">
          Are you sure you want to {modalAction} <strong className="text-primary">{agent.name}</strong>?
        </p>
        <p className="mt-2 text-tertiary m-0 text-xs leading-relaxed">
          {modalAction === 'isolate' 
            ? 'This action triggers immediate network and policy isolation, preventing the agent from performing any outbound operations or accessing protected resources.' 
            : 'This action restores normal operational clearance and removes network confinement locks from the agent runtime.'}
        </p>
      </Modal>
    </div>
  );
};

export default AgentDetails;
