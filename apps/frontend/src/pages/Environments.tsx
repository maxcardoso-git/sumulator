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
  Select,
  JsonInput,
  ActionIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { environmentsApi, Environment } from '../lib/api';

export function EnvironmentsPage() {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Environment | null>(null);
  const queryClient = useQueryClient();

  const { data: environments, isLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: environmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setCreateModal(false);
      form.reset();
      notifications.show({
        title: 'Sucesso',
        message: 'Ambiente criado com sucesso',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao criar ambiente',
        color: 'red',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof environmentsApi.update>[1] }) =>
      environmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setEditModal(null);
      notifications.show({
        title: 'Sucesso',
        message: 'Ambiente atualizado',
        color: 'green',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: environmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      notifications.show({
        title: 'Sucesso',
        message: 'Ambiente removido',
        color: 'green',
      });
    },
  });

  const form = useForm({
    initialValues: {
      name: '',
      code: '',
      orchestrator_base_url: '',
      worker_base_url: '',
      auth_type: 'bearer',
      auth_config: '{}',
    },
  });

  const editForm = useForm({
    initialValues: {
      name: '',
      code: '',
      orchestrator_base_url: '',
      worker_base_url: '',
      auth_type: '',
      auth_config: '{}',
    },
  });

  const handleCreate = (values: typeof form.values) => {
    let authConfig;
    try {
      authConfig = JSON.parse(values.auth_config);
    } catch {
      authConfig = {};
    }

    createMutation.mutate({
      name: values.name,
      code: values.code,
      orchestrator_base_url: values.orchestrator_base_url || undefined,
      worker_base_url: values.worker_base_url || undefined,
      auth_type: values.auth_type || undefined,
      auth_config: authConfig,
    });
  };

  const handleEdit = (env: Environment) => {
    editForm.setValues({
      name: env.name,
      code: env.code,
      orchestrator_base_url: env.orchestratorBaseUrl || '',
      worker_base_url: env.workerBaseUrl || '',
      auth_type: env.authType || '',
      auth_config: JSON.stringify(env.authConfig || {}, null, 2),
    });
    setEditModal(env);
  };

  const handleUpdate = (values: typeof editForm.values) => {
    if (!editModal) return;

    let authConfig;
    try {
      authConfig = JSON.parse(values.auth_config);
    } catch {
      authConfig = {};
    }

    updateMutation.mutate({
      id: editModal.id,
      data: {
        name: values.name,
        code: values.code,
        orchestrator_base_url: values.orchestrator_base_url || undefined,
        worker_base_url: values.worker_base_url || undefined,
        auth_type: values.auth_type || undefined,
        auth_config: authConfig,
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Ambientes</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModal(true)}>
          Novo Ambiente
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Código</Table.Th>
              <Table.Th>Orchestrator URL</Table.Th>
              <Table.Th>Auth</Table.Th>
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
            {environments?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    Nenhum ambiente cadastrado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {environments?.map((env) => (
              <Table.Tr key={env.id}>
                <Table.Td>{env.name}</Table.Td>
                <Table.Td>
                  <Badge>{env.code}</Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" lineClamp={1}>
                    {env.orchestratorBaseUrl || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{env.authType || 'none'}</Badge>
                </Table.Td>
                <Table.Td>{new Date(env.createdAt).toLocaleDateString('pt-BR')}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => handleEdit(env)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(env.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createModal} onClose={() => setCreateModal(false)} title="Novo Ambiente" size="lg">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="Nome" placeholder="Development" required {...form.getInputProps('name')} />
            <TextInput label="Código" placeholder="DEV" required {...form.getInputProps('code')} />
            <TextInput
              label="Orchestrator Base URL"
              placeholder="http://localhost:3000/api/v1/orchestrator"
              {...form.getInputProps('orchestrator_base_url')}
            />
            <TextInput
              label="Worker Base URL"
              placeholder="http://localhost:3001/api/v1/worker"
              {...form.getInputProps('worker_base_url')}
            />
            <Select
              label="Tipo de Autenticação"
              data={[
                { value: 'none', label: 'Nenhum' },
                { value: 'bearer', label: 'Bearer Token' },
                { value: 'basic', label: 'Basic Auth' },
                { value: 'api_key', label: 'API Key' },
              ]}
              {...form.getInputProps('auth_type')}
            />
            <JsonInput
              label="Configuração de Auth"
              description='Ex: {"token": "xxx"} ou {"apiKey": "xxx"}'
              minRows={3}
              formatOnBlur
              {...form.getInputProps('auth_config')}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Criar Ambiente
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={!!editModal} onClose={() => setEditModal(null)} title="Editar Ambiente" size="lg">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <TextInput label="Nome" required {...editForm.getInputProps('name')} />
            <TextInput label="Código" required {...editForm.getInputProps('code')} />
            <TextInput label="Orchestrator Base URL" {...editForm.getInputProps('orchestrator_base_url')} />
            <TextInput label="Worker Base URL" {...editForm.getInputProps('worker_base_url')} />
            <Select
              label="Tipo de Autenticação"
              data={[
                { value: 'none', label: 'Nenhum' },
                { value: 'bearer', label: 'Bearer Token' },
                { value: 'basic', label: 'Basic Auth' },
                { value: 'api_key', label: 'API Key' },
              ]}
              {...editForm.getInputProps('auth_type')}
            />
            <JsonInput
              label="Configuração de Auth"
              minRows={3}
              formatOnBlur
              {...editForm.getInputProps('auth_config')}
            />
            <Button type="submit" loading={updateMutation.isPending}>
              Salvar
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
