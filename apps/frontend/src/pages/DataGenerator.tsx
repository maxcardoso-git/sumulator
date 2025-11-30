import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Select,
  MultiSelect,
  NumberInput,
  Switch,
  Table,
  Badge,
  Accordion,
  ActionIcon,
  Card,
  SimpleGrid,
  Modal,
  Divider,
  Alert,
  SegmentedControl,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlayerPlay,
  IconTrash,
  IconPlus,
  IconX,
  IconAlertTriangle,
  IconDatabase,
  IconChartBar,
} from '@tabler/icons-react';
import {
  dataGeneratorApi,
  GenerateDataResult,
  DeleteDataInput,
  DataGeneratorStats,
} from '../lib/api';

interface DistributionConfig {
  field: string;
  type: 'uniform' | 'normal' | 'exponential';
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  lambda?: number;
}

const defaultDistributions: DistributionConfig[] = [
  { field: 'amount', type: 'normal', mean: 250, stdDev: 100 },
];

export function DataGeneratorPage() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<GenerateDataResult | null>(null);
  const [distributions, setDistributions] = useState<DistributionConfig[]>(defaultDistributions);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [previewFilter, setPreviewFilter] = useState<string>('all');

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['data-generator-stats'],
    queryFn: () => dataGeneratorApi.getStats(),
  });

  const generateMutation = useMutation({
    mutationFn: dataGeneratorApi.run,
    onSuccess: (data) => {
      setResult(data);
      refetchStats();
      notifications.show({
        title: 'Dados gerados',
        message: `${data.generated_rows} registros criados com sucesso`,
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao gerar dados',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dataGeneratorApi.clear,
    onSuccess: (data) => {
      refetchStats();
      closeDeleteModal();
      const totalDeleted =
        data.deleted.transactions_deleted + data.deleted.operational_events_deleted;
      notifications.show({
        title: 'Dados apagados',
        message: `${totalDeleted} registros removidos com sucesso`,
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao apagar dados',
        color: 'red',
      });
    },
  });

  const form = useForm({
    initialValues: {
      target_table: 'transactions' as 'transactions' | 'operational_events',
      rows: 100,
      seasonality: true,
      anomalies_enabled: false,
      anomalies_count: 5,
      anomalies_types: ['outlier'] as string[],
    },
  });

  const deleteForm = useForm<DeleteDataInput>({
    initialValues: {
      target_table: 'all',
      only_simulator_data: true,
    },
  });

  const handleGenerate = (values: typeof form.values) => {
    const distributionsObj: Record<string, { type: string; params?: Record<string, number> }> = {};

    distributions.forEach((dist) => {
      const params: Record<string, number> = {};
      if (dist.type === 'uniform') {
        if (dist.min !== undefined) params.min = dist.min;
        if (dist.max !== undefined) params.max = dist.max;
      } else if (dist.type === 'normal') {
        if (dist.mean !== undefined) params.mean = dist.mean;
        if (dist.stdDev !== undefined) params.stdDev = dist.stdDev;
      } else if (dist.type === 'exponential') {
        if (dist.lambda !== undefined) params.lambda = dist.lambda;
      }
      distributionsObj[dist.field] = {
        type: dist.type,
        params: Object.keys(params).length > 0 ? params : undefined,
      };
    });

    generateMutation.mutate({
      target_table: values.target_table,
      rows: values.rows,
      seasonality: values.seasonality,
      distributions: Object.keys(distributionsObj).length > 0 ? distributionsObj : undefined,
      anomalies: values.anomalies_enabled
        ? {
            enabled: true,
            count: values.anomalies_count,
            types: values.anomalies_types,
          }
        : undefined,
    });
  };

  const handleDelete = (values: DeleteDataInput) => {
    deleteMutation.mutate(values);
  };

  const addDistribution = () => {
    setDistributions([
      ...distributions,
      { field: '', type: 'normal', mean: 100, stdDev: 50 },
    ]);
  };

  const removeDistribution = (index: number) => {
    setDistributions(distributions.filter((_, i) => i !== index));
  };

  const updateDistribution = (index: number, updates: Partial<DistributionConfig>) => {
    setDistributions(
      distributions.map((dist, i) => (i === index ? { ...dist, ...updates } : dist))
    );
  };

  const getFieldOptions = () => {
    if (form.values.target_table === 'transactions') {
      return [
        { value: 'amount', label: 'Valor (amount)' },
        { value: 'customerId', label: 'Cliente (customerId)' },
      ];
    }
    return [
      { value: 'duration', label: 'Duração (durationSec)' },
      { value: 'agent', label: 'Agente' },
    ];
  };

  const filteredPreviewSample = result?.preview_sample.filter((row) => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'anomalies') {
      const metadata = row.metadata as Record<string, unknown> | undefined;
      return metadata?.anomaly_injected;
    }
    return true;
  });

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Data Generator</Title>
          <Text c="dimmed">Gere dados sintéticos para testes de FSB e ACE</Text>
        </div>
        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={16} />}
          onClick={openDeleteModal}
        >
          Apagar Dados
        </Button>
      </Group>

      {/* Statistics Cards */}
      {stats && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          <Card withBorder padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Transações
                </Text>
                <Text size="xl" fw={700}>
                  {stats.transactions?.total ?? 0}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats.transactions?.simulator_generated ?? 0} do simulador
                </Text>
              </div>
              <IconDatabase size={32} color="var(--mantine-color-blue-6)" />
            </Group>
          </Card>

          <Card withBorder padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Eventos Operacionais
                </Text>
                <Text size="xl" fw={700}>
                  {stats.operational_events?.total ?? 0}
                </Text>
              </div>
              <IconChartBar size={32} color="var(--mantine-color-green-6)" />
            </Group>
          </Card>
        </SimpleGrid>
      )}

      <Paper withBorder p="md">
        <form onSubmit={form.onSubmit(handleGenerate)}>
          <Stack>
            <Group grow>
              <Select
                label="Tabela Alvo"
                data={[
                  { value: 'transactions', label: 'Transações' },
                  { value: 'operational_events', label: 'Eventos Operacionais' },
                ]}
                {...form.getInputProps('target_table')}
              />
              <NumberInput
                label="Quantidade de Registros"
                min={1}
                max={100000}
                {...form.getInputProps('rows')}
              />
            </Group>

            <Switch
              label="Aplicar sazonalidade (horário comercial, menos finais de semana)"
              {...form.getInputProps('seasonality', { type: 'checkbox' })}
            />

            <Accordion>
              <Accordion.Item value="distributions">
                <Accordion.Control>
                  <Group gap="xs">
                    <Text>Distribuições Estatísticas</Text>
                    <Badge size="sm" variant="light">
                      {distributions.length} configuradas
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack>
                    <Text size="sm" c="dimmed">
                      Configure distribuições estatísticas para os campos numéricos.
                    </Text>

                    {distributions.map((dist, index) => (
                      <Card key={index} withBorder padding="sm">
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Text size="sm" fw={500}>
                              Distribuição {index + 1}
                            </Text>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeDistribution(index)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>

                          <Group grow>
                            <Select
                              label="Campo"
                              placeholder="Selecione o campo"
                              data={getFieldOptions()}
                              value={dist.field}
                              onChange={(value) =>
                                updateDistribution(index, { field: value || '' })
                              }
                            />
                            <Select
                              label="Tipo de Distribuição"
                              data={[
                                { value: 'uniform', label: 'Uniforme' },
                                { value: 'normal', label: 'Normal (Gaussiana)' },
                                { value: 'exponential', label: 'Exponencial' },
                              ]}
                              value={dist.type}
                              onChange={(value) =>
                                updateDistribution(index, {
                                  type: value as 'uniform' | 'normal' | 'exponential',
                                })
                              }
                            />
                          </Group>

                          {dist.type === 'uniform' && (
                            <Group grow>
                              <NumberInput
                                label="Valor Mínimo"
                                value={dist.min}
                                onChange={(value) =>
                                  updateDistribution(index, {
                                    min: typeof value === 'number' ? value : undefined,
                                  })
                                }
                              />
                              <NumberInput
                                label="Valor Máximo"
                                value={dist.max}
                                onChange={(value) =>
                                  updateDistribution(index, {
                                    max: typeof value === 'number' ? value : undefined,
                                  })
                                }
                              />
                            </Group>
                          )}

                          {dist.type === 'normal' && (
                            <Group grow>
                              <NumberInput
                                label="Média"
                                value={dist.mean}
                                onChange={(value) =>
                                  updateDistribution(index, {
                                    mean: typeof value === 'number' ? value : undefined,
                                  })
                                }
                              />
                              <NumberInput
                                label="Desvio Padrão"
                                value={dist.stdDev}
                                onChange={(value) =>
                                  updateDistribution(index, {
                                    stdDev: typeof value === 'number' ? value : undefined,
                                  })
                                }
                              />
                            </Group>
                          )}

                          {dist.type === 'exponential' && (
                            <NumberInput
                              label="Lambda"
                              description="Taxa de decaimento (valores menores = distribuição mais espalhada)"
                              value={dist.lambda}
                              step={0.01}
                              decimalScale={4}
                              onChange={(value) =>
                                updateDistribution(index, {
                                  lambda: typeof value === 'number' ? value : undefined,
                                })
                              }
                            />
                          )}
                        </Stack>
                      </Card>
                    ))}

                    <Button
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                      onClick={addDistribution}
                    >
                      Adicionar Distribuição
                    </Button>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="anomalies">
                <Accordion.Control>Configuração de Anomalias</Accordion.Control>
                <Accordion.Panel>
                  <Stack>
                    <Switch
                      label="Injetar anomalias nos dados"
                      {...form.getInputProps('anomalies_enabled', { type: 'checkbox' })}
                    />
                    {form.values.anomalies_enabled && (
                      <>
                        <NumberInput
                          label="Quantidade de anomalias"
                          min={1}
                          max={100}
                          {...form.getInputProps('anomalies_count')}
                        />
                        <MultiSelect
                          label="Tipos de Anomalias"
                          placeholder="Selecione os tipos"
                          data={[
                            { value: 'outlier', label: 'Outlier (valores extremos)' },
                            { value: 'duplicate', label: 'Duplicado' },
                            { value: 'null_value', label: 'Valor Nulo' },
                            { value: 'invalid_status', label: 'Status Inválido' },
                          ]}
                          value={form.values.anomalies_types}
                          onChange={(value) => form.setFieldValue('anomalies_types', value)}
                        />
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Button
              type="submit"
              leftSection={<IconPlayerPlay size={16} />}
              loading={generateMutation.isPending}
            >
              Gerar Dados
            </Button>
          </Stack>
        </form>
      </Paper>

      {result && (
        <Paper withBorder p="md">
          <Stack>
            <Group justify="space-between">
              <Text fw={600}>Resultado</Text>
              <Group>
                <SegmentedControl
                  size="xs"
                  value={previewFilter}
                  onChange={setPreviewFilter}
                  data={[
                    { value: 'all', label: 'Todos' },
                    { value: 'anomalies', label: 'Anomalias' },
                  ]}
                />
                <Badge color="green" size="lg">
                  {result.generated_rows} registros criados
                </Badge>
              </Group>
            </Group>

            <Text size="sm" fw={500}>
              Amostra dos dados gerados ({filteredPreviewSample?.length ?? 0} exibidos):
            </Text>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  {result.preview_sample[0] &&
                    Object.keys(result.preview_sample[0])
                      .slice(0, 6)
                      .map((key) => <Table.Th key={key}>{key}</Table.Th>)}
                  <Table.Th>Anomalia</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(filteredPreviewSample ?? []).slice(0, 10).map((row, i) => {
                  const metadata = row.metadata as Record<string, unknown> | undefined;
                  const hasAnomaly = metadata?.anomaly_injected;
                  return (
                    <Table.Tr key={i}>
                      {Object.values(row)
                        .slice(0, 6)
                        .map((val, j) => (
                          <Table.Td key={j}>
                            <Text size="xs" lineClamp={1}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </Text>
                          </Table.Td>
                        ))}
                      <Table.Td>
                        {hasAnomaly ? (
                          <Badge color="orange" size="xs">
                            {String(metadata?.anomaly_injected)}
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      )}

      {/* Delete Modal */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Apagar Dados Gerados">
        <form onSubmit={deleteForm.onSubmit(handleDelete)}>
          <Stack>
            <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
              Esta ação é irreversível. Os dados selecionados serão permanentemente removidos.
            </Alert>

            <Select
              label="Tabela"
              data={[
                { value: 'all', label: 'Todas as tabelas' },
                { value: 'transactions', label: 'Apenas Transações' },
                { value: 'operational_events', label: 'Apenas Eventos Operacionais' },
              ]}
              {...deleteForm.getInputProps('target_table')}
            />

            <Switch
              label="Apagar apenas dados gerados pelo simulador"
              description="Mantém dados que não foram criados pelo simulador"
              {...deleteForm.getInputProps('only_simulator_data', { type: 'checkbox' })}
            />

            <Divider />

            <Group justify="flex-end">
              <Button variant="default" onClick={closeDeleteModal}>
                Cancelar
              </Button>
              <Button
                type="submit"
                color="red"
                loading={deleteMutation.isPending}
                leftSection={<IconTrash size={16} />}
              >
                Apagar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
