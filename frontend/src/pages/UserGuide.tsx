import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import {
  BookOpen,
  Terminal,
  KeyRound,
  Activity,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Play,
  Layers,
  Wrench
} from 'lucide-react';

interface GuideSection {
  id: string;
  name: string;
  icon: React.ReactNode;
  summary: string;
}

const guideSections: GuideSection[] = [
  { id: 'overview', name: '1. What AgentSentry Does', icon: <ShieldCheck size={15} />, summary: 'Core mission, architecture & protection boundary' },
  { id: 'run-scans', name: '2. Running Security Tests', icon: <Terminal size={15} />, summary: 'How to test prompts in Playground' },
  { id: 'decisions', name: '3. Understanding Decisions', icon: <Layers size={15} />, summary: 'ALLOW, QUARANTINE & BLOCK thresholds' },
  { id: 'events', name: '4. Security Events & Audit', icon: <Activity size={15} />, summary: 'Interpreting telemetry and evidence logs' },
  { id: 'honeytokens', name: '5. Canary Honeytokens', icon: <KeyRound size={15} />, summary: 'Decoy traps & egress exfiltration tracking' },
  { id: 'policies', name: '6. Inspecting Policies', icon: <Wrench size={15} />, summary: 'Heuristic rules & tool boundaries' },
  { id: 'threats', name: '7. Responding to Threats', icon: <ShieldAlert size={15} />, summary: 'SOC incident triage and agent kill-switches' },
  { id: 'technical', name: '8. Technical Details & Forensics', icon: <Cpu size={15} />, summary: 'Embeddings, ONNX & AI explainability' },
];

export const UserGuide: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="User &amp; Operations Guide" 
        description="Practical instructions, runbooks, and architectural explanations for security engineers and operators."
        icon={<BookOpen size={20} />}
        actions={
          <button
            type="button"
            onClick={() => navigate('/playground')}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Play size={13} fill="currentColor" />
            <span>Launch Playground</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 dashboard-card border border-border bg-surface p-3 rounded-lg space-y-1">
          <div className="px-3 py-2 text-[11px] font-mono font-semibold uppercase text-text-muted tracking-wider border-b border-border mb-2">
            Operations Index
          </div>

          {guideSections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full text-left p-2.5 rounded transition-colors flex items-center justify-between cursor-pointer border ${
                  isActive 
                    ? 'bg-primary text-white font-semibold border-primary' 
                    : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-white' : 'text-primary'}>
                    {sec.icon}
                  </span>
                  <div className="truncate">
                    <div className="text-xs truncate">{sec.name}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-text-muted'}`}>
                      {sec.summary}
                    </div>
                  </div>
                </div>
                <ArrowRight size={12} className={isActive ? 'text-white' : 'opacity-0'} />
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-8 dashboard-card border border-border bg-surface p-6 rounded-lg text-xs space-y-4">
          {activeSection === 'overview' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">1. What AgentSentry Does</h3>
              <p className="text-text-secondary leading-relaxed">
                AgentSentry is an enterprise security runtime positioned between external untrusted inputs and autonomous AI agents. As agents receive autonomous tools (shell, database queries, API dispatch), they become vulnerable to indirect prompt injection and data theft.
              </p>
              <div className="p-3 rounded bg-surface-elevated border border-border space-y-2">
                <span className="font-semibold text-text-primary block">Core Capabilities:</span>
                <ul className="list-disc list-inside space-y-1 text-text-secondary">
                  <li><strong>Semantic Firewall:</strong> Inspects inbound text via deterministic heuristics and ONNX vector embeddings before content reaches the agent.</li>
                  <li><strong>Canary HoneyToken Mesh:</strong> Plants decoy secrets in agent prompts to create tripwires for exfiltration attempts.</li>
                  <li><strong>Egress Gateway &amp; Kill-Switch:</strong> Intercepts outbound traffic and severs compromised agent connections instantly.</li>
                </ul>
              </div>
            </div>
          )}

          {activeSection === 'run-scans' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">2. How to Run a Scan in Playground</h3>
              <p className="text-text-secondary leading-relaxed">
                The Playground allows you to submit custom prompts or load pre-configured judge attack scenarios to evaluate pipeline defenses in real time.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-text-secondary p-3 rounded bg-surface-elevated border border-border">
                <li><strong>Enter Input:</strong> Type or paste your prompt into the input area. Optionally configure an agent system prompt.</li>
                <li><strong>Select Provider &amp; Tool:</strong> Choose your AI model (Local Heuristic, Grok, or Gemini) and specify tool boundary preferences.</li>
                <li><strong>Execute:</strong> Click <em>Run Security Test</em> (or press Ctrl + Enter). The backend analyzes the payload through both heuristic and semantic stages.</li>
                <li><strong>Review Results:</strong> Examine the decision badge, aggregated risk score, pipeline execution trace, and tool authorization status.</li>
              </ol>
            </div>
          )}

          {activeSection === 'decisions' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">3. Understanding Security Decisions</h3>
              <p className="text-text-secondary leading-relaxed">
                AgentSentry uses deterministic risk scoring (0–100) mapped to three strict decision gates:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded bg-surface-elevated border border-border flex items-start gap-2.5">
                  <Badge variant="safe">ALLOW</Badge>
                  <div>
                    <strong className="text-text-primary block">Score &lt; 30: Pass &amp; Execute</strong>
                    <span className="text-text-secondary text-[11px]">The request is safe and complies with all policies. Execution proceeds to the downstream AI model and authorized tools.</span>
                  </div>
                </div>
                <div className="p-3 rounded bg-surface-elevated border border-border flex items-start gap-2.5">
                  <Badge variant="medium">QUARANTINE</Badge>
                  <div>
                    <strong className="text-text-primary block">Score 30–69: Held for Operator Review</strong>
                    <span className="text-text-secondary text-[11px]">The request exhibits suspicious traits (e.g., unusual formatting, borderline keywords). Execution is halted until a SOC analyst reviews and approves it.</span>
                  </div>
                </div>
                <div className="p-3 rounded bg-surface-elevated border border-border flex items-start gap-2.5">
                  <Badge variant="critical">BLOCK</Badge>
                  <div>
                    <strong className="text-text-primary block">Score &ge; 70: Immediate Block</strong>
                    <span className="text-text-secondary text-[11px]">Direct instruction hijack, system prompt extraction, or canary token theft detected. Execution is severed immediately and a SecurityEvent is logged.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'events' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">4. Security Events &amp; Audit Logs</h3>
              <p className="text-text-secondary leading-relaxed">
                Every prompt evaluated by AgentSentry produces an immutable audit record in the database.
              </p>
              <div className="p-3 rounded bg-surface-elevated border border-border space-y-1.5 text-text-secondary">
                <p><strong>Event ID:</strong> Unique cryptographic UUID for tracking and compliance auditing.</p>
                <p><strong>Severity:</strong> Calculated from rule base scores and vector distance (CRITICAL, HIGH, MEDIUM, LOW).</p>
                <p><strong>Evidence:</strong> Contains matched keyword patterns, decoded obfuscation layers, and sanitized excerpts.</p>
                <p><strong>Source Provenance:</strong> Tracks whether input originated from a user session, third-party webhook, or document ingestion.</p>
              </div>
            </div>
          )}

          {activeSection === 'honeytokens' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">5. What Canary Honeytokens Are</h3>
              <p className="text-text-secondary leading-relaxed">
                Honeytokens are synthetic decoy secrets (such as fake API keys or database URLs) planted inside an autonomous agent's workspace.
              </p>
              <div className="p-3 rounded bg-surface-elevated border border-border space-y-2 text-text-secondary">
                <p>
                  <strong>Why they work:</strong> Legitimate users and benign tasks never need to access or export internal canary credentials. If a canary token appears in outbound network traffic, it is conclusive evidence of prompt extraction or compromised agent instructions.
                </p>
                <p>
                  <strong>Zero Token Leakage:</strong> Actual secret strings are redacted from the console and API responses to avoid exposing synthetic credentials.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'policies' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">6. Inspecting Policies &amp; Tool Boundaries</h3>
              <p className="text-text-secondary leading-relaxed">
                Navigate to the <strong>Policies</strong> page to inspect real rules compiled into the active firewall.
              </p>
              <div className="p-3 rounded bg-surface-elevated border border-border space-y-2 text-text-secondary">
                <p><strong>Deterministic Rules:</strong> 7 categories including Instruction Override, Role Manipulation, and Destructive Actions.</p>
                <p><strong>Default-Deny Tool Gateway:</strong> Unregistered MCP tools (e.g., shell subcommands, arbitrary script execution) are automatically blocked before the agent can invoke them.</p>
              </div>
            </div>
          )}

          {activeSection === 'threats' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">7. Responding to Threats &amp; Kill-Switch</h3>
              <p className="text-text-secondary leading-relaxed">
                When a security threat is flagged, take the following steps in the <strong>Threats</strong> queue:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-text-secondary p-3 rounded bg-surface-elevated border border-border">
                <li><strong>Review Incident:</strong> Click <em>Review</em> to view plain-language explanations and technical details.</li>
                <li><strong>Run AI Incident Triage:</strong> Click <em>Run AI Triage</em> to generate risk assessments and containment recommendations.</li>
                <li><strong>Update Status:</strong> Mark the alert as Acknowledged, Resolved, or Ignored (False Positive).</li>
                <li><strong>Engage Kill-Switch:</strong> If the agent is compromised, isolate it from the Agents fleet page to sever all external egress.</li>
              </ol>
            </div>
          )}

          {activeSection === 'technical' && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-text-primary">8. Technical Details &amp; Forensics</h3>
              <p className="text-text-secondary leading-relaxed">
                AgentSentry combines fast deterministic preprocessing with local machine learning models:
              </p>
              <div className="p-3 rounded bg-surface-elevated border border-border space-y-2 text-text-secondary font-mono text-[11px]">
                <div>&bull; FastEmbed: BAAI/bge-small-en-v1.5 running on ONNX Runtime CPU inference</div>
                <div>&bull; Heuristic Rules: Pre-compiled regex patterns with un-leeting and unicode de-obfuscation</div>
                <div>&bull; Multi-Provider AI: Integrations for xAI Grok, Google Gemini, and 100% offline local engine</div>
                <div>&bull; Protocol: Model Context Protocol (MCP) JSON-RPC 2.0 over stdio transport</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default UserGuide;
