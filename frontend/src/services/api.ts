// In Vite dev, call same-origin /api so cookies stay first-party and the
// browser is not blocked by localhost vs 127.0.0.1 CORS. Production builds
// still use VITE_API_BASE_URL (e.g. the Render API).
const API_ORIGIN = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
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
    // Unauthorized -> redirect to login
    if (!suppressAuthRedirect && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (res.status === 403) {
    // Forbidden -> RBAC or IDOR violation
    if (!suppressAuthRedirect && window.location.pathname !== '/403') {
      window.location.href = '/403';
    }
    const error = new Error('Access Denied') as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  if (!res.ok) {
    const error = new Error(`API Error: ${res.status} ${res.statusText}`) as Error & { status?: number };
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

export const createHoneyToken = async (agentId: string): Promise<HoneyToken> => {
  return apiFetch('/honeytokens', {
    method: 'POST',
    suppressAuthRedirect: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, scope: 'system_prompt', token_type: 'api_key' }),
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

export const fetchCurrentUser = async (): Promise<{ email: string; role: string }> => {
  return apiFetch(`/auth/me`);
};
