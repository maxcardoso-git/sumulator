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
  ActionIcon,
  Tabs,
  Code,
  ScrollArea,
  Tooltip,
  CopyButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEye, IconEdit, IconCode, IconForms, IconCopy, IconCheck } from '@tabler/icons-react';
import { formsApi, environmentsApi, FormDefinition } from '../lib/api';
import { FormBuilder, FormField, fieldsToJsonSchema, fieldsToUiSchema, jsonSchemaToFields } from '../components/FormBuilder';
import { FormRenderer } from '../components/FormRenderer';

export function FormsPage() {
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState<FormDefinition | null>(null);
  const [editModal, setEditModal] = useState<FormDefinition | null>(null);
  const [builderFields, setBuilderFields] = useState<FormField[]>([]);
  const [editBuilderFields, setEditBuilderFields] = useState<FormField[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>('builder');
  const [editActiveTab, setEditActiveTab] = useState<string | null>('builder');
  const [viewTab, setViewTab] = useState<string | null>('preview');
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
      setBuilderFields([]);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof formsApi.update>[1] }) =>
      formsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setEditModal(null);
      editForm.reset();
      setEditBuilderFields([]);
      notifications.show({
        title: 'Sucesso',
        message: 'Formulário atualizado com sucesso',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao atualizar formulário',
        color: 'red',
      });
    },
  });

  const form = useForm({
    initialValues: {
      environment_id: '',
      name: '',
      code: '',
    },
  });

  const editForm = useForm({
    initialValues: {
      name: '',
      code: '',
    },
  });

  const handleCreate = (values: typeof form.values) => {
    if (builderFields.length === 0) {
      notifications.show({
        title: 'Erro',
        message: 'Adicione pelo menos um campo ao formulário',
        color: 'red',
      });
      return;
    }

    // Validate fields have names
    const invalidFields = builderFields.filter((f) => !f.name || !f.label);
    if (invalidFields.length > 0) {
      notifications.show({
        title: 'Erro',
        message: 'Todos os campos precisam ter nome e rótulo definidos',
        color: 'red',
      });
      return;
    }

    const schema = fieldsToJsonSchema(builderFields);
    const uiSchema = fieldsToUiSchema(builderFields);

    createMutation.mutate({
      environment_id: values.environment_id,
      name: values.name,
      code: values.code,
      schema,
      ui_schema: uiSchema,
    });
  };

  const openCreateModal = () => {
    form.reset();
    setBuilderFields([]);
    setActiveTab('builder');
    setCreateModal(true);
  };

  const openEditModal = (formDef: FormDefinition) => {
    editForm.setValues({
      name: formDef.name,
      code: formDef.code,
    });
    const fields = jsonSchemaToFields(
      formDef.schema as Record<string, unknown>,
      formDef.uiSchema as Record<string, unknown>
    );
    setEditBuilderFields(fields);
    setEditActiveTab('builder');
    setEditModal(formDef);
  };

  const handleEdit = (values: typeof editForm.values) => {
    if (!editModal) return;

    if (editBuilderFields.length === 0) {
      notifications.show({
        title: 'Erro',
        message: 'Adicione pelo menos um campo ao formulário',
        color: 'red',
      });
      return;
    }

    const invalidFields = editBuilderFields.filter((f) => !f.name || !f.label);
    if (invalidFields.length > 0) {
      notifications.show({
        title: 'Erro',
        message: 'Todos os campos precisam ter nome e rótulo definidos',
        color: 'red',
      });
      return;
    }

    const schema = fieldsToJsonSchema(editBuilderFields);
    const uiSchema = fieldsToUiSchema(editBuilderFields);

    updateMutation.mutate({
      id: editModal.id,
      data: {
        name: values.name,
        code: values.code,
        schema,
        ui_schema: uiSchema,
      },
    });
  };

  const generatedSchema = fieldsToJsonSchema(builderFields);
  const generatedUiSchema = fieldsToUiSchema(builderFields);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Formulários</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
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
              <Table.Th>Campos</Table.Th>
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
            {forms?.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    Nenhum formulário cadastrado
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {forms?.map((f) => {
              const schemaProps = (f.schema as Record<string, unknown>)?.properties as Record<string, unknown> | undefined;
              const fieldCount = schemaProps ? Object.keys(schemaProps).length : 0;
              return (
                <Table.Tr key={f.id}>
                  <Table.Td>{f.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{f.code}</Badge>
                  </Table.Td>
                  <Table.Td>{f.environment.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="outline">{fieldCount} campos</Badge>
                  </Table.Td>
                  <Table.Td>{new Date(f.createdAt).toLocaleDateString('pt-BR')}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Visualizar">
                        <ActionIcon variant="subtle" onClick={() => setViewModal(f)}>
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Editar">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEditModal(f)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remover">
                        <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(f.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Create Modal */}
      <Modal
        opened={createModal}
        onClose={() => setCreateModal(false)}
        title="Novo Formulário"
        size="xl"
        styles={{ body: { minHeight: 500 } }}
      >
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <Group grow>
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
                description="Identificador único"
                required
                {...form.getInputProps('code')}
              />
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="builder" leftSection={<IconForms size={16} />}>
                  Construtor de Campos
                </Tabs.Tab>
                <Tabs.Tab value="schema" leftSection={<IconCode size={16} />}>
                  Schema Gerado
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="builder" pt="md">
                <FormBuilder fields={builderFields} onChange={setBuilderFields} showDataGeneratorConfig />
              </Tabs.Panel>

              <Tabs.Panel value="schema" pt="md">
                <Stack>
                  <Paper withBorder p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        JSON Schema
                      </Text>
                      <CopyButton value={JSON.stringify(generatedSchema, null, 2)}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                            <ActionIcon variant="subtle" onClick={copy}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={200}>
                      <Code block>{JSON.stringify(generatedSchema, null, 2)}</Code>
                    </ScrollArea>
                  </Paper>

                  <Paper withBorder p="sm">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        UI Schema
                      </Text>
                      <CopyButton value={JSON.stringify(generatedUiSchema, null, 2)}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                            <ActionIcon variant="subtle" onClick={copy}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={150}>
                      <Code block>{JSON.stringify(generatedUiSchema, null, 2)}</Code>
                    </ScrollArea>
                  </Paper>
                </Stack>
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Criar Formulário
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal opened={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.name} size="xl">
        {viewModal && (
          <Stack>
            <Group>
              <div>
                <Text size="sm" fw={600}>
                  Código:
                </Text>
                <Badge>{viewModal.code}</Badge>
              </div>
              <div>
                <Text size="sm" fw={600}>
                  Ambiente:
                </Text>
                <Badge variant="outline">{viewModal.environment.name}</Badge>
              </div>
            </Group>

            <Tabs value={viewTab} onChange={setViewTab}>
              <Tabs.List>
                <Tabs.Tab value="preview" leftSection={<IconForms size={16} />}>
                  Visualização
                </Tabs.Tab>
                <Tabs.Tab value="schema" leftSection={<IconCode size={16} />}>
                  JSON Schema
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="preview" pt="md">
                <FormRenderer
                  schema={viewModal.schema as Record<string, unknown>}
                  uiSchema={viewModal.uiSchema as Record<string, unknown>}
                  readOnly
                />
              </Tabs.Panel>

              <Tabs.Panel value="schema" pt="md">
                <Stack>
                  <div>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={600}>
                        Schema:
                      </Text>
                      <CopyButton value={JSON.stringify(viewModal.schema, null, 2)}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                            <ActionIcon variant="subtle" size="sm" onClick={copy}>
                              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <ScrollArea h={200}>
                      <Code block>{JSON.stringify(viewModal.schema, null, 2)}</Code>
                    </ScrollArea>
                  </div>

                  {viewModal.uiSchema && Object.keys(viewModal.uiSchema as object).length > 0 && (
                    <div>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600}>
                          UI Schema:
                        </Text>
                        <CopyButton value={JSON.stringify(viewModal.uiSchema, null, 2)}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                              <ActionIcon variant="subtle" size="sm" onClick={copy}>
                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                      <ScrollArea h={150}>
                        <Code block>{JSON.stringify(viewModal.uiSchema, null, 2)}</Code>
                      </ScrollArea>
                    </div>
                  )}
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Stack>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        opened={!!editModal}
        onClose={() => setEditModal(null)}
        title="Editar Formulário"
        size="xl"
        styles={{ body: { minHeight: 500 } }}
      >
        {editModal && (
          <form onSubmit={editForm.onSubmit(handleEdit)}>
            <Stack>
              <Group>
                <Badge variant="outline">Ambiente: {editModal.environment.name}</Badge>
              </Group>

              <Group grow>
                <TextInput label="Nome" placeholder="Nome do formulário" required {...editForm.getInputProps('name')} />
                <TextInput
                  label="Código"
                  placeholder="FORM_CODE"
                  description="Identificador único"
                  required
                  {...editForm.getInputProps('code')}
                />
              </Group>

              <Tabs value={editActiveTab} onChange={setEditActiveTab}>
                <Tabs.List>
                  <Tabs.Tab value="builder" leftSection={<IconForms size={16} />}>
                    Construtor de Campos
                  </Tabs.Tab>
                  <Tabs.Tab value="schema" leftSection={<IconCode size={16} />}>
                    Schema Gerado
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="builder" pt="md">
                  <FormBuilder fields={editBuilderFields} onChange={setEditBuilderFields} showDataGeneratorConfig />
                </Tabs.Panel>

                <Tabs.Panel value="schema" pt="md">
                  <Stack>
                    <Paper withBorder p="sm">
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600}>
                          JSON Schema
                        </Text>
                        <CopyButton value={JSON.stringify(fieldsToJsonSchema(editBuilderFields), null, 2)}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                              <ActionIcon variant="subtle" onClick={copy}>
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                      <ScrollArea h={200}>
                        <Code block>{JSON.stringify(fieldsToJsonSchema(editBuilderFields), null, 2)}</Code>
                      </ScrollArea>
                    </Paper>

                    <Paper withBorder p="sm">
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={600}>
                          UI Schema
                        </Text>
                        <CopyButton value={JSON.stringify(fieldsToUiSchema(editBuilderFields), null, 2)}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copiado!' : 'Copiar'}>
                              <ActionIcon variant="subtle" onClick={copy}>
                                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                      <ScrollArea h={150}>
                        <Code block>{JSON.stringify(fieldsToUiSchema(editBuilderFields), null, 2)}</Code>
                      </ScrollArea>
                    </Paper>
                  </Stack>
                </Tabs.Panel>
              </Tabs>

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setEditModal(null)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={updateMutation.isPending}>
                  Salvar Alterações
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  );
}
