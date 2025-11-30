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
import { IconPlus, IconTrash, IconEye } from '@tabler/icons-react';
import { formsApi, environmentsApi, FormDefinition } from '../lib/api';

export function FormsPage() {
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState<FormDefinition | null>(null);
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments'],
    queryFn: environmentsApi.list,
  });

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: formsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setCreateModal(false);
      form.reset();
      notifications.show({
        title: 'Sucesso',
        message: 'Formulário criado com sucesso',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao criar formulário',
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: formsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      notifications.show({
        title: 'Sucesso',
        message: 'Formulário removido',
        color: 'green',
      });
    },
  });

  const form = useForm({
    initialValues: {
      environment_id: '',
      name: '',
      code: '',
      schema: JSON.stringify(
        {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Nome' },
            email: { type: 'string', format: 'email', title: 'Email' },
          },
          required: ['name', 'email'],
        },
        null,
        2,
      ),
    },
  });

  const handleCreate = (values: typeof form.values) => {
    try {
      const schema = JSON.parse(values.schema);
      createMutation.mutate({
        environment_id: values.environment_id,
        name: values.name,
        code: values.code,
        schema,
      });
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Schema JSON inválido',
        color: 'red',
      });
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Formulários</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreateModal(true)}>
          Novo Formulário
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Código</Table.Th>
              <Table.Th>Ambiente</Table.Th>
              <Table.Th>Criado em</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    Carregando...
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {forms?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    Nenhum formulário cadastrado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {forms?.map((f) => (
              <Table.Tr key={f.id}>
                <Table.Td>{f.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{f.code}</Badge>
                </Table.Td>
                <Table.Td>{f.environment.name}</Table.Td>
                <Table.Td>{new Date(f.createdAt).toLocaleDateString('pt-BR')}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" onClick={() => setViewModal(f)}>
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(f.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={createModal} onClose={() => setCreateModal(false)} title="Novo Formulário" size="lg">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <Select
              label="Ambiente"
              placeholder="Selecione o ambiente"
              data={environments?.map((e) => ({ value: e.id, label: e.name })) || []}
              required
              {...form.getInputProps('environment_id')}
            />
            <TextInput label="Nome" placeholder="Nome do formulário" required {...form.getInputProps('name')} />
            <TextInput
              label="Código"
              placeholder="FORM_CODE"
              description="Identificador único do formulário"
              required
              {...form.getInputProps('code')}
            />
            <JsonInput
              label="Schema JSON"
              placeholder="JSON Schema do formulário"
              minRows={10}
              formatOnBlur
              required
              {...form.getInputProps('schema')}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Criar Formulário
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.name} size="lg">
        {viewModal && (
          <Stack>
            <div>
              <Text size="sm" fw={600}>
                Código:
              </Text>
              <Badge>{viewModal.code}</Badge>
            </div>
            <div>
              <Text size="sm" fw={600}>
                Schema:
              </Text>
              <Paper withBorder p="sm" bg="gray.0">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(viewModal.schema, null, 2)}
                </pre>
              </Paper>
            </div>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
