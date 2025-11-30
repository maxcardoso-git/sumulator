import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateApiEndpointDto } from './dto/create-api-endpoint.dto';
import { UpdateApiEndpointDto } from './dto/update-api-endpoint.dto';

@Injectable()
export class SimulatedApiService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateApiEndpointDto) {
    const endpoint = await this.prisma.apiEndpoint.create({
      data: {
        environmentId: dto.environment_id,
        scenarioId: dto.scenario_id,
        method: dto.method.toUpperCase(),
        path: dto.path,
        responseTemplate: (dto.response_template || {}) as Prisma.InputJsonValue,
        statusCode: dto.status_code || 200,
        latencyMs: dto.latency_ms || 0,
        errorRate: dto.error_rate || 0,
        script: dto.script,
        enabled: true,
      },
    });

    return {
      id: endpoint.id,
      full_url: `/api/v1/simulator/sim-proxy${dto.path}`,
    };
  }

  async findAll(environmentId?: string, scenarioId?: string) {
    const where: Record<string, unknown> = {};
    if (environmentId) where.environmentId = environmentId;
    if (scenarioId) where.scenarioId = scenarioId;

    return this.prisma.apiEndpoint.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        scenario: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { callLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const endpoint = await this.prisma.apiEndpoint.findUnique({
      where: { id },
      include: {
        environment: true,
        scenario: true,
      },
    });

    if (!endpoint) {
      throw new NotFoundException(`API Endpoint "${id}" not found`);
    }

    return endpoint;
  }

  async findByMethodAndPath(method: string, path: string) {
    return this.prisma.apiEndpoint.findFirst({
      where: {
        method: method.toUpperCase(),
        path,
        enabled: true,
      },
    });
  }

  async update(id: string, dto: UpdateApiEndpointDto) {
    await this.findById(id);

    return this.prisma.apiEndpoint.update({
      where: { id },
      data: {
        method: dto.method?.toUpperCase(),
        path: dto.path,
        responseTemplate: dto.response_template as Prisma.InputJsonValue,
        statusCode: dto.status_code,
        latencyMs: dto.latency_ms,
        errorRate: dto.error_rate,
        script: dto.script,
        enabled: dto.enabled,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.apiEndpoint.delete({ where: { id } });
    return { deleted: true };
  }

  async executeEndpoint(
    endpoint: {
      id: string;
      responseTemplate: unknown;
      statusCode: number;
      latencyMs: number;
      errorRate: unknown;
      script: string | null;
    },
    request: {
      method: string;
      path: string;
      headers: Record<string, string>;
      body: Record<string, unknown>;
      query: Record<string, string>;
    },
  ) {
    const startTime = Date.now();

    // Apply latency
    if (endpoint.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, endpoint.latencyMs));
    }

    // Check error rate
    const errorRate = Number(endpoint.errorRate) || 0;
    const shouldError = Math.random() * 100 < errorRate;

    let responseStatus = shouldError ? 500 : endpoint.statusCode;
    let responseBody: Record<string, unknown>;

    if (shouldError) {
      responseBody = {
        error: 'Simulated error',
        message: 'This error was injected by the simulator based on error_rate configuration',
      };
    } else if (endpoint.script) {
      // Execute script (basic eval - in production, use a sandbox)
      try {
        const scriptFn = new Function('request', 'response', endpoint.script);
        const response = { status: endpoint.statusCode, body: endpoint.responseTemplate };
        scriptFn(request, response);
        responseStatus = response.status;
        responseBody = response.body as Record<string, unknown>;
      } catch {
        responseBody = endpoint.responseTemplate as Record<string, unknown>;
      }
    } else {
      responseBody = this.interpolateResponse(
        endpoint.responseTemplate as Record<string, unknown>,
        request,
      );
    }

    const latencyMs = Date.now() - startTime;

    // Log the call
    await this.prisma.apiCallLog.create({
      data: {
        endpointId: endpoint.id,
        requestMethod: request.method,
        requestPath: request.path,
        requestHeaders: request.headers,
        requestBody: (request.body || {}) as Prisma.InputJsonValue,
        responseStatus,
        responseBody: responseBody as Prisma.InputJsonValue,
        latencyMs,
        errorInjected: shouldError,
      },
    });

    return { status: responseStatus, body: responseBody };
  }

  async getCallLogs(endpointId: string, limit: number = 50) {
    return this.prisma.apiCallLog.findMany({
      where: { endpointId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private interpolateResponse(
    template: Record<string, unknown>,
    request: { body: Record<string, unknown>; query: Record<string, string> },
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string') {
        // Replace {{request.body.field}} and {{request.query.field}}
        result[key] = value.replace(/\{\{request\.(body|query)\.(\w+)\}\}/g, (_, type, field) => {
          if (type === 'body') {
            return String(request.body[field] ?? '');
          }
          return String(request.query[field] ?? '');
        });
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateResponse(value as Record<string, unknown>, request);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
