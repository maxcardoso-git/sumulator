import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { OrchestratorMessageDto } from './dto/orchestrator-message.dto';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('orchestrator/messages')
  @ApiOperation({ summary: 'Receber mensagens do Orquestrador' })
  async handleOrchestratorMessage(@Body() dto: OrchestratorMessageDto) {
    return this.webhooksService.handleOrchestratorMessage(dto);
  }
}
