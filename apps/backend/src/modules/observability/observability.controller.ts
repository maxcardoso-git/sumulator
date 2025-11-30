import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ObservabilityService } from './observability.service';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('observability')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('observability')
export class ObservabilityController {
  constructor(private observabilityService: ObservabilityService) {}

  @Get('executions')
  @ApiOperation({ summary: 'Listar execuções de fluxos' })
  async getExecutions(@Query() query: ListExecutionsQueryDto) {
    return this.observabilityService.getExecutions(query);
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Buscar execução por ID com chamadas relacionadas' })
  async getExecutionById(@Param('id') id: string) {
    return this.observabilityService.getExecutionById(id);
  }

  @Get('calls')
  @ApiOperation({ summary: 'Listar chamadas ao Orquestrador' })
  async getOrchestratorCalls(
    @Query('environment_id') environmentId?: string,
    @Query('scenario_id') scenarioId?: string,
    @Query('session_id') sessionId?: string,
    @Query('correlation_id') correlationId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.observabilityService.getOrchestratorCalls({
      environment_id: environmentId,
      scenario_id: scenarioId,
      session_id: sessionId,
      correlation_id: correlationId,
      limit,
    });
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas do dashboard' })
  async getDashboardMetrics(@Query('environment_id') environmentId?: string) {
    return this.observabilityService.getDashboardMetrics(environmentId);
  }

  @Get('latency-distribution')
  @ApiOperation({ summary: 'Distribuição de latência' })
  async getLatencyDistribution(@Query('environment_id') environmentId?: string) {
    return this.observabilityService.getLatencyDistribution(environmentId);
  }
}
