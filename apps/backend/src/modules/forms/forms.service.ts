import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFormDto, userId?: string) {
    const existing = await this.prisma.formDefinition.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Form with code "${dto.code}" already exists`);
    }

    return this.prisma.formDefinition.create({
      data: {
        environmentId: dto.environment_id,
        name: dto.name,
        code: dto.code,
        schema: dto.schema as Prisma.InputJsonValue,
        uiSchema: (dto.ui_schema || {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async findAll(environmentId?: string) {
    const where = environmentId ? { environmentId } : {};
    return this.prisma.formDefinition.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const form = await this.prisma.formDefinition.findUnique({
      where: { id },
      include: {
        environment: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(`Form "${id}" not found`);
    }

    return form;
  }

  async findByCode(code: string) {
    const form = await this.prisma.formDefinition.findUnique({
      where: { code },
      include: {
        environment: true,
      },
    });

    if (!form) {
      throw new NotFoundException(`Form with code "${code}" not found`);
    }

    return form;
  }

  async update(id: string, dto: UpdateFormDto) {
    await this.findById(id);

    if (dto.code) {
      const existing = await this.prisma.formDefinition.findFirst({
        where: { code: dto.code, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException(`Form with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.formDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        schema: dto.schema as Prisma.InputJsonValue,
        uiSchema: dto.ui_schema as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.formDefinition.delete({ where: { id } });
    return { deleted: true };
  }

  async submit(formCode: string, dto: SubmitFormDto) {
    const form = await this.findByCode(formCode);

    // Validate data against schema (basic validation)
    const errors = this.validateFormData(form.schema as Record<string, unknown>, dto.data);

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        sessionId: dto.session_id,
        data: dto.data as Prisma.InputJsonValue,
        status: errors.length > 0 ? 'validation_error' : 'submitted',
        errors,
        orchestratorCorrelationId: uuidv4(),
      },
    });

    return {
      submission_id: submission.id,
      status: submission.status,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getSubmissions(formId: string) {
    return this.prisma.formSubmission.findMany({
      where: { formId },
      include: {
        session: {
          select: { id: true, externalSessionId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private validateFormData(
    schema: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    const required = schema.required as string[] | undefined;

    if (!properties) return errors;

    // Check required fields
    if (required) {
      for (const field of required) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          errors.push({ field, message: `Field "${field}" is required` });
        }
      }
    }

    // Check field types
    for (const [field, fieldSchema] of Object.entries(properties)) {
      const value = data[field];
      if (value === undefined || value === null) continue;

      const expectedType = fieldSchema.type as string;
      const actualType = typeof value;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push({ field, message: `Field "${field}" must be a string` });
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push({ field, message: `Field "${field}" must be a number` });
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push({ field, message: `Field "${field}" must be a boolean` });
      }
    }

    return errors;
  }
}
