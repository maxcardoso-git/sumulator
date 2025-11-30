import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SimulatedApiService } from './simulated-api.service';
import { CreateApiEndpointDto } from './dto/create-api-endpoint.dto';
import { UpdateApiEndpointDto } from './dto/update-api-endpoint.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('sim-apis')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('sim-apis')
export class SimulatedApiController {
  constructor(private simulatedApiService: SimulatedApiService) {}

  @Post()
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Criar endpoint HTTP simulado' })
  async create(@Body() dto: CreateApiEndpointDto) {
    return this.simulatedApiService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar endpoints simulados' })
  async findAll(
    @Query('environment_id') environmentId?: string,
    @Query('scenario_id') scenarioId?: string,
  ) {
    return this.simulatedApiService.findAll(environmentId, scenarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar endpoint por ID' })
  async findById(@Param('id') id: string) {
    return this.simulatedApiService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Atualizar endpoint' })
  async update(@Param('id') id: string, @Body() dto: UpdateApiEndpointDto) {
    return this.simulatedApiService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover endpoint' })
  async delete(@Param('id') id: string) {
    return this.simulatedApiService.delete(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Listar logs de chamadas do endpoint' })
  async getCallLogs(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.simulatedApiService.getCallLogs(id, limit);
  }
}
