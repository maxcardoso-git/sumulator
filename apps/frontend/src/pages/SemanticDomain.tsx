import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title,
  Paper,
  Stack,
  Group,
  Text,
  Button,
  Select,
  Switch,
  Table,
  Badge,
  Tabs,
  Accordion,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconBrain, IconRefresh, IconNetwork, IconList } from '@tabler/icons-react';
import { semanticDomainApi } from '../lib/api';

export function SemanticDomainPage() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: concepts, isLoading } = useQuery({
    queryKey: ['domain-concepts', selectedDomain],
    queryFn: () => semanticDomainApi.getConcepts(selectedDomain || undefined),
  });

  const { data: ontology } = useQuery({
    queryKey: ['ontology', selectedDomain],
    queryFn: () => (selectedDomain ? semanticDomainApi.getOntology(selectedDomain) : null),
    enabled: !!selectedDomain,
  });

  const generateMutation = useMutation({
    mutationFn: semanticDomainApi.generate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domain-concepts'] });
      queryClient.invalidateQueries({ queryKey: ['ontology'] });
      notifications.show({
        title: 'Domínio gerado',
        message: `${data.concepts_created} conceitos, ${data.relations_created} relações, ${data.synonyms_created} sinônimos`,
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao gerar domínio',
        color: 'red',
      });
    },
  });

  const form = useForm({
    initialValues: {
      domain: 'finance',
      language: 'pt-BR',
      include_synonyms: true,
      include_relations: true,
    },
  });

  const handleGenerate = (values: typeof form.values) => {
    generateMutation.mutate(values);
  };

  const domains = [...new Set(concepts?.map((c) => c.domain) || [])];

  return (
    <Stack>
      <Title order={2}>Domínio Semântico</Title>
      <Text c="dimmed">Geração de vocabulário, ontologias e seeds de contexto para ACE/RAG</Text>

      <Tabs defaultValue="generate">
        <Tabs.List>
          <Tabs.Tab value="generate" leftSection={<IconBrain size={16} />}>
            Gerar Domínio
          </Tabs.Tab>
          <Tabs.Tab value="concepts" leftSection={<IconList size={16} />}>
            Conceitos
          </Tabs.Tab>
          <Tabs.Tab value="ontology" leftSection={<IconNetwork size={16} />}>
            Ontologia
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="generate" pt="md">
          <Paper withBorder p="md">
            <form onSubmit={form.onSubmit(handleGenerate)}>
              <Stack>
                <Select
                  label="Domínio"
                  description="Template de domínio pré-definido"
                  data={[
                    { value: 'finance', label: 'Financeiro' },
                    { value: 'customer_service', label: 'Atendimento ao Cliente' },
                  ]}
                  {...form.getInputProps('domain')}
                />

                <Select
                  label="Idioma"
                  data={[
                    { value: 'pt-BR', label: 'Português (Brasil)' },
                    { value: 'en-US', label: 'English (US)' },
                  ]}
                  {...form.getInputProps('language')}
                />

                <Switch
                  label="Incluir sinônimos"
                  {...form.getInputProps('include_synonyms', { type: 'checkbox' })}
                />

                <Switch
                  label="Incluir relações ontológicas"
                  {...form.getInputProps('include_relations', { type: 'checkbox' })}
                />

                <Button
                  type="submit"
                  leftSection={<IconRefresh size={16} />}
                  loading={generateMutation.isPending}
                >
                  Gerar Domínio
                </Button>
              </Stack>
            </form>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="concepts" pt="md">
          <Paper withBorder p="md">
            <Stack>
              <Select
                placeholder="Filtrar por domínio"
                data={domains.map((d) => ({ value: d, label: d }))}
                value={selectedDomain}
                onChange={setSelectedDomain}
                clearable
              />

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Código</Table.Th>
                    <Table.Th>Label</Table.Th>
                    <Table.Th>Domínio</Table.Th>
                    <Table.Th>Sinônimos</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading && (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text c="dimmed" ta="center">
                          Carregando...
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {concepts?.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text c="dimmed" ta="center">
                          Nenhum conceito encontrado. Gere um domínio primeiro.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {concepts?.map((concept) => (
                    <Table.Tr key={concept.id}>
                      <Table.Td>
                        <Badge variant="light">{concept.code}</Badge>
                      </Table.Td>
                      <Table.Td>{concept.label}</Table.Td>
                      <Table.Td>{concept.domain}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {concept.synonyms?.slice(0, 3).map((s, i) => (
                            <Badge key={i} size="xs" variant="outline">
                              {s.term}
                            </Badge>
                          ))}
                          {concept.synonyms?.length > 3 && (
                            <Text size="xs" c="dimmed">
                              +{concept.synonyms.length - 3}
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="ontology" pt="md">
          <Paper withBorder p="md">
            <Stack>
              <Select
                placeholder="Selecione um domínio"
                data={domains.map((d) => ({ value: d, label: d }))}
                value={selectedDomain}
                onChange={setSelectedDomain}
              />

              {!selectedDomain && (
                <Text c="dimmed" ta="center" py="xl">
                  Selecione um domínio para visualizar a ontologia
                </Text>
              )}

              {ontology && (
                <Stack>
                  <Text fw={600}>Nós ({ontology.nodes.length})</Text>
                  <Group gap="xs">
                    {ontology.nodes.map((node) => (
                      <Badge key={node.id} size="lg">
                        {node.label || node.code}
                      </Badge>
                    ))}
                  </Group>

                  <Text fw={600}>Relações ({ontology.edges.length})</Text>
                  <Accordion>
                    {ontology.edges.map((edge, i) => {
                      const fromNode = ontology.nodes.find((n) => n.id === edge.from);
                      const toNode = ontology.nodes.find((n) => n.id === edge.to);
                      return (
                        <Accordion.Item key={i} value={`edge-${i}`}>
                          <Accordion.Control>
                            <Group gap="xs">
                              <Badge>{fromNode?.code}</Badge>
                              <Text size="sm" c="dimmed">
                                —{edge.type}→
                              </Text>
                              <Badge>{toNode?.code}</Badge>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Text size="sm">
                              {fromNode?.label || fromNode?.code} {edge.type} {toNode?.label || toNode?.code}
                            </Text>
                          </Accordion.Panel>
                        </Accordion.Item>
                      );
                    })}
                  </Accordion>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
