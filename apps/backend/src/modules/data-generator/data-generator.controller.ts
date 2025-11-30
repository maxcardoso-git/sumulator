import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DataGeneratorService } from './data-generator.service';
import { GenerateDataDto } from './dto/generate-data.dto';
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
}
