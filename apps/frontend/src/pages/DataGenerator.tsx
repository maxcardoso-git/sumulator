import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Tabs,
  ScrollArea,
  Code,
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
  IconForms,
  IconRefresh,
} from '@tabler/icons-react';
import {
  dataGeneratorApi,
  formsApi,
  FormDefinition,
  GenerateDataResult,
  DeleteDataInput,
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

// Interface para dados gerados por formulário
interface FormGeneratedData {
  formId: string;
  formName: string;
  formCode: string;
  data: Record<string, unknown>[];
  generatedAt: string;
}

// Função para gerar valor baseado no tipo do campo do schema
function generateValueForField(
  fieldName: string,
  fieldSchema: Record<string, unknown>
): unknown {
  const fieldType = fieldSchema.type as string;
  const format = fieldSchema.format as string | undefined;
  const enumValues = fieldSchema.enum as string[] | undefined;

  // Se tem enum, escolhe um valor aleatório
  if (enumValues && enumValues.length > 0) {
    return enumValues[Math.floor(Math.random() * enumValues.length)];
  }

  switch (fieldType) {
    case 'string':
      if (format === 'email') {
        const names = ['joao', 'maria', 'pedro', 'ana', 'carlos', 'lucia'];
        const domains = ['email.com', 'empresa.com.br', 'teste.com'];
        return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
      }
      if (format === 'date' || format === 'date-time') {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 365));
        return format === 'date'
          ? date.toISOString().split('T')[0]
          : date.toISOString();
      }
      // Gera texto baseado no nome do campo
      if (fieldName.toLowerCase().includes('nome') || fieldName.toLowerCase().includes('name')) {
        const names = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Pereira', 'Lucia Ferreira'];
        return names[Math.floor(Math.random() * names.length)];
      }
      if (fieldName.toLowerCase().includes('descricao') || fieldName.toLowerCase().includes('description')) {
        const descriptions = [
          'Descrição detalhada do item solicitado',
          'Solicitação urgente para análise',
          'Necessita atenção especial',
          'Item de rotina para processamento',
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
      }
      if (fieldName.toLowerCase().includes('titulo') || fieldName.toLowerCase().includes('title')) {
        const titles = [
          'Solicitação #' + Math.floor(Math.random() * 10000),
          'Chamado Urgente',
          'Requisição de Serviço',
          'Pedido de Suporte',
        ];
        return titles[Math.floor(Math.random() * titles.length)];
      }
      if (fieldName.toLowerCase().includes('documento') || fieldName.toLowerCase().includes('cpf') || fieldName.toLowerCase().includes('cnpj')) {
        // Gera CPF fake
        return `${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}`;
      }
      return `Valor ${fieldName} #${Math.floor(Math.random() * 1000)}`;

    case 'number':
      const min = (fieldSchema.minimum as number) ?? 0;
      const max = (fieldSchema.maximum as number) ?? 10000;
      return Math.round((Math.random() * (max - min) + min) * 100) / 100;

    case 'integer':
      const intMin = (fieldSchema.minimum as number) ?? 0;
      const intMax = (fieldSchema.maximum as number) ?? 100;
      return Math.floor(Math.random() * (intMax - intMin) + intMin);

    case 'boolean':
      return Math.random() > 0.5;

    default:
      return `Valor ${fieldName}`;
  }
}

// Função para gerar dados baseados no schema do formulário
function generateDataFromSchema(
  schema: Record<string, unknown>,
  count: number
): Record<string, unknown>[] {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return [];

  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      row[fieldName] = generateValueForField(fieldName, fieldSchema);
    }
    row._generated_at = new Date().toISOString();
    row._row_index = i + 1;
    data.push(row);
  }
  return data;
}

export function DataGeneratorPage() {
  const [result, setResult] = useState<GenerateDataResult | null>(null);
  const [distributions, setDistributions] = useState<DistributionConfig[]>(defaultDistributions);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [previewFilter, setPreviewFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string | null>('tables');

  // Estados para geração por formulário
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formRowCount, setFormRowCount] = useState<number>(10);
  const [formGeneratedData, setFormGeneratedData] = useState<FormGeneratedData[]>([]);

  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });

  const selectedForm = useMemo(() => {
    return forms?.find((f) => f.id === selectedFormId);
  }, [forms, selectedFormId]);

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

  // Função para gerar dados por formulário
  const handleGenerateFormData = () => {
    if (!selectedForm) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione um formulário',
        color: 'red',
      });
      return;
    }

    const generatedData = generateDataFromSchema(selectedForm.schema, formRowCount);

    const newFormData: FormGeneratedData = {
      formId: selectedForm.id,
      formName: selectedForm.name,
      formCode: selectedForm.code,
      data: generatedData,
      generatedAt: new Date().toISOString(),
    };

    // Adiciona ao início da lista (mais recente primeiro)
    setFormGeneratedData((prev) => [newFormData, ...prev]);

    notifications.show({
      title: 'Dados Gerados',
      message: `${formRowCount} registros gerados para o formulário "${selectedForm.name}"`,
      color: 'green',
    });
  };

  // Limpar dados gerados por formulário
  const handleClearFormData = (formId?: string) => {
    if (formId) {
      setFormGeneratedData((prev) => prev.filter((f) => f.formId !== formId));
    } else {
      setFormGeneratedData([]);
    }
  };

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

          <Card withBorder padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Dados de Formulários
                </Text>
                <Text size="xl" fw={700}>
                  {formGeneratedData.reduce((sum, f) => sum + f.data.length, 0)}
                </Text>
                <Text size="xs" c="dimmed">
                  {formGeneratedData.length} lotes gerados
                </Text>
              </div>
              <IconForms size={32} color="var(--mantine-color-violet-6)" />
            </Group>
          </Card>
        </SimpleGrid>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="tables" leftSection={<IconDatabase size={16} />}>
            Tabelas (Transactions/Events)
          </Tabs.Tab>
          <Tabs.Tab value="forms" leftSection={<IconForms size={16} />}>
            Formulários
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tables" pt="md">
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
        </Tabs.Panel>

        <Tabs.Panel value="forms" pt="md">
          <Stack>
            {/* Form Generator */}
            <Paper withBorder p="md">
              <Stack>
                <Group justify="space-between">
                  <Text fw={600}>Gerar Dados por Formulário</Text>
                  {formGeneratedData.length > 0 && (
                    <Button
                      color="red"
                      variant="subtle"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleClearFormData()}
                    >
                      Limpar Todos
                    </Button>
                  )}
                </Group>

                <Group grow align="flex-end">
                  <Select
                    label="Formulário"
                    placeholder="Selecione um formulário"
                    data={forms?.map((f) => ({
                      value: f.id,
                      label: `${f.name} (${f.code})`,
                    })) || []}
                    value={selectedFormId}
                    onChange={setSelectedFormId}
                    searchable
                  />
                  <NumberInput
                    label="Quantidade de Registros"
                    min={1}
                    max={1000}
                    value={formRowCount}
                    onChange={(value) => setFormRowCount(typeof value === 'number' ? value : 10)}
                  />
                  <Button
                    leftSection={<IconPlayerPlay size={16} />}
                    onClick={handleGenerateFormData}
                    disabled={!selectedFormId}
                  >
                    Gerar Dados
                  </Button>
                </Group>

                {selectedForm && (
                  <Paper withBorder p="sm" bg="gray.0">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        Schema do Formulário: {selectedForm.name}
                      </Text>
                      <Badge variant="light">{selectedForm.code}</Badge>
                    </Group>
                    <ScrollArea h={150}>
                      <Code block>{JSON.stringify(selectedForm.schema, null, 2)}</Code>
                    </ScrollArea>
                  </Paper>
                )}
              </Stack>
            </Paper>

            {/* Generated Data List */}
            {formGeneratedData.length > 0 && (
              <Accordion variant="separated">
                {formGeneratedData.map((formData, idx) => (
                  <Accordion.Item key={`${formData.formId}-${idx}`} value={`${formData.formId}-${idx}`}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
                        <Group gap="sm">
                          <IconForms size={20} color="var(--mantine-color-violet-6)" />
                          <div>
                            <Text fw={500}>{formData.formName}</Text>
                            <Text size="xs" c="dimmed">
                              {formData.data.length} registros - Gerado em{' '}
                              {new Date(formData.generatedAt).toLocaleString('pt-BR')}
                            </Text>
                          </div>
                        </Group>
                        <Badge variant="light">{formData.formCode}</Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack>
                        <Group justify="flex-end">
                          <Button
                            color="red"
                            variant="subtle"
                            size="xs"
                            leftSection={<IconTrash size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormGeneratedData((prev) =>
                                prev.filter((_, i) => i !== idx)
                              );
                            }}
                          >
                            Remover Lote
                          </Button>
                        </Group>

                        <ScrollArea>
                          <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>#</Table.Th>
                                {formData.data[0] &&
                                  Object.keys(formData.data[0])
                                    .filter((k) => !k.startsWith('_'))
                                    .slice(0, 6)
                                    .map((key) => (
                                      <Table.Th key={key}>{key}</Table.Th>
                                    ))}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {formData.data.slice(0, 20).map((row, rowIdx) => (
                                <Table.Tr key={rowIdx}>
                                  <Table.Td>
                                    <Text size="xs" c="dimmed">
                                      {rowIdx + 1}
                                    </Text>
                                  </Table.Td>
                                  {Object.entries(row)
                                    .filter(([k]) => !k.startsWith('_'))
                                    .slice(0, 6)
                                    .map(([key, val], colIdx) => (
                                      <Table.Td key={colIdx}>
                                        <Text size="xs" lineClamp={1}>
                                          {typeof val === 'boolean'
                                            ? val
                                              ? 'Sim'
                                              : 'Não'
                                            : typeof val === 'object'
                                              ? JSON.stringify(val)
                                              : String(val)}
                                        </Text>
                                      </Table.Td>
                                    ))}
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>

                        {formData.data.length > 20 && (
                          <Text size="xs" c="dimmed" ta="center">
                            Mostrando 20 de {formData.data.length} registros
                          </Text>
                        )}

                        <Divider />

                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            JSON dos Dados Gerados:
                          </Text>
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => {
                              const form = forms?.find((f) => f.id === formData.formId);
                              if (form) {
                                const newData = generateDataFromSchema(form.schema, formData.data.length);
                                setFormGeneratedData((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, data: newData, generatedAt: new Date().toISOString() }
                                      : item
                                  )
                                );
                                notifications.show({
                                  title: 'Dados Regenerados',
                                  message: `Novos dados gerados para "${formData.formName}"`,
                                  color: 'blue',
                                });
                              }
                            }}
                          >
                            Regenerar
                          </Button>
                        </Group>
                        <ScrollArea h={200}>
                          <Code block>{JSON.stringify(formData.data, null, 2)}</Code>
                        </ScrollArea>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}

            {formGeneratedData.length === 0 && (
              <Paper withBorder p="xl">
                <Text c="dimmed" ta="center">
                  Nenhum dado de formulário gerado ainda. Selecione um formulário acima e clique em
                  "Gerar Dados".
                </Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

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
