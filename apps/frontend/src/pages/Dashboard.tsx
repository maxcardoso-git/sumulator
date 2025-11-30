import { useQuery } from '@tanstack/react-query';
import {
  Title,
  Grid,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Table,
  Skeleton,
  ThemeIcon,
  RingProgress,
  Center,
} from '@mantine/core';
import {
  IconTestPipe,
  IconPlayerPlay,
  IconApi,
  IconAlertTriangle,
  IconClock,
} from '@tabler/icons-react';
import { observabilityApi } from '../lib/api';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size: number }>;
  color: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size="lg" radius="md">
          <Icon size={20} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export function DashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => observabilityApi.getDashboard(),
    refetchInterval: 30000,
  });

  useQuery({
    queryKey: ['latency-distribution'],
    queryFn: () => observabilityApi.getLatencyDistribution(),
  });

  if (isLoading) {
    return (
      <Stack>
        <Title order={2}>Dashboard</Title>
        <Grid>
          {[1, 2, 3, 4].map((i) => (
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton height={100} />
            </Grid.Col>
          ))}
        </Grid>
      </Stack>
    );
  }


  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Cenários"
            value={metrics?.totalScenarios || 0}
            icon={IconTestPipe}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Execuções"
            value={metrics?.totalExecutions || 0}
            icon={IconPlayerPlay}
            color="green"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Chamadas API"
            value={metrics?.totalCalls || 0}
            icon={IconApi}
            color="violet"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Taxa de Erro"
            value={`${metrics?.errorRate || 0}%`}
            icon={IconAlertTriangle}
            color="red"
          />
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="md">
              Execuções por Status
            </Text>
            <Group justify="center" gap="xl">
              <RingProgress
                size={150}
                thickness={16}
                sections={
                  metrics?.executionsByStatus?.map((s, i) => ({
                    value: (s.count / (metrics.totalExecutions || 1)) * 100,
                    color: ['green', 'yellow', 'red', 'gray'][i % 4] || 'gray',
                    tooltip: `${s.status}: ${s.count}`,
                  })) || []
                }
                label={
                  <Center>
                    <Text size="xl" fw={700}>
                      {metrics?.totalExecutions || 0}
                    </Text>
                  </Center>
                }
              />
              <Stack gap="xs">
                {metrics?.executionsByStatus?.map((s) => (
                  <Group key={s.status} gap="xs">
                    <Badge
                      color={
                        s.status === 'completed'
                          ? 'green'
                          : s.status === 'failed'
                            ? 'red'
                            : s.status === 'running'
                              ? 'yellow'
                              : 'gray'
                      }
                    >
                      {s.status}
                    </Badge>
                    <Text size="sm">{s.count}</Text>
                  </Group>
                ))}
              </Stack>
            </Group>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="md">
              Latência
            </Text>
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon color="green" variant="light" size="sm">
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="sm">Mínima</Text>
                </Group>
                <Text fw={600}>{metrics?.latency?.min || 0}ms</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon color="blue" variant="light" size="sm">
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="sm">Média</Text>
                </Group>
                <Text fw={600}>{Math.round(metrics?.latency?.avg || 0)}ms</Text>
              </Group>
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon color="red" variant="light" size="sm">
                    <IconClock size={14} />
                  </ThemeIcon>
                  <Text size="sm">Máxima</Text>
                </Group>
                <Text fw={600}>{metrics?.latency?.max || 0}ms</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="md">
          Execuções Recentes
        </Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Run ID</Table.Th>
              <Table.Th>Cenário</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Início</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {metrics?.recentExecutions?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    Nenhuma execução encontrada
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {metrics?.recentExecutions?.map((exec) => (
              <Table.Tr key={exec.id}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {exec.runId?.slice(0, 8) || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>{exec.scenario || '-'}</Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      exec.status === 'completed'
                        ? 'green'
                        : exec.status === 'failed'
                          ? 'red'
                          : 'yellow'
                    }
                    size="sm"
                  >
                    {exec.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {exec.startedAt ? new Date(exec.startedAt).toLocaleString('pt-BR') : '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
