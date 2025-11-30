import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { OrchestratorClientService } from './orchestrator-client.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, OrchestratorClientService],
  exports: [ChatService, OrchestratorClientService, ChatGateway],
})
export class ChatModule {}
