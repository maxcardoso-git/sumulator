import { useState } from 'react';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Tabs,
  Code,
  CopyButton,
  ActionIcon,
  Tooltip,
  Badge,
  Accordion,
  Box,
  Select,
  Alert,
  Divider,
  ThemeIcon,
  ScrollArea,
} from '@mantine/core';
import {
  IconCopy,
  IconCheck,
  IconApi,
  IconLock,
  IconMessage,
  IconForms,
  IconDatabase,
  IconBrain,
  IconChartBar,
  IconServer,
  IconTestPipe,
  IconInfoCircle,
  IconBolt,
} from '@tabler/icons-react';

const API_BASE_URL = 'http://72.61.52.70:4001/api/v1/simulator';

interface CodeExample {
  curl: string;
  javascript: string;
  python: string;
}

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  roles?: string[];
  requestBody?: Record<string, unknown>;
  responseExample?: unknown;
  queryParams?: { name: string; type: string; required: boolean; description: string }[];
}

const methodColors: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
};

function generateCodeExamples(endpoint: EndpointDoc, token = 'SEU_ACCESS_TOKEN'): CodeExample {
  const fullUrl = `${API_BASE_URL}${endpoint.path}`;
  const hasBody = endpoint.requestBody && ['POST', 'PUT'].includes(endpoint.method);
  const bodyJson = hasBody ? JSON.stringify(endpoint.requestBody, null, 2) : '';

  const curl = `# ${endpoint.description}
curl -X ${endpoint.method} "${fullUrl}" \\
  -H "Content-Type: application/json"${endpoint.auth ? ` \\
  -H "Authorization: Bearer ${token}"` : ''}${hasBody ? ` \\
  -d '${bodyJson}'` : ''}`;

  const javascript = `// ${endpoint.description}
const response = await fetch("${fullUrl}", {
  method: "${endpoint.method}",
  headers: {
    "Content-Type": "application/json",${endpoint.auth ? `
    "Authorization": \`Bearer \${accessToken}\`,` : ''}
  },${hasBody ? `
  body: JSON.stringify(${bodyJson}),` : ''}
});

const data = await response.json();
console.log(data);`;

  const python = `# ${endpoint.description}
import requests

url = "${fullUrl}"
headers = {
    "Content-Type": "application/json",${endpoint.auth ? `
    "Authorization": f"Bearer {access_token}",` : ''}
}${hasBody ? `
payload = ${bodyJson}` : ''}

response = requests.${endpoint.method.toLowerCase()}(url, headers=headers${hasBody ? ', json=payload' : ''})
data = response.json()
print(data)`;

  return { curl, javascript, python };
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <Box pos="relative">
      <CopyButton value={code}>
        {({ copied, copy }) => (
          <ActionIcon
            pos="absolute"
            top={8}
            right={8}
            variant="subtle"
            color={copied ? 'green' : 'gray'}
            onClick={copy}
            style={{ zIndex: 1 }}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        )}
      </CopyButton>
      <ScrollArea>
        <Code block p="md" style={{ backgroundColor: '#1a1b26', color: '#a9b1d6', fontSize: '13px' }}>
          {code}
        </Code>
      </ScrollArea>
      <Text size="xs" c="dimmed" mt={4}>
        {language}
      </Text>
    </Box>
  );
}

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  const [language, setLanguage] = useState<string>('curl');
  const examples = generateCodeExamples(endpoint);

  return (
    <Paper withBorder p="md" mb="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <Badge color={methodColors[endpoint.method]} size="lg" variant="filled">
              {endpoint.method}
            </Badge>
            <Code fz="md">{endpoint.path}</Code>
            <CopyButton value={`${API_BASE_URL}${endpoint.path}`}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copiado!' : 'Copiar URL'}>
                  <ActionIcon size="sm" variant="subtle" onClick={copy}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
          {endpoint.auth && (
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="yellow">
                <IconLock size={12} />
              </ThemeIcon>
              <Text size="xs" c="dimmed">
                Requer autenticação
                {endpoint.roles && ` (${endpoint.roles.join(', ')})`}
              </Text>
            </Group>
          )}
        </Group>

        <Text c="dimmed">{endpoint.description}</Text>

        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
          <Box>
            <Text fw={500} size="sm" mb="xs">
              Query Parameters:
            </Text>
            <Stack gap="xs">
              {endpoint.queryParams.map((param) => (
                <Group key={param.name} gap="xs">
                  <Code>{param.name}</Code>
                  <Badge size="xs" color={param.required ? 'red' : 'gray'}>
                    {param.required ? 'obrigatório' : 'opcional'}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    ({param.type}) - {param.description}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Box>
        )}

        {endpoint.requestBody && (
          <Box>
            <Text fw={500} size="sm" mb="xs">
              Request Body:
            </Text>
            <CodeBlock code={JSON.stringify(endpoint.requestBody, null, 2)} language="JSON" />
          </Box>
        )}

        {endpoint.responseExample && (
          <Box>
            <Text fw={500} size="sm" mb="xs">
              Response Example:
            </Text>
            <CodeBlock code={JSON.stringify(endpoint.responseExample, null, 2)} language="JSON" />
          </Box>
        )}

        <Box>
          <Group justify="space-between" mb="xs">
            <Text fw={500} size="sm">
              Exemplos de Código:
            </Text>
            <Select
              size="xs"
              w={120}
              value={language}
              onChange={(v) => setLanguage(v || 'curl')}
              data={[
                { value: 'curl', label: 'cURL' },
                { value: 'javascript', label: 'JavaScript' },
                { value: 'python', label: 'Python' },
              ]}
            />
          </Group>
          <CodeBlock
            code={examples[language as keyof CodeExample]}
            language={language === 'curl' ? 'Bash' : language === 'javascript' ? 'JavaScript' : 'Python'}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

// API Documentation Data
const authEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/auth/login',
    description: 'Autenticar usuário e obter token JWT',
    auth: false,
    requestBody: {
      email: 'seu-email@example.com',
      password: 'sua-senha',
    },
    responseExample: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'uuid',
        name: 'Nome do Usuário',
        email: 'email@example.com',
        role: 'ADMIN',
      },
    },
  },
];

const environmentEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/environments',
    description: 'Listar todos os ambientes configurados',
    auth: true,
    responseExample: [
      {
        id: 'uuid',
        name: 'Development',
        code: 'DEV',
        orchestratorBaseUrl: 'http://localhost:3000/api/v1/orchestrator',
        workerBaseUrl: 'http://localhost:3001/api/v1/worker',
        authType: 'bearer',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    method: 'POST',
    path: '/environments',
    description: 'Criar novo ambiente',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      name: 'Production',
      code: 'PROD',
      orchestrator_base_url: 'https://orchestrator.example.com/api/v1',
      worker_base_url: 'https://worker.example.com/api/v1',
      auth_type: 'bearer',
      auth_config: { api_key: 'your-api-key' },
    },
    responseExample: {
      id: 'uuid',
      name: 'Production',
      code: 'PROD',
      orchestratorBaseUrl: 'https://orchestrator.example.com/api/v1',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
];

const scenarioEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/scenarios',
    description: 'Listar todos os cenários de teste',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
    ],
    responseExample: [
      {
        id: 'uuid',
        name: 'Cenário de Teste',
        code: 'TEST_001',
        description: 'Descrição do cenário',
        tags: ['tag1', 'tag2'],
        environment: { id: 'uuid', name: 'DEV', code: 'DEV' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    method: 'POST',
    path: '/scenarios',
    description: 'Criar novo cenário de teste',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      name: 'Novo Cenário',
      code: 'SCENARIO_001',
      description: 'Descrição do cenário',
      tags: ['teste', 'integração'],
    },
    responseExample: {
      id: 'uuid',
      name: 'Novo Cenário',
      code: 'SCENARIO_001',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
];

const chatEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/chat/sessions',
    description: 'Criar nova sessão de chat',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      scenario_id: 'uuid-do-cenario',
      external_session_id: 'session-externa-123',
      metadata: { canal: 'whatsapp', cliente_id: '12345' },
    },
    responseExample: {
      id: 'uuid',
      externalSessionId: 'session-externa-123',
      status: 'active',
      metadata: { canal: 'whatsapp', cliente_id: '12345' },
      environment: { id: 'uuid', name: 'DEV', code: 'DEV' },
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
  {
    method: 'GET',
    path: '/chat/sessions',
    description: 'Listar sessões de chat',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
    ],
  },
  {
    method: 'GET',
    path: '/chat/sessions/:id',
    description: 'Obter detalhes de uma sessão de chat',
    auth: true,
    responseExample: {
      id: 'uuid',
      externalSessionId: 'session-123',
      status: 'active',
      messages: [
        {
          id: 'uuid',
          direction: 'inbound',
          type: 'text',
          content: 'Olá, preciso de ajuda',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
      orchestratorCalls: [],
    },
  },
  {
    method: 'POST',
    path: '/chat/sessions/:sessionId/messages',
    description: 'Enviar mensagem na sessão de chat',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      type: 'text',
      content: 'Mensagem do usuário',
      payload: { extra_data: 'valor' },
    },
    responseExample: {
      message_id: 'uuid',
      correlation_id: 'corr-uuid',
    },
  },
  {
    method: 'POST',
    path: '/chat/sessions/:sessionId/close',
    description: 'Encerrar sessão de chat',
    auth: true,
    roles: ['ADMIN', 'DEV'],
  },
];

const formsEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/forms',
    description: 'Listar definições de formulários',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
    ],
    responseExample: [
      {
        id: 'uuid',
        name: 'Formulário de Cadastro',
        code: 'cadastro-cliente',
        schema: { type: 'object', properties: {} },
        uiSchema: {},
        environment: { id: 'uuid', name: 'DEV', code: 'DEV' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    method: 'POST',
    path: '/forms',
    description: 'Criar definição de formulário',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      name: 'Formulário de Contato',
      code: 'form-contato',
      schema: {
        type: 'object',
        properties: {
          nome: { type: 'string', title: 'Nome Completo' },
          email: { type: 'string', format: 'email', title: 'E-mail' },
          mensagem: { type: 'string', title: 'Mensagem' },
        },
        required: ['nome', 'email'],
      },
      ui_schema: {
        mensagem: { 'ui:widget': 'textarea' },
      },
    },
    responseExample: {
      id: 'uuid',
      name: 'Formulário de Contato',
      code: 'form-contato',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
  {
    method: 'POST',
    path: '/forms/:formCode/submit',
    description: 'Submeter dados para um formulário',
    auth: true,
    requestBody: {
      session_id: 'uuid-da-sessao',
      data: {
        nome: 'João Silva',
        email: 'joao@example.com',
        mensagem: 'Gostaria de mais informações',
      },
    },
    responseExample: {
      id: 'uuid',
      formId: 'uuid',
      data: { nome: 'João Silva', email: 'joao@example.com' },
      status: 'submitted',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
];

const simulatedApisEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/sim-apis',
    description: 'Listar endpoints de API simulados',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
    ],
    responseExample: [
      {
        id: 'uuid',
        method: 'GET',
        path: '/api/clientes/:id',
        responseTemplate: { id: '{{request.params.id}}', nome: 'Cliente Exemplo' },
        statusCode: 200,
        latencyMs: 100,
        errorRate: 5,
        enabled: true,
        environment: { id: 'uuid', name: 'DEV', code: 'DEV' },
      },
    ],
  },
  {
    method: 'POST',
    path: '/sim-apis',
    description: 'Criar endpoint de API simulado',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      method: 'POST',
      path: '/api/pedidos',
      response_template: {
        success: true,
        pedido_id: '{{uuid}}',
        timestamp: '{{now}}',
        dados: '{{request.body}}',
      },
      status_code: 201,
      latency_ms: 150,
      error_rate: 2.5,
    },
    responseExample: {
      id: 'uuid',
      full_url: '/api/v1/simulator/sim-proxy/api/pedidos',
    },
  },
  {
    method: 'GET',
    path: '/sim-apis/:id/logs',
    description: 'Obter logs de chamadas para um endpoint simulado',
    auth: true,
    responseExample: [
      {
        id: 'uuid',
        requestMethod: 'POST',
        requestPath: '/api/pedidos',
        responseStatus: 201,
        latencyMs: 145,
        errorInjected: false,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
  },
];

const eventsEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/events/trigger',
    description: 'Disparar evento para o orquestrador',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      scenario_id: 'uuid-do-cenario',
      event_type: 'webhook.received',
      payload: {
        customer_id: '12345',
        action: 'order_completed',
        data: { order_id: 'ORD-001', total: 150.0 },
      },
      headers: {
        'X-Custom-Header': 'value',
      },
    },
    responseExample: {
      success: true,
      event_id: 'uuid',
      correlation_id: 'uuid',
      orchestrator_call_id: 'uuid',
    },
  },
];

const dataGeneratorEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/data-generator/run',
    description: 'Gerar dados sintéticos para testes',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      target_table: 'transactions',
      rows: 1000,
      distributions: {
        amount: { type: 'normal', params: { mean: 100, std: 30 } },
        type: { type: 'categorical', params: { categories: ['PIX', 'TED', 'BOLETO'] } },
      },
      seasonality: true,
      anomalies: { enabled: true, count: 10, types: ['spike', 'outlier'] },
    },
    responseExample: {
      generated_rows: 1000,
      preview_sample: [
        { id: 'uuid', type: 'PIX', amount: 125.5, status: 'completed' },
        { id: 'uuid', type: 'TED', amount: 89.99, status: 'pending' },
      ],
    },
  },
];

const semanticDomainEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/semantic-domain/generate',
    description: 'Gerar domínio semântico com conceitos, relações e sinônimos',
    auth: true,
    roles: ['ADMIN', 'DEV'],
    requestBody: {
      environment_id: 'uuid-do-ambiente',
      domain: 'financeiro',
      language: 'pt-BR',
      include_synonyms: true,
      include_relations: true,
    },
    responseExample: {
      concepts_created: 45,
      relations_created: 30,
      synonyms_created: 120,
    },
  },
  {
    method: 'GET',
    path: '/semantic-domain/concepts',
    description: 'Listar conceitos do domínio semântico',
    auth: true,
    queryParams: [{ name: 'domain', type: 'string', required: false, description: 'Filtrar por domínio' }],
    responseExample: [
      {
        id: 'uuid',
        domain: 'financeiro',
        code: 'PIX',
        label: 'Pagamento Instantâneo',
        description: 'Sistema de pagamentos instantâneos brasileiro',
        synonyms: [
          { term: 'pagamento pix', language: 'pt-BR' },
          { term: 'transferência pix', language: 'pt-BR' },
        ],
      },
    ],
  },
  {
    method: 'GET',
    path: '/semantic-domain/ontology/:domain',
    description: 'Obter grafo de ontologia do domínio',
    auth: true,
    responseExample: {
      nodes: [
        { id: 'uuid-1', code: 'PAGAMENTO', label: 'Pagamento' },
        { id: 'uuid-2', code: 'PIX', label: 'PIX' },
      ],
      edges: [{ from: 'uuid-1', to: 'uuid-2', type: 'has_type' }],
    },
  },
];

const observabilityEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/observability/dashboard',
    description: 'Obter métricas do dashboard',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
    ],
    responseExample: {
      totalScenarios: 15,
      totalExecutions: 1250,
      totalCalls: 5430,
      errorRate: 2.5,
      latency: { avg: 245, max: 1200, min: 45 },
      executionsByStatus: [
        { status: 'completed', count: 1180 },
        { status: 'failed', count: 70 },
      ],
      recentExecutions: [],
    },
  },
  {
    method: 'GET',
    path: '/observability/executions',
    description: 'Listar execuções do orquestrador',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
      { name: 'status', type: 'string', required: false, description: 'Filtrar por status' },
    ],
    responseExample: [
      {
        id: 'uuid',
        orchestratorRunId: 'run-123',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00Z',
        finishedAt: '2024-01-01T00:00:05Z',
        metrics: { duration_ms: 5000 },
        environment: { id: 'uuid', name: 'DEV', code: 'DEV' },
        scenario: { id: 'uuid', name: 'Cenário', code: 'SC01' },
      },
    ],
  },
  {
    method: 'GET',
    path: '/observability/executions/:id',
    description: 'Obter detalhes de uma execução',
    auth: true,
    responseExample: {
      id: 'uuid',
      orchestratorRunId: 'run-123',
      status: 'completed',
      orchestratorCalls: [
        {
          id: 'uuid',
          direction: 'outbound',
          endpoint: '/api/process',
          method: 'POST',
          responseStatus: 200,
          latencyMs: 150,
          errorFlag: false,
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/observability/calls',
    description: 'Listar chamadas ao orquestrador',
    auth: true,
    queryParams: [
      { name: 'environment_id', type: 'UUID', required: false, description: 'Filtrar por ambiente' },
      { name: 'correlation_id', type: 'string', required: false, description: 'Filtrar por correlation ID' },
    ],
  },
];

const apiSections = [
  { id: 'auth', label: 'Autenticação', icon: IconLock, endpoints: authEndpoints },
  { id: 'environments', label: 'Ambientes', icon: IconServer, endpoints: environmentEndpoints },
  { id: 'scenarios', label: 'Cenários', icon: IconTestPipe, endpoints: scenarioEndpoints },
  { id: 'chat', label: 'Chat Simulator', icon: IconMessage, endpoints: chatEndpoints },
  { id: 'forms', label: 'Formulários', icon: IconForms, endpoints: formsEndpoints },
  { id: 'sim-apis', label: 'APIs Simuladas', icon: IconApi, endpoints: simulatedApisEndpoints },
  { id: 'events', label: 'Eventos', icon: IconBolt, endpoints: eventsEndpoints },
  { id: 'data-generator', label: 'Data Generator', icon: IconDatabase, endpoints: dataGeneratorEndpoints },
  { id: 'semantic', label: 'Domínio Semântico', icon: IconBrain, endpoints: semanticDomainEndpoints },
  { id: 'observability', label: 'Observabilidade', icon: IconChartBar, endpoints: observabilityEndpoints },
];

export function ApiDocsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('auth');

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Documentação da API</Title>
        <CopyButton value={API_BASE_URL}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copiado!' : 'Copiar Base URL'}>
              <Badge
                size="lg"
                variant="light"
                style={{ cursor: 'pointer' }}
                onClick={copy}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {API_BASE_URL}
              </Badge>
            </Tooltip>
          )}
        </CopyButton>
      </Group>

      <Alert icon={<IconInfoCircle size={16} />} title="Guia de Implementação" color="blue">
        <Text size="sm">
          Esta documentação fornece exemplos de código em cURL, JavaScript e Python para integração com a API do
          Simulator. Todas as requisições autenticadas requerem um token JWT obtido através do endpoint de login.
        </Text>
      </Alert>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={500}>Fluxo de Autenticação</Text>
          <Accordion variant="contained">
            <Accordion.Item value="step1">
              <Accordion.Control icon={<Badge circle>1</Badge>}>Obter Token de Acesso</Accordion.Control>
              <Accordion.Panel>
                <CodeBlock
                  code={`curl -X POST "${API_BASE_URL}/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"seu-email@example.com","password":"sua-senha"}'`}
                  language="Bash"
                />
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="step2">
              <Accordion.Control icon={<Badge circle>2</Badge>}>Usar Token nas Requisições</Accordion.Control>
              <Accordion.Panel>
                <CodeBlock
                  code={`# Adicione o header Authorization em todas as requisições autenticadas
curl -X GET "${API_BASE_URL}/environments" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"`}
                  language="Bash"
                />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Paper>

      <Divider label="Endpoints da API" labelPosition="center" />

      <Tabs value={activeTab} onChange={setActiveTab} orientation="vertical">
        <Tabs.List>
          {apiSections.map((section) => (
            <Tabs.Tab key={section.id} value={section.id} leftSection={<section.icon size={16} />}>
              {section.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {apiSections.map((section) => (
          <Tabs.Panel key={section.id} value={section.id} pl="md">
            <Stack>
              <Title order={3}>
                <Group>
                  <section.icon size={24} />
                  {section.label}
                </Group>
              </Title>
              {section.endpoints.map((endpoint, index) => (
                <EndpointCard key={`${endpoint.method}-${endpoint.path}-${index}`} endpoint={endpoint} />
              ))}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}
