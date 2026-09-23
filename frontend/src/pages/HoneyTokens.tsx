import React, { useEffect, useState } from 'react';
import { fetchHoneyTokens, rotateHoneyToken } from '../services/api';
import type { HoneyToken } from '../services/api';
import { SkeletonTable } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { Badge } from '../components/Badge';
import { PageHeader } from '../components/PageHeader';
import { Database, RefreshCw, Key } from 'lucide-react';
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
        title="HoneyTokens" 
        description="Manage decoy credentials used to detect unauthorized access attempts."
        icon={<Database size={24} />}
      />
      
      {error && <div className="form-error mb-4">{error}</div>}

      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-surface flex-1 overflow-hidden flex flex-col mb-8"
      >
        {loading ? (
          <div className="p-8"><SkeletonTable rows={4} columns={5} /></div>
        ) : tokens.length === 0 ? (
          <div className="empty-state">
            <Key size={48} className="empty-state-icon" />
            <p>No HoneyTokens configured</p>
          </div>
        ) : (
          <div className="table-container border-0 rounded-none flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(token => (
                  <tr key={token.id}>
                    <td>
                      <strong className="font-medium text-primary">{token.scope} / {token.token_type}</strong>
                      <div className="mono text-xs text-tertiary mt-1">{token.id}</div>
                    </td>
                    <td>
                      <span className="mono text-xs bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        ••••••••••••••••
                      </span>
                    </td>
                    <td>
                      <Badge variant={token.status === 'active' ? 'safe' : 'default'}>
                        {token.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-xs text-tertiary">{new Date(token.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      {token.status === 'active' && (
                        <button 
                          className="btn btn-secondary text-xs py-1"
                          onClick={() => handleRotateClick(token.id)}
                        >
                          <RefreshCw size={12} />
                          Rotate
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
        title="Confirm Rotation"
        actions={
          <>
            <button className="btn btn-secondary" onClick={closeRotateModal} disabled={actionLoading}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmRotate} disabled={actionLoading}>
              {actionLoading ? 'Rotating...' : 'Rotate Token'}
            </button>
          </>
        }
      >
        <p className="m-0 text-sm">Are you sure you want to rotate this HoneyToken?</p>
        <p className="mt-2 text-sm text-tertiary m-0">
          The old token will be revoked immediately and a new token will be generated. You must update your environment variables or agent configurations with the new token.
        </p>
      </Modal>
    </div>
  );
};

export default HoneyTokens;
