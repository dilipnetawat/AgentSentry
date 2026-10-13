import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Terminal,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Sliders,
  Database,
  FileCheck,
  Cpu,
  Lock,
  CheckCircle2
} from 'lucide-react';


interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How does AgentSentry analyze messages without an external AI API?',
    answer: 'AgentSentry features an air-gapped Local Security Engine running deterministic heuristic rules, Unicode NFKC normalization, zero-width stripping, and pattern matching across 7 attack categories. It executes locally in sub-10ms with zero network transmission.'
  },
  {
    question: 'How are risk scores calculated?',
    answer: 'Risk scores range from 0 (clean/benign) to 100 (critical exploit). Findings within the same threat category are de-duplicated by taking the highest rule score, while independent categories trigger a calibrated synergy weighting (+15 per distinct vector), capped at 100.'
  },
  {
    question: 'How does AgentSentry prevent false positives on educational questions?',
    answer: 'Our rule registry incorporates negative context suppression filters. Benign research inquiries like "What is prompt injection?" or "Our security team is studying system prompts" are explicitly exempted from triggering directive override rules.'
  },
  {
    question: 'What are HoneyTokens and how do they function?',
    answer: 'HoneyTokens are unique, realistic decoy credentials (such as database tokens or fake API keys) embedded into the agent context. If an attacker tricks the model into leaking its instructions, our egress tripwires intercept the token and isolate the agent.'
  },
  {
    question: 'What are the limitations of heuristic detection?',
    answer: 'Deterministic heuristic rules reliably catch known attack signatures, delimiter injections, and structural evasion. However, they do not guarantee 100% protection against novel zero-day adversarial jailbreaks. Layered defense-in-depth with output tripwires is strongly recommended.'
  }
];

const HowItWorks: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'simple' | 'technical'>('simple');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="dashboard-container max-w-7xl mx-auto space-y-6">

        {/* =====================================================================
            1. PAGE HEADER (Panel 3 Match)
            ===================================================================== */}
        <div className="dashboard-card border border-border bg-surface p-6 rounded-lg flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 mb-1">
              <HelpCircle size={13} />
              <span>DEFENSE ARCHITECTURE</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary m-0">How It Works</h1>
            <p className="text-xs text-text-muted mt-1 m-0">
              Understand how AgentSentry works and how it helps keep your AI agents safe.
            </p>
          </div>

          {/* Simple View / Technical View Toggle */}
          <div className="flex items-center p-1 rounded-md bg-surface-elevated border border-border">
            <button
              type="button"
              onClick={() => setViewMode('simple')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer border-none ${
                viewMode === 'simple'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Simple View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('technical')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer border-none ${
                viewMode === 'technical'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Technical View
            </button>
          </div>
        </div>

        {/* =====================================================================
            2. SIMPLE VIEW (Panel 3 Specification)
            ===================================================================== */}
        {viewMode === 'simple' && (
          <div className="space-y-6">
            
            {/* 4 Numbered Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Step 1 */}
              <div 
                className="p-5 rounded-lg flex flex-col justify-between"
                style={{ background: '#082448', border: '1px solid #174A7D' }}
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1677FF]/20 border border-[#1677FF] text-[#22C8F5] font-bold font-mono text-sm flex items-center justify-center mb-3">
                    1
                  </div>
                  <strong className="text-sm text-[#F3F8FF] block mb-1">Paste a message</strong>
                  <p className="text-xs text-[#A9C4E5] leading-relaxed">
                    Add the text you want checked into the prompt editor or load a verified adversarial example.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#174A7D]/40 flex items-center gap-1.5 text-[11px] font-mono text-[#22C8F5]">
                  <Terminal size={12} />
                  <span>Input Boundary Check</span>
                </div>
              </div>

              {/* Step 2 */}
              <div 
                className="p-5 rounded-lg flex flex-col justify-between"
                style={{ background: '#082448', border: '1px solid #174A7D' }}
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1677FF]/20 border border-[#1677FF] text-[#22C8F5] font-bold font-mono text-sm flex items-center justify-center mb-3">
                    2
                  </div>
                  <strong className="text-sm text-[#F3F8FF] block mb-1">Check for risks</strong>
                  <p className="text-xs text-[#A9C4E5] leading-relaxed">
                    The local security engine checks known patterns, unicode evasion, honeytokens, and relevant signals.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#174A7D]/40 flex items-center gap-1.5 text-[11px] font-mono text-[#22C8F5]">
                  <Cpu size={12} />
                  <span>Sub-10ms Air-Gapped Engine</span>
                </div>
              </div>

              {/* Step 3 */}
              <div 
                className="p-5 rounded-lg flex flex-col justify-between"
                style={{ background: '#082448', border: '1px solid #174A7D' }}
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1677FF]/20 border border-[#1677FF] text-[#22C8F5] font-bold font-mono text-sm flex items-center justify-center mb-3">
                    3
                  </div>
                  <strong className="text-sm text-[#F3F8FF] block mb-1">Get your results</strong>
                  <p className="text-xs text-[#A9C4E5] leading-relaxed">
                    Review the risk level, status, evidence, triggered rule IDs, and recommended next hardening steps.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#174A7D]/40 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                  <CheckCircle2 size={12} />
                  <span>Transparent Scorecard</span>
                </div>
              </div>

              {/* Step 4 */}
              <div 
                className="p-5 rounded-lg flex flex-col justify-between"
                style={{ background: '#082448', border: '1px solid #174A7D' }}
              >
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1677FF]/20 border border-[#1677FF] text-[#22C8F5] font-bold font-mono text-sm flex items-center justify-center mb-3">
                    4
                  </div>
                  <strong className="text-sm text-[#F3F8FF] block mb-1">Take action</strong>
                  <p className="text-xs text-[#A9C4E5] leading-relaxed">
                    Review findings and apply appropriate security controls: block payloads, isolate agents, or authorize exceptions.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#174A7D]/40 flex items-center gap-1.5 text-[11px] font-mono text-[#22C8F5]">
                  <Sliders size={12} />
                  <span>Enforcement & Audit</span>
                </div>
              </div>

            </div>

            {/* Real-Life Analogy Card */}
            <div 
              className="p-6 rounded-lg flex items-start gap-4"
              style={{ background: '#061B35', border: '1px solid #174A7D' }}
            >
              <div className="w-10 h-10 rounded-lg bg-[#1677FF]/15 border border-[#1677FF] flex items-center justify-center text-[#22C8F5] shrink-0 mt-0.5">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-1">
                <strong className="text-sm text-[#F3F8FF] block">
                  Real-Life Security Analogy: The Secure Building Checkpoint
                </strong>
                <p className="text-xs text-[#A9C4E5] leading-relaxed m-0">
                  Think of AgentSentry like a high-security checkpoint at a protected government facility. When visitors arrive (user messages), they cannot walk directly into sensitive offices (the AI model). First, security officers inspect credentials, screen baggage for contraband (prompt injection detection), verify secret badges (HoneyToken canaries), and ensure visitors cannot access restricted servers (tool boundaries). Clean visitors proceed normally; suspicious intruders are stopped at the perimeter before any damage can occur.
                </p>
              </div>
            </div>

            {/* Expandable FAQ Section */}
            <div 
              className="p-6 rounded-lg space-y-3"
              style={{ background: '#082448', border: '1px solid #174A7D' }}
            >
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-[#F3F8FF] flex items-center gap-2">
                  <HelpCircle size={15} className="text-[#22C8F5]" />
                  <span>Frequently Asked Questions</span>
                </h3>
                <p className="text-xs text-[#A9C4E5] mt-0.5">
                  Common questions regarding local analysis, risk scoring, and detection mechanics
                </p>
              </div>

              <div className="divide-y divide-[#174A7D]/50">
                {faqs.map((faq, index) => {
                  const isOpen = expandedFaq === index;
                  return (
                    <div key={index} className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between text-left gap-4 bg-transparent border-none p-0 cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-[#F3F8FF] hover:text-[#22C8F5] transition-colors">
                          {faq.question}
                        </span>
                        {isOpen ? <ChevronUp size={15} className="text-[#22C8F5] shrink-0" /> : <ChevronDown size={15} className="text-[#A9C4E5] shrink-0" />}
                      </button>
                      {isOpen && (
                        <p className="text-xs text-[#A9C4E5] mt-2 leading-relaxed pl-2 border-l-2 border-[#1677FF]">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* =====================================================================
            3. TECHNICAL VIEW (Panel 3 Specification)
            ===================================================================== */}
        {viewMode === 'technical' && (
          <div className="space-y-6">
            
            {/* 6-Stage Pipeline Overview Diagram */}
            <div 
              className="p-6 rounded-lg"
              style={{ background: '#082448', border: '1px solid #174A7D' }}
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#F3F8FF] flex items-center gap-2">
                  <Layers size={16} className="text-[#22C8F5]" />
                  <span>6-Stage Local Security Pipeline</span>
                </h3>
                <p className="text-xs text-[#A9C4E5] mt-0.5">
                  Sub-10ms deterministic lifecycle screening all untrusted agent inputs
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Stage 1 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 1</span>
                    <FileCheck size={14} className="text-[#A9C4E5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Input Validation</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Enforces max length boundaries (50,000 characters) and verifies target agent operational health (rejects isolated agents).
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 2</span>
                    <Sliders size={14} className="text-[#A9C4E5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Normalization</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Executes Unicode NFKC normalization, strips zero-width spaces (\u200b), unquotes URL encodings, and decodes Base64 payloads.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 3</span>
                    <ShieldCheck size={14} className="text-[#22C8F5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Rule-Based Detection</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Evaluates normalized and unleeted text against 7 attack categories with negative inquiry suppression for educational queries.
                  </p>
                </div>

                {/* Stage 4 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 4</span>
                    <Cpu size={14} className="text-[#A9C4E5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Risk Scoring</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Aggregates findings with intra-category de-duplication, multi-category synergy boost (+15 per vector), and strict 0–100 clamping.
                  </p>
                </div>

                {/* Stage 5 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 5</span>
                    <Lock size={14} className="text-[#A9C4E5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Policy Decision</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Applies deterministic policy mapping: LOW (0–29) ALLOW, SUSPICIOUS (30–69) QUARANTINE, and HIGH (70–100) BLOCK.
                  </p>
                </div>

                {/* Stage 6 */}
                <div className="p-4 rounded bg-[#0B2D55] border border-[#174A7D] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#22C8F5]">STAGE 6</span>
                    <Database size={14} className="text-[#A9C4E5]" />
                  </div>
                  <strong className="text-xs text-[#F3F8FF] block">Evidence & Audit</strong>
                  <p className="text-[11px] text-[#A9C4E5] leading-relaxed">
                    Persists immutable SecurityEvent and SOC Alert records in PostgreSQL with forensic indicators and recommended mitigations.
                  </p>
                </div>

              </div>
            </div>

            {/* Call to action */}
            <div 
              className="p-5 rounded-lg flex items-center justify-between flex-wrap gap-4"
              style={{ background: '#061B35', border: '1px solid #174A7D' }}
            >
              <div>
                <strong className="text-xs text-[#F3F8FF] block">Ready to test the pipeline?</strong>
                <span className="text-xs text-[#A9C4E5]">Try custom attacks or safe benchmark scenarios in the Playground.</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/playground')}
                className="btn btn-primary"
                style={{ padding: '7px 16px', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                <span>Launch Playground</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>
        )}

      </div>
  );
};

export default HowItWorks;
