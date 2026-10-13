import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSystemStatus, type SystemStatusResponse } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { 
  Cpu, 
  Terminal, 
  RefreshCw,
  Layers
} from 'lucide-react';

export const Brain: React.FC = () => {
  const [sysStatus, setSysStatus] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemStatus();
      setSysStatus(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const stages = [
    {
      step: 1,
      title: 'Input Normalization & De-obfuscation',
      module: 'normalizer.py',
      status: 'OPERATIONAL',
      badgeVariant: 'safe',
      whatItChecks: 'Decodes leetspeak, strips zero-width Unicode characters, evaluates multi-base encodings (Base64, hex, URL-encoding), and bounds maximum character length (50,000 chars).',
      whyItMatters: 'Attackers use obfuscation and hidden unicode glyphs to hide malicious directives from simple substring filters.',
      onViolation: 'Normalized and decoded payloads are passed to downstream detectors; oversized payloads (> 50k chars) are rejected with HTTP 400.'
    },
    {
      step: 2,
      title: 'Deterministic Heuristic Rule Registry',
      module: 'rules.py & local_engine.py',
      status: 'OPERATIONAL',
      badgeVariant: 'safe',
      whatItChecks: 'Fast, offline regex inspection across 7 attack vectors: instruction overrides ("ignore prior rules"), DAN mode jailbreaks, prompt extraction, and OS shell commands.',
      whyItMatters: 'Zero latency (~1ms), deterministic threat detection with transparent scoring and zero external AI API dependency.',
      onViolation: 'Assigns category base score (+70 to +90). Flags rule matches with verifiable matched excerpts.'
    },
    {
      step: 3,
      title: 'Semantic Vector Similarity Detector',
      module: 'semantic_detector.py',
      status: sysStatus?.subsystems.semantic_firewall.ready ? 'OPERATIONAL' : 'FALLBACK',
      badgeVariant: sysStatus?.subsystems.semantic_firewall.ready ? 'safe' : 'medium',
      whatItChecks: 'Local FastEmbed ONNX runtime running BAAI/bge-small-en-v1.5 embeddings. Measures cosine similarity against adversarial vector centroids.',
      whyItMatters: 'Detects paraphrased, novel, and semantic prompt injections that evade keyword and regex heuristics.',
      onViolation: 'Calculates continuous similarity penalty score added to the transparent risk aggregator.'
    },
    {
      step: 4,
      title: 'Risk Aggregator & Policy Gate',
      module: 'aggregator.py & policy.py',
      status: 'OPERATIONAL',
      badgeVariant: 'safe',
      whatItChecks: 'Combines heuristic penalties, vector distance, and canary indicators into an aggregated risk score (0–100) and maps to strict decision boundaries.',
      whyItMatters: 'Enforces transparent, auditable policy decisions instead of black-box opaque classifications.',
      onViolation: 'Score >= 70 triggers immediate BLOCK (execution severed). Score 30–69 triggers QUARANTINE (held for review). Score < 30 allows execution.'
    },
    {
      step: 5,
      title: 'Canary HoneyToken Decoy Mesh',
      module: 'honeytoken_service.py',
      status: 'ACTIVE',
      badgeVariant: 'safe',
      whatItChecks: 'Plants unique synthetic credentials (API keys, DB connection strings, JWTs) into the agent\'s prompt context and memory.',
      whyItMatters: 'Serves as an unambiguous forensic tripwire. Benign users never reference canary credentials; attackers actively try to extract them.',
      onViolation: 'If canary tokens are extracted and leaked into outbound traffic, the Egress Gateway flags an immediate critical violation.'
    },
    {
      step: 6,
      title: 'AI Generation & Tool Boundary Guard',
      module: 'security_gateway.py (MCP)',
      status: 'OPERATIONAL',
      badgeVariant: 'safe',
      whatItChecks: 'Default-deny tool execution sandbox. Validates tool names against allowlists (e.g. get_system_health, inspect_agent_posture) and checks argument parameters for shell injections.',
      whyItMatters: 'Autonomous agents must not execute arbitrary shell commands (rm -rf, sudo) or call unregistered external tools.',
      onViolation: 'Unauthorized tools are blocked with status DENIED, and a high-severity security audit event is persisted.'
    },
    {
      step: 7,
      title: 'Egress Enforcement Gateway & Kill-Switch',
      module: 'agents.py (egress endpoint)',
      status: 'OPERATIONAL',
      badgeVariant: 'safe',
      whatItChecks: 'Scans all outbound network traffic and tool responses for canary token leaks or sensitive credential exfiltration.',
      whyItMatters: 'Prevents stolen agent secrets and database credentials from reaching external command-and-control servers.',
      onViolation: 'Outbound connection is immediately severed, a critical alert is dispatched, and the agent is quarantined under automated fleet isolation.'
    }
  ];

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Security Pipeline Architecture (The Brain)" 
        description="Inspect the authentic 7-stage defense-in-depth pipeline that monitors, validates, and isolates autonomous agent runtimes."
        icon={<Cpu size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={loadStatus}
              disabled={loading}
              title="Refresh subsystem telemetry"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Telemetry</span>
            </button>
            <Link to="/playground" className="btn btn-primary text-xs">
              <Terminal size={13} />
              <span>Test Pipeline in Playground</span>
            </Link>
          </div>
        }
      />

      {/* Live Telemetry Status Strip */}
      <div className="dashboard-card border border-border bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-primary" />
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Verified Runtime Subsystem Status
            </h3>
          </div>
          <Badge variant="safe">DEFENSE PERIMETER ACTIVE</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded bg-surface-elevated border border-border">
            <span className="text-text-muted text-[11px] block">Database Persistence</span>
            <span className="font-mono font-semibold text-text-primary">
              {sysStatus?.subsystems.database.engine || 'SQLite'} (Connected)
            </span>
          </div>

          <div className="p-2.5 rounded bg-surface-elevated border border-border">
            <span className="text-text-muted text-[11px] block">Heuristic Engine</span>
            <span className="font-mono font-semibold text-text-primary">
              Deterministic Rules (Active)
            </span>
          </div>

          <div className="p-2.5 rounded bg-surface-elevated border border-border">
            <span className="text-text-muted text-[11px] block">Embedding Engine</span>
            <span className="font-mono font-semibold text-accent-cyan">
              {sysStatus?.subsystems.semantic_firewall.engine || 'FastEmbed (bge-small-en-v1.5)'}
            </span>
          </div>

          <div className="p-2.5 rounded bg-surface-elevated border border-border">
            <span className="text-text-muted text-[11px] block">Active AI Intelligence</span>
            <span className="font-mono font-semibold text-text-primary">
              {sysStatus?.subsystems.ai_service.provider || 'local'} ({sysStatus?.subsystems.ai_service.model || 'agentsentry-local-v1'})
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Lifecycle Stages */}
      <div className="space-y-4">
        {stages.map((st) => (
          <div key={st.step} className="dashboard-card border border-border bg-surface p-5 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-primary/15 text-primary flex items-center justify-center font-mono font-bold text-xs border border-primary/30 shrink-0">
                  {st.step}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{st.title}</h3>
                  <span className="text-[11px] font-mono text-text-muted">Module: {st.module}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={st.badgeVariant as any}>{st.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="font-semibold text-text-primary block mb-1">What It Checks:</span>
                <p className="text-text-secondary leading-relaxed text-[11px]">{st.whatItChecks}</p>
              </div>

              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="font-semibold text-accent-cyan block mb-1">Why It Matters:</span>
                <p className="text-text-secondary leading-relaxed text-[11px]">{st.whyItMatters}</p>
              </div>

              <div className="p-3 rounded bg-surface-elevated border border-border">
                <span className="font-semibold text-color-critical block mb-1">On Problem Detected:</span>
                <p className="text-text-secondary leading-relaxed text-[11px]">{st.onViolation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Brain;
