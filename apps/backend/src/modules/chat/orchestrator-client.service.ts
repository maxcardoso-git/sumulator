import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface ChatSession {
  id: string;
  environmentId: string;
  scenarioId: string | null;
  externalSessionId: string | null;
  environment: {
    id: string;
    orchestratorBaseUrl: string | null;
    authType: string | null;
    authConfig: Prisma.JsonValue;
  };
}

interface ChatMessage {
  id: string;
  type: string;
  content: string | null;
  payload: Prisma.JsonValue;
}

@Injectable()
export class OrchestratorClientService {
  constructor(private prisma: PrismaService) {}

  async sendToOrchestrator(
    session: ChatSession,
    message: ChatMessage,
    correlationId: string,
  ) {
    const startTime = Date.now();
    const endpoint = `${session.environment.orchestratorBaseUrl}/inbound`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
      'X-Session-Id': session.id,
    };

    // Add auth headers based on auth_type
    if (session.environment.authType === 'bearer') {
      const authConfig = session.environment.authConfig as Record<string, unknown> | null;
      const token = authConfig?.token as string | undefined;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const requestBody = {
      session_id: session.externalSessionId || session.id,
      message_id: message.id,
      type: message.type,
      content: message.content,
      payload: message.payload,
      correlation_id: correlationId,
      metadata: {
        simulator_session_id: session.id,
        environment_id: session.environmentId,
        scenario_id: session.scenarioId,
      },
    };

    let responseStatus: number | null = null;
    let responseBody: Record<string, unknown> | null = null;
    let errorFlag = false;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
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
    await this.prisma.orchestratorCall.create({
      data: {
        environmentId: session.environmentId,
        scenarioId: session.scenarioId,
        sessionId: session.id,
        direction: 'outbound',
        endpoint,
        method: 'POST',
        requestHeaders: headers as Prisma.InputJsonValue,
        requestBody: requestBody as unknown as Prisma.InputJsonValue,
        responseStatus,
        responseBody: (responseBody ?? {}) as Prisma.InputJsonValue,
        latencyMs,
        errorFlag,
        correlationId,
      },
    });

    return { success: !errorFlag, responseStatus, responseBody, latencyMs };
  }
}
