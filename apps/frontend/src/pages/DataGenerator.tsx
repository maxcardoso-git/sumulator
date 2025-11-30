import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Select,
  NumberInput,
  Switch,
  Table,
  Badge,
  JsonInput,
  Accordion,
  Code,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlayerPlay } from '@tabler/icons-react';
import { dataGeneratorApi, GenerateDataResult } from '../lib/api';

export function DataGeneratorPage() {
  const [result, setResult] = useState<GenerateDataResult | null>(null);

  const generateMutation = useMutation({
    mutationFn: dataGeneratorApi.run,
    onSuccess: (data) => {
      setResult(data);
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

  const form = useForm({
    initialValues: {
      target_table: 'transactions' as 'transactions' | 'operational_events',
      rows: 100,
      seasonality: true,
      anomalies_enabled: false,
      anomalies_count: 5,
      anomalies_types: 'outlier,duplicate',
      distributions: JSON.stringify(
        {
          amount: { type: 'normal', params: { mean: 250, stdDev: 100 } },
        },
        null,
        2,
      ),
    },
  });

  const handleGenerate = (values: typeof form.values) => {
    let distributions;
    try {
      distributions = JSON.parse(values.distributions);
    } catch {
      distributions = undefined;
    }

    generateMutation.mutate({
      target_table: values.target_table,
      rows: values.rows,
      seasonality: values.seasonality,
      distributions,
      anomalies: values.anomalies_enabled
        ? {
            enabled: true,
            count: values.anomalies_count,
            types: values.anomalies_types.split(',').map((t) => t.trim()),
          }
        : undefined,
    });
  };

  return (
    <Stack>
      <Title order={2}>Data Generator</Title>
      <Text c="dimmed">Gere dados sintéticos para testes de FSB e ACE</Text>

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
                        <Text size="sm">
                          Tipos: <Code>outlier, duplicate, null_value, invalid_status</Code>
                        </Text>
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="distributions">
                <Accordion.Control>Distribuições Estatísticas</Accordion.Control>
                <Accordion.Panel>
                  <JsonInput
                    label="Configuração de distribuições"
                    description="Tipos: uniform, normal, exponential"
                    minRows={6}
                    formatOnBlur
                    {...form.getInputProps('distributions')}
                  />
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
              <Badge color="green" size="lg">
                {result.generated_rows} registros criados
              </Badge>
            </Group>

            <Text size="sm" fw={500}>
              Amostra dos dados gerados:
            </Text>

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  {result.preview_sample[0] &&
                    Object.keys(result.preview_sample[0]).slice(0, 6).map((key) => (
                      <Table.Th key={key}>{key}</Table.Th>
                    ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {result.preview_sample.slice(0, 5).map((row, i) => (
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
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
