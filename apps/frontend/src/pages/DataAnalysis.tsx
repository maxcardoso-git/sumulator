import { useState, useMemo } from 'react';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

export function DataAnalysisPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [aiResult, setAiResult] = useState<InvokeExternalApiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedApi, setSelectedApi] = useState<ExternalApi | null>(null);
  const [dataSeed, setDataSeed] = useState<number>(Date.now());
  const [selectedMonths, setSelectedMonths] = useState<string[]>(MONTHS_OPTIONS.map(m => m.value));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonthForDaily, setSelectedMonthForDaily] = useState<string | null>(null);

  const { data: forms } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['form-submissions-stats', selectedFormId],
    queryFn: () => formsApi.getStats(selectedFormId || undefined),
  });

  const handleFormChange = (formId: string | null) => {
    setSelectedFormId(formId);
    setSelectedApi(null);
    setDataSeed(Date.now()); // Force data regeneration
    refetchStats();
  };

  const { data: availableApis } = useQuery({
    queryKey: ['external-apis-by-form', selectedFormId],
    queryFn: () => selectedFormId ? externalApisApi.getByForm(selectedFormId) : Promise.resolve([]),
    enabled: !!selectedFormId,
  });

  // Seeded random number generator for consistent data per form
  const seededRandom = (seed: number, index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  // Simulated monthly data (in a real app, this would come from an API)
  const monthlyData = useMemo<TransactionData[]>(() => {
    if (!stats?.form_submissions?.total) return [];

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const total = stats.form_submissions.total;
    const perMonth = Math.floor(total / 12);

    // Generate data for all months, then filter
    const allMonthsData = months.map((month, index) => {
      const yearSeed = parseInt(selectedYear) * 1000;
      const variance = seededRandom(dataSeed + yearSeed, index) * 0.4 - 0.2; // -20% to +20%
      const count = Math.max(1, Math.floor(perMonth * (1 + variance)));
      const avgValue = 1000 + seededRandom(dataSeed + yearSeed, index + 12) * 4000;

      return {
        month,
        total: Math.round(count * avgValue),
        count,
        avg: Math.round(avgValue),
        min: Math.round(avgValue * 0.3),
        max: Math.round(avgValue * 2.5),
        byType: {
          'Venda': Math.floor(count * 0.45),
          'Servico': Math.floor(count * 0.25),
          'Assinatura': Math.floor(count * 0.20),
          'Outro': Math.floor(count * 0.10),
        },
      };
    });

    // Filter by selected months
    return allMonthsData.filter(m => selectedMonths.includes(m.month));
  }, [stats, dataSeed, selectedMonths, selectedYear]);

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

  const totalStats = useMemo(() => {
    if (!monthlyData.length) return { total: 0, count: 0, avg: 0 };

    const total = monthlyData.reduce((acc, m) => acc + m.total, 0);
    const count = monthlyData.reduce((acc, m) => acc + m.count, 0);

    return {
      total,
      count,
      avg: count > 0 ? Math.round(total / count) : 0,
    };
  }, [monthlyData]);

  // Generate daily data for selected month
  const dailyData = useMemo<DailyData[]>(() => {
    if (!selectedMonthForDaily || !stats?.form_submissions?.total) return [];

    const monthIndex = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].indexOf(selectedMonthForDaily);
    if (monthIndex === -1) return [];

    // Get days in month
    const year = parseInt(selectedYear);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Get the monthly data for this month
    const monthData = monthlyData.find(m => m.month === selectedMonthForDaily);
    if (!monthData) return [];

    const dailyCount = Math.floor(monthData.count / daysInMonth);
    const dailyTotal = Math.floor(monthData.total / daysInMonth);

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const daySeed = dataSeed + year * 1000 + monthIndex * 100 + day;
      const variance = seededRandom(daySeed, day) * 0.6 - 0.3; // -30% to +30%
      const count = Math.max(1, Math.floor(dailyCount * (1 + variance)));
      const total = Math.round(dailyTotal * (1 + variance));

      return {
        day,
        total,
        count,
        avg: count > 0 ? Math.round(total / count) : 0,
      };
    });
  }, [selectedMonthForDaily, stats, selectedYear, monthlyData, dataSeed, seededRandom]);

  // Handler for bar click
  const handleBarClick = (data: { month?: string }) => {
    if (data?.month) {
      const month = data.month;
      setSelectedMonthForDaily(prev => prev === month ? null : month);
    }
  };

  // Get full month name for display
  const getMonthFullName = (abbr: string) => {
    const option = MONTHS_OPTIONS.find(m => m.value === abbr);
    return option?.label || abbr;
  };

  const handleExplainWithAI = async () => {
    if (!selectedApi) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma API de analise',
        color: 'red',
      });
      return;
    }

    setAiModal(true);
    setAiLoading(true);
    setAiResult(null);

    try {
      const result = await externalApisApi.invoke(selectedApi.id, {
        payload: {
          form_code: forms?.find((f) => f.id === selectedFormId)?.code,
          period: 'ultimo_ano',
          data_summary: {
            total_value: totalStats.total,
            transaction_count: totalStats.count,
            average_value: totalStats.avg,
            monthly_data: monthlyData.map((m) => ({
              month: m.month,
              total: m.total,
              count: m.count,
              by_type: m.byType,
            })),
            distribution_by_type: pieData,
          },
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

          {selectedFormId && (
            <Select
              label="API de Analise IA"
              placeholder="Selecione a API"
              data={availableApis?.map((a) => ({ value: a.id, label: a.name })) || []}
              value={selectedApi?.id || null}
              onChange={(id) => setSelectedApi(availableApis?.find((a) => a.id === id) || null)}
              style={{ minWidth: 300 }}
              disabled={!availableApis?.length}
              description={!availableApis?.length ? 'Nenhuma API vinculada a este formulario' : undefined}
            />
          )}

          {selectedApi && (
            <Button
              leftSection={<IconBrain size={16} />}
              onClick={handleExplainWithAI}
              style={{ marginTop: 24 }}
            >
              Explique com IA
            </Button>
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

      {statsLoading ? (
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

          {/* Charts */}
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
            <Paper withBorder p="md">
              <Group justify="space-between" mb="md">
                <Text fw={600}>Volume Mensal</Text>
                <Text size="xs" c="dimmed">Clique em uma barra para ver detalhes diarios</Text>
              </Group>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} onClick={(e) => {
                  const payload = (e as { activePayload?: { payload?: { month?: string } }[] })?.activePayload?.[0]?.payload;
                  if (payload) handleBarClick(payload);
                }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
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
              <Text fw={600} mb="md">Distribuicao por Tipo</Text>
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: selectedMonthForDaily ? 2 : 1 }}>
            <Paper withBorder p="md">
              <Text fw={600} mb="md">Tendencia Mensal (Quantidade)</Text>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#228be6" name="Quantidade" strokeWidth={2} />
                  <Line type="monotone" dataKey="avg" stroke="#40c057" name="Valor Medio" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>

            {selectedMonthForDaily && dailyData.length > 0 && (
              <Paper withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Text fw={600}>
                    Tendencia Diaria - {getMonthFullName(selectedMonthForDaily)} {selectedYear}
                  </Text>
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
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Valor Total') {
                          return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        }
                        return value.toLocaleString('pt-BR');
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#228be6" name="Quantidade" strokeWidth={2} />
                    <Line type="monotone" dataKey="total" stroke="#40c057" name="Valor Total" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            )}
          </SimpleGrid>
        </>
      )}

      {/* AI Analysis Modal */}
      <Modal
        opened={aiModal}
        onClose={() => setAiModal(false)}
        title="Analise com IA"
        size="lg"
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
              <Alert
                color={aiResult.success ? 'green' : 'red'}
                title={aiResult.success ? 'Analise Concluida' : 'Erro na Analise'}
                icon={aiResult.success ? <IconCheck /> : <IconX />}
              >
                {aiResult.success
                  ? `Resposta recebida em ${aiResult.latency_ms}ms`
                  : aiResult.error}
              </Alert>

              {aiResult.response && (
                <>
                  <Divider label="Resposta da IA" labelPosition="center" />
                  <Paper withBorder p="md" bg="gray.0">
                    <ScrollArea h={300}>
                      {typeof aiResult.response === 'string' ? (
                        <Text style={{ whiteSpace: 'pre-wrap' }}>{aiResult.response}</Text>
                      ) : (
                        <Code block>{JSON.stringify(aiResult.response, null, 2)}</Code>
                      )}
                    </ScrollArea>
                  </Paper>
                </>
              )}

              <Divider label="Dados Enviados" labelPosition="center" />
              <Paper withBorder p="sm">
                <ScrollArea h={150}>
                  <Code block>{JSON.stringify(aiResult.request.body, null, 2)}</Code>
                </ScrollArea>
              </Paper>
            </>
          ) : null}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAiModal(false)}>
              Fechar
            </Button>
            {!aiLoading && (
              <Button onClick={handleExplainWithAI}>
                Analisar Novamente
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
