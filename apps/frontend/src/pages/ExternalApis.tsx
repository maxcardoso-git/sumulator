import { useState } from 'react';
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
  Textarea,
  NumberInput,
  Switch,
  ActionIcon,
  Tabs,
  Code,
  ScrollArea,
  Tooltip,
  Loader,
  Alert,
  JsonInput,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconPlayerPlay,
  IconCheck,
  IconX,
  IconApi,
  IconSettings,
  IconTestPipe,
  IconLink,
  IconCopy,
  IconClock,
} from '@tabler/icons-react';
import {
  externalApisApi,
  environmentsApi,
  formsApi,
  ExternalApi,
  InvokeExternalApiResult,
} from '../lib/api';

export function ExternalApisPage() {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<ExternalApi | null>(null);
  const [testModal, setTestModal] = useState<ExternalApi | null>(null);
  const [testResult, setTestResult] = useState<InvokeExternalApiResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testPayload, setTestPayload] = useState<string>('{}');
  const [activeTab, setActiveTab] = useState<string | null>('basic');
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });

  const { data: externalApis, isLoading } = useQuery({
    queryKey: ['external-apis'],
    queryFn: () => externalApisApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: externalApisApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      setCreateModal(false);
      form.reset();
      notifications.show({
        title: 'Sucesso',
        message: 'API externa criada com sucesso',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao criar API',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof externalApisApi.update>[1] }) =>
      externalApisApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      setEditModal(null);
      notifications.show({
        title: 'Sucesso',
        message: 'API externa atualizada',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao atualizar API',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: externalApisApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
      notifications.show({
        title: 'Sucesso',
        message: 'API externa removida',
        color: 'green',
      });
    },
  });

  const form = useForm({
    initialValues: {
      environment_id: '',
      form_id: '',
      name: '',
      code: '',
      description: '',
      api_type: 'CONSULTA_IA',
      base_url: '',
      endpoint: '',
      method: 'POST',
      headers: '{\n  "Content-Type": "application/json"\n}',
      auth_type: 'NONE',
      auth_config: '{}',
      request_body: '{\n  "data": "{{DATA}}"\n}',
      timeout: 30000,
      enabled: true,
    },
  });

  const handleCreate = (values: typeof form.values) => {
    try {
      createMutation.mutate({
        environment_id: values.environment_id,
        form_id: values.form_id || undefined,
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        api_type: values.api_type,
        base_url: values.base_url,
        endpoint: values.endpoint,
        method: values.method,
        headers: JSON.parse(values.headers),
        auth_type: values.auth_type,
        auth_config: JSON.parse(values.auth_config),
        request_body: JSON.parse(values.request_body),
        timeout: values.timeout,
        enabled: values.enabled,
      });
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'JSON inválido em headers, auth_config ou request_body',
        color: 'red',
      });
    }
  };

  const handleUpdate = (values: typeof form.values) => {
    if (!editModal) return;
    try {
      updateMutation.mutate({
        id: editModal.id,
        data: {
          environment_id: values.environment_id,
          form_id: values.form_id || undefined,
          name: values.name,
          code: values.code,
          description: values.description || undefined,
          api_type: values.api_type,
          base_url: values.base_url,
          endpoint: values.endpoint,
          method: values.method,
          headers: JSON.parse(values.headers),
          auth_type: values.auth_type,
          auth_config: JSON.parse(values.auth_config),
          request_body: JSON.parse(values.request_body),
          timeout: values.timeout,
          enabled: values.enabled,
        },
      });
    } catch (error) {
      notifications.show({
        title: 'Erro',
        message: 'JSON inválido em headers, auth_config ou request_body',
        color: 'red',
      });
    }
  };

  const handleTest = async (api: ExternalApi, withPayload = false) => {
    setTestModal(api);
    setTestResult(null);
    setTestLoading(true);
    try {
      let payload: Record<string, unknown> | undefined;
      if (withPayload) {
        try {
          const parsed = JSON.parse(testPayload);
          payload = Object.keys(parsed).length > 0 ? parsed : undefined;
        } catch {
          notifications.show({
            title: 'Erro',
            message: 'Payload JSON invalido',
            color: 'red',
          });
          setTestLoading(false);
          return;
        }
      }
      const result = await externalApisApi.invoke(api.id, payload ? { payload } : undefined);
      setTestResult(result);
      queryClient.invalidateQueries({ queryKey: ['external-apis'] });
    } catch (error) {
      setTestResult({
        success: false,
        status: 'ERROR',
        latency_ms: 0,
        response: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        request: { url: '', method: '', headers: {}, body: null },
      });
    } finally {
      setTestLoading(false);
    }
  };

  const openTestModal = (api: ExternalApi) => {
    setTestModal(api);
    setTestResult(null);
    setTestPayload('{\n  "exemplo": "dados de teste"\n}');
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 500) return 'green';
    if (ms < 2000) return 'yellow';
    return 'red';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openEditModal = (api: ExternalApi) => {
    form.setValues({
      environment_id: api.environment.id,
      form_id: api.form?.id || '',
      name: api.name,
      code: api.code,
      description: api.description || '',
      api_type: api.apiType || 'CONSULTA_IA',
      base_url: api.baseUrl,
      endpoint: api.endpoint,
      method: api.method,
      headers: JSON.stringify(api.headers, null, 2),
      auth_type: api.authType || 'NONE',
      auth_config: JSON.stringify(api.authConfig, null, 2),
      request_body: JSON.stringify(api.requestBody, null, 2),
      timeout: api.timeout,
      enabled: api.enabled,
    });
    setActiveTab('basic');
    setEditModal(api);
  };

  const openCreateModal = () => {
    form.reset();
    setActiveTab('basic');
    setCreateModal(true);
  };

  const handleCopy = (api: ExternalApi) => {
    form.setValues({
      environment_id: api.environment.id,
      form_id: api.form?.id || '',
      name: `${api.name} (Copia)`,
      code: `${api.code}_COPY`,
      description: api.description || '',
      api_type: api.apiType || 'CONSULTA_IA',
      base_url: api.baseUrl,
      endpoint: api.endpoint,
      method: api.method,
      headers: JSON.stringify(api.headers, null, 2),
      auth_type: api.authType || 'NONE',
      auth_config: JSON.stringify(api.authConfig, null, 2),
      request_body: JSON.stringify(api.requestBody, null, 2),
      timeout: api.timeout,
      enabled: api.enabled,
    });
    setActiveTab('basic');
    setCreateModal(true);
    notifications.show({
      title: 'API copiada',
      message: 'Altere o nome e codigo antes de salvar',
      color: 'blue',
    });
  };

  const getStatusBadge = (api: ExternalApi) => {
    if (!api.lastTestedAt) {
      return <Badge variant="outline" color="gray">Nunca testado</Badge>;
    }
    if (api.lastTestStatus === 'SUCCESS') {
      return <Badge color="green" leftSection={<IconCheck size={12} />}>OK</Badge>;
    }
    return <Badge color="red" leftSection={<IconX size={12} />}>Erro</Badge>;
  };

  const renderForm = (onSubmit: (values: typeof form.values) => void, isEdit = false) => (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="basic" leftSection={<IconApi size={16} />}>
            Configuracao Basica
          </Tabs.Tab>
          <Tabs.Tab value="auth" leftSection={<IconSettings size={16} />}>
            Autenticacao
          </Tabs.Tab>
          <Tabs.Tab value="request" leftSection={<IconLink size={16} />}>
            Request
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="basic" pt="md">
          <Stack>
            <Group grow>
              <Select
                label="Ambiente"
                placeholder="Selecione o ambiente"
                data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
                required
                {...form.getInputProps('environment_id')}
              />
              <Select
                label="Formulario Vinculado"
                placeholder="Opcional - vincule a um formulario"
                data={forms?.map((f) => ({ value: f.id, label: `${f.name} (${f.code})` })) || []}
                clearable
                {...form.getInputProps('form_id')}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Nome"
                placeholder="API de Analise IA"
                required
                {...form.getInputProps('name')}
              />
              <TextInput
                label="Codigo"
                placeholder="ANALISE_IA_API"
                description="Identificador unico"
                required
                {...form.getInputProps('code')}
              />
            </Group>
            <Textarea
              label="Descricao"
              placeholder="API do Orquestrador para analise de dados com IA"
              {...form.getInputProps('description')}
            />
            <Select
              label="Tipo de API"
              description="Chat: para conversas interativas. Consulta IA: para analise de dados"
              data={[
                { value: 'CHAT', label: 'Chat' },
                { value: 'CONSULTA_IA', label: 'Consulta IA' },
              ]}
              {...form.getInputProps('api_type')}
            />
            <Group grow>
              <TextInput
                label="URL Base"
                placeholder="https://api.orchestrator.com"
                required
                {...form.getInputProps('base_url')}
              />
              <TextInput
                label="Endpoint"
                placeholder="/v1/analyze"
                required
                {...form.getInputProps('endpoint')}
              />
            </Group>
            <Group grow>
              <Select
                label="Metodo HTTP"
                data={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
                {...form.getInputProps('method')}
              />
              <NumberInput
                label="Timeout (ms)"
                min={1000}
                max={300000}
                {...form.getInputProps('timeout')}
              />
            </Group>
            <Switch
              label="API Ativa"
              description="Desative para impedir chamadas"
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="auth" pt="md">
          <Stack>
            <Select
              label="Tipo de Autenticacao"
              data={[
                { value: 'NONE', label: 'Nenhuma' },
                { value: 'BEARER_TOKEN', label: 'Bearer Token' },
                { value: 'API_KEY', label: 'API Key' },
                { value: 'BASIC', label: 'Basic Auth' },
                { value: 'OAUTH2_PASSWORD', label: 'OAuth2 Password (Login Automatico)' },
              ]}
              {...form.getInputProps('auth_type')}
            />
            <JsonInput
              label="Configuracao de Autenticacao"
              placeholder='{"token": "seu-token"}'
              description={
                form.values.auth_type === 'BEARER_TOKEN'
                  ? 'Use: {"token": "seu-token"}'
                  : form.values.auth_type === 'API_KEY'
                  ? 'Use: {"header_name": "X-API-Key", "api_key": "sua-chave"}'
                  : form.values.auth_type === 'BASIC'
                  ? 'Use: {"username": "user", "password": "pass"}'
                  : form.values.auth_type === 'OAUTH2_PASSWORD'
                  ? 'Use: {"login_url": "http://host:port/api/v1/auth/login", "email": "user@email.com", "password": "senha", "token_path": "accessToken"}'
                  : ''
              }
              autosize
              minRows={3}
              formatOnBlur
              {...form.getInputProps('auth_config')}
            />
            {form.values.auth_type === 'OAUTH2_PASSWORD' && (
              <Alert color="blue" title="OAuth2 Password Grant">
                Este tipo de autenticacao faz login automaticamente antes de chamar a API.
                O sistema ira enviar POST para login_url com {'{'}email, password{'}'} e usar o token retornado.
                Use token_path para indicar onde esta o token na resposta (ex: "accessToken" ou "data.token").
              </Alert>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="request" pt="md">
          <Stack>
            <JsonInput
              label="Headers"
              placeholder='{"Content-Type": "application/json"}'
              autosize
              minRows={3}
              formatOnBlur
              {...form.getInputProps('headers')}
            />
            <JsonInput
              label="Body Template"
              placeholder='{"data": "{{DATA}}"}'
              description="Use {{DATA}} como placeholder para os dados que serao enviados"
              autosize
              minRows={5}
              formatOnBlur
              {...form.getInputProps('request_body')}
            />
            <Alert color="blue" title="Dica">
              O placeholder <Code>{'{{DATA}}'}</Code> sera substituido pelos dados reais ao chamar a API.
              Por exemplo, ao usar "Explique com IA", os dados do formulario serao inseridos no lugar do placeholder.
            </Alert>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Divider my="md" />

      <Group justify="flex-end">
        <Button variant="default" onClick={() => isEdit ? setEditModal(null) : setCreateModal(false)}>
          Cancelar
        </Button>
        <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? 'Atualizar' : 'Criar API'}
        </Button>
      </Group>
    </form>
  );

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>APIs Externas (Orquestrador)</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Nova API
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Codigo</Table.Th>
              <Table.Th>Ambiente</Table.Th>
              <Table.Th>Formulario</Table.Th>
              <Table.Th>Endpoint</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Acoes</Table.Th>
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
            {externalApis?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text c="dimmed" ta="center">
                    Nenhuma API externa cadastrada
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {externalApis?.map((api) => (
              <Table.Tr key={api.id} style={{ opacity: api.enabled ? 1 : 0.5 }}>
                <Table.Td>
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color={api.enabled ? 'blue' : 'gray'}>
                      <IconApi size={14} />
                    </ThemeIcon>
                    {api.name}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{api.code}</Badge>
                </Table.Td>
                <Table.Td>{api.environment.name}</Table.Td>
                <Table.Td>
                  {api.form ? (
                    <Badge variant="outline" color="violet">
                      {api.form.code}
                    </Badge>
                  ) : (
                    <Text c="dimmed" size="sm">-</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {api.method} {api.endpoint}
                  </Text>
                </Table.Td>
                <Table.Td>{getStatusBadge(api)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Testar API">
                      <ActionIcon variant="subtle" color="green" onClick={() => openTestModal(api)}>
                        <IconTestPipe size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Copiar API">
                      <ActionIcon variant="subtle" color="cyan" onClick={() => handleCopy(api)}>
                        <IconCopy size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Editar">
                      <ActionIcon variant="subtle" onClick={() => openEditModal(api)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Remover">
                      <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(api.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
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
        title="Nova API Externa"
        size="lg"
      >
        {renderForm(handleCreate)}
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Editar: ${editModal?.name}`}
        size="lg"
      >
        {renderForm(handleUpdate, true)}
      </Modal>

      {/* Test Modal */}
      <Modal
        opened={!!testModal}
        onClose={() => setTestModal(null)}
        title={`Teste: ${testModal?.name}`}
        size="xl"
      >
        {testModal && (
          <Stack>
            <Paper withBorder p="sm" bg="gray.0">
              <Group justify="space-between">
                <Group gap="xs">
                  <Badge variant="filled" color="blue">{testModal.method}</Badge>
                  <Code>{testModal.baseUrl}{testModal.endpoint}</Code>
                </Group>
                {testModal.lastTestedAt && (
                  <Group gap="xs">
                    <IconClock size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      Ultimo teste: {formatDate(testModal.lastTestedAt)}
                    </Text>
                    {testModal.lastTestStatus && (
                      <Badge size="xs" color={testModal.lastTestStatus === 'SUCCESS' ? 'green' : 'red'}>
                        {testModal.lastTestStatus}
                      </Badge>
                    )}
                  </Group>
                )}
              </Group>
            </Paper>

            <Divider label="Payload de Teste (opcional)" labelPosition="center" />
            <JsonInput
              placeholder='{"exemplo": "dados de teste"}'
              description="Os dados serao inseridos no placeholder {{DATA}} do request body"
              autosize
              minRows={4}
              maxRows={8}
              value={testPayload}
              onChange={setTestPayload}
              formatOnBlur
              disabled={testLoading}
            />

            <Group>
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => handleTest(testModal, true)}
                loading={testLoading}
                color="green"
              >
                Testar com Payload
              </Button>
              <Button
                variant="light"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => handleTest(testModal, false)}
                loading={testLoading}
              >
                Testar sem Payload
              </Button>
            </Group>

            {testResult && (
              <Stack>
                <Divider label="Resultado" labelPosition="center" />

                <Paper withBorder p="md">
                  <Group justify="space-between" mb="md">
                    <Group gap="md">
                      <Badge
                        size="lg"
                        color={testResult.success ? 'green' : 'red'}
                        leftSection={testResult.success ? <IconCheck size={14} /> : <IconX size={14} />}
                      >
                        {testResult.success ? 'Sucesso' : 'Erro'}
                      </Badge>
                      <Badge size="lg" color={getLatencyColor(testResult.latency_ms)} variant="light">
                        {testResult.latency_ms}ms
                      </Badge>
                    </Group>
                    {testResult.error && (
                      <Text size="sm" c="red" fw={500}>{testResult.error}</Text>
                    )}
                  </Group>
                </Paper>

                <Tabs defaultValue="response">
                  <Tabs.List>
                    <Tabs.Tab value="response">Response</Tabs.Tab>
                    <Tabs.Tab value="request">Request</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="response" pt="md">
                    <Paper withBorder p="sm">
                      <ScrollArea h={250}>
                        <Code block>
                          {typeof testResult.response === 'string'
                            ? testResult.response
                            : JSON.stringify(testResult.response, null, 2)}
                        </Code>
                      </ScrollArea>
                    </Paper>
                  </Tabs.Panel>

                  <Tabs.Panel value="request" pt="md">
                    <Paper withBorder p="sm">
                      <Text size="sm" fw={500} mb="xs">URL:</Text>
                      <Code block>{testResult.request.url}</Code>
                      <Text size="sm" fw={500} mt="sm" mb="xs">Headers:</Text>
                      <ScrollArea h={80}>
                        <Code block>{JSON.stringify(testResult.request.headers, null, 2)}</Code>
                      </ScrollArea>
                      {testResult.request.body !== null && testResult.request.body !== undefined && (
                        <>
                          <Text size="sm" fw={500} mt="sm" mb="xs">Body:</Text>
                          <ScrollArea h={100}>
                            <Code block>{JSON.stringify(testResult.request.body as Record<string, unknown>, null, 2)}</Code>
                          </ScrollArea>
                        </>
                      )}
                    </Paper>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setTestModal(null)}>
                Fechar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
