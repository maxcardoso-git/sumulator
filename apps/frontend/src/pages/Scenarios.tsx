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
  Textarea,
  Select,
  ActionIcon,
  TagsInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { scenariosApi, environmentsApi, Scenario } from '../lib/api';

export function ScenariosPage() {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Scenario | null>(null);
  const [filterEnvironment, setFilterEnvironment] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ['scenarios', filterEnvironment],
    queryFn: () => scenariosApi.list(filterEnvironment || undefined),
  });

  const createMutation = useMutation({
    mutationFn: scenariosApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setCreateModal(false);
      form.reset();
      notifications.show({
        title: 'Sucesso',
        message: 'Cenário criado com sucesso',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao criar cenário',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof scenariosApi.update>[1] }) =>
      scenariosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      setEditModal(null);
      notifications.show({
        title: 'Sucesso',
        message: 'Cenário atualizado',
        color: 'green',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: scenariosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      notifications.show({
        title: 'Sucesso',
        message: 'Cenário removido',
        color: 'green',
      });
    },
  });

  const form = useForm({
    initialValues: {
      environment_id: '',
      name: '',
      code: '',
      description: '',
      tags: [] as string[],
    },
  });

  const editForm = useForm({
    initialValues: {
      environment_id: '',
      name: '',
      code: '',
      description: '',
      tags: [] as string[],
    },
  });

  const handleCreate = (values: typeof form.values) => {
    createMutation.mutate({
      environment_id: values.environment_id,
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      tags: values.tags.length > 0 ? values.tags : undefined,
    });
  };

  const handleEdit = (scenario: Scenario) => {
    editForm.setValues({
      environment_id: scenario.environment.id,
      name: scenario.name,
      code: scenario.code || '',
      description: scenario.description || '',
      tags: scenario.tags || [],
    });
    setEditModal(scenario);
  };

  const handleUpdate = (values: typeof editForm.values) => {
    if (!editModal) return;

    updateMutation.mutate({
      id: editModal.id,
      data: {
        environment_id: values.environment_id,
        name: values.name,
        code: values.code || undefined,
        description: values.description || undefined,
        tags: values.tags.length > 0 ? values.tags : undefined,
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Cenários</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModal(true)}>
          Novo Cenário
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Stack>
          <Select
            placeholder="Filtrar por ambiente"
            data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
            value={filterEnvironment}
            onChange={setFilterEnvironment}
            clearable
            w={300}
          />

          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Código</Table.Th>
                <Table.Th>Ambiente</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Criado em</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">
                      Carregando...
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {scenarios?.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center">
                      Nenhum cenário cadastrado
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {scenarios?.map((scenario) => (
                <Table.Tr key={scenario.id}>
                  <Table.Td>{scenario.name}</Table.Td>
                  <Table.Td>
                    {scenario.code ? <Badge variant="light">{scenario.code}</Badge> : '-'}
                  </Table.Td>
                  <Table.Td>
                    <Badge>{scenario.environment.code}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {scenario.tags?.slice(0, 3).map((tag, i) => (
                        <Badge key={i} size="xs" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {scenario.tags?.length > 3 && (
                        <Text size="xs" c="dimmed">
                          +{scenario.tags.length - 3}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>{new Date(scenario.createdAt).toLocaleDateString('pt-BR')}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="subtle" onClick={() => handleEdit(scenario)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => deleteMutation.mutate(scenario.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>

      <Modal opened={createModal} onClose={() => setCreateModal(false)} title="Novo Cenário" size="lg">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <Select
              label="Ambiente"
              placeholder="Selecione o ambiente"
              data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
              required
              {...form.getInputProps('environment_id')}
            />
            <TextInput
              label="Nome"
              placeholder="Teste de Pagamento"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Código"
              placeholder="PAYMENT_TEST_V1"
              description="Identificador único (opcional)"
              {...form.getInputProps('code')}
            />
            <Textarea
              label="Descrição"
              placeholder="Descreva o cenário de teste..."
              minRows={3}
              {...form.getInputProps('description')}
            />
            <TagsInput
              label="Tags"
              placeholder="Digite e pressione Enter"
              {...form.getInputProps('tags')}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Criar Cenário
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={!!editModal} onClose={() => setEditModal(null)} title="Editar Cenário" size="lg">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <Select
              label="Ambiente"
              data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
              required
              {...editForm.getInputProps('environment_id')}
            />
            <TextInput label="Nome" required {...editForm.getInputProps('name')} />
            <TextInput label="Código" {...editForm.getInputProps('code')} />
            <Textarea label="Descrição" minRows={3} {...editForm.getInputProps('description')} />
            <TagsInput label="Tags" {...editForm.getInputProps('tags')} />
            <Button type="submit" loading={updateMutation.isPending}>
              Salvar
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
