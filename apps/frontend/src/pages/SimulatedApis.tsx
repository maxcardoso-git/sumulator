import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Table,
  Badge,
  Modal,
  TextInput,
  Select,
  NumberInput,
  JsonInput,
  ActionIcon,
  Code,
  CopyButton,
  Tooltip,
  Tabs,
  ScrollArea,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconEye,
  IconFileExport,
  IconDownload,
  IconInfoCircle,
} from '@tabler/icons-react';
import { simulatedApisApi, environmentsApi } from '../lib/api';

// Tipos para o documento de integração
interface ConnectorConfig {
  id: string;
  name: string;
  description: string;
  type: 'REST_API';
  version: string;
  baseUrl: string;
  authentication: {
    type: 'BEARER_TOKEN' | 'API_KEY' | 'NONE';
    config: Record<string, string>;
  };
  headers: Record<string, string>;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    retryDelayMs: number;
    retryableStatusCodes: number[];
  };
  healthCheck: {
    enabled: boolean;
    endpoint: string;
    intervalSeconds: number;
  };
}

interface ResourceOperation {
  operationId: string;
  method: string;
  path: string;
  description: string;
  parameters: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'body';
    required: boolean;
    type: string;
    description: string;
  }>;
  requestBody?: {
    contentType: string;
    schema: Record<string, unknown>;
  };
  responses: Record<
    string,
    {
      description: string;
      schema?: Record<string, unknown>;
    }
  >;
}

interface ResourceRegistry {
  id: string;
  connectorId: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  operations: ResourceOperation[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
  };
}

interface IntegrationDocument {
  version: string;
  generatedAt: string;
  connector: ConnectorConfig;
  resourceRegistry: ResourceRegistry;
}

export function SimulatedApisPage() {
  const [createModal, setCreateModal] = useState(false);
  const [logsModal, setLogsModal] = useState<string | null>(null);
  const [integrationModal, setIntegrationModal] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const { data: endpoints, isLoading } = useQuery({
    queryKey: ['api-endpoints'],
    queryFn: () => simulatedApisApi.list(),
  });

  const { data: logs } = useQuery({
    queryKey: ['api-logs', logsModal],
    queryFn: () => (logsModal ? simulatedApisApi.getLogs(logsModal) : null),
    enabled: !!logsModal,
  });

  // Gera o documento de integração baseado nos endpoints
  const integrationDocument = useMemo((): IntegrationDocument | null => {
    if (!endpoints || endpoints.length === 0 || !selectedEnvironment) return null;

    const env = environments?.find((e) => e.id === selectedEnvironment);
    if (!env) return null;

    const filteredEndpoints = endpoints.filter((ep) => ep.environment.id === selectedEnvironment);
    if (filteredEndpoints.length === 0) return null;

    const connectorId = `connector-simulator-${env.code.toLowerCase().replace(/\s+/g, '-')}`;
    const registryId = `registry-simulator-${env.code.toLowerCase().replace(/\s+/g, '-')}`;

    // Gerar operações a partir dos endpoints
    const operations: ResourceOperation[] = filteredEndpoints.map((ep) => {
      const pathParams = ep.path.match(/\/:([^/]+)/g) || [];
      const parameters = pathParams.map((param) => ({
        name: param.replace('/:', ''),
        in: 'path' as const,
        required: true,
        type: 'string',
        description: `Path parameter: ${param.replace('/:', '')}`,
      }));

      // Adicionar parâmetros de query genéricos para GET
      if (ep.method === 'GET') {
        parameters.push({
          name: 'limit',
          in: 'query' as const,
          required: false,
          type: 'integer',
          description: 'Limit number of results',
        });
        parameters.push({
          name: 'offset',
          in: 'query' as const,
          required: false,
          type: 'integer',
          description: 'Offset for pagination',
        });
      }

      const operation: ResourceOperation = {
        operationId: `${ep.method.toLowerCase()}_${ep.path.replace(/[/:]/g, '_').replace(/^_/, '')}`,
        method: ep.method,
        path: ep.path,
        description: `Simulated endpoint: ${ep.method} ${ep.path}`,
        parameters,
        responses: {
          [String(ep.statusCode)]: {
            description: ep.statusCode < 400 ? 'Successful response' : 'Error response',
            schema: ep.responseTemplate as Record<string, unknown>,
          },
        },
      };

      // Adicionar requestBody para métodos que suportam
      if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
        operation.requestBody = {
          contentType: 'application/json',
          schema: {
            type: 'object',
            properties: {},
            description: 'Request body (schema inferred from response template)',
          },
        };
      }

      return operation;
    });

    const connector: ConnectorConfig = {
      id: connectorId,
      name: `Simulator - ${env.name}`,
      description: `Connector for simulated APIs in environment: ${env.name}`,
      type: 'REST_API',
      version: '1.0.0',
      baseUrl: `${window.location.origin}/api/v1/simulator/sim-proxy`,
      authentication: {
        type: 'BEARER_TOKEN',
        config: {
          tokenHeader: 'Authorization',
          tokenPrefix: 'Bearer',
          tokenSource: 'ENVIRONMENT_VARIABLE',
          tokenVariable: 'SIMULATOR_API_TOKEN',
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Environment-Id': selectedEnvironment,
      },
      timeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        retryDelayMs: 1000,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      },
      healthCheck: {
        enabled: true,
        endpoint: '/health',
        intervalSeconds: 60,
      },
    };

    const resourceRegistry: ResourceRegistry = {
      id: registryId,
      connectorId: connectorId,
      name: `Simulator Resources - ${env.name}`,
      description: `Resource registry for simulated APIs in environment: ${env.name}`,
      version: '1.0.0',
      category: 'SIMULATOR',
      tags: ['simulator', 'mock', 'testing', env.code.toLowerCase()],
      operations,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'Simulator System',
      },
    };

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      connector,
      resourceRegistry,
    };
  }, [endpoints, environments, selectedEnvironment]);

  const createMutation = useMutation({
    mutationFn: simulatedApisApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-endpoints'] });
      setCreateModal(false);
      form.reset();
      notifications.show({
        title: 'Endpoint criado',
        message: `URL: ${data.full_url}`,
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao criar endpoint',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: simulatedApisApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-endpoints'] });
      notifications.show({ title: 'Sucesso', message: 'Endpoint removido', color: 'green' });
    },
  });

  const form = useForm({
    initialValues: {
      environment_id: '',
      method: 'GET',
      path: '/api/example',
      response_template: JSON.stringify(
        { message: 'Hello World', timestamp: '{{request.query.ts}}' },
        null,
        2
      ),
      status_code: 200,
      latency_ms: 0,
      error_rate: 0,
    },
  });

  const handleCreate = (values: typeof form.values) => {
    let responseTemplate;
    try {
      responseTemplate = JSON.parse(values.response_template);
    } catch {
      responseTemplate = {};
    }

    createMutation.mutate({
      environment_id: values.environment_id,
      method: values.method,
      path: values.path,
      response_template: responseTemplate,
      status_code: values.status_code,
      latency_ms: values.latency_ms,
      error_rate: values.error_rate,
    });
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      PATCH: 'yellow',
      DELETE: 'red',
    };
    return colors[method] || 'gray';
  };

  const handleOpenIntegrationModal = () => {
    // Pre-select first environment if available
    if (environments && environments.length > 0 && !selectedEnvironment) {
      setSelectedEnvironment(environments[0].id);
    }
    setIntegrationModal(true);
  };

  const handleDownloadDocument = () => {
    if (!integrationDocument) return;

    const jsonString = JSON.stringify(integrationDocument, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-document-${selectedEnvironment}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notifications.show({
      title: 'Download iniciado',
      message: 'O documento de integração foi baixado',
      color: 'green',
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>APIs Simuladas</Title>
        <Group>
          <Button
            variant="light"
            leftSection={<IconFileExport size={16} />}
            onClick={handleOpenIntegrationModal}
            disabled={!endpoints || endpoints.length === 0}
          >
            Gerar Documento de Integração
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModal(true)}>
            Novo Endpoint
          </Button>
        </Group>
      </Group>

      <Paper withBorder p="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Método</Table.Th>
              <Table.Th>Path</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Latência</Table.Th>
              <Table.Th>Taxa de Erro</Table.Th>
              <Table.Th>Ambiente</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">
                    Carregando...
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {endpoints?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">
                    Nenhum endpoint configurado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {endpoints?.map((ep) => (
              <Table.Tr key={ep.id}>
                <Table.Td>
                  <Badge color={getMethodColor(ep.method)}>{ep.method}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Code>{ep.path}</Code>
                    <CopyButton value={`/api/v1/simulator/sim-proxy${ep.path}`}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copiado!' : 'Copiar URL'}>
                          <ActionIcon size="sm" variant="subtle" onClick={copy}>
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Table.Td>
                <Table.Td>{ep.statusCode}</Table.Td>
                <Table.Td>{ep.latencyMs}ms</Table.Td>
                <Table.Td>{ep.errorRate}%</Table.Td>
                <Table.Td>{ep.environment.name}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => setLogsModal(ep.id)}>
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => deleteMutation.mutate(ep.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Create Modal */}
      <Modal
        opened={createModal}
        onClose={() => setCreateModal(false)}
        title="Novo Endpoint"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <Select
              label="Ambiente"
              data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
              required
              {...form.getInputProps('environment_id')}
            />
            <Group grow>
              <Select
                label="Método"
                data={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
                {...form.getInputProps('method')}
              />
              <TextInput
                label="Path"
                placeholder="/api/resource"
                required
                {...form.getInputProps('path')}
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Status Code"
                min={100}
                max={599}
                {...form.getInputProps('status_code')}
              />
              <NumberInput label="Latência (ms)" min={0} {...form.getInputProps('latency_ms')} />
              <NumberInput
                label="Taxa de Erro (%)"
                min={0}
                max={100}
                {...form.getInputProps('error_rate')}
              />
            </Group>
            <JsonInput
              label="Response Template"
              description="Use {{request.body.field}} ou {{request.query.field}} para interpolação"
              minRows={6}
              formatOnBlur
              {...form.getInputProps('response_template')}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Criar Endpoint
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Logs Modal */}
      <Modal
        opened={!!logsModal}
        onClose={() => setLogsModal(null)}
        title="Logs de Chamadas"
        size="xl"
      >
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Método</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Latência</Table.Th>
              <Table.Th>Erro Injetado</Table.Th>
              <Table.Th>Data</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {logs?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    Nenhuma chamada registrada
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {logs?.map((log) => (
              <Table.Tr key={log.id}>
                <Table.Td>
                  <Badge color={getMethodColor(log.requestMethod)}>{log.requestMethod}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={log.responseStatus >= 400 ? 'red' : 'green'}>
                    {log.responseStatus}
                  </Badge>
                </Table.Td>
                <Table.Td>{log.latencyMs}ms</Table.Td>
                <Table.Td>
                  {log.errorInjected ? <Badge color="red">Sim</Badge> : 'Não'}
                </Table.Td>
                <Table.Td>{new Date(log.createdAt).toLocaleString('pt-BR')}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>

      {/* Integration Document Modal */}
      <Modal
        opened={integrationModal}
        onClose={() => setIntegrationModal(false)}
        title="Documento de Integração - Orquestrador"
        size="xl"
      >
        <Stack>
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            Este documento contém a configuração do <strong>Connector</strong> e do{' '}
            <strong>Resource Registry</strong> para integração com o sistema Orquestrador.
          </Alert>

          <Select
            label="Ambiente"
            description="Selecione o ambiente para gerar o documento"
            data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
            value={selectedEnvironment}
            onChange={setSelectedEnvironment}
          />

          {integrationDocument ? (
            <>
              <Tabs defaultValue="complete">
                <Tabs.List>
                  <Tabs.Tab value="complete">Documento Completo</Tabs.Tab>
                  <Tabs.Tab value="connector">Connector</Tabs.Tab>
                  <Tabs.Tab value="registry">Resource Registry</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="complete" pt="md">
                  <Paper withBorder p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        Documento de Integração Completo
                      </Text>
                      <CopyButton value={JSON.stringify(integrationDocument, null, 2)}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar JSON'}>
                            <ActionIcon variant="subtle" onClick={copy}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={400}>
                      <Code block>{JSON.stringify(integrationDocument, null, 2)}</Code>
                    </ScrollArea>
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="connector" pt="md">
                  <Paper withBorder p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        Connector Configuration
                      </Text>
                      <CopyButton value={JSON.stringify(integrationDocument.connector, null, 2)}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar JSON'}>
                            <ActionIcon variant="subtle" onClick={copy}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={400}>
                      <Code block>{JSON.stringify(integrationDocument.connector, null, 2)}</Code>
                    </ScrollArea>
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="registry" pt="md">
                  <Paper withBorder p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        Resource Registry
                      </Text>
                      <CopyButton
                        value={JSON.stringify(integrationDocument.resourceRegistry, null, 2)}
                      >
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar JSON'}>
                            <ActionIcon variant="subtle" onClick={copy}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={400}>
                      <Code block>
                        {JSON.stringify(integrationDocument.resourceRegistry, null, 2)}
                      </Code>
                    </ScrollArea>
                  </Paper>
                </Tabs.Panel>
              </Tabs>

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setIntegrationModal(false)}>
                  Fechar
                </Button>
                <Button leftSection={<IconDownload size={16} />} onClick={handleDownloadDocument}>
                  Download JSON
                </Button>
              </Group>
            </>
          ) : (
            <Paper withBorder p="xl">
              <Text c="dimmed" ta="center">
                {!selectedEnvironment
                  ? 'Selecione um ambiente para gerar o documento'
                  : 'Nenhum endpoint configurado para este ambiente'}
              </Text>
            </Paper>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
