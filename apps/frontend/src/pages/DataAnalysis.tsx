import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Select,
  Button,
  Modal,
  Loader,
  Alert,
  SimpleGrid,
  Card,
  ThemeIcon,
  ScrollArea,
  Code,
  Divider,
  Center,
  MultiSelect,
  ActionIcon,
  Tooltip,
  SegmentedControl,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChartBar,
  IconChartPie,
  IconChartLine,
  IconBrain,
  IconCheck,
  IconX,
  IconRefresh,
  IconDatabaseOff,
  IconCalendar,
} from '@tabler/icons-react';
import { ChartRenderer } from '../components/ChartRenderer';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  formsApi,
  externalApisApi,
  ExternalApi,
  InvokeExternalApiResult,
} from '../lib/api';

const COLORS = ['#228be6', '#40c057', '#fab005', '#fa5252', '#7950f2', '#15aabf', '#fd7e14', '#e64980'];

interface TransactionData {
  month: string;
  total: number;
  count: number;
  avg: number;
  min: number;
  max: number;
  byType: Record<string, number>;
}

interface DailyData {
  day: number;
  total: number;
  count: number;
  avg: number;
}

const MONTHS_OPTIONS = [
  { value: 'Jan', label: 'Janeiro' },
  { value: 'Fev', label: 'Fevereiro' },
  { value: 'Mar', label: 'Marco' },
  { value: 'Abr', label: 'Abril' },
  { value: 'Mai', label: 'Maio' },
  { value: 'Jun', label: 'Junho' },
  { value: 'Jul', label: 'Julho' },
  { value: 'Ago', label: 'Agosto' },
  { value: 'Set', label: 'Setembro' },
  { value: 'Out', label: 'Outubro' },
  { value: 'Nov', label: 'Novembro' },
  { value: 'Dez', label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const YEARS_OPTIONS = [
  { value: String(currentYear - 2), label: String(currentYear - 2) },
  { value: String(currentYear - 1), label: String(currentYear - 1) },
  { value: String(currentYear), label: String(currentYear) },
];

// Helper function to format field labels
const formatFieldLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper function to format values
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString('pt-BR');
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
};

// Helper function to extract chart data from AI response
type ChartDataPoint = Record<string, string | number | null | undefined>;
const extractChartData = (response: unknown): ChartDataPoint[] => {
  if (!response || typeof response !== 'object') return [];

  const data = response as Record<string, unknown>;

  // Look for common array fields that contain chart data
  const arrayFields = [
    'monthly_totals',
    'data',
    'results',
    'items',
    'records',
    'values',
    'chart_data',
    'series',
    'metrics',
    'statistics',
  ];

  for (const field of arrayFields) {
    if (Array.isArray(data[field]) && data[field].length > 0) {
      return data[field] as ChartDataPoint[];
    }
  }

  // If response itself is an array
  if (Array.isArray(response) && response.length > 0) {
    return response as ChartDataPoint[];
  }

  // Try to find any array property at the top level
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key]) && (data[key] as unknown[]).length > 0) {
      const arr = data[key] as unknown[];
      // Check if array items are objects (not primitives)
      if (arr[0] && typeof arr[0] === 'object') {
        return arr as ChartDataPoint[];
      }
    }
  }

  // If no arrays found, try to convert single object to array
  if (!Array.isArray(response) && typeof response === 'object') {
    const keys = Object.keys(data);
    const numericKeys = keys.filter(k => typeof data[k] === 'number');
    if (numericKeys.length > 0) {
      // Create array from object properties
      return numericKeys.map(key => ({
        label: formatFieldLabel(key),
        value: data[key] as number,
      }));
    }
  }

  return [];
};

// Structured view component for AI response
function StructuredResponseView({ data }: { data: unknown }) {
  if (typeof data === 'string') {
    return <Text style={{ whiteSpace: 'pre-wrap' }}>{data}</Text>;
  }

  if (!data || typeof data !== 'object') {
    return <Text c="dimmed">Sem dados</Text>;
  }

  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Text c="dimmed">-</Text>;
    }

    if (typeof value === 'string') {
      return <Text style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>;
    }

    if (typeof value === 'number') {
      return <Text fw={500}>{formatValue(value)}</Text>;
    }

    if (typeof value === 'boolean') {
      return <Text c={value ? 'green' : 'red'}>{value ? 'Sim' : 'Nao'}</Text>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <Text c="dimmed">Lista vazia</Text>;
      }
      // Check if it's an array of simple values
      if (value.every(v => typeof v !== 'object' || v === null)) {
        return <Text>{value.map(v => formatValue(v)).join(', ')}</Text>;
      }
      // Array of objects
      return (
        <Stack gap="xs">
          {value.map((item, index) => (
            <Paper key={index} withBorder p="xs" bg="white">
              <Text size="xs" c="dimmed" mb="xs">Item {index + 1}</Text>
              {renderValue(item, depth + 1)}
            </Paper>
          ))}
        </Stack>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      return (
        <Stack gap="xs">
          {entries.map(([key, val]) => (
            <Group key={key} align="flex-start" gap="xs" wrap="nowrap">
              <Text size="sm" fw={600} c="dimmed" style={{ minWidth: 120 }}>
                {formatFieldLabel(key)}:
              </Text>
              <div style={{ flex: 1 }}>{renderValue(val, depth + 1)}</div>
            </Group>
          ))}
        </Stack>
      );
    }

    return <Text>{String(value)}</Text>;
  };

  return renderValue(data);
}

// Structured view component for request data
function StructuredRequestView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) {
    return <Text c="dimmed">Sem dados</Text>;
  }

  const renderRequestData = (obj: Record<string, unknown>): React.ReactNode => {
    const entries = Object.entries(obj);

    return (
      <Stack gap="sm">
        {entries.map(([key, value]) => {
          // Special handling for known fields
          if (key === 'data' && typeof value === 'object' && value !== null) {
            return (
              <Paper key={key} withBorder p="sm" bg="white">
                <Text fw={600} mb="xs">{formatFieldLabel(key)}</Text>
                {renderNestedData(value as Record<string, unknown>)}
              </Paper>
            );
          }

          if (key === 'selected_months' && Array.isArray(value)) {
            return (
              <Group key={key} align="flex-start" gap="xs" wrap="nowrap">
                <Text size="sm" fw={600} c="dimmed" style={{ minWidth: 130 }}>
                  Meses Selecionados:
                </Text>
                <Group gap="xs">
                  {value.map((month, i) => (
                    <Text key={i} size="sm" span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: 4 }}>
                      {month}
                    </Text>
                  ))}
                </Group>
              </Group>
            );
          }

          return (
            <Group key={key} align="flex-start" gap="xs" wrap="nowrap">
              <Text size="sm" fw={600} c="dimmed" style={{ minWidth: 130 }}>
                {formatFieldLabel(key)}:
              </Text>
              <Text size="sm">{formatValue(value)}</Text>
            </Group>
          );
        })}
      </Stack>
    );
  };

  const renderNestedData = (obj: Record<string, unknown>): React.ReactNode => {
    const entries = Object.entries(obj);

    return (
      <Stack gap="xs">
        {entries.map(([key, value]) => {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            // Array of objects (like monthly_totals)
            return (
              <div key={key}>
                <Text size="sm" fw={600} c="dimmed" mb="xs">{formatFieldLabel(key)}:</Text>
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="xs">
                  {value.slice(0, 12).map((item, index) => (
                    <Paper key={index} withBorder p="xs" bg="gray.0">
                      {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                        <Text key={k} size="xs">
                          <Text span fw={600}>{formatFieldLabel(k)}:</Text> {formatValue(v)}
                        </Text>
                      ))}
                    </Paper>
                  ))}
                </SimpleGrid>
              </div>
            );
          }

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Nested object (like summary)
            return (
              <Paper key={key} withBorder p="xs" bg="gray.0">
                <Text size="sm" fw={600} mb="xs">{formatFieldLabel(key)}</Text>
                <Group gap="lg">
                  {Object.entries(value).map(([k, v]) => (
                    <div key={k}>
                      <Text size="xs" c="dimmed">{formatFieldLabel(k)}</Text>
                      <Text size="sm" fw={500}>{formatValue(v)}</Text>
                    </div>
                  ))}
                </Group>
              </Paper>
            );
          }

          return (
            <Group key={key} align="center" gap="xs">
              <Text size="sm" fw={600} c="dimmed">{formatFieldLabel(key)}:</Text>
              <Text size="sm">{formatValue(value)}</Text>
            </Group>
          );
        })}
      </Stack>
    );
  };

  return renderRequestData(data);
}

export function DataAnalysisPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [aiResult, setAiResult] = useState<InvokeExternalApiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ExternalApi | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS_OPTIONS.map(m => m.value));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonthForDaily, setSelectedMonthForDaily] = useState<string | null>(null);
  const [aiChartContext, setAiChartContext] = useState<string>('');
  const [aiViewMode, setAiViewMode] = useState<'structured' | 'chart' | 'json'>('structured');

  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['form-submissions-stats', selectedFormId],
    queryFn: () => formsApi.getStats(selectedFormId || undefined),
    enabled: !!selectedFormId,
  });

  // Fetch real monthly stats from API
  const { data: monthlyStatsData } = useQuery({
    queryKey: ['form-monthly-stats', selectedFormId, selectedYear],
    queryFn: () => formsApi.getMonthlyStats(selectedFormId!, parseInt(selectedYear)),
    enabled: !!selectedFormId,
  });

  // Fetch real daily stats from API
  const { data: dailyStatsData } = useQuery({
    queryKey: ['form-daily-stats', selectedFormId, selectedYear, selectedMonthForDaily],
    queryFn: () => {
      const monthIndex = MONTHS_OPTIONS.findIndex(m => m.value === selectedMonthForDaily);
      return formsApi.getDailyStats(selectedFormId!, parseInt(selectedYear), monthIndex);
    },
    enabled: !!selectedFormId && !!selectedMonthForDaily,
  });

  const handleFormChange = (formId: string | null) => {
    setSelectedFormId(formId);
    setSelectedApi(null);
    refetchStats();
  };

  const { data: availableApis } = useQuery({
    queryKey: ['external-apis-by-form', selectedFormId],
    queryFn: () => selectedFormId ? externalApisApi.getByForm(selectedFormId) : Promise.resolve([]),
    enabled: !!selectedFormId,
  });

  // Auto-select first API when form has associated APIs
  useEffect(() => {
    if (availableApis?.length) {
      setSelectedApi(availableApis[0]);
    } else {
      setSelectedApi(null);
    }
  }, [availableApis]);

  // Transform API monthly stats to chart data format
  const monthlyData = useMemo<TransactionData[]>(() => {
    if (!monthlyStatsData?.months) return [];

    // Filter by selected months and transform to chart format
    return monthlyStatsData.months
      .filter(m => selectedMonths.includes(m.month))
      .map(m => ({
        month: m.month,
        total: m.total,
        count: m.count,
        avg: m.avg,
        min: m.min,
        max: m.max,
        byType: m.byType,
      }));
  }, [monthlyStatsData, selectedMonths]);

  const pieData = useMemo(() => {
    if (!monthlyData.length) return [];

    const totals: Record<string, number> = {};
    monthlyData.forEach((m) => {
      Object.entries(m.byType).forEach(([type, count]) => {
        totals[type] = (totals[type] || 0) + count;
      });
    });

    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [monthlyData]);

  // Calculate total stats from real monthly data or API summary
  const totalStats = useMemo(() => {
    if (monthlyStatsData?.summary) {
      return {
        total: monthlyStatsData.summary.totalValue,
        count: monthlyStatsData.summary.totalCount,
        avg: monthlyStatsData.summary.avgValue,
      };
    }
    if (!monthlyData.length) return { total: 0, count: 0, avg: 0 };

    const total = monthlyData.reduce((acc, m) => acc + m.total, 0);
    const count = monthlyData.reduce((acc, m) => acc + m.count, 0);

    return {
      total,
      count,
      avg: count > 0 ? Math.round(total / count) : 0,
    };
  }, [monthlyData, monthlyStatsData]);

  // Transform API daily stats to chart data format
  const dailyData = useMemo<DailyData[]>(() => {
    if (!dailyStatsData?.days) return [];

    return dailyStatsData.days.map(d => ({
      day: d.day,
      total: d.total,
      count: d.count,
      avg: d.avg,
    }));
  }, [dailyStatsData]);

  // Get full month name for display
  const getMonthFullName = (abbr: string) => {
    const option = MONTHS_OPTIONS.find(m => m.value === abbr);
    return option?.label || abbr;
  };

  const handleExplainWithAI = async (chartContext: string, chartData: unknown) => {
    if (!selectedApi) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma API de analise',
        color: 'red',
      });
      return;
    }

    setAiChartContext(chartContext);
    setAiModal(true);
    setAiLoading(true);
    setAiResult(null);
    setAiViewMode('structured');

    try {
      const result = await externalApisApi.invoke(selectedApi.id, {
        payload: {
          form_code: forms?.find((f) => f.id === selectedFormId)?.code,
          chart_type: chartContext,
          period: selectedYear,
          selected_months: selectedMonths,
          data: chartData,
        },
      });
      setAiResult(result);
    } catch (error) {
      setAiResult({
        success: false,
        status: 'ERROR',
        latency_ms: 0,
        response: null,
        error: error instanceof Error ? error.message : 'Erro ao chamar API',
        request: { url: '', method: '', headers: {}, body: null },
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Prepare chart-specific data for AI explanation
  const handleExplainVolumeMensal = () => {
    handleExplainWithAI('Volume Mensal (Total por Mes)', {
      monthly_totals: monthlyData.map((m) => ({
        month: m.month,
        total: m.total,
        count: m.count,
      })),
      summary: {
        total_value: totalStats.total,
        total_count: totalStats.count,
        average_value: totalStats.avg,
      },
    });
  };

  const handleExplainPieChart = () => {
    handleExplainWithAI('Distribuicao por Tipo', {
      distribution: pieData,
      total: pieData.reduce((acc, p) => acc + p.value, 0),
    });
  };

  const handleExplainTrendChart = () => {
    handleExplainWithAI('Tendencia Mensal (Quantidade)', {
      monthly_trend: monthlyData.map((m) => ({
        month: m.month,
        count: m.count,
        avg: m.avg,
      })),
      trend_analysis: {
        first_month: monthlyData[0]?.count || 0,
        last_month: monthlyData[monthlyData.length - 1]?.count || 0,
        growth: monthlyData.length > 1
          ? ((monthlyData[monthlyData.length - 1]?.count || 0) - (monthlyData[0]?.count || 0)) / (monthlyData[0]?.count || 1) * 100
          : 0,
      },
    });
  };

  const handleExplainDailyTrend = () => {
    if (!selectedMonthForDaily) return;
    handleExplainWithAI(`Tendencia Diaria - ${getMonthFullName(selectedMonthForDaily)} ${selectedYear}`, {
      month: selectedMonthForDaily,
      year: selectedYear,
      daily_trend: dailyData.map((d) => ({
        day: d.day,
        count: d.count,
        total: d.total,
      })),
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Analise de Dados</Title>
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={() => refetchStats()}
          loading={statsLoading}
        >
          Atualizar
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Group>
          <Select
            label="Fonte de Dados (Formulario)"
            placeholder="Selecione um formulario"
            data={forms?.map((f) => ({ value: f.id, label: `${f.name} (${f.code})` })) || []}
            value={selectedFormId}
            onChange={handleFormChange}
            style={{ minWidth: 300 }}
          />

          {selectedFormId && selectedApi && (
            <Text size="sm" c="dimmed">
              API: <Text span fw={500} c="blue">{selectedApi.name}</Text>
            </Text>
          )}
          {selectedFormId && !availableApis?.length && (
            <Text size="sm" c="orange">
              Nenhuma API vinculada a este formulario
            </Text>
          )}
        </Group>
      </Paper>

      {/* Date Filters */}
      <Paper withBorder p="md">
        <Group align="flex-end">
          <Select
            label="Ano"
            placeholder="Selecione o ano"
            leftSection={<IconCalendar size={16} />}
            data={YEARS_OPTIONS}
            value={selectedYear}
            onChange={(value) => value && setSelectedYear(value)}
            style={{ minWidth: 120 }}
          />
          <MultiSelect
            label="Meses"
            placeholder="Selecione os meses"
            data={MONTHS_OPTIONS}
            value={selectedMonths}
            onChange={setSelectedMonths}
            style={{ minWidth: 400 }}
            searchable
            clearable
          />
          <Button
            variant="light"
            onClick={() => setSelectedMonths(MONTHS_OPTIONS.map(m => m.value))}
          >
            Todos
          </Button>
          <Button
            variant="light"
            color="gray"
            onClick={() => setSelectedMonths([])}
          >
            Limpar
          </Button>
        </Group>
      </Paper>

      {!selectedFormId ? (
        <Alert
          icon={<IconDatabaseOff size={24} />}
          title="Selecione um formulario"
          color="blue"
        >
          Selecione um formulario acima para visualizar os dados e graficos.
        </Alert>
      ) : statsLoading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : !stats?.form_submissions?.total ? (
        <Alert
          icon={<IconDatabaseOff size={24} />}
          title="Sem dados"
          color="yellow"
        >
          Nao ha dados gerados ainda. Acesse o Data Generator para gerar dados de teste.
        </Alert>
      ) : (
        <>
          {/* Summary Cards */}
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Card withBorder>
              <Group>
                <ThemeIcon size="xl" variant="light" color="blue">
                  <IconChartBar size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Total de Transacoes</Text>
                  <Text size="xl" fw={700}>{totalStats.count.toLocaleString('pt-BR')}</Text>
                </div>
              </Group>
            </Card>
            <Card withBorder>
              <Group>
                <ThemeIcon size="xl" variant="light" color="green">
                  <IconChartLine size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Valor Total</Text>
                  <Text size="xl" fw={700}>
                    {totalStats.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </div>
              </Group>
            </Card>
            <Card withBorder>
              <Group>
                <ThemeIcon size="xl" variant="light" color="violet">
                  <IconChartPie size={24} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">Ticket Medio</Text>
                  <Text size="xl" fw={700}>
                    {totalStats.avg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </div>
              </Group>
            </Card>
          </SimpleGrid>

          {/* Charts - Volume Mensal and Daily Drill-down */}
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Volume Mensal (Total por Mes)</Text>
                  {selectedApi && (
                    <Tooltip label="Explicar com IA">
                      <ActionIcon
                        variant="light"
                        color="violet"
                        size="sm"
                        onClick={handleExplainVolumeMensal}
                      >
                        <IconBrain size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
                <Text size="xs" c="dimmed">Clique em uma barra para ver detalhes diarios</Text>
              </Group>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyData}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(state: any) => {
                    if (state?.activePayload?.[0]?.payload?.month) {
                      const month = state.activePayload[0].payload.month;
                      setSelectedMonthForDaily(prev => prev === month ? null : month);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip
                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  />
                  <Legend />
                  <Bar
                    dataKey="total"
                    name="Valor Total"
                    cursor="pointer"
                  >
                    {monthlyData.map((entry) => (
                      <Cell
                        key={`cell-${entry.month}`}
                        fill={entry.month === selectedMonthForDaily ? '#1971c2' : '#228be6'}
                        stroke={entry.month === selectedMonthForDaily ? '#1864ab' : undefined}
                        strokeWidth={entry.month === selectedMonthForDaily ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            <Paper withBorder p="md">
              <Group gap="xs" mb="md">
                <Text fw={600}>Distribuicao por Tipo</Text>
                {selectedApi && (
                  <Tooltip label="Explicar com IA">
                    <ActionIcon
                      variant="light"
                      color="violet"
                      size="sm"
                      onClick={handleExplainPieChart}
                    >
                      <IconBrain size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </SimpleGrid>

          {/* Trend Charts */}
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Paper withBorder p="md">
              <Group gap="xs" mb="md">
                <Text fw={600}>Tendencia Mensal (Quantidade)</Text>
                {selectedApi && (
                  <Tooltip label="Explicar com IA">
                    <ActionIcon
                      variant="light"
                      color="violet"
                      size="sm"
                      onClick={handleExplainTrendChart}
                    >
                      <IconBrain size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#228be6" name="Quantidade" strokeWidth={2} />
                  <Line type="monotone" dataKey="avg" stroke="#40c057" name="Valor Medio" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            {selectedMonthForDaily && dailyData.length > 0 ? (
              <Paper withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Text fw={600}>
                      Drill-down: {getMonthFullName(selectedMonthForDaily)} {selectedYear}
                    </Text>
                    {selectedApi && (
                      <Tooltip label="Explicar com IA">
                        <ActionIcon
                          variant="light"
                          color="violet"
                          size="sm"
                          onClick={handleExplainDailyTrend}
                        >
                          <IconBrain size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                  <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    onClick={() => setSelectedMonthForDaily(null)}
                  >
                    Fechar
                  </Button>
                </Group>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Valor Total') {
                          return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        }
                        return value.toLocaleString('pt-BR');
                      }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Valor Total" fill="#40c057" />
                    <Bar dataKey="count" name="Quantidade" fill="#228be6" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            ) : (
              <Paper withBorder p="md">
                <Center h={350}>
                  <Stack align="center" gap="sm">
                    <ThemeIcon size="xl" variant="light" color="gray">
                      <IconChartBar size={24} />
                    </ThemeIcon>
                    <Text c="dimmed" ta="center">
                      Clique em uma barra do grafico de volume mensal<br />
                      para ver os detalhes diarios
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            )}
          </SimpleGrid>
        </>
      )}

      {/* AI Analysis Modal */}
      <Modal
        opened={aiModal}
        onClose={() => setAiModal(false)}
        title={`Analise com IA${aiChartContext ? ` - ${aiChartContext}` : ''}`}
        size="xl"
      >
        <Stack>
          {aiLoading ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text>Analisando dados com IA...</Text>
              </Stack>
            </Center>
          ) : aiResult ? (
            <>
              <Group justify="space-between" align="center">
                <Alert
                  color={aiResult.success ? 'green' : 'red'}
                  title={aiResult.success ? 'Analise Concluida' : 'Erro na Analise'}
                  icon={aiResult.success ? <IconCheck /> : <IconX />}
                  style={{ flex: 1 }}
                >
                  {aiResult.success
                    ? `Resposta recebida em ${aiResult.latency_ms}ms`
                    : aiResult.error}
                </Alert>
                <SegmentedControl
                  value={aiViewMode}
                  onChange={(v) => setAiViewMode(v as 'structured' | 'chart' | 'json')}
                  data={[
                    { value: 'structured', label: 'Estruturado' },
                    { value: 'chart', label: 'Grafico' },
                    { value: 'json', label: 'JSON' },
                  ]}
                />
              </Group>

              {aiResult.response && (
                <>
                  <Divider label="Resposta da IA" labelPosition="center" />
                  <Paper withBorder p="md" bg="gray.0">
                    {aiViewMode === 'json' ? (
                      <ScrollArea h={300}>
                        <Code block>{JSON.stringify(aiResult.response, null, 2)}</Code>
                      </ScrollArea>
                    ) : aiViewMode === 'chart' ? (
                      <ChartRenderer
                        data={extractChartData(aiResult.response)}
                        title={aiChartContext}
                        chartType="auto"
                        height={350}
                        showStats={true}
                      />
                    ) : (
                      <ScrollArea h={300}>
                        <StructuredResponseView data={aiResult.response} />
                      </ScrollArea>
                    )}
                  </Paper>
                </>
              )}

              <Divider label="Dados Enviados" labelPosition="center" />
              <Paper withBorder p="md" bg="gray.0">
                <ScrollArea h={200}>
                  {aiViewMode === 'json' ? (
                    <Code block>{JSON.stringify(aiResult.request.body, null, 2)}</Code>
                  ) : (
                    <StructuredRequestView data={aiResult.request.body} />
                  )}
                </ScrollArea>
              </Paper>
            </>
          ) : null}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAiModal(false)}>
              Fechar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
