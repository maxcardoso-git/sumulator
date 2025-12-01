import {
  TextInput,
  NumberInput,
  Select,
  Checkbox,
  Textarea,
  Stack,
  Paper,
  Text,
  Badge,
  Group,
  SimpleGrid,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';

export interface JsonSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  enum?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  [key: string]: unknown;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

interface FormRendererProps {
  schema: JsonSchema | Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  readOnly?: boolean;
}

export function FormRenderer({ schema, readOnly = true }: FormRendererProps) {
  if (!schema || !schema.properties) {
    return (
      <Text c="dimmed" ta="center">
        Schema inválido ou vazio
      </Text>
    );
  }

  const properties = schema.properties;
  const requiredFields = (schema.required || []) as string[];

  const renderField = (name: string, prop: JsonSchemaProperty) => {
    const isRequired = requiredFields.includes(name);
    const label = prop.title || name;
    const description = prop.description;

    // Handle enum (select)
    if (prop.enum && prop.enum.length > 0) {
      return (
        <Select
          key={name}
          label={label}
          description={description}
          placeholder={`Selecione ${label.toLowerCase()}`}
          data={prop.enum.map((val) => ({ value: val, label: formatEnumLabel(val) }))}
          required={isRequired}
          disabled={readOnly}
          withAsterisk={isRequired}
        />
      );
    }

    // Handle by type
    switch (prop.type) {
      case 'string':
        // Check format
        if (prop.format === 'email') {
          return (
            <TextInput
              key={name}
              label={label}
              description={description}
              placeholder={`Digite ${label.toLowerCase()}`}
              type="email"
              required={isRequired}
              disabled={readOnly}
              withAsterisk={isRequired}
            />
          );
        }
        if (prop.format === 'date') {
          return (
            <DateInput
              key={name}
              label={label}
              description={description}
              placeholder={`Selecione ${label.toLowerCase()}`}
              required={isRequired}
              disabled={readOnly}
              withAsterisk={isRequired}
              valueFormat="DD/MM/YYYY"
            />
          );
        }
        if (prop.format === 'date-time') {
          return (
            <DateInput
              key={name}
              label={label}
              description={description}
              placeholder={`Selecione ${label.toLowerCase()}`}
              required={isRequired}
              disabled={readOnly}
              withAsterisk={isRequired}
              valueFormat="DD/MM/YYYY HH:mm"
            />
          );
        }
        // Long text (textarea) - heuristic based on field name
        if (
          name.toLowerCase().includes('descricao') ||
          name.toLowerCase().includes('comentario') ||
          name.toLowerCase().includes('observacao') ||
          name.toLowerCase().includes('detalhada') ||
          prop.maxLength && prop.maxLength > 200
        ) {
          return (
            <Textarea
              key={name}
              label={label}
              description={description}
              placeholder={`Digite ${label.toLowerCase()}`}
              required={isRequired}
              disabled={readOnly}
              withAsterisk={isRequired}
              rows={3}
            />
          );
        }
        // Default string input
        return (
          <TextInput
            key={name}
            label={label}
            description={description}
            placeholder={`Digite ${label.toLowerCase()}`}
            required={isRequired}
            disabled={readOnly}
            withAsterisk={isRequired}
          />
        );

      case 'number':
      case 'integer':
        return (
          <NumberInput
            key={name}
            label={label}
            description={description}
            placeholder={`Digite ${label.toLowerCase()}`}
            required={isRequired}
            disabled={readOnly}
            withAsterisk={isRequired}
            min={prop.minimum}
            max={prop.maximum}
            decimalScale={prop.type === 'integer' ? 0 : 2}
          />
        );

      case 'boolean':
        return (
          <Checkbox
            key={name}
            label={label}
            description={description}
            disabled={readOnly}
          />
        );

      default:
        return (
          <TextInput
            key={name}
            label={label}
            description={description}
            placeholder={`Digite ${label.toLowerCase()}`}
            required={isRequired}
            disabled={readOnly}
            withAsterisk={isRequired}
          />
        );
    }
  };

  const fields = Object.entries(properties);

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600} size="sm" c="dimmed">
            Visualização do Formulário
          </Text>
          <Badge variant="light" color="blue">
            {fields.length} campos
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {fields.map(([name, prop]) => renderField(name, prop))}
        </SimpleGrid>

        {requiredFields.length > 0 && (
          <Text size="xs" c="dimmed">
            * Campos obrigatórios
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

// Helper to format enum values for display
function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
