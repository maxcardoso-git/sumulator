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
  NumberInput,
  JsonInput,
  ActionIcon,
  Code,
  CopyButton,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconCopy, IconCheck, IconEye } from '@tabler/icons-react';
import { simulatedApisApi, environmentsApi } from '../lib/api';

export function SimulatedApisPage() {
  const [createModal, setCreateModal] = useState(false);
  const [logsModal, setLogsModal] = useState<string | null>(null);
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
      response_template: JSON.stringify({ message: 'Hello World', timestamp: '{{request.query.ts}}' }, null, 2),
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

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>APIs Simuladas</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModal(true)}>
          Novo Endpoint
        </Button>
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
                    <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(ep.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createModal} onClose={() => setCreateModal(false)} title="Novo Endpoint" size="lg">
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
              <TextInput label="Path" placeholder="/api/resource" required {...form.getInputProps('path')} />
            </Group>
            <Group grow>
              <NumberInput label="Status Code" min={100} max={599} {...form.getInputProps('status_code')} />
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

      <Modal opened={!!logsModal} onClose={() => setLogsModal(null)} title="Logs de Chamadas" size="xl">
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
                  <Badge color={log.responseStatus >= 400 ? 'red' : 'green'}>{log.responseStatus}</Badge>
                </Table.Td>
                <Table.Td>{log.latencyMs}ms</Table.Td>
                <Table.Td>{log.errorInjected ? <Badge color="red">Sim</Badge> : 'Não'}</Table.Td>
                <Table.Td>{new Date(log.createdAt).toLocaleString('pt-BR')}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Modal>
    </Stack>
  );
}
