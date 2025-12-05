import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto, BulkSubmitFormDto } from './dto/submit-form.dto';

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

  async bulkSubmit(formCode: string, dto: BulkSubmitFormDto) {
    const form = await this.findByCode(formCode);
    const batchId = uuidv4();

    const submissions = dto.data.map((data) => {
      const errors = this.validateFormData(form.schema as Record<string, unknown>, data);

      return {
        formId: form.id,
        sessionId: dto.session_id,
        data: {
          ...data,
          _batch_id: batchId,
          _source: 'data_generator',
        } as Prisma.InputJsonValue,
        status: errors.length > 0 ? 'validation_error' : 'submitted',
        errors,
        orchestratorCorrelationId: uuidv4(),
      };
    });

    const result = await this.prisma.formSubmission.createMany({
      data: submissions,
    });

    return {
      batch_id: batchId,
      total_submitted: result.count,
      form_code: formCode,
      form_name: form.name,
    };
  }

  async getStats(formId?: string) {
    const where = formId ? { formId } : {};

    const total = await this.prisma.formSubmission.count({ where });

    const dataGeneratorCount = await this.prisma.formSubmission.count({
      where: {
        ...where,
        data: {
          path: ['_source'],
          equals: 'data_generator',
        },
      },
    });

    return {
      form_submissions: {
        total,
        data_generator_generated: dataGeneratorCount,
      },
    };
  }

  async getMonthlyStats(formId: string, year?: number) {
    const targetYear = year || new Date().getFullYear();

    // Get ALL submissions for the form (we'll filter by year based on _generated_at or createdAt)
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        formId,
      },
      select: {
        id: true,
        data: true,
        createdAt: true,
      },
    });

    // Aggregate by month
    const monthlyData: Record<number, {
      count: number;
      total: number;
      values: number[];
      byType: Record<string, number>;
    }> = {};

    // Initialize all months
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { count: 0, total: 0, values: [], byType: {} };
    }

    // Process submissions
    for (const submission of submissions) {
      const data = submission.data as Record<string, unknown>;

      // Use _generated_at from data if available (for data generator submissions), otherwise use createdAt
      let submissionDate: Date;
      if (data._generated_at && typeof data._generated_at === 'string') {
        submissionDate = new Date(data._generated_at);
      } else {
        submissionDate = submission.createdAt;
      }

      // Filter by year
      if (submissionDate.getFullYear() !== targetYear) {
        continue;
      }

      const month = submissionDate.getMonth();

      monthlyData[month].count++;

      // Try to extract value from common field names
      const valueFields = ['valor', 'value', 'amount', 'total', 'preco', 'price', 'nota_geral', 'nota', 'rating', 'score'];
      let value = 0;
      for (const field of valueFields) {
        if (typeof data[field] === 'number') {
          value = data[field] as number;
          break;
        }
      }
      monthlyData[month].total += value;
      if (value > 0) {
        monthlyData[month].values.push(value);
      }

      // Try to extract type from common field names
      const typeFields = ['tipo', 'type', 'categoria', 'category'];
      for (const field of typeFields) {
        if (typeof data[field] === 'string') {
          const type = data[field] as string;
          monthlyData[month].byType[type] = (monthlyData[month].byType[type] || 0) + 1;
          break;
        }
      }
    }

    // Format response
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const result = months.map((month, index) => {
      const data = monthlyData[index];
      const values = data.values;
      return {
        month,
        monthIndex: index,
        total: data.total,
        count: data.count,
        avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0,
        byType: data.byType,
      };
    });

    return {
      year: targetYear,
      months: result,
      summary: {
        totalCount: submissions.length,
        totalValue: result.reduce((acc, m) => acc + m.total, 0),
        avgValue: submissions.length > 0
          ? Math.round(result.reduce((acc, m) => acc + m.total, 0) / submissions.length)
          : 0,
      },
    };
  }

  async getDailyStats(formId: string, year: number, month: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get ALL submissions for the form (we'll filter by month based on _generated_at or createdAt)
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        formId,
      },
      select: {
        data: true,
        createdAt: true,
      },
    });

    // Initialize daily data
    const dailyData: Record<number, { count: number; total: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      dailyData[i] = { count: 0, total: 0 };
    }

    // Process submissions
    for (const submission of submissions) {
      const data = submission.data as Record<string, unknown>;

      // Use _generated_at from data if available (for data generator submissions), otherwise use createdAt
      let submissionDate: Date;
      if (data._generated_at && typeof data._generated_at === 'string') {
        submissionDate = new Date(data._generated_at);
      } else {
        submissionDate = submission.createdAt;
      }

      // Filter by year and month
      if (submissionDate.getFullYear() !== year || submissionDate.getMonth() !== month) {
        continue;
      }

      const day = submissionDate.getDate();

      // Ensure day is within valid range
      if (day < 1 || day > daysInMonth) {
        continue;
      }

      dailyData[day].count++;

      const valueFields = ['valor', 'value', 'amount', 'total', 'preco', 'price', 'nota_geral', 'nota', 'rating', 'score'];
      for (const field of valueFields) {
        if (typeof data[field] === 'number') {
          dailyData[day].total += data[field] as number;
          break;
        }
      }
    }

    return {
      year,
      month,
      days: Object.entries(dailyData).map(([day, data]) => ({
        day: parseInt(day),
        count: data.count,
        total: data.total,
        avg: data.count > 0 ? Math.round(data.total / data.count) : 0,
      })),
    };
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
