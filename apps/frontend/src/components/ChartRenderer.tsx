import { useMemo } from 'react';
import { Paper, Text, Group, Stack, Badge, SimpleGrid, ThemeIcon } from '@mantine/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { IconTrendingUp, IconTrendingDown, IconMinus, IconAlertTriangle } from '@tabler/icons-react';

// Pulse Theme Colors
const PULSE_THEME = {
  primary: '#228be6',
  secondary: '#40c057',
  accent: '#fab005',
  danger: '#fa5252',
  neutral: '#868e96',
  background: '#f8f9fa',
  gradientStart: '#228be6',
  gradientEnd: '#40c057',
  colors: ['#228be6', '#40c057', '#fab005', '#fa5252', '#7950f2', '#20c997', '#e64980', '#fd7e14'],
};

// Types
interface DataPoint {
  [key: string]: string | number | null | undefined;
}

interface ChartStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  outliers: DataPoint[];
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

type ChartType = 'line' | 'bar' | 'area' | 'heatmap' | 'kpi-card' | 'auto';

interface ChartRendererProps {
  data: DataPoint[];
  chartType?: ChartType;
  title?: string;
  subtitle?: string;
  xKey?: string;
  yKeys?: string[];
  height?: number;
  showStats?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  formatValue?: (value: number) => string;
  formatLabel?: (label: string) => string;
}

// Utility functions
function detectChartType(data: DataPoint[]): ChartType {
  if (!data || data.length === 0) return 'bar';

  const keys = Object.keys(data[0] || {});
  const hasDateField = keys.some((k) =>
    /date|time|mes|month|dia|day|ano|year/i.test(k)
  );
  const numericKeys = keys.filter((k) => typeof data[0][k] === 'number');

  // If only one numeric field and it's likely a KPI
  if (numericKeys.length === 1 && data.length === 1) {
    return 'kpi-card';
  }

  // Time series -> Line chart
  if (hasDateField && data.length > 5) {
    return 'line';
  }

  // Monthly aggregates -> Bar chart
  if (data.length <= 12 && data.length >= 2) {
    return 'bar';
  }

  // Many data points -> Area chart
  if (data.length > 20) {
    return 'area';
  }

  return 'bar';
}

function detectAxisKeys(data: DataPoint[]): { xKey: string; yKeys: string[] } {
  if (!data || data.length === 0) return { xKey: '', yKeys: [] };

  const keys = Object.keys(data[0] || {});
  const sample = data[0];

  // Find the x-axis key (usually date/time or categorical)
  let xKey = keys.find((k) =>
    /date|time|mes|month|dia|day|ano|year|periodo|label|name|categoria|category/i.test(k)
  ) || keys[0];

  // Find numeric keys for y-axis
  const yKeys = keys.filter((k) => {
    if (k === xKey) return false;
    const val = sample[k];
    return typeof val === 'number' || !isNaN(Number(val));
  });

  return { xKey, yKeys };
}

function calculateStats(data: DataPoint[], yKey: string): ChartStats {
  const values = data
    .map((d) => Number(d[yKey]))
    .filter((v) => !isNaN(v) && v !== null);

  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      outliers: [],
      trend: 'stable',
      percentageChange: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Calculate standard deviation
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Detect outliers (values beyond 2 standard deviations)
  const lowerBound = mean - 2 * stdDev;
  const upperBound = mean + 2 * stdDev;
  const outliers = data.filter((d) => {
    const v = Number(d[yKey]);
    return v < lowerBound || v > upperBound;
  });

  // Calculate trend
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const percentageChange = firstValue !== 0
    ? ((lastValue - firstValue) / firstValue) * 100
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 5) trend = 'up';
  else if (percentageChange < -5) trend = 'down';

  return { min, max, mean, median, stdDev, outliers, trend, percentageChange };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

// KPI Card Component
function KPICard({
  title,
  value,
  change,
  trend,
  formatValue = formatCurrency,
}: {
  title: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  formatValue?: (v: number) => string;
}) {
  const trendColor = trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray';
  const TrendIcon = trend === 'up' ? IconTrendingUp : trend === 'down' ? IconTrendingDown : IconMinus;

  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed" mb={4}>{title}</Text>
      <Text size="xl" fw={700}>{formatValue(value)}</Text>
      {change !== undefined && (
        <Group gap={4} mt="xs">
          <ThemeIcon size="sm" variant="light" color={trendColor}>
            <TrendIcon size={14} />
          </ThemeIcon>
          <Text size="xs" c={trendColor}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </Text>
        </Group>
      )}
    </Paper>
  );
}

// Stats Display Component
function StatsDisplay({ stats, formatValue = formatCurrency }: { stats: ChartStats; formatValue?: (v: number) => string }) {
  return (
    <SimpleGrid cols={4} spacing="xs" mt="sm">
      <Paper withBorder p="xs" radius="sm">
        <Text size="xs" c="dimmed">Minimo</Text>
        <Text size="sm" fw={600}>{formatValue(stats.min)}</Text>
      </Paper>
      <Paper withBorder p="xs" radius="sm">
        <Text size="xs" c="dimmed">Maximo</Text>
        <Text size="sm" fw={600}>{formatValue(stats.max)}</Text>
      </Paper>
      <Paper withBorder p="xs" radius="sm">
        <Text size="xs" c="dimmed">Media</Text>
        <Text size="sm" fw={600}>{formatValue(stats.mean)}</Text>
      </Paper>
      <Paper withBorder p="xs" radius="sm">
        <Text size="xs" c="dimmed">Mediana</Text>
        <Text size="sm" fw={600}>{formatValue(stats.median)}</Text>
      </Paper>
      {stats.outliers.length > 0 && (
        <Paper withBorder p="xs" radius="sm" style={{ gridColumn: 'span 4' }}>
          <Group gap="xs">
            <IconAlertTriangle size={14} color={PULSE_THEME.accent} />
            <Text size="xs" c="dimmed">
              {stats.outliers.length} outlier(s) detectado(s)
            </Text>
          </Group>
        </Paper>
      )}
    </SimpleGrid>
  );
}

// Heatmap Component (simplified as colored cells)
function HeatmapChart({
  data,
  xKey,
  yKey,
  valueKey,
  height = 300,
}: {
  data: DataPoint[];
  xKey: string;
  yKey: string;
  valueKey: string;
  height?: number;
}) {
  const values = data.map((d) => Number(d[valueKey])).filter((v) => !isNaN(v));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  const getColor = (value: number) => {
    const ratio = maxVal === minVal ? 0.5 : (value - minVal) / (maxVal - minVal);
    const r = Math.round(250 - ratio * 216); // 250 -> 34
    const g = Math.round(128 + ratio * 64);  // 128 -> 192
    const b = Math.round(114 + ratio * 112); // 114 -> 226
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey={xKey} type="category" width={100} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey={valueKey}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColor(Number(entry[valueKey]) || 0)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Main ChartRenderer Component
export function ChartRenderer({
  data,
  chartType = 'auto',
  title,
  subtitle,
  xKey: propXKey,
  yKeys: propYKeys,
  height = 300,
  showStats = true,
  showLegend = true,
  showGrid = true,
  animate = true,
  formatValue = formatCurrency,
  formatLabel,
}: ChartRendererProps) {
  // Detect chart configuration
  const detectedType = useMemo(() => {
    return chartType === 'auto' ? detectChartType(data) : chartType;
  }, [data, chartType]);

  const { xKey, yKeys } = useMemo(() => {
    if (propXKey && propYKeys) {
      return { xKey: propXKey, yKeys: propYKeys };
    }
    return detectAxisKeys(data);
  }, [data, propXKey, propYKeys]);

  // Calculate statistics for the primary y-axis
  const stats = useMemo(() => {
    if (!showStats || yKeys.length === 0) return null;
    return calculateStats(data, yKeys[0]);
  }, [data, yKeys, showStats]);

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <Paper withBorder p="md" radius="md">
        <Text c="dimmed" ta="center">Sem dados para exibir</Text>
      </Paper>
    );
  }

  // Render KPI Card
  if (detectedType === 'kpi-card') {
    const value = Number(data[0][yKeys[0]]) || 0;
    return (
      <KPICard
        title={title || yKeys[0]}
        value={value}
        change={stats?.percentageChange}
        trend={stats?.trend}
        formatValue={formatValue}
      />
    );
  }

  // Common chart props
  const chartProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  };

  const commonLineProps = {
    type: 'monotone' as const,
    strokeWidth: 2,
    dot: { r: 3 },
    activeDot: { r: 5 },
    animationDuration: animate ? 1000 : 0,
  };

  const renderChart = () => {
    switch (detectedType) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={xKey}
              tickFormatter={formatLabel}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => formatNumber(v)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              labelFormatter={formatLabel}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                {...commonLineProps}
                dataKey={key}
                stroke={PULSE_THEME.colors[index % PULSE_THEME.colors.length]}
                name={key}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...chartProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={xKey}
              tickFormatter={formatLabel}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => formatNumber(v)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              labelFormatter={formatLabel}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={PULSE_THEME.colors[index % PULSE_THEME.colors.length]}
                fill={PULSE_THEME.colors[index % PULSE_THEME.colors.length]}
                fillOpacity={0.3}
                name={key}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </AreaChart>
        );

      case 'heatmap':
        return (
          <HeatmapChart
            data={data}
            xKey={xKey}
            yKey={yKeys[0] || ''}
            valueKey={yKeys[0] || ''}
            height={height}
          />
        );

      case 'bar':
      default:
        return (
          <BarChart {...chartProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis
              dataKey={xKey}
              tickFormatter={formatLabel}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(v) => formatNumber(v)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              labelFormatter={formatLabel}
            />
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={PULSE_THEME.colors[index % PULSE_THEME.colors.length]}
                name={key}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <Stack gap="sm">
      {(title || subtitle) && (
        <div>
          {title && <Text fw={600}>{title}</Text>}
          {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
        </div>
      )}

      {stats && (
        <Group gap="xs">
          <Badge
            color={stats.trend === 'up' ? 'green' : stats.trend === 'down' ? 'red' : 'gray'}
            variant="light"
            leftSection={
              stats.trend === 'up' ? <IconTrendingUp size={12} /> :
              stats.trend === 'down' ? <IconTrendingDown size={12} /> :
              <IconMinus size={12} />
            }
          >
            {stats.percentageChange >= 0 ? '+' : ''}{stats.percentageChange.toFixed(1)}%
          </Badge>
        </Group>
      )}

      <Paper withBorder p="md" radius="md">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </Paper>

      {showStats && stats && (
        <StatsDisplay stats={stats} formatValue={formatValue} />
      )}
    </Stack>
  );
}

// Export utility functions for external use
export { detectChartType, detectAxisKeys, calculateStats, formatCurrency, formatNumber };
export type { DataPoint, ChartStats, ChartType, ChartRendererProps };
