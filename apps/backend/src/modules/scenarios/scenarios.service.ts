import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { ListScenariosQueryDto } from './dto/list-scenarios-query.dto';

@Injectable()
export class ScenariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateScenarioDto, userId?: string) {
    return this.prisma.scenario.create({
      data: {
        environmentId: dto.environment_id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        tags: dto.tags || [],
        config: (dto.config || {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
      include: {
        environment: true,
      },
    });
  }

  async findAll(query: ListScenariosQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.environment_id) {
      where.environmentId = query.environment_id;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.scenario.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id },
      include: {
        environment: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with id "${id}" not found`);
    }

    return scenario;
  }

  async update(id: string, dto: UpdateScenarioDto) {
    await this.findById(id);

    return this.prisma.scenario.update({
      where: { id },
      data: {
        environmentId: dto.environment_id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        tags: dto.tags,
        config: dto.config as Prisma.InputJsonValue,
      },
      include: {
        environment: true,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.scenario.delete({ where: { id } });
    return { deleted: true };
  }
}
