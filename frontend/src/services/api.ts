// In Vite dev, call same-origin /api so cookies stay first-party and the
// browser is not blocked by localhost vs 127.0.0.1 CORS. Production builds
// still use VITE_API_BASE_URL (e.g. the Render API).
const API_ORIGIN = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '');
const API_BASE = `${API_ORIGIN}/api/v1`;

export interface DashboardStats {
  total_agents: number;
  active_agents: number;
  isolated_agents: number;
  total_security_events: number;
  open_alerts: number;
  critical_alerts: number;
  blocked_events: number;
  quarantined_events: number;
  honeytoken_triggers: number;
}

export interface SecurityEvent {
  id: string;
  agent_id: string;
  event_type: string;
  severity: string;
  source: string;
  risk_score: number;
  action: string;
  created_at: string;
  evidence?: {
    content_snippet?: string;
    reason?: string;
    metadata?: Record<string, any>;
  };
}

export interface Alert {
  id: string;
  security_event_id: string;
  agent_id: string;
  severity: string;
  status: string;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  status: string;
  risk_score: number;
  created_at: string;
  semantic_similarity?: number;
  confidence?: number;
  detector_status?: string;
}

export interface HoneyToken {
  id: string;
  agent_id: string;
  scope: string;
  token_type: string;
  value: string;
  status: string;
  created_at: string;
  is_triggered: boolean;
  trigger_count: number;
  last_triggered_at?: string;
}

export interface IngestionResult {
  id: string;
  agent_id: string;
  decision: string;
  risk_score: number;
  reason: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ContextResult {
  context: string;
}

export interface EgressResult {
  status: string;
  message: string;
}

export interface AIAlertTriageResult {
  alert_id: string;
  provider: string;
  risk_assessment: string;
  recommended_action: string;
  confidence_score: number;
  containment_steps: string[];
  analysis_summary: string;
}

export interface AIEventExplanation {
  event_id: string;
  provider: string;
  threat_name: string;
  severity_rating: string;
  technical_explanation: string;
  attacker_intent: string;
  mitigation_guidance: string;
  iocs_identified: string[];
}

export interface SystemStatusResponse {
  status: string;
  timestamp: string;
  version: string;
  subsystems: {
    database: { status: string; engine: string; error?: string };
    ai_service: { provider: string; model: string; healthy: boolean; fallback_available: boolean; configured_provider?: string };
    semantic_firewall: { status: string; engine: string; ready: boolean };
    egress_gateway: { status: string; active_honeytokens: number };
  };
  metrics: {
    total_agents: number;
    isolated_agents: number;
    total_events: number;
    open_alerts: number;
  };
}

type ApiFetchOptions = RequestInit & { suppressAuthRedirect?: boolean };

// Utility to read a cookie by name
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Custom fetch wrapper for credentials, CSRF, and intercepting 401/403
export async function apiFetch(url: string, options: ApiFetchOptions = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const { suppressAuthRedirect = false, ...requestOptions } = options;
  
  const isMutatingRequest = requestOptions.method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(requestOptions.method.toUpperCase());
  
  const headers = new Headers(requestOptions.headers || {});
  
  if (isMutatingRequest) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const mergedOptions: RequestInit = {
    ...requestOptions,
    headers,
    credentials: 'include' // Important for sending/receiving HttpOnly cookies
  };

  const res = await fetch(fullUrl, mergedOptions);

  if (res.status === 401) {
    if (!suppressAuthRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.detail || 'Unauthorized';
    const error = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)) as Error & { status?: number };
    error.status = 401;
    throw error;
  }

  if (res.status === 403) {
    if (!suppressAuthRedirect && window.location.pathname !== '/403') {
      window.location.href = '/403';
    }
    const errBody = await res.json().catch(() => null);
    const msg = errBody?.detail || 'Access Denied';
    const error = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)) as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    let msg = `API Error: ${res.status} ${res.statusText}`;
    if (errBody?.detail) {
      msg = typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail);
    }
    const error = new Error(msg) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  return apiFetch(`/dashboard/stats`);
};

export const fetchRecentEvents = async (limit: number = 10, offset: number = 0): Promise<SecurityEvent[]> => {
  return apiFetch(`/security-events?limit=${limit}&offset=${offset}`);
};

export const fetchRecentAlerts = async (limit: number = 10, offset: number = 0): Promise<Alert[]> => {
  return apiFetch(`/alerts?limit=${limit}&offset=${offset}`);
};

export const fetchRecentAgents = async (limit: number = 50, offset: number = 0): Promise<Agent[]> => {
  return apiFetch(`/agents?limit=${limit}&offset=${offset}`);
};

export const isolateAgent = async (agentId: string): Promise<Agent> => {
  return apiFetch(`/agents/${agentId}/isolate`, {
    method: 'POST',
  });
};

export const restoreAgent = async (agentId: string): Promise<Agent> => {
  return apiFetch(`/agents/${agentId}/restore`, {
    method: 'POST',
  });
};

export const fetchAgentDetails = async (agentId: string): Promise<Agent> => {
  return apiFetch(`/agents/${agentId}`);
};

export const fetchHoneyTokens = async (): Promise<HoneyToken[]> => {
  return apiFetch(`/honeytokens`);
};

export const createAgent = async (name: string): Promise<Agent> => {
  return apiFetch('/agents', {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, status: 'active', risk_score: 0 }),
  });
};

export const ingestDemoContent = async (agentId: string, content: string): Promise<IngestionResult> => {
  return apiFetch('/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      content,
      source_type: 'demo',
      provenance: { label: 'Guided Security Demo' },
    }),
  });
};

export const createHoneyToken = async (
  agentId: string,
  scope: string = 'system_prompt',
  token_type: string = 'api_key'
): Promise<HoneyToken> => {
  return apiFetch('/honeytokens', {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, scope, token_type }),
  });
};

export const fetchAgentContext = async (agentId: string): Promise<ContextResult> => {
  return apiFetch(`/agents/${agentId}/context`);
};

export const submitEgress = async (agentId: string, payload: string): Promise<EgressResult> => {
  return apiFetch(`/agents/${agentId}/egress`, {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination_url: 'https://demo.invalid/exfiltration', payload }),
  });
};

export const resetGuidedDemo = async (): Promise<{ deleted_agents: number }> => {
  return apiFetch('/demo/reset', { method: 'POST', suppressAuthRedirect: true });
};

export const fetchAgentEvents = async (agentId: string): Promise<SecurityEvent[]> => {
  return apiFetch(`/security-events?agent_id=${encodeURIComponent(agentId)}&limit=50&offset=0`);
};

export const fetchAgentAlerts = async (agentId: string): Promise<Alert[]> => {
  const alerts = await fetchRecentAlerts(100, 0);
  return alerts.filter((alert) => alert.agent_id === agentId);
};

export const rotateHoneyToken = async (token: HoneyToken): Promise<{ message?: string; value?: string }> => {
  return apiFetch('/honeytokens/rotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: token.agent_id, scope: token.scope, token_type: token.token_type }),
  });
};

export const fetchAllEvents = async (limit: number = 50, offset: number = 0): Promise<SecurityEvent[]> => {
  return apiFetch(`/security-events?limit=${limit}&offset=${offset}`);
};

export const fetchAllAlerts = async (limit: number = 50, offset: number = 0): Promise<Alert[]> => {
  return apiFetch(`/alerts?limit=${limit}&offset=${offset}`);
};

export const updateAlertStatus = async (alertId: string, status: string): Promise<Alert> => {
  return apiFetch(`/alerts/${alertId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
};

export const triageAlert = async (alertId: string): Promise<AIAlertTriageResult> => {
  return apiFetch(`/alerts/${alertId}/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};

export const explainSecurityEvent = async (eventId: string): Promise<AIEventExplanation> => {
  return apiFetch(`/security-events/${eventId}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};

export const fetchSystemStatus = async (): Promise<SystemStatusResponse> => {
  return apiFetch('/system/status');
};

export const registerUser = async (email: string, password: string): Promise<{ message: string; email: string }> => {
  return apiFetch('/auth/register', {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
};

export const loginFirebase = async (idToken: string): Promise<{ message: string; email: string }> => {
  return apiFetch('/auth/firebase-login', {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
};

export const fetchCurrentUser = async (): Promise<{ email: string; role: string }> => {
  return apiFetch(`/auth/me`);
};

export const parseEventMetadata = (event: SecurityEvent) => {
  let category = '-';
  let detector = '-';
  if (event.evidence && typeof event.evidence.metadata === 'object' && event.evidence.metadata !== null) {
    const metadata = event.evidence.metadata;
    const detectors = Object.keys(metadata);
    if (detectors.length > 0) {
      detector = detectors.map((name) => name.replace('Detector', '')).join(', ');
      const categories = detectors.map((name) => (metadata as Record<string, any>)[name]?.category).filter((value) => value && value !== 'safe');
      if (categories.length > 0) category = Array.from(new Set(categories)).join(', ');
    }
  }
  return { category, detector };
};

export interface AIProviderInfo {
  id: string;
  provider_name: string;
  display_name: string;
  model: string;
  status: string;
  is_configured: boolean;
  is_active_default: boolean;
  latency_ms?: number;
  message?: string;
}

export interface PipelineStageTrace {
  stage: string;
  name: string;
  status: string;
  latency_ms: number;
  details?: string;
  risk_score?: number;
  detectors?: Record<string, any>;
}

export interface MatchedRuleDetail {
  rule_id: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  name: string;
  description: string;
  score: number;
  matched_excerpt: string;
  mitigation: string;
  version?: string;
}

export interface LocalEngineDetails {
  engine_name: string;
  mode: string;
  detected: boolean;
  risk_score: number;
  risk_band: 'LOW' | 'SUSPICIOUS' | 'HIGH' | string;
  primary_category: string;
  recommended_action: 'ALLOW' | 'QUARANTINE' | 'BLOCK' | string;
  matched_rules: MatchedRuleDetail[];
  matched_indicators: string[];
  transformations_applied: string[];
  decoded_payloads: Array<{ encoding: string; decoded_payload: string }>;
  coverage_limitation: string;
  metadata?: Record<string, any>;
}

export interface PlaygroundExecutionResponse {
  execution_id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  prompt: string;
  provider: string;
  model: string;
  test_mode?: 'live_ai' | 'analysis_only' | string;
  decision: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  risk_score: number;
  defense_score?: number;
  defense_status?: 'PASSED' | 'FAILED' | 'WARNING' | 'INCONCLUSIVE' | string;
  defense_summary?: string;
  defense_recommendations?: string[];
  reason: string;
  latency_ms: number;
  ai_response?: string;
  tool_execution?: {
    tool: string;
    status: 'AUTHORIZED' | 'DENIED' | 'VALIDATION_ERROR' | 'UNAVAILABLE' | 'EXECUTION_ERROR' | string;
    reason?: string;
    output?: any;
    mcp_server?: string;
    arguments?: any;
    invoked_by?: string;
  };
  model_tool_calls?: Array<{
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: any };
  }>;
  security_event_id?: string;
  alert_id?: string;
  forensic_explanation?: string;
  detector_breakdown?: Record<string, any>;
  local_engine_details?: LocalEngineDetails;
  pipeline_trace: PipelineStageTrace[];
}

export interface ScenarioPreset {
  id: string;
  title: string;
  description: string;
  category: string;
  expected_decision: string;
  badge_variant: string;
  prompt: string;
  system_prompt?: string;
  requested_tool?: {
    name: string;
    arguments: Record<string, any>;
  };
  judge_notes: string;
}

export const fetchAIProviders = async (): Promise<AIProviderInfo[]> => {
  return apiFetch('/playground/providers');
};

export const testAIProvider = async (provider: string): Promise<Record<string, any>> => {
  return apiFetch('/playground/providers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
};

export const fetchPlaygroundScenarios = async (): Promise<ScenarioPreset[]> => {
  return apiFetch('/playground/scenarios');
};

export const executePlaygroundRequest = async (payload: {
  prompt: string;
  test_mode?: 'live_ai' | 'analysis_only';
  provider?: string;
  agent_id?: string;
  system_prompt?: string;
  requested_tool?: { name: string; arguments?: Record<string, any> };
  enable_mcp_tools?: boolean;
  max_iterations?: number;
}): Promise<PlaygroundExecutionResponse> => {
  return apiFetch('/playground/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const approveQuarantinedEvent = async (eventId: string): Promise<{ status: string; decision: string; reviewer: string }> => {
  return apiFetch(`/playground/approve/${eventId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
};

export interface PolicyRule {
  rule_id: string;
  category: string;
  name: string;
  description: string;
  severity: string;
  base_score: number;
  mitigation: string;
  version: string;
  pattern_count: number;
  negative_context_count: number;
  status: string;
  enforcement: 'BLOCK' | 'QUARANTINE' | 'ALLOW' | string;
}

export interface AuthorizedToolPolicy {
  server: string;
  tool_name: string;
  capability: string;
  read_only: boolean;
  max_timeout_sec: number;
  status: string;
}

export interface SecurityPoliciesResponse {
  framework: string;
  thresholds: {
    block_threshold: number;
    quarantine_threshold: number;
    allow_threshold: number;
    description: string;
  };
  engine_mode: string;
  rules_count: number;
  rules: PolicyRule[];
  tool_authorization: {
    default_action: string;
    enforcement_mode: string;
    disallowed_argument_patterns: string[];
    authorized_tools: AuthorizedToolPolicy[];
  };
  canary_mesh_policy: {
    strategy: string;
    leak_action: string;
    token_types: string[];
    rotation_interval_days: number;
  };
}

export const fetchSecurityPolicies = async (): Promise<SecurityPoliciesResponse> => {
  return apiFetch('/policies');
};

