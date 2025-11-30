import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrchestratorClientService } from './orchestrator-client.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private orchestratorClient: OrchestratorClientService,
  ) {}

  async createSession(dto: CreateSessionDto) {
    const session = await this.prisma.chatSession.create({
      data: {
        environmentId: dto.environment_id,
        scenarioId: dto.scenario_id,
        externalSessionId: dto.external_session_id || uuidv4(),
        status: 'active',
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      },
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        scenario: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return session;
  }

  async getSessions(environmentId?: string, scenarioId?: string) {
    const where: Record<string, unknown> = {};
    if (environmentId) where.environmentId = environmentId;
    if (scenarioId) where.scenarioId = scenarioId;

    return this.prisma.chatSession.findMany({
      where,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        scenario: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSessionById(id: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id },
      include: {
        environment: true,
        scenario: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session "${id}" not found`);
    }

    return session;
  }

  async sendMessage(sessionId: string, dto: SendMessageDto) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { environment: true },
    });

    if (!session) {
      throw new NotFoundException(`Session "${sessionId}" not found`);
    }

    const correlationId = uuidv4();

    // Save inbound message
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        direction: 'inbound',
        type: dto.type || 'text',
        content: dto.content,
        payload: (dto.payload || {}) as Prisma.InputJsonValue,
        correlationId,
      },
    });

    // Update session timestamp
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Call orchestrator asynchronously
    let orchestratorCallEnqueued = false;
    if (session.environment.orchestratorBaseUrl) {
      this.orchestratorClient.sendToOrchestrator(session, message, correlationId).catch((err) => {
        console.error('Failed to send to orchestrator:', err);
      });
      orchestratorCallEnqueued = true;
    }

    return {
      message_id: message.id,
      correlation_id: correlationId,
      orchestrator_call_enqueued: orchestratorCallEnqueued,
    };
  }

  async addOutboundMessage(
    sessionId: string,
    content: string,
    payload: Record<string, unknown>,
    correlationId?: string,
    runId?: string,
  ) {
    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        direction: 'outbound',
        type: payload.type as string || 'text',
        content,
        payload: payload as Prisma.InputJsonValue,
        correlationId,
        orchestratorRunId: runId,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async closeSession(sessionId: string) {
    await this.getSessionById(sessionId);
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'closed' },
    });
  }
}
