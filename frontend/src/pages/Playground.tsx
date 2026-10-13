import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Copy,
  Check,
  Play,
  Wrench,
  Sparkles,
  Layers,
  RotateCw,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader';
import { DecisionBadge } from '../components/Badge';
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
  const location = useLocation();

  // Tab State: Custom Prompt vs Example Prompts
  const [activeTab, setActiveTab] = useState<'custom' | 'examples'>('custom');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // State
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('local');
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [prompt, setPrompt] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>('autonomous');
  const [testMode, setTestMode] = useState<'live_ai' | 'analysis_only'>('live_ai');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<PlaygroundExecutionResponse | null>(null);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [approvingEvent, setApprovingEvent] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const loadProviders = useCallback(async () => {
    try {
      const data = await fetchAIProviders();
      setProviders(data);
      const active = data.find((p) => p.is_active_default);
      if (active) setSelectedProvider(active.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to retrieve AI provider catalog.', 'error');
    }
  }, [showToast]);

  const loadScenarios = useCallback(async () => {
    try {
      const data = await fetchPlaygroundScenarios();
      setScenarios(data);
    } catch (err: any) {
      console.warn('Could not load scenario presets:', err);
    }
  }, []);

  useEffect(() => {
    loadProviders();
    loadScenarios();
  }, [loadProviders, loadScenarios]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [location.search]);

  const handleTestProvider = async (e: React.MouseEvent, providerId: string) => {
    e.stopPropagation();
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
    setValidationError(null);
    setExecutionError(null);
    setSystemPrompt(preset.system_prompt || '');
    if (preset.system_prompt) setShowSystemPrompt(true);

    if (preset.requested_tool) {
      setSelectedTool(preset.requested_tool.name);
      setShowAdvancedOptions(true);
    } else {
      setSelectedTool('autonomous');
    }

    setActiveTab('custom');
    showToast(`Loaded "${preset.title}" — Expected: ${preset.expected_decision}`, 'info');
  };

  const handleExecute = async () => {
    if (!prompt || !prompt.trim()) {
      setValidationError("Please enter or paste a prompt to test your AI agent's security.");
      showToast('Please enter a prompt or choose a preset test scenario.', 'warning');
      return;
    }

    if (prompt.length > 50000) {
      setValidationError('Prompt exceeds maximum length of 50,000 characters.');
      showToast('Prompt exceeds maximum length of 50,000 characters.', 'warning');
      return;
    }

    setValidationError(null);
    setExecutionError(null);
    setIsLoading(true);
    setExecutionResult(null);

    let requested_tool_payload = undefined;
    let enable_mcp_tools = true;

    if (selectedTool === 'none') {
      enable_mcp_tools = false;
    } else if (selectedTool === 'autonomous') {
      enable_mcp_tools = true;
      requested_tool_payload = undefined;
    } else if (selectedTool === 'get_system_health') {
      requested_tool_payload = { name: 'get_system_health', arguments: { include_metrics: true } };
    } else if (selectedTool === 'get_recent_security_events') {
      requested_tool_payload = { name: 'get_recent_security_events', arguments: { limit: 5 } };
    } else if (selectedTool === 'inspect_agent_posture') {
      requested_tool_payload = { name: 'inspect_agent_posture', arguments: { agent_name: 'Playground-Security-Agent' } };
    } else if (selectedTool === 'github_read_issues') {
      requested_tool_payload = { name: 'github_read_issues', arguments: { repository: 'dilipnetawat/AgentSentry', state: 'open', limit: 5 } };
    } else if (selectedTool === 'github_list_repositories') {
      requested_tool_payload = { name: 'github_list_repositories', arguments: { limit: 10 } };
    } else if (selectedTool === 'execute_arbitrary_script') {
      requested_tool_payload = { name: 'execute_arbitrary_script', arguments: { command: 'rm -rf /var/log/*' } };
    } else if (selectedTool === 'execute_shell') {
      requested_tool_payload = { name: 'execute_shell', arguments: { command: 'cat /etc/passwd' } };
    } else if (selectedTool === 'read_database') {
      requested_tool_payload = { name: 'read_database', arguments: { query: 'SELECT * FROM client_secrets' } };
    } else if (selectedTool === 'fetch_url') {
      requested_tool_payload = { name: 'fetch_url', arguments: { url: 'https://internal-vault.corp/api/keys' } };
    } else if (selectedTool === 'send_notification') {
      requested_tool_payload = { name: 'send_notification', arguments: { channel: 'soc-ops', message: 'Exfiltrated token payload' } };
    }

    try {
      const result = await executePlaygroundRequest({
        prompt: prompt.trim(),
        test_mode: testMode,
        provider: selectedProvider,
        system_prompt: showSystemPrompt && systemPrompt ? systemPrompt : undefined,
        requested_tool: requested_tool_payload,
        enable_mcp_tools,
        max_iterations: 3,
      });

      setExecutionResult(result);

      if (testMode === 'analysis_only') {
        if (result.decision === 'BLOCK') {
          showToast(`Threat Blocked (BLOCK) in Analysis Mode (Risk: ${result.risk_score}/100)`, 'error');
        } else if (result.decision === 'QUARANTINE') {
          showToast(`Quarantined (QUARANTINE) pending approval (Risk: ${result.risk_score}/100)`, 'warning');
        } else {
          showToast(`Security Analysis Complete: Clean Request in ${result.latency_ms}ms`, 'success');
        }
      } else {
        if (result.decision === 'ALLOW') {
          showToast(`Request Permitted (ALLOW) in ${result.latency_ms}ms (Risk: ${result.risk_score}/100)`, 'success');
        } else if (result.decision === 'BLOCK') {
          showToast(`Threat Blocked (BLOCK) by Firewall (Risk: ${result.risk_score}/100)`, 'error');
        } else {
          showToast(`Quarantined (QUARANTINE) pending approval (Risk: ${result.risk_score}/100)`, 'warning');
        }
      }
    } catch (err: any) {
      setExecutionError(err.message || 'An error occurred during playground execution.');
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
      showToast('AI model output copied to clipboard.', 'info');
    }
  };

  const handleApproveQuarantined = async () => {
    if (!executionResult?.security_event_id) return;
    setApprovingEvent(true);
    try {
      const res = await approveQuarantinedEvent(executionResult.security_event_id);
      showToast(`Quarantine Approved by ${res.reviewer}. Security event updated.`, 'success');
      setExecutionResult((prev) => (prev ? { ...prev, decision: 'ALLOW' } : null));
    } catch (err: any) {
      showToast(err.message || 'Failed to approve event.', 'error');
    } finally {
      setApprovingEvent(false);
    }
  };

  // Render Defense Output Console
  const renderOutputConsole = () => {
    if (isLoading) {
      return (
        <div className="workspace-empty" style={{ minHeight: '320px' }}>
          <RotateCw size={32} className="animate-spin text-accent" />
          <strong>Inspecting Payload</strong>
          <span>Running Regex Heuristics, FastEmbed Cosine Similarity, and Policy Evaluation...</span>
        </div>
      );
    }

    if (!executionResult) {
      return (
        <div className="workspace-empty" style={{ minHeight: '320px' }}>
          <Terminal size={32} />
          <strong>Awaiting Playground Input</strong>
          <span>Select a scenario on the left and click "Execute & Analyze Security Defense" to view real firewall inspection results.</span>
        </div>
      );
    }

    const result = executionResult;

    return (
      <div>
        {/* Transparent Defense Scorecard Banner */}
        <div
          className="defense-scorecard-banner"
          style={{
            border: `1px solid ${
              result.defense_status === 'PASSED'
                ? 'var(--color-safe-border)'
                : result.defense_status === 'INCONCLUSIVE'
                ? 'var(--color-medium-border)'
                : 'var(--color-critical-border)'
            }`,
            background:
              result.defense_status === 'PASSED'
                ? 'rgba(16, 185, 129, 0.08)'
                : result.defense_status === 'INCONCLUSIVE'
                ? 'var(--color-medium-bg)'
                : 'var(--color-critical-bg)',
          }}
        >
          <div className="flex items-center gap-3">
            {result.defense_status === 'PASSED' ? (
              <ShieldCheck size={28} style={{ color: 'var(--color-safe)' }} />
            ) : result.defense_status === 'INCONCLUSIVE' ? (
              <AlertTriangle size={28} style={{ color: 'var(--color-medium)' }} />
            ) : (
              <ShieldAlert size={28} style={{ color: 'var(--color-critical)' }} />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <DecisionBadge decision={result.decision} />
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background:
                      result.defense_status === 'PASSED'
                        ? 'var(--color-safe-bg)'
                        : result.defense_status === 'INCONCLUSIVE'
                        ? 'var(--color-medium-bg)'
                        : 'var(--color-critical-bg)',
                    color:
                      result.defense_status === 'PASSED'
                        ? 'var(--color-safe)'
                        : result.defense_status === 'INCONCLUSIVE'
                        ? 'var(--color-medium)'
                        : 'var(--color-critical)',
                    border: `1px solid ${
                      result.defense_status === 'PASSED'
                        ? 'var(--color-safe-border)'
                        : result.defense_status === 'INCONCLUSIVE'
                        ? 'var(--color-medium-border)'
                        : 'var(--color-critical-border)'
                    }`
                  }}
                >
                  {result.defense_status === 'PASSED'
                    ? 'DEFENSE PASSED / PROTECTED'
                    : result.defense_status === 'INCONCLUSIVE'
                    ? 'INCONCLUSIVE / QUARANTINED'
                    : 'DEFENSE BREACHED / FAILED'}
                </span>
                <span
                  className="mono text-xs px-2 py-0.5 rounded"
                  style={{
                    fontSize: '0.68rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {result.test_mode === 'analysis_only' ? 'MODE: ANALYSIS ONLY' : 'MODE: LIVE AI TEST'}
                </span>
              </div>
              <span className="text-xs text-primary font-medium block">
                {result.defense_summary || result.reason || 'Security evaluation completed.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Defense Score Box */}
            <div className="defense-score-box">
              <span
                className="defense-score-number"
                style={{
                  color:
                    (result.defense_score ?? 100) >= 80
                      ? 'var(--color-safe)'
                      : (result.defense_score ?? 100) >= 50
                      ? 'var(--color-medium)'
                      : 'var(--color-critical)',
                }}
              >
                {result.defense_score ?? (result.decision === 'BLOCK' ? 100 : result.decision === 'QUARANTINE' ? 75 : 100)}/100
              </span>
              <span className="defense-score-label text-tertiary">DEFENSE SCORE</span>
              <span className="mono text-xs text-tertiary mt-0.5" style={{ fontSize: '0.68rem' }}>Protection rating</span>
            </div>

            {/* Threat Score Box */}
            <div className="defense-score-box" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
              <span
                className="defense-score-number"
                style={{
                  color:
                    result.risk_score >= 70
                      ? 'var(--color-critical)'
                      : result.risk_score >= 30
                      ? 'var(--color-medium)'
                      : 'var(--color-safe)',
                }}
              >
                {result.risk_score}/100
              </span>
              <span className="defense-score-label text-tertiary">THREAT RISK</span>
              <span className="mono text-xs text-tertiary mt-0.5" style={{ fontSize: '0.68rem' }}>Adversarial intensity</span>
            </div>
          </div>
        </div>

        {/* Tested Prompt Inspector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
              <Terminal size={13} className="text-accent" />
              <span>Tested Prompt Payload:</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-tertiary mono">
                {result.prompt.length.toLocaleString()} chars
              </span>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(result.prompt);
                  setCopiedPrompt(true);
                  setTimeout(() => setCopiedPrompt(false), 2000);
                  showToast('Tested prompt copied to clipboard', 'info');
                }}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                {copiedPrompt ? <Check size={11} className="text-safe" /> : <Copy size={11} />}
                <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
              lineHeight: 1.45,
              maxHeight: '130px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {result.prompt}
          </div>
        </div>

        {/* Actionable Defensive Recommendations (if provided) */}
        {result.defense_recommendations && result.defense_recommendations.length > 0 && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              marginBottom: '1.25rem',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={14} className="text-accent" />
              <strong className="text-xs text-primary">Defensive Hardening Recommendations:</strong>
            </div>
            <ul className="recommendations-list">
              {result.defense_recommendations.map((rec, i) => (
                <li key={i} className="recommendation-item">
                  <span className="recommendation-bullet">✓</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Observed Behavior & Evidence Box */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
          }}
        >
          <span className="text-xs font-semibold text-secondary block mb-1">Observed Behavior & Evidence:</span>
          <p className="text-xs text-secondary m-0 leading-relaxed">
            {result.forensic_explanation || result.reason || 'Input evaluated by Semantic Firewall.'}
          </p>
          {result.detector_breakdown && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-subtle flex-wrap text-xs">
              <span className="text-tertiary">Detectors:</span>
              {Object.entries(result.detector_breakdown).map(([k, v]: [string, any]) => (
                <span
                  key={k}
                  className="mono text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  {k}: {typeof v === 'object' && v !== null ? v.decision || v.matched || 'FLAGGED' : String(v)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Local Security Engine Inspection Section */}
        {result.local_engine_details && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              marginBottom: '1.25rem',
            }}
          >
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-accent-cyan" />
                <strong className="text-xs text-primary font-mono">
                  Local Security Engine Breakdown
                </strong>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(34, 200, 245, 0.12)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(34, 200, 245, 0.25)',
                    fontWeight: 600,
                  }}
                >
                  Air-Gapped / No External AI Required
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="mono text-xs px-2 py-0.5 rounded"
                  style={{
                    fontSize: '0.68rem',
                    background:
                      result.local_engine_details.risk_band === 'HIGH'
                        ? 'var(--color-critical-bg)'
                        : result.local_engine_details.risk_band === 'SUSPICIOUS'
                        ? 'var(--color-medium-bg)'
                        : 'var(--color-safe-bg)',
                    color:
                      result.local_engine_details.risk_band === 'HIGH'
                        ? 'var(--color-critical)'
                        : result.local_engine_details.risk_band === 'SUSPICIOUS'
                        ? 'var(--color-medium)'
                        : 'var(--color-safe)',
                    border: `1px solid ${
                      result.local_engine_details.risk_band === 'HIGH'
                        ? 'var(--color-critical-border)'
                        : result.local_engine_details.risk_band === 'SUSPICIOUS'
                        ? 'var(--color-medium-border)'
                        : 'var(--color-safe-border)'
                    }`,
                    fontWeight: 600,
                  }}
                >
                  BAND: {result.local_engine_details.risk_band} ({result.local_engine_details.risk_score}/100)
                </span>
                <span
                  className="mono text-xs px-2 py-0.5 rounded font-bold"
                  style={{
                    fontSize: '0.68rem',
                    background:
                      result.local_engine_details.recommended_action === 'BLOCK'
                        ? 'var(--color-critical-bg)'
                        : result.local_engine_details.recommended_action === 'QUARANTINE'
                        ? 'var(--color-medium-bg)'
                        : 'var(--color-safe-bg)',
                    color:
                      result.local_engine_details.recommended_action === 'BLOCK'
                        ? 'var(--color-critical)'
                        : result.local_engine_details.recommended_action === 'QUARANTINE'
                        ? 'var(--color-medium)'
                        : 'var(--color-safe)',
                    border: `1px solid ${
                      result.local_engine_details.recommended_action === 'BLOCK'
                        ? 'var(--color-critical-border)'
                        : result.local_engine_details.recommended_action === 'QUARANTINE'
                        ? 'var(--color-medium-border)'
                        : 'var(--color-safe-border)'
                    }`,
                  }}
                >
                  {result.local_engine_details.recommended_action}
                </span>
              </div>
            </div>

            {/* Input Normalization Transformations */}
            {result.local_engine_details.transformations_applied &&
              result.local_engine_details.transformations_applied.length > 0 && (
                <div className="mb-3 p-2 rounded bg-surface border border-subtle">
                  <span className="text-[11px] font-semibold text-tertiary block mb-1">
                    Input Transformations Applied (Deobfuscation):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.local_engine_details.transformations_applied.map((t, idx) => (
                      <span
                        key={idx}
                        className="mono text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-light)',
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Decoded Payloads if Base64 extracted */}
            {result.local_engine_details.decoded_payloads &&
              result.local_engine_details.decoded_payloads.length > 0 && (
                <div className="mb-3 p-2 rounded bg-surface border border-subtle">
                  <span className="text-[11px] font-semibold text-tertiary block mb-1">
                    Extracted Obfuscated Payloads:
                  </span>
                  {result.local_engine_details.decoded_payloads.map((dp, idx) => (
                    <div key={idx} className="mono text-[11px] text-secondary break-all">
                      <span className="text-tertiary">[{dp.encoding}]: </span>
                      <code>{dp.decoded_payload}</code>
                    </div>
                  ))}
                </div>
              )}

            {/* Matched Rules List */}
            {result.local_engine_details.matched_rules &&
            result.local_engine_details.matched_rules.length > 0 ? (
              <div className="mb-3">
                <span className="text-xs font-semibold text-secondary block mb-2">
                  Triggered Heuristic Security Rules ({result.local_engine_details.matched_rules.length}):
                </span>
                <div className="space-y-2">
                  {result.local_engine_details.matched_rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded border border-light"
                      style={{
                        background: 'var(--bg-surface)',
                        borderLeft: `3px solid ${
                          rule.severity === 'CRITICAL'
                            ? 'var(--color-critical)'
                            : rule.severity === 'HIGH'
                            ? '#f97316'
                            : rule.severity === 'MEDIUM'
                            ? 'var(--color-medium)'
                            : 'var(--color-safe)'
                        }`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="mono text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)' }}
                          >
                            {rule.rule_id}
                          </span>
                          <strong className="text-xs text-primary">{rule.name}</strong>
                          <span
                            className="mono text-[10px] px-1.5 py-0.5 rounded text-tertiary"
                            style={{ background: 'rgba(255, 255, 255, 0.04)' }}
                          >
                            {rule.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background:
                                rule.severity === 'CRITICAL'
                                  ? 'var(--color-critical-bg)'
                                  : rule.severity === 'HIGH'
                                  ? 'rgba(249, 115, 22, 0.15)'
                                  : rule.severity === 'MEDIUM'
                                  ? 'var(--color-medium-bg)'
                                  : 'var(--color-safe-bg)',
                              color:
                                rule.severity === 'CRITICAL'
                                  ? 'var(--color-critical)'
                                  : rule.severity === 'HIGH'
                                  ? '#fb923c'
                                  : rule.severity === 'MEDIUM'
                                  ? 'var(--color-medium)'
                                  : 'var(--color-safe)',
                            }}
                          >
                            {rule.severity}
                          </span>
                          <span className="mono text-xs font-semibold text-secondary">
                            +{rule.score} pts
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-secondary m-0 mb-1 leading-snug">{rule.description}</p>
                      {rule.matched_excerpt && (
                        <div className="mono text-[11px] p-1.5 rounded bg-background text-tertiary break-all mb-1">
                          <span className="text-accent-cyan font-semibold">Matched Excerpt: </span>
                          "{rule.matched_excerpt}"
                        </div>
                      )}
                      {rule.mitigation && (
                        <div className="text-[11px] text-tertiary mt-1 flex items-start gap-1">
                          <span className="text-accent-cyan font-bold">Mitigation:</span>
                          <span>{rule.mitigation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded bg-surface border border-subtle mb-3 flex items-center gap-2 text-xs text-secondary">
                <ShieldCheck size={16} className="text-safe shrink-0" />
                <span>
                  No heuristic rule violations detected across all 7 threat categories. Baseline input validated clean.
                </span>
              </div>
            )}

            {/* Coverage Limitation & Disclaimer Box */}
            <div
              className="p-2.5 rounded text-[11px] flex items-start gap-2"
              style={{
                background: 'rgba(100, 116, 139, 0.08)',
                border: '1px solid rgba(100, 116, 139, 0.2)',
                color: 'var(--text-tertiary)',
              }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-tertiary" />
              <span>
                <strong>Coverage Notice:</strong> {result.local_engine_details.coverage_limitation ||
                  'Deterministic heuristic rules detect known attack patterns and structural anomalies offline. They do not guarantee protection against novel zero-day adversarial jailbreaks. Enhanced AI analysis recommended for defense-in-depth.'}
              </span>
            </div>
          </div>
        )}

        {/* Quarantine Approval Button (if quarantined) */}
        {result.decision === 'QUARANTINE' && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <strong className="text-xs text-primary block">Quarantine Exception Authorization</strong>
              <span className="text-xs text-tertiary">Analyst override allows safe execution and logs reviewer audit.</span>
            </div>
            <button
              className="btn btn-primary text-xs"
              onClick={handleApproveQuarantined}
              disabled={approvingEvent}
            >
              {approvingEvent ? 'Approving...' : 'Approve Execution'}
            </button>
          </div>
        )}

        {/* Real Model-to-MCP Tool Interception & Execution Panel */}
        {result.tool_execution && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface-elevated)',
              border: `1px solid ${
                result.tool_execution.status === 'AUTHORIZED'
                  ? 'var(--color-safe-border)'
                  : 'var(--color-critical-border)'
              }`,
              marginBottom: '1.25rem',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench
                  size={14}
                  style={{
                    color:
                      result.tool_execution.status === 'AUTHORIZED'
                        ? 'var(--color-safe)'
                        : 'var(--color-critical)',
                  }}
                />
                <strong className="text-xs text-primary font-mono">
                  MCP Tool Boundary: {result.tool_execution.tool}
                </strong>
                {result.tool_execution.mcp_server && (
                  <span className="mono text-xs text-tertiary">
                    [{result.tool_execution.mcp_server}]
                  </span>
                )}
                {result.tool_execution.invoked_by === 'model' && (
                  <span className="status-badge status-default text-xs" style={{ fontSize: '0.65rem' }}>
                    Autonomous Model Request
                  </span>
                )}
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  background:
                    result.tool_execution.status === 'AUTHORIZED'
                      ? 'var(--color-safe-bg)'
                      : 'var(--color-critical-bg)',
                  color:
                    result.tool_execution.status === 'AUTHORIZED'
                      ? 'var(--color-safe)'
                      : 'var(--color-critical)',
                  border: `1px solid ${
                    result.tool_execution.status === 'AUTHORIZED'
                      ? 'var(--color-safe-border)'
                      : 'var(--color-critical-border)'
                  }`,
                }}
              >
                {result.tool_execution.status}
              </span>
            </div>

            <p className="text-xs text-secondary m-0 mb-2">
              {result.tool_execution.reason ||
                'Tool execution evaluated by runtime policy gateway and executed over JSON-RPC 2.0 stdio transport.'}
            </p>

            {result.tool_execution.output !== undefined && (
              <div>
                <span className="text-xs text-tertiary block font-mono mb-1">
                  Verified Stdio Output:
                </span>
                <pre
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '0.6rem',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    maxHeight: '130px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {typeof result.tool_execution.output === 'string'
                    ? result.tool_execution.output
                    : JSON.stringify(result.tool_execution.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* AI Model Output */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-secondary flex items-center gap-1.5">
              <Sparkles size={13} className="text-accent" />
              <span>AI Model Output ({result.provider} · {result.model}):</span>
            </label>
            {result.ai_response && (
              <button
                className="btn btn-secondary text-xs"
                onClick={handleCopyResponse}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                {copiedResponse ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              color: result.ai_response ? 'var(--text-primary)' : 'var(--text-tertiary)',
              lineHeight: 1.5,
              minHeight: '90px',
              maxHeight: '220px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {result.ai_response || (
              <span className="italic text-tertiary">
                {result.test_mode === 'analysis_only'
                  ? '[Security Analysis Only: Generative AI model inference was intentionally bypassed per test mode configuration. Switch to "Live AI Security Test" mode to evaluate model responses.]'
                  : result.decision === 'BLOCK'
                  ? '[Generation Suppressed: The Semantic Firewall intercepted and terminated execution before model generation to protect agent integrity.]'
                  : result.decision === 'QUARANTINE'
                  ? '[Generation Held: Quarantined pending SOC analyst review.]'
                  : '[No response returned by provider.]'}
              </span>
            )}
          </div>
        </div>

        {/* Detector Inspection Drawer / Details */}
        <div
          style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-secondary flex items-center gap-1.5">
              <Layers size={13} />
              <span>Pipeline Stage Traces & Diagnostics</span>
            </span>
            <button
              type="button"
              className="text-xs text-accent bg-transparent border-none cursor-pointer"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-tertiary">
            <span>Execution Stages Evaluated:</span>
            <strong className="text-primary mono">
              {result.pipeline_trace?.length || 0} stages ({result.latency_ms}ms)
            </strong>
          </div>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-subtle flex flex-col gap-2 text-xs">
              {result.pipeline_trace?.map((trace, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-subtle">
                  <div>
                    <span className="text-primary font-medium">{trace.name}</span>
                    <span className="text-tertiary ml-2 mono">({trace.stage})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-tertiary">{trace.latency_ms}ms</span>
                    <span className={`mono font-bold text-xs ${trace.status === 'BLOCKED' ? 'text-critical' : trace.status === 'ALLOWED' ? 'text-safe' : 'text-tertiary'}`}>
                      {trace.status}
                    </span>
                  </div>
                </div>
              ))}

              {result.security_event_id && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-tertiary">Logged Audit Event:</span>
                  <Link
                    to="/events"
                    className="text-accent flex items-center gap-1 mono"
                  >
                    <span>{result.security_event_id.slice(0, 16)}...</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={handleExecute}
              disabled={isLoading}
            >
              <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>Rerun Security Test</span>
            </button>
            {result.ai_response && (
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={handleCopyResponse}
              >
                {copiedResponse ? <Check size={13} className="text-safe" /> : <Copy size={13} />}
                <span>{copiedResponse ? 'Copied' : 'Copy Output'}</span>
              </button>
            )}
          </div>
          {result.security_event_id && (
            <Link
              to="/events"
              className="btn btn-secondary text-xs flex items-center gap-1.5"
              style={{ textDecoration: 'none' }}
            >
              <span>View Audit in History</span>
              <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>
    );
  };

  const categories = ['all', ...Array.from(new Set(scenarios.map((s) => s.category)))];
  const filteredScenarios = selectedCategory === 'all'
    ? scenarios
    : scenarios.filter((s) => s.category === selectedCategory);

  return (
    <div className="dashboard-container">
      <PageHeader
        title="Test a Prompt"
        description="Enter your own prompt or choose from examples. Then run a security test to see the analysis and results."
        icon={<Terminal size={20} />}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-tertiary">Active Target:</span>
            <span className="status-badge status-default uppercase font-mono">
              {selectedProvider} ({providers.find(p => p.id === selectedProvider)?.model || 'default'})
            </span>
          </div>
        }
      />

      {/* 1. Provider Selector Bar */}
      <section className="glass-surface p-5 mb-4" style={{ borderRadius: 'var(--radius-md)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="page-header-icon-box" style={{ width: '34px', height: '34px' }}>
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="m-0 text-sm font-semibold text-primary">Target AI Intelligence Provider</h3>
              <p className="m-0 text-xs text-tertiary">Select generation model evaluated for permitted requests</p>
            </div>
          </div>

          {/* Provider Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;
              const isOnline = p.status === 'operational';
              const isTesting = testingProvider === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--color-accent-muted)' : 'var(--bg-surface)',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  title={p.message || p.display_name}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: isOnline ? 'var(--color-safe)' : p.is_configured ? 'var(--color-medium)' : 'var(--text-muted)',
                    }}
                  />
                  <span>{p.display_name}</span>
                  <span className="mono text-xs text-tertiary font-normal">({p.model})</span>
                  {!p.is_configured && (
                    <span 
                      style={{ 
                        fontSize: '0.60rem', 
                        padding: '1px 4px', 
                        borderRadius: '3px', 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        color: 'var(--text-muted)',
                        fontWeight: 500
                      }}
                    >
                      UNCONFIGURED
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleTestProvider(e, p.id)}
                    disabled={isTesting}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Ping connectivity"
                  >
                    <RotateCw size={11} className={isTesting ? 'animate-spin text-accent' : 'hover:text-primary'} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unconfigured Provider Advisory Notice */}
        {(() => {
          const activeP = providers.find(p => p.id === selectedProvider);
          if (activeP && !activeP.is_configured) {
            return (
              <div 
                className="mt-3 p-2.5 rounded text-xs flex items-center justify-between"
                style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: 'var(--color-medium)' }}
              >
                <span>
                  Notice: <strong>{activeP.display_name}</strong> is currently unconfigured. Requests will report an honest provider error unless the API key is configured in <code>backend/.env</code>.
                </span>
                <span className="mono text-xs">Deterministic Local is active default</span>
              </div>
            );
          }
          return null;
        })()}
      </section>

      {/* 2. Main Two-Column Playground Workspace */}
      <div className="playground-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Left Column: Security Testing Workspace */}
        <div className="flex flex-col gap-4">
          <div className="glass-surface panel-container" style={{ borderRadius: 'var(--radius-md)' }}>
            <div className="panel-header">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2 text-white">
                  <Terminal size={17} className="text-accent-cyan" />
                  <span>Interactive Security Testing</span>
                </h2>
                <p className="text-xs text-secondary">
                  Evaluate real-time agent firewall defense, prompt injection detection, and tool execution boundaries.
                </p>
              </div>
            </div>

            {/* Custom Prompt and Example Prompts Tabs */}
            <div className="flex border-b border-border mb-4 px-1">
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'custom'
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-secondary hover:text-white'
                }`}
                style={{ background: 'transparent' }}
              >
                Custom Prompt
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('examples')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'examples'
                    ? 'border-accent-cyan text-accent-cyan'
                    : 'border-transparent text-secondary hover:text-white'
                }`}
                style={{ background: 'transparent' }}
              >
                <span>Example Prompts</span>
                {scenarios.length > 0 && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                    style={{ background: 'rgba(34, 200, 245, 0.15)', color: 'var(--accent-cyan)' }}
                  >
                    {scenarios.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT: Custom Prompt */}
            {activeTab === 'custom' && (
              <div>
                {/* Test Mode Selector */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Select Security Test Mode:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setTestMode('live_ai')}
                      disabled={isLoading}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${testMode === 'live_ai' ? 'var(--accent-cyan)' : 'var(--border)'}`,
                        background: testMode === 'live_ai' ? 'rgba(34, 200, 245, 0.1)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={16} className={testMode === 'live_ai' ? 'text-accent-cyan' : 'text-tertiary'} />
                        <strong className="text-xs" style={{ color: testMode === 'live_ai' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                          Live AI Security Test
                        </strong>
                      </div>
                      <p className="text-xs m-0 text-secondary leading-tight" style={{ fontSize: '0.72rem' }}>
                        Full pipeline: firewall inspection + real AI generation & tool boundary execution.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTestMode('analysis_only')}
                      disabled={isLoading}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${testMode === 'analysis_only' ? 'var(--accent-cyan)' : 'var(--border)'}`,
                        background: testMode === 'analysis_only' ? 'rgba(34, 200, 245, 0.1)' : 'var(--surface)',
                        color: 'var(--text-primary)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        opacity: isLoading ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={16} className={testMode === 'analysis_only' ? 'text-accent-cyan' : 'text-tertiary'} />
                        <strong className="text-xs" style={{ color: testMode === 'analysis_only' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                          Local Security Engine (No External AI Required)
                        </strong>
                      </div>
                      <p className="text-xs m-0 text-secondary leading-tight" style={{ fontSize: '0.72rem' }}>
                        Air-gapped offline analysis: Unicode normalization, rules across 7 attack categories & canaries.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Prompt Toolbar & Editor */}
                <div className="form-group mb-3">
                  <div className="prompt-toolbar">
                    <label htmlFor="playground-prompt" className="text-xs font-semibold text-secondary flex items-center gap-1.5">
                      <Terminal size={13} className="text-accent-cyan" />
                      <span>Custom Prompt Input:</span>
                    </label>

                    <div className="prompt-toolbar-actions">
                      <button
                        type="button"
                        onClick={() => setActiveTab('examples')}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px', height: '26px' }}
                        title="Browse example attack scenarios"
                      >
                        <BookOpen size={12} />
                        <span>Load Example</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPrompt('');
                          setActiveScenario(null);
                          setValidationError(null);
                          setExecutionError(null);
                        }}
                        disabled={isLoading || !prompt}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px', height: '26px' }}
                        title="Clear prompt text"
                      >
                        <Trash2 size={12} />
                        <span>Clear</span>
                      </button>

                      <button
                        type="button"
                        disabled={!prompt}
                        onClick={() => {
                          if (!prompt) return;
                          navigator.clipboard.writeText(prompt);
                          showToast('Prompt copied to clipboard', 'info');
                        }}
                        className="btn btn-secondary text-xs"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px', height: '26px' }}
                        title="Copy prompt"
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>

                      <span
                        className={`text-xs mono ml-1 font-semibold ${
                          prompt.length > 50000 ? 'text-critical' : 'text-secondary'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {prompt.length.toLocaleString()} / 50,000 characters
                      </span>
                    </div>
                  </div>

                  <textarea
                    id="playground-prompt"
                    rows={8}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (validationError && e.target.value.trim()) setValidationError(null);
                      if (executionError) setExecutionError(null);
                    }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleExecute();
                      }
                    }}
                    placeholder="Type or paste your own prompt here..."
                    disabled={isLoading}
                    className="custom-prompt-textarea"
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--background, #0B1120)',
                      border: validationError ? '1px solid var(--color-critical)' : '1px solid var(--border)',
                      color: 'var(--text-primary, #F1F5F9)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      resize: 'vertical',
                      lineHeight: 1.5,
                      opacity: isLoading ? 0.6 : 1,
                      cursor: isLoading ? 'not-allowed' : 'text',
                    }}
                  />

                  {validationError && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-critical font-medium">
                      <AlertTriangle size={14} />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {executionError && (
                    <div 
                      className="flex items-center gap-1.5 mt-2 p-2.5 rounded text-xs text-critical font-medium" 
                      style={{ background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)' }}
                    >
                      <ShieldAlert size={14} className="shrink-0" />
                      <span>{executionError}</span>
                    </div>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={handleExecute}
                    disabled={isLoading}
                    style={{ padding: '0.75rem', fontSize: '0.88rem', gap: '8px' }}
                  >
                    {isLoading ? (
                      <>
                        <RotateCw size={15} className="animate-spin" />
                        <span>Evaluating Firewall & Security Defenses...</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} fill="currentColor" />
                        <span>
                          {testMode === 'analysis_only'
                            ? 'Run Local Security Analysis (No External AI API)'
                            : 'Run Security Test'}
                        </span>
                        <span className="mono text-xs opacity-70">(Ctrl + Enter)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPrompt('');
                      setActiveScenario(null);
                      setValidationError(null);
                      setExecutionError(null);
                    }}
                    disabled={isLoading || !prompt}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}
                    title="Clear input text"
                  >
                    Clear
                  </button>
                </div>

                {/* Expandable Advanced Options */}
                <div className="pt-3 border-t border-border">
                  <button
                    type="button"
                    className="text-xs text-accent-cyan flex items-center justify-between w-full font-medium bg-transparent border-none p-0 cursor-pointer"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    <span className="flex items-center gap-1.5">
                      {showAdvancedOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <strong>Advanced Options (System Prompt & Tool Gateway)</strong>
                    </span>
                    <span className="text-tertiary text-xs">
                      {showAdvancedOptions ? 'Hide' : 'Expand'}
                    </span>
                  </button>

                  {showAdvancedOptions && (
                    <div className="mt-3 space-y-3 p-3 rounded border border-border bg-surface">
                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1">
                          Agent System Prompt (Optional):
                        </label>
                        <textarea
                          rows={3}
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="System instructions (e.g. 'You are a financial analyst agent. Never disclose confidential client secrets.')"
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--background, #0B1120)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary, #F1F5F9)',
                            fontSize: '0.78rem',
                            fontFamily: 'var(--font-mono, monospace)',
                            resize: 'vertical',
                          }}
                        />
                      </div>

                      <div>
                        <label htmlFor="tool-select" className="text-xs font-semibold text-secondary flex items-center gap-1 mb-1">
                          <Wrench size={13} />
                          <span>Tool / MCP Boundary Action:</span>
                        </label>
                        <select
                          id="tool-select"
                          className="filter-select w-full"
                          value={selectedTool}
                          onChange={(e) => setSelectedTool(e.target.value)}
                          style={{ background: 'var(--background, #0B1120)', color: 'var(--text-primary, #F1F5F9)' }}
                        >
                          <option value="autonomous">Autonomous Model Tool Calling (MCP stdio server — model decides)</option>
                          <option value="get_system_health">Explicit MCP: get_system_health (System & Subsystem Diagnostics)</option>
                          <option value="get_recent_security_events">Explicit MCP: get_recent_security_events (Audit Event Log)</option>
                          <option value="inspect_agent_posture">Explicit MCP: inspect_agent_posture (Agent Security Posture)</option>
                          <option value="github_read_issues">GitHub MCP: github_read_issues (Read issues from allowlisted repo)</option>
                          <option value="github_list_repositories">GitHub MCP: github_list_repositories (List authorized repositories)</option>
                          <option value="execute_arbitrary_script">Restricted MCP: execute_arbitrary_script (Disallowed — Default-Deny)</option>
                          <option value="execute_shell">Restricted: execute_shell (OS Command — Denied by Policy)</option>
                          <option value="read_database">Sandbox: read_database (Privileged DB Query)</option>
                          <option value="fetch_url">Sandbox: fetch_url (Outbound Network Egress)</option>
                          <option value="send_notification">Sandbox: send_notification (Channel Dispatch)</option>
                          <option value="none">None (Tools Disabled / Plain LLM Chat)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Example Prompts */}
            {activeTab === 'examples' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-secondary font-medium">Attack Category Filter:</span>
                  <span className="text-xs text-tertiary font-mono">
                    {selectedCategory === 'all' ? `${scenarios.length} presets` : `${filteredScenarios.length} in category`}
                  </span>
                </div>

                {/* Category Pills */}
                <div className="playground-category-filters mb-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`category-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                    >
                      {cat === 'all' ? 'All Scenarios' : cat}
                    </button>
                  ))}
                </div>

                {/* Scrollable Scenario Presets */}
                <div className="scenario-presets-scrollable" style={{ maxHeight: '340px' }}>
                  {filteredScenarios.map((sc) => {
                    const isSelected = activeScenario === sc.id;
                    return (
                      <div
                        key={sc.id}
                        className="p-3 rounded border border-border bg-surface flex flex-col justify-between w-full hover:border-accent-cyan transition-colors"
                        style={{
                          borderColor: isSelected ? 'var(--accent-cyan)' : undefined,
                          background: isSelected ? 'rgba(34, 200, 245, 0.08)' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {sc.expected_decision === 'BLOCK' && <ShieldAlert size={14} className="text-critical shrink-0" />}
                            {sc.expected_decision === 'QUARANTINE' && <AlertTriangle size={14} className="text-warning shrink-0" />}
                            {sc.expected_decision === 'ALLOW' && <ShieldCheck size={14} className="text-safe shrink-0" />}
                            <strong className="text-xs text-white">{sc.title}</strong>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-tertiary">
                            {sc.category}
                          </span>
                        </div>
                        <p className="text-xs text-secondary mb-3 leading-snug">
                          {sc.description}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                          <span className="text-[11px] font-mono text-tertiary">
                            Expected: <strong className={sc.expected_decision === 'BLOCK' ? 'text-critical' : sc.expected_decision === 'QUARANTINE' ? 'text-warning' : 'text-safe'}>{sc.expected_decision}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyScenario(sc)}
                            className="btn btn-primary text-xs"
                            style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                          >
                            Load into Editor
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Defense Decision & Output Console */}
        <div className="glass-surface panel-container" style={{ borderRadius: 'var(--radius-md)' }}>
          <div className="panel-header">
            <div>
              <h2 className="text-base font-semibold">Firewall Decision & Telemetry</h2>
              <p className="text-xs text-tertiary">Inspection outcome, risk scoring, and model generation.</p>
            </div>
            {executionResult && (
              <span className="mono text-xs text-tertiary">{executionResult.latency_ms}ms total</span>
            )}
          </div>

          {renderOutputConsole()}
        </div>
      </div>
    </div>
  );
};

export default Playground;
