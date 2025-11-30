import { useAuthStore } from '../stores/auth.store';

const API_BASE = '/api/v1/simulator';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/auth/login',
      { email, password },
      { skipAuth: true },
    ),
};

// Environments API
export const environmentsApi = {
  list: () => api.get<Environment[]>('/environments'),
  create: (data: CreateEnvironmentInput) => api.post<Environment>('/environments', data),
  update: (id: string, data: Partial<CreateEnvironmentInput>) => api.put<Environment>(`/environments/${id}`, data),
  delete: (id: string) => api.delete(`/environments/${id}`),
};

// Scenarios API
export const scenariosApi = {
  list: (environmentId?: string) =>
    api.get<Scenario[]>(`/scenarios${environmentId ? `?environment_id=${environmentId}` : ''}`),
  create: (data: CreateScenarioInput) => api.post<Scenario>('/scenarios', data),
  update: (id: string, data: Partial<CreateScenarioInput>) => api.put<Scenario>(`/scenarios/${id}`, data),
  delete: (id: string) => api.delete(`/scenarios/${id}`),
};

// Chat API
export const chatApi = {
  createSession: (data: CreateChatSessionInput) => api.post<ChatSession>('/chat/sessions', data),
  getSessions: (environmentId?: string) =>
    api.get<ChatSession[]>(`/chat/sessions${environmentId ? `?environment_id=${environmentId}` : ''}`),
  getSession: (id: string) => api.get<ChatSession>(`/chat/sessions/${id}`),
  sendMessage: (sessionId: string, data: SendMessageInput) =>
    api.post<{ message_id: string; correlation_id: string }>(`/chat/sessions/${sessionId}/messages`, data),
  closeSession: (sessionId: string) => api.post(`/chat/sessions/${sessionId}/close`),
};

// Forms API
export const formsApi = {
  list: (environmentId?: string) =>
    api.get<FormDefinition[]>(`/forms${environmentId ? `?environment_id=${environmentId}` : ''}`),
  get: (id: string) => api.get<FormDefinition>(`/forms/${id}`),
  create: (data: CreateFormInput) => api.post<FormDefinition>('/forms', data),
  update: (id: string, data: Partial<CreateFormInput>) => api.put<FormDefinition>(`/forms/${id}`, data),
  delete: (id: string) => api.delete(`/forms/${id}`),
  submit: (formCode: string, data: SubmitFormInput) => api.post(`/forms/${formCode}/submit`, data),
};

// Data Generator API
export const dataGeneratorApi = {
  run: (data: GenerateDataInput) => api.post<GenerateDataResult>('/data-generator/run', data),
};

// Semantic Domain API
export const semanticDomainApi = {
  generate: (data: GenerateDomainInput) => api.post<GenerateDomainResult>('/semantic-domain/generate', data),
  getConcepts: (domain?: string) =>
    api.get<DomainConcept[]>(`/semantic-domain/concepts${domain ? `?domain=${domain}` : ''}`),
  getOntology: (domain: string) => api.get<OntologyGraph>(`/semantic-domain/ontology/${domain}`),
};

// Simulated APIs
export const simulatedApisApi = {
  list: (environmentId?: string) =>
    api.get<ApiEndpoint[]>(`/sim-apis${environmentId ? `?environment_id=${environmentId}` : ''}`),
  get: (id: string) => api.get<ApiEndpoint>(`/sim-apis/${id}`),
  create: (data: CreateApiEndpointInput) => api.post<{ id: string; full_url: string }>('/sim-apis', data),
  update: (id: string, data: Partial<CreateApiEndpointInput>) => api.put<ApiEndpoint>(`/sim-apis/${id}`, data),
  delete: (id: string) => api.delete(`/sim-apis/${id}`),
  getLogs: (id: string) => api.get<ApiCallLog[]>(`/sim-apis/${id}/logs`),
};

// Events API
export const eventsApi = {
  trigger: (data: TriggerEventInput) => api.post<TriggerEventResult>('/events/trigger', data),
};

// Observability API
export const observabilityApi = {
  getDashboard: (environmentId?: string) =>
    api.get<DashboardMetrics>(`/observability/dashboard${environmentId ? `?environment_id=${environmentId}` : ''}`),
  getExecutions: (params?: { environment_id?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.environment_id) searchParams.set('environment_id', params.environment_id);
    if (params?.status) searchParams.set('status', params.status);
    return api.get<Execution[]>(`/observability/executions?${searchParams}`);
  },
  getExecution: (id: string) => api.get<Execution>(`/observability/executions/${id}`),
  getCalls: (params?: { environment_id?: string; correlation_id?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.environment_id) searchParams.set('environment_id', params.environment_id);
    if (params?.correlation_id) searchParams.set('correlation_id', params.correlation_id);
    return api.get<OrchestratorCall[]>(`/observability/calls?${searchParams}`);
  },
  getLatencyDistribution: (environmentId?: string) =>
    api.get<{ label: string; count: number }[]>(
      `/observability/latency-distribution${environmentId ? `?environment_id=${environmentId}` : ''}`,
    ),
};

// Types
export interface Environment {
  id: string;
  name: string;
  code: string;
  orchestratorBaseUrl: string | null;
  workerBaseUrl: string | null;
  authType: string | null;
  authConfig: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEnvironmentInput {
  name: string;
  code: string;
  orchestrator_base_url?: string;
  worker_base_url?: string;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  tags: string[];
  environment: { id: string; name: string; code: string };
  createdAt: string;
}

export interface CreateScenarioInput {
  environment_id: string;
  name: string;
  code?: string;
  description?: string;
  tags?: string[];
}

export interface ChatSession {
  id: string;
  externalSessionId: string | null;
  status: string;
  metadata: Record<string, unknown>;
  environment: { id: string; name: string; code: string };
  scenario: { id: string; name: string; code: string } | null;
  orchestratorCalls?: OrchestratorCall[];
  messages?: ChatMessage[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  type: string;
  content: string | null;
  payload: Record<string, unknown>;
  correlationId: string | null;
  createdAt: string;
}

export interface CreateChatSessionInput {
  environment_id: string;
  scenario_id?: string;
  external_session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageInput {
  type?: string;
  content: string;
  payload?: Record<string, unknown>;
}

export interface FormDefinition {
  id: string;
  name: string;
  code: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  environment: { id: string; name: string; code: string };
  createdAt: string;
}

export interface CreateFormInput {
  environment_id: string;
  name: string;
  code: string;
  schema: Record<string, unknown>;
  ui_schema?: Record<string, unknown>;
}

export interface SubmitFormInput {
  session_id?: string;
  data: Record<string, unknown>;
}

export interface GenerateDataInput {
  environment_id?: string;
  scenario_id?: string;
  target_table: 'transactions' | 'operational_events';
  rows: number;
  distributions?: Record<string, { type: string; params?: Record<string, number> }>;
  seasonality?: boolean;
  anomalies?: { enabled?: boolean; count?: number; types?: string[] };
}

export interface GenerateDataResult {
  generated_rows: number;
  preview_sample: Record<string, unknown>[];
}

export interface GenerateDomainInput {
  environment_id?: string;
  domain: string;
  language?: string;
  include_synonyms?: boolean;
  include_relations?: boolean;
}

export interface GenerateDomainResult {
  concepts_created: number;
  relations_created: number;
  synonyms_created: number;
}

export interface DomainConcept {
  id: string;
  domain: string;
  code: string;
  label: string | null;
  description: string | null;
  synonyms: { term: string; language: string }[];
}

export interface OntologyGraph {
  nodes: { id: string; code: string; label: string }[];
  edges: { from: string; to: string; type: string }[];
}

export interface ApiEndpoint {
  id: string;
  method: string;
  path: string;
  responseTemplate: Record<string, unknown>;
  statusCode: number;
  latencyMs: number;
  errorRate: number;
  enabled: boolean;
  environment: { id: string; name: string; code: string };
  createdAt: string;
}

export interface CreateApiEndpointInput {
  environment_id: string;
  scenario_id?: string;
  method: string;
  path: string;
  response_template?: Record<string, unknown>;
  status_code?: number;
  latency_ms?: number;
  error_rate?: number;
  script?: string;
}

export interface ApiCallLog {
  id: string;
  requestMethod: string;
  requestPath: string;
  responseStatus: number;
  latencyMs: number;
  errorInjected: boolean;
  createdAt: string;
}

export interface TriggerEventInput {
  environment_id: string;
  scenario_id?: string;
  event_type: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface TriggerEventResult {
  success: boolean;
  event_id: string;
  correlation_id: string;
  orchestrator_call_id: string;
}

export interface DashboardMetrics {
  totalScenarios: number;
  totalExecutions: number;
  totalCalls: number;
  errorRate: number;
  latency: { avg: number; max: number; min: number };
  executionsByStatus: { status: string; count: number }[];
  recentExecutions: { id: string; runId: string; scenario: string; status: string; startedAt: string }[];
}

export interface Execution {
  id: string;
  orchestratorRunId: string | null;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  metrics: Record<string, unknown>;
  environment: { id: string; name: string; code: string } | null;
  scenario: { id: string; name: string; code: string } | null;
  orchestratorCalls?: OrchestratorCall[];
}

export interface OrchestratorCall {
  id: string;
  direction: string;
  endpoint: string;
  method: string;
  responseStatus: number | null;
  latencyMs: number | null;
  errorFlag: boolean;
  correlationId: string | null;
  createdAt: string;
}
