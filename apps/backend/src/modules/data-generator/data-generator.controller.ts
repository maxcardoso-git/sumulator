import { Controller, Post, Delete, Body, Query, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DataGeneratorService } from './data-generator.service';
import { GenerateDataDto, DeleteDataDto } from './dto/generate-data.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('data-generator')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('data-generator')
export class DataGeneratorController {
  constructor(private dataGeneratorService: DataGeneratorService) {}

  @Post('run')
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Gerar dados sintéticos para tabela alvo' })
  async run(@Body() dto: GenerateDataDto) {
    if (dto.target_table === 'transactions') {
      return this.dataGeneratorService.generateTransactions(dto);
    } else if (dto.target_table === 'operational_events') {
      return this.dataGeneratorService.generateOperationalEvents(dto);
    }

    return {
      error: 'Unsupported target table. Use "transactions" or "operational_events".',
    };
  }

  @Delete('clear')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Apagar dados gerados pelo simulador' })
  async clear(@Body() dto: DeleteDataDto) {
    return this.dataGeneratorService.clearData(dto);
  }

  @Get('stats')
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Obter estatísticas dos dados gerados' })
  @ApiQuery({ name: 'target_table', required: false, enum: ['transactions', 'operational_events'] })
  async stats(@Query('target_table') targetTable?: string) {
    return this.dataGeneratorService.getStats(targetTable);
  }
}
