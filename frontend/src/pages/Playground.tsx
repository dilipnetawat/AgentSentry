import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Cpu,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Play,
  Wrench,
  Sparkles,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Activity,
  AlertOctagon,
  CheckCheck
} from 'lucide-react';

import AppShell from '../components/AppShell';
import { PageHeader } from '../components/PageHeader';
import { SpotlightCard } from '../components/SpotlightCard';
import { Badge, type BadgeVariant } from '../components/Badge';
import { useToast } from '../contexts/ToastContext';
import {
  fetchAIProviders,
  testAIProvider,
  fetchPlaygroundScenarios,
  executePlaygroundRequest,
  approveQuarantinedEvent,
  type AIProviderInfo,
  type ScenarioPreset,
  type PlaygroundExecutionResponse
} from '../services/api';

const Playground: React.FC = () => {
  const { showToast } = useToast();

  // State
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('local');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>('none');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<PlaygroundExecutionResponse | null>(null);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);
  const [approvingEvent, setApprovingEvent] = useState<boolean>(false);
  const [showDetectorDetails, setShowDetectorDetails] = useState<boolean>(false);

  const loadProviders = React.useCallback(async () => {
    try {
      const data = await fetchAIProviders();
      setProviders(data);
      const active = data.find((p) => p.is_active_default);
      if (active) setSelectedProvider(active.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to retrieve AI provider catalog.', 'error');
    }
  }, [showToast]);

  const loadScenarios = React.useCallback(async () => {
    try {
      const data = await fetchPlaygroundScenarios();
      setScenarios(data);
    } catch (err: any) {
      console.warn('Could not load scenario presets:', err);
    }
  }, []);

  // Load providers and scenarios on mount
  useEffect(() => {
    loadProviders();
    loadScenarios();
  }, [loadProviders, loadScenarios]);

  const handleTestProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const res = await testAIProvider(providerId);
      showToast(
        `${providerId.toUpperCase()}: ${res.message} (${res.latency_ms ?? 0}ms)`,
        res.status === 'operational' ? 'success' : 'warning'
      );
      await loadProviders();
    } catch (err: any) {
      showToast(err.message || 'Error communicating with provider.', 'error');
    } finally {
      setTestingProvider(null);
    }
  };

  const handleApplyScenario = (preset: ScenarioPreset) => {
    setActiveScenario(preset.id);
    setPrompt(preset.prompt);
    setSystemPrompt(preset.system_prompt || '');
    if (preset.system_prompt) setShowSystemPrompt(true);

    if (preset.requested_tool) {
      setSelectedTool(preset.requested_tool.name);
    } else {
      setSelectedTool('none');
    }

    showToast(`Loaded "${preset.title}" — Expected: ${preset.expected_decision}`, 'info');
  };

  const handleExecute = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt or choose a judge test scenario.', 'warning');
      return;
    }

    setIsLoading(true);
    setExecutionResult(null);

    let requested_tool_payload = undefined;
    if (selectedTool !== 'none') {
      if (selectedTool === 'execute_shell') {
        requested_tool_payload = { name: 'execute_shell', arguments: { command: 'rm -rf /' } };
      } else if (selectedTool === 'read_database') {
        requested_tool_payload = { name: 'read_database', arguments: { query: 'SELECT * FROM clients' } };
      } else if (selectedTool === 'fetch_url') {
        requested_tool_payload = { name: 'fetch_url', arguments: { url: 'https://api.internal-finance.com/v1/summary' } };
      } else if (selectedTool === 'send_notification') {
        requested_tool_payload = { name: 'send_notification', arguments: { channel: 'soc-ops', message: 'Test message' } };
      }
    }

    try {
      const result = await executePlaygroundRequest({
        prompt,
        provider: selectedProvider,
        system_prompt: showSystemPrompt && systemPrompt ? systemPrompt : undefined,
        requested_tool: requested_tool_payload,
      });

      setExecutionResult(result);

      if (result.decision === 'ALLOW') {
        showToast(`Request Permitted (ALLOW) in ${result.latency_ms}ms (Risk: ${result.risk_score}/100)`, 'success');
      } else if (result.decision === 'BLOCK') {
        showToast(`Threat Blocked (BLOCK) at firewall (Risk: ${result.risk_score}/100)`, 'error');
      } else {
        showToast(`Quarantined (QUARANTINE) pending approval (Risk: ${result.risk_score}/100)`, 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'An error occurred during playground execution.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (executionResult?.ai_response) {
      navigator.clipboard.writeText(executionResult.ai_response);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
      showToast('AI response text copied to clipboard.', 'info');
    }
  };

  const handleApproveQuarantined = async () => {
    if (!executionResult?.security_event_id) return;
    setApprovingEvent(true);
    try {
      const res = await approveQuarantinedEvent(executionResult.security_event_id);
      showToast(`Quarantine Approved by ${res.reviewer}. Event updated in SOC history.`, 'success');
      setExecutionResult((prev) => (prev ? { ...prev, decision: 'ALLOW' } : null));
    } catch (err: any) {
      showToast(err.message || 'Failed to approve event.', 'error');
    } finally {
      setApprovingEvent(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Secure AI Playground"
        description="Live Prompt-Injection Defense, Semantic Firewall Evaluation & Tool Boundary Enforcement Console"
        icon={<Terminal size={22} />}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        {/* PROVIDER SELECTION & HEALTH STATUS BAR */}
        <SpotlightCard className="p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-accent)' }}>
                <Cpu size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>AI Engine Provider</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Select the active generation model for permitted requests
                </span>
              </div>
            </div>

            {/* Provider Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {providers.map((p) => {
                const isSelected = selectedProvider === p.id;
                const isOnline = p.status === 'operational';
                const isConfigured = p.is_configured;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--color-surface-subtle)',
                      color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isOnline
                          ? 'var(--color-safe)'
                          : isConfigured
                          ? 'var(--color-warning)'
                          : 'var(--color-text-muted)',
                      }}
                    />
                    <span>{p.display_name}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({p.model})</span>
                  </button>
                );
              })}
            </div>

            {/* Test Connection Button */}
            <button
              onClick={() => handleTestProvider(selectedProvider)}
              disabled={testingProvider !== null}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Activity size={14} className={testingProvider ? 'animate-spin' : ''} />
              {testingProvider ? 'Pinging API...' : 'Test Connection'}
            </button>
          </div>
        </SpotlightCard>

        {/* JUDGE TEST SCENARIOS PRESET BAR */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
              Hackathon Judge Demonstration Scenarios
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {scenarios.map((sc) => {
              const isActive = activeScenario === sc.id;
              let variant: BadgeVariant = 'default';
              if (sc.expected_decision === 'ALLOW') variant = 'safe';
              else if (sc.expected_decision === 'BLOCK') variant = 'critical';
              else if (sc.expected_decision.includes('DENY')) variant = 'medium';

              return (
                <div
                  key={sc.id}
                  onClick={() => handleApplyScenario(sc)}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.65rem',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                    border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                    boxShadow: isActive ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {sc.title}
                    </span>
                    <Badge variant={variant}>
                      {sc.expected_decision}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4', marginBottom: '0.65rem' }}>
                    {sc.description}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 500 }}>
                    Click to load test case →
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INTERACTIVE PLAYGROUND CONSOLE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <SpotlightCard className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)' }}>Input & Evaluation Payload</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {prompt.length} / 50,000 characters
              </span>
            </div>

            {/* Prompt Textarea */}
            <div style={{ marginBottom: '1rem' }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter user prompt or paste suspicious document content for real-time security inspection..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  background: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            {/* System Persona Context Toggle */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                {showSystemPrompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>{showSystemPrompt ? 'Hide System Prompt Context' : 'Configure Custom System Prompt Context'}</span>
              </button>

              <AnimatePresence>
                {showSystemPrompt && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="e.g. You are an autonomous AI research agent. Protect confidential internal information."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '0.5rem',
                        background: 'var(--color-surface-subtle)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        outline: 'none',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tool Boundary Request Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Wrench size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Demonstration Tool Call:</span>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  style={{
                    background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    borderRadius: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="none">None (Standard Prompt Only)</option>
                  <option value="read_database">read_database (Allowed Demo Query)</option>
                  <option value="fetch_url">fetch_url (Allowlisted HTTP Request)</option>
                  <option value="send_notification">send_notification (Alert Channel)</option>
                  <option value="execute_shell">execute_shell (RESTRICTED - Tool Policy Deny)</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleExecute}
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? (
                  <>
                    <Activity size={18} className="animate-spin" />
                    <span>Evaluating Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>Evaluate & Execute</span>
                  </>
                )}
              </button>
            </div>
          </SpotlightCard>

          {/* REAL-TIME ENFORCEMENT & EXECUTION RESULTS */}
          <AnimatePresence>
            {executionResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
              >
                {/* 1. DECISION BANNER */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '0.75rem',
                    background:
                      executionResult.decision === 'ALLOW'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : executionResult.decision === 'BLOCK'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                    border:
                      executionResult.decision === 'ALLOW'
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : executionResult.decision === 'BLOCK'
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        padding: '0.65rem',
                        borderRadius: '0.5rem',
                        background:
                          executionResult.decision === 'ALLOW'
                            ? 'var(--color-safe)'
                            : executionResult.decision === 'BLOCK'
                            ? 'var(--color-danger)'
                            : 'var(--color-warning)',
                        color: '#fff',
                      }}
                    >
                      {executionResult.decision === 'ALLOW' ? (
                        <ShieldCheck size={26} />
                      ) : executionResult.decision === 'BLOCK' ? (
                        <ShieldAlert size={26} />
                      ) : (
                        <AlertTriangle size={26} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            color:
                              executionResult.decision === 'ALLOW'
                                ? 'var(--color-safe)'
                                : executionResult.decision === 'BLOCK'
                                ? 'var(--color-danger)'
                                : 'var(--color-warning)',
                          }}
                        >
                          ENFORCEMENT DECISION: {executionResult.decision}
                        </span>
                        <Badge
                          variant={
                            executionResult.decision === 'ALLOW'
                              ? 'safe'
                              : executionResult.decision === 'BLOCK'
                              ? 'critical'
                              : 'medium'
                          }
                        >
                          Risk Score: {executionResult.risk_score} / 100
                        </Badge>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', marginTop: '0.25rem' }}>
                        {executionResult.reason}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                        Total Pipeline Latency
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'monospace' }}>
                        {executionResult.latency_ms} ms
                      </span>
                    </div>

                    {executionResult.decision === 'QUARANTINE' && (
                      <button
                        onClick={handleApproveQuarantined}
                        disabled={approvingEvent}
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <CheckCheck size={14} />
                        {approvingEvent ? 'Approving...' : 'Approve Execution (SOC Override)'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. REQUEST LIFECYCLE PIPELINE TRACE */}
                <SpotlightCard className="p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Layers size={17} style={{ color: 'var(--color-accent)' }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      Request Inspection & Enforcement Pipeline Trace
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {executionResult.pipeline_trace.map((step, idx) => {
                      const isSuccess = ['PASSED', 'ALLOW', 'SUCCESS', 'AUTHORIZED'].includes(step.status);
                      const isDanger = ['BLOCK', 'DENIED', 'ERROR', 'TRIPWIRE_TRIGGERED'].includes(step.status);
                      const isWarn = ['QUARANTINE', 'FLAGGED'].includes(step.status);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '0.5rem',
                            background: 'var(--color-surface-subtle)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ color: isSuccess ? 'var(--color-safe)' : isDanger ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                              {isSuccess ? <CheckCircle2 size={16} /> : isDanger ? <XCircle size={16} /> : <AlertOctagon size={16} />}
                            </div>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                Stage {idx + 1}: {step.name}
                              </span>
                              {step.details && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                  {step.details}
                                </p>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <Badge
                              variant={isSuccess ? 'safe' : isDanger ? 'critical' : isWarn ? 'medium' : 'default'}
                            >
                              {step.status}
                            </Badge>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                              {step.latency_ms}ms
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SpotlightCard>

                {/* 3. AI RESPONSE CONTAINER (When ALLOW) */}
                {executionResult.decision === 'ALLOW' && executionResult.ai_response && (
                  <SpotlightCard className="p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={17} style={{ color: 'var(--color-safe)' }} />
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                          Verified Model Response ({executionResult.provider} / {executionResult.model})
                        </h3>
                      </div>
                      <button
                        onClick={handleCopyResponse}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        {copiedResponse ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        background: 'var(--color-surface-subtle)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text)',
                        fontSize: '0.85rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {executionResult.ai_response}
                    </div>

                    {/* Tool Result if present */}
                    {executionResult.tool_execution && (
                      <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Wrench size={14} style={{ color: 'var(--color-accent)' }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                            Tool Execution: {executionResult.tool_execution.tool}
                          </span>
                          <Badge
                            variant={executionResult.tool_execution.status === 'AUTHORIZED' ? 'safe' : 'critical'}
                          >
                            {executionResult.tool_execution.status}
                          </Badge>
                        </div>
                        {executionResult.tool_execution.output && (
                          <pre
                            style={{
                              padding: '0.65rem',
                              borderRadius: '0.4rem',
                              background: 'rgba(0,0,0,0.3)',
                              color: 'var(--color-text-muted)',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                            }}
                          >
                            {JSON.stringify(executionResult.tool_execution.output, null, 2)}
                          </pre>
                        )}
                        {executionResult.tool_execution.reason && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                            {executionResult.tool_execution.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </SpotlightCard>
                )}

                {/* 4. FORENSIC EXPLANATION & SECURITY EVIDENCE (When BLOCK or QUARANTINE) */}
                {executionResult.decision !== 'ALLOW' && (
                  <SpotlightCard className="p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Lock size={17} style={{ color: 'var(--color-danger)' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        Forensic Explanation & Security Telemetry
                      </h3>
                    </div>

                    {executionResult.forensic_explanation && (
                      <div
                        style={{
                          padding: '0.85rem',
                          borderRadius: '0.5rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--color-text)',
                          fontSize: '0.85rem',
                          lineHeight: '1.5',
                          marginBottom: '1rem',
                        }}
                      >
                        {executionResult.forensic_explanation}
                      </div>
                    )}

                    {/* Linked Database Records Navigation */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--color-surface-subtle)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Persisted SOC Telemetry:
                      </div>

                      {executionResult.security_event_id && (
                        <Link
                          to="/events"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            color: 'var(--color-accent)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>View in Security Events (#{executionResult.security_event_id.slice(0, 8)})</span>
                        </Link>
                      )}

                      {executionResult.alert_id && (
                        <Link
                          to="/alerts"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            color: 'var(--color-warning)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          <ExternalLink size={13} />
                          <span>View in Active Alerts (#{executionResult.alert_id.slice(0, 8)})</span>
                        </Link>
                      )}
                    </div>
                  </SpotlightCard>
                )}

                {/* 5. RAW DETECTOR BREAKDOWN INSPECTION */}
                {executionResult.detector_breakdown && (
                  <SpotlightCard className="p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setShowDetectorDetails(!showDetectorDetails)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={16} style={{ color: 'var(--color-accent)' }} />
                        <span>Inspect Raw Detector Breakdown & Similarity Vectors</span>
                      </div>
                      {showDetectorDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <AnimatePresence>
                      {showDetectorDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ marginTop: '0.85rem' }}
                        >
                          <pre
                            style={{
                              padding: '0.85rem',
                              borderRadius: '0.4rem',
                              background: 'rgba(0,0,0,0.3)',
                              color: 'var(--color-text-muted)',
                              fontSize: '0.8rem',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                              maxHeight: '300px',
                            }}
                          >
                            {JSON.stringify(executionResult.detector_breakdown, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SpotlightCard>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
};

export default Playground;
