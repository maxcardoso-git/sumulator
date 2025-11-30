import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';

@Injectable()
export class ObservabilityService {
  constructor(private prisma: PrismaService) {}

  async getExecutions(query: ListExecutionsQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.environment_id) where.environmentId = query.environment_id;
    if (query.scenario_id) where.scenarioId = query.scenario_id;
    if (query.session_id) where.sessionId = query.session_id;
    if (query.status) where.status = query.status;

    return this.prisma.execution.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        scenario: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: query.limit || 100,
    });
  }

  async getExecutionById(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        environment: true,
        scenario: true,
      },
    });

    if (!execution) {
      return null;
    }

    // Get related orchestrator calls
    const calls = await this.prisma.orchestratorCall.findMany({
      where: {
        OR: [
          { sessionId: execution.sessionId },
          { correlationId: execution.orchestratorRunId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...execution,
      orchestratorCalls: calls,
    };
  }

  async getOrchestratorCalls(query: {
    environment_id?: string;
    scenario_id?: string;
    session_id?: string;
    correlation_id?: string;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (query.environment_id) where.environmentId = query.environment_id;
    if (query.scenario_id) where.scenarioId = query.scenario_id;
    if (query.session_id) where.sessionId = query.session_id;
    if (query.correlation_id) where.correlationId = query.correlation_id;

    return this.prisma.orchestratorCall.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        scenario: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 100,
    });
  }

  async getDashboardMetrics(environmentId?: string) {
    const where = environmentId ? { environmentId } : {};

    const [
      totalScenarios,
      totalExecutions,
      totalCalls,
      recentExecutions,
      executionsByStatus,
      avgLatency,
    ] = await Promise.all([
      this.prisma.scenario.count({ where }),
      this.prisma.execution.count({ where }),
      this.prisma.orchestratorCall.count({ where }),
      this.prisma.execution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          scenario: { select: { name: true } },
        },
      }),
      this.prisma.execution.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.orchestratorCall.aggregate({
        where,
        _avg: { latencyMs: true },
        _max: { latencyMs: true },
        _min: { latencyMs: true },
      }),
    ]);

    // Calculate error rate
    const totalCallsWithErrors = await this.prisma.orchestratorCall.count({
      where: { ...where, errorFlag: true },
    });

    const errorRate = totalCalls > 0 ? (totalCallsWithErrors / totalCalls) * 100 : 0;

    return {
      totalScenarios,
      totalExecutions,
      totalCalls,
      errorRate: Math.round(errorRate * 100) / 100,
      latency: {
        avg: avgLatency._avg.latencyMs || 0,
        max: avgLatency._max.latencyMs || 0,
        min: avgLatency._min.latencyMs || 0,
      },
      executionsByStatus: executionsByStatus.map((e) => ({
        status: e.status,
        count: e._count,
      })),
      recentExecutions: recentExecutions.map((e) => ({
        id: e.id,
        runId: e.orchestratorRunId,
        scenario: e.scenario?.name,
        status: e.status,
        startedAt: e.startedAt,
        finishedAt: e.finishedAt,
      })),
    };
  }

  async getLatencyDistribution(environmentId?: string) {
    const where = environmentId ? { environmentId } : {};

    const calls = await this.prisma.orchestratorCall.findMany({
      where,
      select: { latencyMs: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const buckets = [
      { label: '0-50ms', min: 0, max: 50, count: 0 },
      { label: '50-100ms', min: 50, max: 100, count: 0 },
      { label: '100-200ms', min: 100, max: 200, count: 0 },
      { label: '200-500ms', min: 200, max: 500, count: 0 },
      { label: '500ms-1s', min: 500, max: 1000, count: 0 },
      { label: '1s+', min: 1000, max: Infinity, count: 0 },
    ];

    for (const call of calls) {
      const latency = call.latencyMs || 0;
      for (const bucket of buckets) {
        if (latency >= bucket.min && latency < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    return buckets.map((b) => ({ label: b.label, count: b.count }));
  }
}
