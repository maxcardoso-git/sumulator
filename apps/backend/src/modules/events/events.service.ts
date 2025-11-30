import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TriggerEventDto } from './dto/trigger-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async triggerEvent(dto: TriggerEventDto) {
    const eventId = uuidv4();
    const correlationId = uuidv4();

    // Get environment
    const environment = await this.prisma.environment.findUnique({
      where: { id: dto.environment_id },
    });

    if (!environment) {
      return {
        success: false,
        error: `Environment "${dto.environment_id}" not found`,
      };
    }

    if (!environment.orchestratorBaseUrl) {
      return {
        success: false,
        error: 'Environment does not have an orchestrator URL configured',
      };
    }

    // Prepare event payload
    const eventPayload = {
      event_id: eventId,
      event_type: dto.event_type,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      payload: dto.payload,
      metadata: {
        simulator_environment_id: dto.environment_id,
        simulator_scenario_id: dto.scenario_id,
      },
    };

    const endpoint = `${environment.orchestratorBaseUrl}/events`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Event-Id': eventId,
      'X-Correlation-Id': correlationId,
      ...(dto.headers || {}),
    };

    // Add auth if configured
    if (environment.authType === 'bearer') {
      const token = (environment.authConfig as Record<string, string>)?.token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let responseStatus: number | null = null;
    let responseBody: Record<string, unknown> | null = null;
    let errorFlag = false;
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventPayload),
      });

      responseStatus = response.status;
      responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        errorFlag = true;
      }
    } catch (error) {
      errorFlag = true;
      responseBody = { error: String(error) };
    }

    const latencyMs = Date.now() - startTime;

    // Log the call
    const orchestratorCall = await this.prisma.orchestratorCall.create({
      data: {
        environmentId: dto.environment_id,
        scenarioId: dto.scenario_id,
        direction: 'outbound',
        endpoint,
        method: 'POST',
        requestHeaders: headers as Prisma.InputJsonValue,
        requestBody: eventPayload as unknown as Prisma.InputJsonValue,
        responseStatus,
        responseBody: (responseBody ?? {}) as Prisma.InputJsonValue,
        latencyMs,
        errorFlag,
        correlationId,
      },
    });

    return {
      success: !errorFlag,
      event_id: eventId,
      correlation_id: correlationId,
      orchestrator_call_id: orchestratorCall.id,
      response_status: responseStatus,
      latency_ms: latencyMs,
    };
  }
}
