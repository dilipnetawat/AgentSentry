import React, { useEffect, useState } from 'react';
import { fetchHoneyTokens, rotateHoneyToken } from '../services/api';
import type { HoneyToken } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { Database, RefreshCw, Lock, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

const HoneyTokens: React.FC = () => {
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await fetchHoneyTokens();
      setTokens(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load HoneyTokens');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateClick = (id: string) => {
    setRotatingTokenId(id);
    setModalOpen(true);
  };

  const confirmRotate = async () => {
    if (!rotatingTokenId) return;
    setActionLoading(true);
    try {
      const token = tokens.find((item) => item.id === rotatingTokenId);
      if (!token) throw new Error('HoneyToken not found');
      const result = await rotateHoneyToken(token);
      showToast(result.message || 'Token rotated successfully', 'success');
      await loadTokens();
    } catch (err: any) {
      showToast(err.message || 'Failed to rotate HoneyToken', 'error');
    } finally {
      setActionLoading(false);
      setModalOpen(false);
      setRotatingTokenId(null);
    }
  };

  const closeRotateModal = () => {
    if (!actionLoading) {
      setModalOpen(false);
      setRotatingTokenId(null);
    }
  };

  return (
    <div className="dashboard-container flex flex-col h-full">
      <PageHeader 
        title="HoneyToken Decoy Credential Vault" 
        description="Active decoy traps deployed across agent execution environments to detect unauthorized exfiltration."
        icon={<Database size={20} />}
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
            <span>Create a canary token via API or execute the HoneyToken Guided Security Demo scenario.</span>
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

      <Modal 
        isOpen={modalOpen} 
        onClose={closeRotateModal} 
        title="Confirm HoneyToken Rotation"
        actions={
          <>
            <button className="btn btn-secondary" onClick={closeRotateModal} disabled={actionLoading}>
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
