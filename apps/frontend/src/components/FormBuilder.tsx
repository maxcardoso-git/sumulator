import { useState } from 'react';
import {
  Paper,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Select,
  NumberInput,
  Switch,
  ActionIcon,
  Card,
  Badge,
  Collapse,
  Divider,
  Box,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import { useListState } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
} from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  description?: string;
  // Validations
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  // Select options
  options?: { value: string; label: string }[];
  // Data Generator config
  dataGenerator?: {
    enabled: boolean;
    distribution?: 'uniform' | 'normal' | 'exponential' | 'categorical';
    // For numeric distributions
    mean?: number;
    stdDev?: number;
    lambda?: number;
    // For categorical
    weights?: Record<string, number>;
    // For strings
    generator?: 'uuid' | 'name' | 'email' | 'phone' | 'address' | 'company' | 'lorem' | 'custom';
    customValues?: string[];
  };
}

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  showDataGeneratorConfig?: boolean;
}

const fieldTypes = [
  { value: 'string', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date', label: 'Data' },
  { value: 'email', label: 'Email' },
  { value: 'select', label: 'Seleção' },
  { value: 'textarea', label: 'Texto Longo' },
];

const stringGenerators = [
  { value: 'uuid', label: 'UUID' },
  { value: 'name', label: 'Nome de Pessoa' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'address', label: 'Endereço' },
  { value: 'company', label: 'Nome de Empresa' },
  { value: 'lorem', label: 'Lorem Ipsum' },
  { value: 'custom', label: 'Valores Customizados' },
];

const numericDistributions = [
  { value: 'uniform', label: 'Uniforme (min-max)' },
  { value: 'normal', label: 'Normal (Gaussiana)' },
  { value: 'exponential', label: 'Exponencial' },
];

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createDefaultField(): FormField {
  return {
    id: generateId(),
    name: '',
    label: '',
    type: 'string',
    required: false,
    dataGenerator: {
      enabled: false,
    },
  };
}

export function FormBuilder({ fields, onChange, showDataGeneratorConfig = true }: FormBuilderProps) {
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [, listHandlers] = useListState(fields);

  // Sync with parent
  const updateFields = (newFields: FormField[]) => {
    listHandlers.setState(newFields);
    onChange(newFields);
  };

  const addField = () => {
    const newField = createDefaultField();
    updateFields([...fields, newField]);
    setExpandedFields((prev) => new Set([...prev, newField.id]));
  };

  const removeField = (id: string) => {
    updateFields(fields.filter((f) => f.id !== id));
    setExpandedFields((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const duplicateField = (field: FormField) => {
    const newField = {
      ...field,
      id: generateId(),
      name: `${field.name}_copy`,
      label: `${field.label} (cópia)`,
    };
    const index = fields.findIndex((f) => f.id === field.id);
    const newFields = [...fields];
    newFields.splice(index + 1, 0, newField);
    updateFields(newFields);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    updateFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const toggleExpanded = (id: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedFields = [...fields];
    const [removed] = reorderedFields.splice(result.source.index, 1);
    reorderedFields.splice(result.destination.index, 0, removed);
    updateFields(reorderedFields);
  };

  return (
    <Stack>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="fields">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <Stack gap="sm">
                {fields.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        withBorder
                        shadow={snapshot.isDragging ? 'md' : 'sm'}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <Group justify="space-between" mb={expandedFields.has(field.id) ? 'sm' : 0}>
                          <Group>
                            <div {...provided.dragHandleProps}>
                              <IconGripVertical size={18} style={{ cursor: 'grab' }} color="gray" />
                            </div>
                            <Box>
                              <Group gap="xs">
                                <Text fw={500}>{field.label || 'Novo Campo'}</Text>
                                <Badge size="xs" variant="light">
                                  {fieldTypes.find((t) => t.value === field.type)?.label}
                                </Badge>
                                {field.required && (
                                  <Badge size="xs" color="red" variant="light">
                                    Obrigatório
                                  </Badge>
                                )}
                                {field.dataGenerator?.enabled && (
                                  <Badge size="xs" color="teal" variant="light">
                                    Data Gen
                                  </Badge>
                                )}
                              </Group>
                              <Text size="xs" c="dimmed">
                                {field.name || 'campo_sem_nome'}
                              </Text>
                            </Box>
                          </Group>
                          <Group gap="xs">
                            <Tooltip label="Duplicar">
                              <ActionIcon variant="subtle" onClick={() => duplicateField(field)}>
                                <IconCopy size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Remover">
                              <ActionIcon variant="subtle" color="red" onClick={() => removeField(field.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <ActionIcon variant="subtle" onClick={() => toggleExpanded(field.id)}>
                              {expandedFields.has(field.id) ? (
                                <IconChevronUp size={16} />
                              ) : (
                                <IconChevronDown size={16} />
                              )}
                            </ActionIcon>
                          </Group>
                        </Group>

                        <Collapse in={expandedFields.has(field.id)}>
                          <Stack gap="md" mt="sm">
                            <Divider />

                            {/* Basic Info */}
                            <SimpleGrid cols={2}>
                              <TextInput
                                label="Nome do Campo"
                                placeholder="nome_campo"
                                description="Identificador único (snake_case)"
                                value={field.name}
                                onChange={(e) => updateField(field.id, { name: e.target.value })}
                              />
                              <TextInput
                                label="Rótulo"
                                placeholder="Nome do Campo"
                                description="Texto exibido ao usuário"
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                              />
                            </SimpleGrid>

                            <SimpleGrid cols={3}>
                              <Select
                                label="Tipo"
                                data={fieldTypes}
                                value={field.type}
                                onChange={(value) =>
                                  updateField(field.id, { type: value as FormField['type'] })
                                }
                              />
                              <TextInput
                                label="Placeholder"
                                placeholder="Texto de exemplo"
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                              />
                              <Box pt={25}>
                                <Switch
                                  label="Obrigatório"
                                  checked={field.required}
                                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                />
                              </Box>
                            </SimpleGrid>

                            <TextInput
                              label="Descrição"
                              placeholder="Descrição do campo para ajudar o usuário"
                              value={field.description || ''}
                              onChange={(e) => updateField(field.id, { description: e.target.value })}
                            />

                            {/* Validations based on type */}
                            {(field.type === 'string' || field.type === 'textarea') && (
                              <SimpleGrid cols={3}>
                                <NumberInput
                                  label="Tamanho Mínimo"
                                  placeholder="0"
                                  min={0}
                                  value={field.minLength}
                                  onChange={(value) =>
                                    updateField(field.id, { minLength: value as number | undefined })
                                  }
                                />
                                <NumberInput
                                  label="Tamanho Máximo"
                                  placeholder="255"
                                  min={0}
                                  value={field.maxLength}
                                  onChange={(value) =>
                                    updateField(field.id, { maxLength: value as number | undefined })
                                  }
                                />
                                <TextInput
                                  label="Padrão (Regex)"
                                  placeholder="^[A-Z]+$"
                                  value={field.pattern || ''}
                                  onChange={(e) => updateField(field.id, { pattern: e.target.value })}
                                />
                              </SimpleGrid>
                            )}

                            {field.type === 'number' && (
                              <SimpleGrid cols={2}>
                                <NumberInput
                                  label="Valor Mínimo"
                                  placeholder="0"
                                  value={field.min}
                                  onChange={(value) => updateField(field.id, { min: value as number | undefined })}
                                />
                                <NumberInput
                                  label="Valor Máximo"
                                  placeholder="1000"
                                  value={field.max}
                                  onChange={(value) => updateField(field.id, { max: value as number | undefined })}
                                />
                              </SimpleGrid>
                            )}

                            {field.type === 'select' && (
                              <Box>
                                <Text size="sm" fw={500} mb="xs">
                                  Opções de Seleção
                                </Text>
                                <Stack gap="xs">
                                  {(field.options || []).map((option, optIndex) => (
                                    <Group key={optIndex}>
                                      <TextInput
                                        placeholder="valor"
                                        value={option.value}
                                        onChange={(e) => {
                                          const newOptions = [...(field.options || [])];
                                          newOptions[optIndex] = { ...option, value: e.target.value };
                                          updateField(field.id, { options: newOptions });
                                        }}
                                        style={{ flex: 1 }}
                                      />
                                      <TextInput
                                        placeholder="Rótulo"
                                        value={option.label}
                                        onChange={(e) => {
                                          const newOptions = [...(field.options || [])];
                                          newOptions[optIndex] = { ...option, label: e.target.value };
                                          updateField(field.id, { options: newOptions });
                                        }}
                                        style={{ flex: 1 }}
                                      />
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => {
                                          const newOptions = (field.options || []).filter((_, i) => i !== optIndex);
                                          updateField(field.id, { options: newOptions });
                                        }}
                                      >
                                        <IconTrash size={14} />
                                      </ActionIcon>
                                    </Group>
                                  ))}
                                  <Button
                                    variant="light"
                                    size="xs"
                                    leftSection={<IconPlus size={14} />}
                                    onClick={() => {
                                      const newOptions = [...(field.options || []), { value: '', label: '' }];
                                      updateField(field.id, { options: newOptions });
                                    }}
                                  >
                                    Adicionar Opção
                                  </Button>
                                </Stack>
                              </Box>
                            )}

                            {/* Data Generator Config */}
                            {showDataGeneratorConfig && (
                              <>
                                <Divider label="Configuração do Data Generator" labelPosition="center" />
                                <Switch
                                  label="Habilitar geração automática de dados"
                                  description="Configure como dados serão gerados para este campo"
                                  checked={field.dataGenerator?.enabled || false}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      dataGenerator: { ...field.dataGenerator, enabled: e.target.checked },
                                    })
                                  }
                                />

                                {field.dataGenerator?.enabled && (
                                  <Paper withBorder p="sm" bg="gray.0">
                                    {field.type === 'number' && (
                                      <Stack gap="sm">
                                        <Select
                                          label="Distribuição"
                                          data={numericDistributions}
                                          value={field.dataGenerator.distribution || 'uniform'}
                                          onChange={(value) =>
                                            updateField(field.id, {
                                              dataGenerator: {
                                                ...field.dataGenerator,
                                                enabled: true,
                                                distribution: value as 'uniform' | 'normal' | 'exponential',
                                              },
                                            })
                                          }
                                        />
                                        {field.dataGenerator.distribution === 'normal' && (
                                          <SimpleGrid cols={2}>
                                            <NumberInput
                                              label="Média"
                                              value={field.dataGenerator.mean || 0}
                                              onChange={(value) =>
                                                updateField(field.id, {
                                                  dataGenerator: {
                                                    ...field.dataGenerator,
                                                    enabled: true,
                                                    mean: value as number,
                                                  },
                                                })
                                              }
                                            />
                                            <NumberInput
                                              label="Desvio Padrão"
                                              value={field.dataGenerator.stdDev || 1}
                                              onChange={(value) =>
                                                updateField(field.id, {
                                                  dataGenerator: {
                                                    ...field.dataGenerator,
                                                    enabled: true,
                                                    stdDev: value as number,
                                                  },
                                                })
                                              }
                                            />
                                          </SimpleGrid>
                                        )}
                                        {field.dataGenerator.distribution === 'exponential' && (
                                          <NumberInput
                                            label="Lambda (taxa)"
                                            value={field.dataGenerator.lambda || 1}
                                            step={0.1}
                                            onChange={(value) =>
                                              updateField(field.id, {
                                                dataGenerator: {
                                                  ...field.dataGenerator,
                                                  enabled: true,
                                                  lambda: value as number,
                                                },
                                              })
                                            }
                                          />
                                        )}
                                      </Stack>
                                    )}

                                    {(field.type === 'string' || field.type === 'email' || field.type === 'textarea') && (
                                      <Stack gap="sm">
                                        <Select
                                          label="Gerador"
                                          data={stringGenerators}
                                          value={field.dataGenerator.generator || 'lorem'}
                                          onChange={(value) =>
                                            updateField(field.id, {
                                              dataGenerator: {
                                                ...field.dataGenerator,
                                                enabled: true,
                                                generator: value as NonNullable<FormField['dataGenerator']>['generator'],
                                              },
                                            })
                                          }
                                        />
                                        {field.dataGenerator.generator === 'custom' && (
                                          <TextInput
                                            label="Valores (separados por vírgula)"
                                            placeholder="valor1, valor2, valor3"
                                            value={(field.dataGenerator.customValues || []).join(', ')}
                                            onChange={(e) =>
                                              updateField(field.id, {
                                                dataGenerator: {
                                                  ...field.dataGenerator,
                                                  enabled: true,
                                                  customValues: e.target.value.split(',').map((v) => v.trim()),
                                                },
                                              })
                                            }
                                          />
                                        )}
                                      </Stack>
                                    )}

                                    {field.type === 'select' && (
                                      <Stack gap="sm">
                                        <Text size="sm">
                                          Para campos de seleção, os valores serão escolhidos aleatoriamente entre as
                                          opções definidas acima.
                                        </Text>
                                        <Select
                                          label="Distribuição"
                                          data={[
                                            { value: 'uniform', label: 'Uniforme (igual probabilidade)' },
                                            { value: 'categorical', label: 'Ponderada (definir pesos)' },
                                          ]}
                                          value={field.dataGenerator.distribution || 'uniform'}
                                          onChange={(value) =>
                                            updateField(field.id, {
                                              dataGenerator: {
                                                ...field.dataGenerator,
                                                enabled: true,
                                                distribution: value as 'uniform' | 'categorical',
                                              },
                                            })
                                          }
                                        />
                                        {field.dataGenerator.distribution === 'categorical' && field.options && (
                                          <Stack gap="xs">
                                            <Text size="sm" fw={500}>
                                              Pesos por opção
                                            </Text>
                                            {field.options.map((option) => (
                                              <Group key={option.value}>
                                                <Text size="sm" style={{ flex: 1 }}>
                                                  {option.label}
                                                </Text>
                                                <NumberInput
                                                  size="xs"
                                                  w={100}
                                                  min={0}
                                                  max={100}
                                                  value={field.dataGenerator?.weights?.[option.value] || 1}
                                                  onChange={(value) =>
                                                    updateField(field.id, {
                                                      dataGenerator: {
                                                        ...field.dataGenerator,
                                                        enabled: true,
                                                        weights: {
                                                          ...field.dataGenerator?.weights,
                                                          [option.value]: value as number,
                                                        },
                                                      },
                                                    })
                                                  }
                                                />
                                              </Group>
                                            ))}
                                          </Stack>
                                        )}
                                      </Stack>
                                    )}

                                    {field.type === 'boolean' && (
                                      <Text size="sm" c="dimmed">
                                        Valores booleanos serão gerados com 50% de probabilidade para cada valor.
                                      </Text>
                                    )}

                                    {field.type === 'date' && (
                                      <Text size="sm" c="dimmed">
                                        Datas serão geradas aleatoriamente nos últimos 6 meses.
                                      </Text>
                                    )}
                                  </Paper>
                                )}
                              </>
                            )}
                          </Stack>
                        </Collapse>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button leftSection={<IconPlus size={16} />} variant="light" onClick={addField}>
        Adicionar Campo
      </Button>

      {fields.length === 0 && (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">Nenhum campo adicionado. Clique em "Adicionar Campo" para começar.</Text>
        </Paper>
      )}
    </Stack>
  );
}

// Utility function to convert FormField[] to JSON Schema
export function fieldsToJsonSchema(fields: FormField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const field of fields) {
    const prop: Record<string, unknown> = {
      title: field.label,
    };

    // Map type
    switch (field.type) {
      case 'string':
      case 'textarea':
        prop.type = 'string';
        if (field.minLength) prop.minLength = field.minLength;
        if (field.maxLength) prop.maxLength = field.maxLength;
        if (field.pattern) prop.pattern = field.pattern;
        break;
      case 'number':
        prop.type = 'number';
        if (field.min !== undefined) prop.minimum = field.min;
        if (field.max !== undefined) prop.maximum = field.max;
        break;
      case 'boolean':
        prop.type = 'boolean';
        break;
      case 'date':
        prop.type = 'string';
        prop.format = 'date';
        break;
      case 'email':
        prop.type = 'string';
        prop.format = 'email';
        break;
      case 'select':
        prop.type = 'string';
        prop.enum = field.options?.map((o) => o.value) || [];
        prop.enumNames = field.options?.map((o) => o.label) || [];
        break;
    }

    if (field.description) {
      prop.description = field.description;
    }

    properties[field.name] = prop;

    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

// Utility function to convert FormField[] to UI Schema
export function fieldsToUiSchema(fields: FormField[]): Record<string, unknown> {
  const uiSchema: Record<string, unknown> = {
    'ui:order': fields.map((f) => f.name),
  };

  for (const field of fields) {
    const fieldUi: Record<string, unknown> = {};

    if (field.placeholder) {
      fieldUi['ui:placeholder'] = field.placeholder;
    }

    if (field.type === 'textarea') {
      fieldUi['ui:widget'] = 'textarea';
      fieldUi['ui:options'] = { rows: 4 };
    }

    if (Object.keys(fieldUi).length > 0) {
      uiSchema[field.name] = fieldUi;
    }
  }

  return uiSchema;
}

// Utility to extract Data Generator config from fields
export function fieldsToDataGeneratorConfig(fields: FormField[]): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.dataGenerator?.enabled) {
      config[field.name] = {
        type: field.type,
        ...field.dataGenerator,
      };
    }
  }

  return config;
}

// Utility to convert JSON Schema back to FormField[]
export function jsonSchemaToFields(
  schema: Record<string, unknown>,
  uiSchema?: Record<string, unknown>
): FormField[] {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = (schema.required as string[]) || [];
  const order = (uiSchema?.['ui:order'] as string[]) || [];

  if (!properties) return [];

  const fields: FormField[] = [];

  // Use order from uiSchema if available, otherwise use Object.keys
  const fieldNames = order.length > 0 ? order : Object.keys(properties);

  for (const name of fieldNames) {
    const prop = properties[name];
    if (!prop) continue;

    const fieldUi = uiSchema?.[name] as Record<string, unknown> | undefined;

    let type: FormField['type'] = 'string';

    // Determine type from schema
    if (prop.type === 'boolean') {
      type = 'boolean';
    } else if (prop.type === 'number' || prop.type === 'integer') {
      type = 'number';
    } else if (prop.format === 'date') {
      type = 'date';
    } else if (prop.format === 'email') {
      type = 'email';
    } else if (prop.enum) {
      type = 'select';
    } else if (fieldUi?.['ui:widget'] === 'textarea') {
      type = 'textarea';
    }

    const field: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      label: (prop.title as string) || name,
      type,
      required: required.includes(name),
      description: prop.description as string | undefined,
      placeholder: fieldUi?.['ui:placeholder'] as string | undefined,
    };

    // Add type-specific properties
    if (type === 'string' || type === 'textarea') {
      if (prop.minLength !== undefined) field.minLength = prop.minLength as number;
      if (prop.maxLength !== undefined) field.maxLength = prop.maxLength as number;
      if (prop.pattern !== undefined) field.pattern = prop.pattern as string;
    }

    if (type === 'number') {
      if (prop.minimum !== undefined) field.min = prop.minimum as number;
      if (prop.maximum !== undefined) field.max = prop.maximum as number;
    }

    if (type === 'select' && prop.enum) {
      const enumValues = prop.enum as string[];
      const enumNames = (prop.enumNames as string[]) || enumValues;
      field.options = enumValues.map((value, index) => ({
        value,
        label: enumNames[index] || value,
      }));
    }

    fields.push(field);
  }

  return fields;
}
