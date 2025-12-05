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

  delete: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    }),
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
  bulkSubmit: (formCode: string, data: BulkSubmitFormInput) =>
    api.post<BulkSubmitFormResult>(`/forms/${formCode}/bulk-submit`, data),
  getSubmissions: (formId: string) => api.get(`/forms/${formId}/submissions`),
  getStats: (formId?: string) =>
    api.get<FormSubmissionsStats>(`/forms/stats/summary${formId ? `?form_id=${formId}` : ''}`),
  getMonthlyStats: (formId: string, year?: number) =>
    api.get<FormMonthlyStats>(`/forms/${formId}/stats/monthly${year ? `?year=${year}` : ''}`),
  getDailyStats: (formId: string, year: number, month: number) =>
    api.get<FormDailyStats>(`/forms/${formId}/stats/daily?year=${year}&month=${month}`),
};

// Data Generator API
export const dataGeneratorApi = {
  run: (data: GenerateDataInput) => api.post<GenerateDataResult>('/data-generator/run', data),
  clear: (data: DeleteDataInput) => api.delete<DeleteDataResult>('/data-generator/clear', data),
  getStats: (targetTable?: string) =>
    api.get<DataGeneratorStats>(`/data-generator/stats${targetTable ? `?target_table=${targetTable}` : ''}`),
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

export interface BulkSubmitFormInput {
  session_id?: string;
  data: Record<string, unknown>[];
}

export interface BulkSubmitFormResult {
  batch_id: string;
  total_submitted: number;
  form_code: string;
  form_name: string;
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

export interface DeleteDataInput {
  target_table: 'transactions' | 'operational_events' | 'form_submissions' | 'all';
  only_simulator_data?: boolean;
  from_date?: string;
  to_date?: string;
}

export interface DeleteDataResult {
  success: boolean;
  deleted: {
    transactions_deleted: number;
    operational_events_deleted: number;
    form_submissions_deleted: number;
  };
}

export interface DataGeneratorStats {
  transactions?: {
    total: number;
    simulator_generated: number;
  };
  operational_events?: {
    total: number;
  };
}

export interface FormSubmissionsStats {
  form_submissions: {
    total: number;
    data_generator_generated: number;
  };
}

export interface MonthlyStatsData {
  month: string;
  monthIndex: number;
  total: number;
  count: number;
  avg: number;
  min: number;
  max: number;
  byType: Record<string, number>;
}

export interface FormMonthlyStats {
  year: number;
  months: MonthlyStatsData[];
  summary: {
    totalCount: number;
    totalValue: number;
    avgValue: number;
  };
}

export interface DailyStatsData {
  day: number;
  count: number;
  total: number;
  avg: number;
}

export interface FormDailyStats {
  year: number;
  month: number;
  days: DailyStatsData[];
}

// External APIs
export interface ExternalApi {
  id: string;
  name: string;
  code: string;
  description: string | null;
  apiType: string;
  baseUrl: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  authType: string | null;
  authConfig: Record<string, unknown>;
  requestBody: Record<string, unknown>;
  timeout: number;
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  environment: { id: string; name: string; code: string };
  form: { id: string; name: string; code: string } | null;
  createdAt: string;
}

export interface CreateExternalApiInput {
  environment_id: string;
  form_id?: string;
  name: string;
  code: string;
  description?: string;
  api_type?: string;
  base_url: string;
  endpoint: string;
  method?: string;
  headers?: Record<string, string>;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  request_body?: Record<string, unknown>;
  timeout?: number;
  enabled?: boolean;
}

export interface InvokeExternalApiInput {
  payload?: Record<string, unknown>;
  extra_headers?: Record<string, string>;
}

export interface InvokeExternalApiResult {
  success: boolean;
  status: string;
  latency_ms: number;
  response: unknown;
  error: string | null;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | null;
  };
}

export const externalApisApi = {
  list: (environmentId?: string) =>
    api.get<ExternalApi[]>(`/external-apis${environmentId ? `?environment_id=${environmentId}` : ''}`),
  get: (id: string) => api.get<ExternalApi>(`/external-apis/${id}`),
  getByForm: (formId: string) => api.get<ExternalApi[]>(`/external-apis/by-form/${formId}`),
  create: (data: CreateExternalApiInput) => api.post<ExternalApi>('/external-apis', data),
  update: (id: string, data: Partial<CreateExternalApiInput>) =>
    api.put<ExternalApi>(`/external-apis/${id}`, data),
  delete: (id: string) => api.delete(`/external-apis/${id}`),
  invoke: (id: string, data?: InvokeExternalApiInput) =>
    api.post<InvokeExternalApiResult>(`/external-apis/${id}/invoke`, data || {}),
  test: (id: string) => api.post<InvokeExternalApiResult>(`/external-apis/${id}/test`),
};
