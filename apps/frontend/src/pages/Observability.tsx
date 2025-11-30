import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Table,
  Badge,
  Select,
  Tabs,
  Modal,
  Code,
} from '@mantine/core';
import { IconChartBar, IconList, IconActivity } from '@tabler/icons-react';
import { observabilityApi, Execution, OrchestratorCall } from '../lib/api';

export function ObservabilityPage() {
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: executions, isLoading: loadingExecutions } = useQuery({
    queryKey: ['executions', statusFilter],
    queryFn: () => observabilityApi.getExecutions({ status: statusFilter || undefined }),
  });

  const { data: executionDetails } = useQuery({
    queryKey: ['execution', selectedExecution],
    queryFn: () => (selectedExecution ? observabilityApi.getExecution(selectedExecution) : null),
    enabled: !!selectedExecution,
  });

  const { data: calls, isLoading: loadingCalls } = useQuery({
    queryKey: ['orchestrator-calls'],
    queryFn: () => observabilityApi.getCalls(),
  });

  const { data: latencyDist } = useQuery({
    queryKey: ['latency-distribution'],
    queryFn: () => observabilityApi.getLatencyDistribution(),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'green',
      running: 'yellow',
      pending: 'gray',
      failed: 'red',
    };
    return colors[status] || 'gray';
  };

  return (
    <Stack>
      <Title order={2}>Observabilidade</Title>

      <Tabs defaultValue="executions">
        <Tabs.List>
          <Tabs.Tab value="executions" leftSection={<IconActivity size={16} />}>
            Execuções
          </Tabs.Tab>
          <Tabs.Tab value="calls" leftSection={<IconList size={16} />}>
            Chamadas API
          </Tabs.Tab>
          <Tabs.Tab value="metrics" leftSection={<IconChartBar size={16} />}>
            Métricas
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="executions" pt="md">
          <Paper withBorder p="md">
            <Stack>
              <Select
                placeholder="Filtrar por status"
                data={[
                  { value: 'pending', label: 'Pendente' },
                  { value: 'running', label: 'Executando' },
                  { value: 'completed', label: 'Completo' },
                  { value: 'failed', label: 'Falha' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                w={200}
              />

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Run ID</Table.Th>
                    <Table.Th>Cenário</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Início</Table.Th>
                    <Table.Th>Fim</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loadingExecutions && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed" ta="center">
                          Carregando...
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {executions?.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed" ta="center">
                          Nenhuma execução encontrada
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {executions?.map((exec: Execution) => (
                    <Table.Tr
                      key={exec.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedExecution(exec.id)}
                    >
                      <Table.Td>
                        <Code>{exec.orchestratorRunId?.slice(0, 8) || exec.id.slice(0, 8)}</Code>
                      </Table.Td>
                      <Table.Td>{exec.scenario?.name || '-'}</Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(exec.status)}>{exec.status}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {exec.startedAt ? new Date(exec.startedAt).toLocaleString('pt-BR') : '-'}
                      </Table.Td>
                      <Table.Td>
                        {exec.finishedAt ? new Date(exec.finishedAt).toLocaleString('pt-BR') : '-'}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="calls" pt="md">
          <Paper withBorder p="md">
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Direção</Table.Th>
                  <Table.Th>Método</Table.Th>
                  <Table.Th>Endpoint</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Latência</Table.Th>
                  <Table.Th>Erro</Table.Th>
                  <Table.Th>Data</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loadingCalls && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center">
                        Carregando...
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {calls?.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center">
                        Nenhuma chamada registrada
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {calls?.map((call: OrchestratorCall) => (
                  <Table.Tr key={call.id}>
                    <Table.Td>
                      <Badge color={call.direction === 'outbound' ? 'blue' : 'violet'}>
                        {call.direction === 'outbound' ? '→' : '←'} {call.direction}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">{call.method}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" lineClamp={1}>
                        {call.endpoint}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={call.responseStatus && call.responseStatus >= 400 ? 'red' : 'green'}>
                        {call.responseStatus || '-'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{call.latencyMs || 0}ms</Table.Td>
                    <Table.Td>
                      {call.errorFlag ? <Badge color="red">Erro</Badge> : <Badge color="green">OK</Badge>}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs">{new Date(call.createdAt).toLocaleString('pt-BR')}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="metrics" pt="md">
          <Paper withBorder p="md">
            <Stack>
              <Text fw={600}>Distribuição de Latência</Text>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Faixa</Table.Th>
                    <Table.Th>Chamadas</Table.Th>
                    <Table.Th>Gráfico</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {latencyDist?.map((bucket) => {
                    const maxCount = Math.max(...(latencyDist?.map((b) => b.count) || [1]));
                    const width = (bucket.count / maxCount) * 100;
                    return (
                      <Table.Tr key={bucket.label}>
                        <Table.Td>{bucket.label}</Table.Td>
                        <Table.Td>{bucket.count}</Table.Td>
                        <Table.Td>
                          <div
                            style={{
                              width: `${width}%`,
                              minWidth: bucket.count > 0 ? '4px' : 0,
                              height: '20px',
                              backgroundColor: 'var(--mantine-color-blue-6)',
                              borderRadius: '2px',
                            }}
                          />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!selectedExecution}
        onClose={() => setSelectedExecution(null)}
        title="Detalhes da Execução"
        size="xl"
      >
        {executionDetails && (
          <Stack>
            <Group>
              <div>
                <Text size="sm" c="dimmed">
                  Run ID
                </Text>
                <Code>{executionDetails.orchestratorRunId || executionDetails.id}</Code>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Status
                </Text>
                <Badge color={getStatusColor(executionDetails.status)}>{executionDetails.status}</Badge>
              </div>
            </Group>

            <div>
              <Text size="sm" c="dimmed">
                Cenário
              </Text>
              <Text>{executionDetails.scenario?.name || 'N/A'}</Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">
                Métricas
              </Text>
              <Paper withBorder p="sm" bg="gray.0">
                <pre style={{ margin: 0 }}>{JSON.stringify(executionDetails.metrics, null, 2)}</pre>
              </Paper>
            </div>

            {executionDetails.orchestratorCalls && (
              <div>
                <Text size="sm" c="dimmed" mb="xs">
                  Chamadas Relacionadas ({executionDetails.orchestratorCalls.length})
                </Text>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Direção</Table.Th>
                      <Table.Th>Endpoint</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Latência</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {executionDetails.orchestratorCalls.map((call: OrchestratorCall) => (
                      <Table.Tr key={call.id}>
                        <Table.Td>
                          <Badge size="xs">{call.direction}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" lineClamp={1}>
                            {call.endpoint}
                          </Text>
                        </Table.Td>
                        <Table.Td>{call.responseStatus || '-'}</Table.Td>
                        <Table.Td>{call.latencyMs}ms</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
