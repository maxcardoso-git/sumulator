import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Criar nova sessão de chat' })
  async createSession(@Body() dto: CreateSessionDto) {
    return this.chatService.createSession(dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Listar sessões de chat' })
  async getSessions(
    @Query('environment_id') environmentId?: string,
    @Query('scenario_id') scenarioId?: string,
  ) {
    return this.chatService.getSessions(environmentId, scenarioId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Buscar sessão por ID com mensagens' })
  async getSessionById(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionById(sessionId);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Enviar mensagem para sessão de chat' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(sessionId, dto);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Listar mensagens de uma sessão' })
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getMessages(sessionId);
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Fechar sessão de chat' })
  async closeSession(@Param('sessionId') sessionId: string) {
    return this.chatService.closeSession(sessionId);
  }
}
