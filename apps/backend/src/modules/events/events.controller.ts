import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { TriggerEventDto } from './dto/trigger-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post('trigger')
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Disparar evento/webhook para o Orquestrador' })
  async triggerEvent(@Body() dto: TriggerEventDto) {
    return this.eventsService.triggerEvent(dto);
  }
}
