import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('environments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('environments')
export class EnvironmentsController {
  constructor(private environmentsService: EnvironmentsService) {}

  @Post()
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Criar ambiente de simulação' })
  async create(@Body() dto: CreateEnvironmentDto) {
    return this.environmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os ambientes' })
  async findAll() {
    return this.environmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ambiente por ID' })
  async findById(@Param('id') id: string) {
    return this.environmentsService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Atualizar ambiente' })
  async update(@Param('id') id: string, @Body() dto: UpdateEnvironmentDto) {
    return this.environmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover ambiente' })
  async delete(@Param('id') id: string) {
    return this.environmentsService.delete(id);
  }
}
