import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEnvironmentDto) {
    const existing = await this.prisma.environment.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Environment with code "${dto.code}" already exists`);
    }

    return this.prisma.environment.create({
      data: {
        name: dto.name,
        code: dto.code,
        orchestratorBaseUrl: dto.orchestrator_base_url,
        workerBaseUrl: dto.worker_base_url,
        authType: dto.auth_type,
        authConfig: (dto.auth_config || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findAll() {
    return this.prisma.environment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id },
    });

    if (!environment) {
      throw new NotFoundException(`Environment with id "${id}" not found`);
    }

    return environment;
  }

  async findByCode(code: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { code },
    });

    if (!environment) {
      throw new NotFoundException(`Environment with code "${code}" not found`);
    }

    return environment;
  }

  async update(id: string, dto: UpdateEnvironmentDto) {
    await this.findById(id);

    if (dto.code) {
      const existing = await this.prisma.environment.findFirst({
        where: { code: dto.code, NOT: { id } },
      });

      if (existing) {
        throw new ConflictException(`Environment with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.environment.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        orchestratorBaseUrl: dto.orchestrator_base_url,
        workerBaseUrl: dto.worker_base_url,
        authType: dto.auth_type,
        authConfig: dto.auth_config as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.environment.delete({ where: { id } });
    return { deleted: true };
  }
}
