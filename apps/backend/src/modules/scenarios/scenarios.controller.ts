import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ScenariosService } from './scenarios.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { ListScenariosQueryDto } from './dto/list-scenarios-query.dto';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('scenarios')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private scenariosService: ScenariosService) {}

  @Post()
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Criar cenário de teste' })
  async create(@Body() dto: CreateScenarioDto, @CurrentUser() user: CurrentUserData) {
    return this.scenariosService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cenários' })
  async findAll(@Query() query: ListScenariosQueryDto) {
    return this.scenariosService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cenário por ID' })
  async findById(@Param('id') id: string) {
    return this.scenariosService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Atualizar cenário' })
  async update(@Param('id') id: string, @Body() dto: UpdateScenarioDto) {
    return this.scenariosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Remover cenário' })
  async delete(@Param('id') id: string) {
    return this.scenariosService.delete(id);
  }
}
