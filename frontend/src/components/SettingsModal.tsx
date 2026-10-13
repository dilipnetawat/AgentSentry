import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { fetchSystemStatus, type SystemStatusResponse } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from './Badge';
import { Server, Shield, Cpu, Key, Database, RefreshCw, UserCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve telemetry status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AgentSentry System Settings & Telemetry" size="lg">
      <div className="space-y-4 text-sm">
        {/* Operator Profile Section */}
        <div className="p-3 rounded border border-border bg-surface-elevated">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <UserCheck size={15} className="text-primary" />
              <span>Operator Session</span>
            </span>
            <Badge variant="safe">AUTHENTICATED</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Account: </span>
              <span className="font-mono text-text-primary">{user?.email || 'security@agentsentry.corp'}</span>
            </div>
            <div>
              <span className="text-text-muted">Role: </span>
              <span className="font-mono text-text-primary uppercase">{user?.role || 'operator'}</span>
            </div>
            <div>
              <span className="text-text-muted">Session Cookie: </span>
              <span className="font-mono text-text-secondary">HttpOnly (SameSite=Lax)</span>
            </div>
            <div>
              <span className="text-text-muted">CSRF Protection: </span>
              <span className="font-mono text-text-secondary">Double-Submit Cookie Active</span>
            </div>
          </div>
        </div>

        {/* Subsystems Health */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Server size={15} className="text-accent-cyan" />
              <span>Subsystem Status & Architecture</span>
            </span>
            <button
              type="button"
              className="btn btn-secondary text-xs p-1"
              onClick={loadStatus}
              disabled={loading}
              title="Refresh telemetry"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {error ? (
            <div className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
              {error}
            </div>
          ) : !status ? (
            <div className="p-4 text-center text-text-muted text-xs">
              Loading runtime telemetry...
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {/* Database */}
              <div className="flex items-center justify-between p-2 rounded border border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-text-secondary" />
                  <div>
                    <div className="font-semibold text-text-primary">Database Persistence</div>
                    <div className="text-text-muted">{status.subsystems.database.engine} Engine</div>
                  </div>
                </div>
                <Badge variant={status.subsystems.database.status === 'connected' ? 'safe' : 'critical'}>
                  {status.subsystems.database.status.toUpperCase()}
                </Badge>
              </div>

              {/* Semantic Firewall */}
              <div className="flex items-center justify-between p-2 rounded border border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-text-secondary" />
                  <div>
                    <div className="font-semibold text-text-primary">Semantic Firewall & Vectors</div>
                    <div className="text-text-muted">{status.subsystems.semantic_firewall.engine}</div>
                  </div>
                </div>
                <Badge variant={status.subsystems.semantic_firewall.ready ? 'safe' : 'medium'}>
                  {status.subsystems.semantic_firewall.ready ? 'OPERATIONAL' : 'DEGRADED'}
                </Badge>
              </div>

              {/* AI Intelligence Provider */}
              <div className="flex items-center justify-between p-2 rounded border border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-text-secondary" />
                  <div>
                    <div className="font-semibold text-text-primary">AI Intelligence Engine</div>
                    <div className="text-text-muted">
                      Provider: <span className="font-mono text-text-primary">{status.subsystems.ai_service.provider}</span> ({status.subsystems.ai_service.model})
                    </div>
                  </div>
                </div>
                <Badge variant={status.subsystems.ai_service.healthy ? 'safe' : 'medium'}>
                  {status.subsystems.ai_service.healthy ? 'HEALTHY' : 'FALLBACK READY'}
                </Badge>
              </div>

              {/* Egress Canary Gateway */}
              <div className="flex items-center justify-between p-2 rounded border border-border bg-surface">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-text-secondary" />
                  <div>
                    <div className="font-semibold text-text-primary">Egress Gateway & Canary Mesh</div>
                    <div className="text-text-muted">
                      Active HoneyTokens: <span className="font-mono text-text-primary">{status.subsystems.egress_gateway.active_honeytokens}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="safe">
                  ACTIVE
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Runtime Metadata */}
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>AgentSentry Runtime v0.1.0</span>
          <span>Verified Local Security Layer</span>
        </div>
      </div>
    </Modal>
  );
};
export default SettingsModal;
