import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Terminal,
  Activity,
  KeyRound,
  Layers,
  Server,
  Database,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock
} from 'lucide-react';

import { 
  fetchDashboardStats, 
  fetchRecentEvents, 
  fetchHoneyTokens,
  type DashboardStats, 
  type SecurityEvent,
  type HoneyToken
} from '../services/api';
import { DecisionBadge } from '../components/Badge';

const formatTimeAgo = (dateStr: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatEventTitle = (event: SecurityEvent) => {
  if (event.event_type === 'honeytoken_trigger') {
    return 'Canary HoneyToken Exfiltration Attempt';
  }
  if (event.event_type === 'prompt_injection_blocked') {
    return 'Adversarial Prompt Injection Blocked';
  }
  if (event.event_type === 'prompt_quarantined') {
    return 'Suspicious Prompt Quarantined';
  }
  return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [tokens, setTokens] = useState<HoneyToken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [statsData, eventsData, tokensData] = await Promise.all([
        fetchDashboardStats().catch(() => null),
        fetchRecentEvents(5, 0).catch(() => []),
        fetchHoneyTokens().catch(() => [])
      ]);

      setStats(statsData);
      setRecentEvents(eventsData);
      setTokens(tokensData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTokensCount = tokens.filter(t => t.status === 'active').length;
  const avgRiskScore = recentEvents.length > 0
    ? Math.round(recentEvents.reduce((acc, curr) => acc + (curr.risk_score || 0), 0) / recentEvents.length)
    : 0;

  return (
    <div className="dashboard-container max-w-7xl mx-auto space-y-6">
        
        {/* =====================================================================
            1. HERO SECTION (Panel 1 Reference Match)
            ===================================================================== */}
        <section 
          className="p-6 md:p-8 rounded-lg relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #061B35 0%, #082448 60%, #0B2D55 100%)',
            border: '1px solid #174A7D',
            boxShadow: '0 8px 30px rgba(0, 10, 30, 0.45)'
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Headline and Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono font-semibold"
                style={{ background: 'rgba(34, 200, 245, 0.12)', border: '1px solid rgba(34, 200, 245, 0.3)', color: '#22C8F5' }}
              >
                <ShieldCheck size={14} className="text-[#22C8F5]" />
                <span>AI SECURITY & FIREWALL GUARD</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F3F8FF] leading-tight">
                Test your AI's security.
              </h1>

              <p className="text-sm sm:text-base text-[#A9C4E5] max-w-xl leading-relaxed">
                Detect potential risks, find vulnerabilities, and make your AI systems safer with real-time heuristic inspection and canary honeytokens.
              </p>

              <div className="flex items-center gap-4 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate('/playground')}
                  className="btn btn-primary"
                  style={{
                    padding: '9px 20px',
                    fontSize: '0.88rem',
                    borderRadius: '6px',
                    background: '#1677FF',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(22, 119, 255, 0.4)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Terminal size={15} />
                  <span>Check a message</span>
                </button>

                <Link
                  to="/how-it-works"
                  className="text-xs sm:text-sm text-[#22C8F5] hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                >
                  <span>Learn how it works</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Right Column: High-tech Cybersecurity Shield Illustration */}
            <div className="lg:col-span-5 relative flex items-center justify-center min-h-[220px]">
              
              {/* Background ambient glow */}
              <div 
                className="absolute inset-0 m-auto w-48 h-48 rounded-full pointer-events-none opacity-40 blur-2xl"
                style={{ background: 'radial-gradient(circle, #22C8F5 0%, #1677FF 60%, transparent 80%)' }}
              />

              {/* Central Shield Graphic SVG */}
              <div className="relative z-10 w-44 h-44 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer Shield Border */}
                  <path 
                    d="M100 20 L160 50 V110 C160 150 100 180 100 180 C100 180 40 150 40 110 V50 L100 20 Z" 
                    fill="#082448" 
                    stroke="#174A7D" 
                    strokeWidth="3"
                  />
                  {/* Inner Glowing Shield */}
                  <path 
                    d="M100 32 L148 56 V108 C148 140 100 166 100 166 C100 166 52 140 52 108 V56 L100 32 Z" 
                    fill="url(#shieldGrad)" 
                    stroke="#22C8F5" 
                    strokeWidth="2" 
                    strokeDasharray="4 2"
                  />
                  {/* Center Node / Lock Core */}
                  <circle cx="100" cy="100" r="22" fill="#03152D" stroke="#22C8F5" strokeWidth="2.5" />
                  <path 
                    d="M93 100 L98 105 L108 94" 
                    stroke="#22C8F5" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  {/* Subtle Grid Coordinates */}
                  <line x1="100" y1="40" x2="100" y2="78" stroke="#174A7D" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="100" y1="122" x2="100" y2="160" stroke="#174A7D" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="60" y1="100" x2="78" y2="100" stroke="#174A7D" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1="122" y1="100" x2="140" y2="100" stroke="#174A7D" strokeWidth="1" strokeDasharray="2 2" />

                  <defs>
                    <linearGradient id="shieldGrad" x1="100" y1="32" x2="100" y2="166" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0B2D55" stopOpacity="0.9" />
                      <stop offset="1" stopColor="#061B35" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Callout 1: Top-Left "Detect Risks" */}
              <div 
                className="absolute top-2 left-2 sm:left-4 z-20 px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-md"
                style={{ background: '#0B2D55', border: '1px solid #174A7D', color: '#F3F8FF' }}
              >
                <ShieldAlert size={13} className="text-[#22C8F5]" />
                <span>Detect Risks</span>
              </div>

              {/* Callout 2: Top-Right "Analyze Prompts" */}
              <div 
                className="absolute top-4 right-2 sm:right-4 z-20 px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-md"
                style={{ background: '#0B2D55', border: '1px solid #174A7D', color: '#F3F8FF' }}
              >
                <Terminal size={13} className="text-[#1677FF]" />
                <span>Analyze Prompts</span>
              </div>

              {/* Callout 3: Bottom "Get Results" */}
              <div 
                className="absolute bottom-2 z-20 px-3 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-md"
                style={{ background: '#0B2D55', border: '1px solid #174A7D', color: '#F3F8FF' }}
              >
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Get Results</span>
              </div>

            </div>

          </div>
        </section>

        {/* =====================================================================
            2. METRICS ROW (4 Compact Cards per Specification)
            ===================================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Scans */}
          <div 
            className="p-5 rounded-lg border border-[#174A7D] bg-[#082448] relative overflow-hidden flex flex-col justify-between min-h-[128px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#A9C4E5]">Total Scans</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0B2D55] border border-[#174A7D] text-[#22C8F5]">
                <Activity size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold font-mono text-[#F3F8FF] leading-none">
                {loading ? '...' : (stats?.total_security_events ?? 0)}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#174A7D]/40 flex items-center justify-between text-[11px] text-[#A9C4E5]">
              <span>Prompt evaluations</span>
              <span className="text-[#22C8F5] font-mono">Verified</span>
            </div>
          </div>

          {/* Card 2: Active Tokens */}
          <div 
            className="p-5 rounded-lg border border-[#174A7D] bg-[#082448] relative overflow-hidden flex flex-col justify-between min-h-[128px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#A9C4E5]">Active Tokens</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0B2D55] border border-[#174A7D] text-emerald-400">
                <KeyRound size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold font-mono text-emerald-400 leading-none">
                {loading ? '...' : activeTokensCount}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#174A7D]/40 flex items-center justify-between text-[11px] text-[#A9C4E5]">
              <span>Decoy canary traps</span>
              <span className="text-emerald-400 font-mono">Armed</span>
            </div>
          </div>

          {/* Card 3: Blocked Attempts */}
          <div 
            className="p-5 rounded-lg border border-[#174A7D] bg-[#082448] relative overflow-hidden flex flex-col justify-between min-h-[128px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#A9C4E5]">Blocked Attempts</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0B2D55] border border-[#174A7D] text-rose-400">
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold font-mono text-rose-400 leading-none">
                {loading ? '...' : (stats?.blocked_events ?? 0)}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#174A7D]/40 flex items-center justify-between text-[11px] text-[#A9C4E5]">
              <span>Policy gate triggers</span>
              <span className="text-rose-400 font-mono">Intercepted</span>
            </div>
          </div>

          {/* Card 4: Risk Score (Avg) */}
          <div 
            className="p-5 rounded-lg border border-[#174A7D] bg-[#082448] relative overflow-hidden flex flex-col justify-between min-h-[128px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#A9C4E5]">Risk Score (Avg)</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0B2D55] border border-[#174A7D] text-amber-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold font-mono text-[#F3F8FF] leading-none">
                {loading ? '...' : `${avgRiskScore}/100`}
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#174A7D]/40 flex items-center justify-between text-[11px] text-[#A9C4E5]">
              <span>Evaluated threat intensity</span>
              <span className={`font-mono ${avgRiskScore >= 70 ? 'text-rose-400' : avgRiskScore >= 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {avgRiskScore >= 70 ? 'Elevated' : avgRiskScore >= 30 ? 'Moderate' : 'Clean'}
              </span>
            </div>
          </div>

        </section>

        {/* =====================================================================
            3. SYSTEM OVERVIEW ARCHITECTURE DIAGRAM (Horizontal Flow)
            ===================================================================== */}
        <section 
          className="p-5 rounded-lg"
          style={{ background: '#082448', border: '1px solid #174A7D' }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#F3F8FF] flex items-center gap-2">
                <Layers size={16} className="text-[#22C8F5]" />
                <span>System Overview</span>
              </h2>
              <p className="text-xs text-[#A9C4E5] mt-0.5">
                Verified end-to-end processing pipeline defending AI agent operations
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#22C8F5] px-2 py-0.5 rounded bg-[#0B2D55] border border-[#174A7D]">
              Air-Gapped & Deterministic
            </span>
          </div>

          {/* Horizontal Connected Architecture Stages */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
            
            {/* Stage 1 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#174A7D] flex flex-col justify-between relative group hover:border-[#22C8F5] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">01</span>
                <Terminal size={14} className="text-[#A9C4E5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">User Input</strong>
              <span className="text-[11px] text-[#A9C4E5] mt-0.5">Prompt & Tool Call</span>
            </div>

            {/* Stage 2 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#174A7D] flex flex-col justify-between relative group hover:border-[#22C8F5] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">02</span>
                <Layers size={14} className="text-[#A9C4E5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">Frontend</strong>
              <span className="text-[11px] text-[#A9C4E5] mt-0.5">React 18 + Vite UI</span>
            </div>

            {/* Stage 3 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#174A7D] flex flex-col justify-between relative group hover:border-[#22C8F5] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">03</span>
                <Server size={14} className="text-[#A9C4E5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">Backend</strong>
              <span className="text-[11px] text-[#A9C4E5] mt-0.5">FastAPI Gateway</span>
            </div>

            {/* Stage 4 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#22C8F5]/60 flex flex-col justify-between relative group shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">04</span>
                <ShieldCheck size={14} className="text-[#22C8F5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">Detection Engine</strong>
              <span className="text-[11px] text-[#22C8F5] mt-0.5 font-medium">Rules & Canaries</span>
            </div>

            {/* Stage 5 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#174A7D] flex flex-col justify-between relative group hover:border-[#22C8F5] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">05</span>
                <Sliders size={14} className="text-[#A9C4E5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">Response/Actions</strong>
              <span className="text-[11px] text-[#A9C4E5] mt-0.5">ALLOW / BLOCK Gate</span>
            </div>

            {/* Stage 6 */}
            <div className="p-3 rounded bg-[#0B2D55] border border-[#174A7D] flex flex-col justify-between relative group hover:border-[#22C8F5] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-[#22C8F5]">06</span>
                <Database size={14} className="text-[#A9C4E5]" />
              </div>
              <strong className="text-xs text-[#F3F8FF] block">Security Audit</strong>
              <span className="text-[11px] text-[#A9C4E5] mt-0.5">PostgreSQL Event Log</span>
            </div>

          </div>
        </section>

        {/* =====================================================================
            4. RECENT ACTIVITY PANEL (Real Events from API)
            ===================================================================== */}
        <section 
          className="p-5 rounded-lg"
          style={{ background: '#082448', border: '1px solid #174A7D' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#F3F8FF] flex items-center gap-2">
                <Activity size={16} className="text-[#22C8F5]" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-xs text-[#A9C4E5] mt-0.5">Live security events and policy enforcement decisions</p>
            </div>
            <Link 
              to="/security-activity" 
              className="text-xs text-[#22C8F5] hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              <span>View full activity</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-[#A9C4E5] flex items-center justify-center gap-2">
              <RotateCw size={15} className="animate-spin text-[#22C8F5]" />
              <span>Loading recent security records...</span>
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#A9C4E5] bg-[#03152D] rounded border border-[#174A7D]/40">
              No recent security activity logged yet. Test a prompt in the Playground to record your first audit event.
            </div>
          ) : (
            <div className="divide-y divide-[#174A7D]/40">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {(() => {
                      const act = (evt.action || '').toUpperCase();
                      const isBlock = act.includes('BLOCK') || act.includes('DENY');
                      const isWarn = act.includes('QUARANTINE') || act.includes('WARN');
                      const iconBg = isBlock ? 'var(--color-critical-bg)' : isWarn ? 'var(--color-warning-bg)' : 'var(--color-safe-bg)';
                      const iconBorder = isBlock ? 'var(--color-critical-border)' : isWarn ? 'var(--color-warning-border)' : 'var(--color-safe-border)';
                      const iconColor = isBlock ? 'var(--color-critical)' : isWarn ? 'var(--color-warning)' : 'var(--color-safe)';

                      return (
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: iconBg,
                            border: `1px solid ${iconBorder}`,
                            color: iconColor
                          }}
                        >
                          {isBlock ? <ShieldAlert size={15} /> : isWarn ? <AlertTriangle size={15} /> : <ShieldCheck size={15} />}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <strong className="text-xs text-[#F3F8FF] block truncate">
                        {formatEventTitle(evt)}
                      </strong>
                      <span className="text-[11px] text-[#A9C4E5] truncate block">
                        {evt.evidence?.reason || `Risk Score: ${evt.risk_score}/100`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#A9C4E5] flex items-center gap-1">
                      <Clock size={11} />
                      <span>{formatTimeAgo(evt.created_at)}</span>
                    </span>
                    <DecisionBadge decision={evt.action} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
  );
};

export default Home;
