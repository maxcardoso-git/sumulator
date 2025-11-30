import { Prisma } from '@prisma/client';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { OrchestratorMessageDto } from './dto/orchestrator-message.dto';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async handleOrchestratorMessage(dto: OrchestratorMessageDto) {
    // Find session by external_session_id or session_id
    const session = await this.prisma.chatSession.findFirst({
      where: {
        OR: [
          { id: dto.session_id },
          { externalSessionId: dto.session_id },
        ],
      },
    });

    if (!session) {
      return {
        success: false,
        error: `Session "${dto.session_id}" not found`,
      };
    }

    // Save outbound message
    const message = await this.chatService.addOutboundMessage(
      session.id,
      dto.content,
      dto.payload || {},
      dto.correlation_id,
      dto.run_id,
    );

    // Log the inbound webhook call
    await this.prisma.orchestratorCall.create({
      data: {
        environmentId: session.environmentId,
        scenarioId: session.scenarioId,
        sessionId: session.id,
        direction: 'inbound',
        endpoint: '/webhooks/orchestrator/messages',
        method: 'POST',
        requestBody: dto as unknown as Prisma.InputJsonValue,
        responseStatus: 200,
        responseBody: { message_id: message.id },
        latencyMs: 0,
        errorFlag: false,
        correlationId: dto.correlation_id,
      },
    });

    // Update or create execution record
    if (dto.run_id) {
      const existingExecution = await this.prisma.execution.findFirst({
        where: { orchestratorRunId: dto.run_id },
      });

      if (existingExecution) {
        await this.prisma.execution.update({
          where: { id: existingExecution.id },
          data: {
            status: 'completed',
            finishedAt: new Date(),
          },
        });
      } else {
        await this.prisma.execution.create({
          data: {
            orchestratorRunId: dto.run_id,
            environmentId: session.environmentId,
            scenarioId: session.scenarioId,
            sessionId: session.id,
            status: 'completed',
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        });
      }
    }

    // Notify connected clients via WebSocket
    await this.chatGateway.notifyNewMessage(session.id, {
      id: message.id,
      direction: 'outbound',
      type: message.type,
      content: message.content,
      payload: message.payload,
      createdAt: message.createdAt,
    });

    return {
      success: true,
      message_id: message.id,
    };
  }
}
