import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto, BulkSubmitFormDto } from './dto/submit-form.dto';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}

  @Post()
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Criar formulário dinâmico' })
  async create(@Body() dto: CreateFormDto, @CurrentUser() user: CurrentUserData) {
    return this.formsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar formulários' })
  async findAll(@Query('environment_id') environmentId?: string) {
    return this.formsService.findAll(environmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar formulário por ID' })
  async findById(@Param('id') id: string) {
    return this.formsService.findById(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Atualizar formulário' })
  async update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.formsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover formulário' })
  async delete(@Param('id') id: string) {
    return this.formsService.delete(id);
  }

  @Post(':formCode/submit')
  @ApiOperation({ summary: 'Submeter dados de formulário' })
  async submit(@Param('formCode') formCode: string, @Body() dto: SubmitFormDto) {
    return this.formsService.submit(formCode, dto);
  }

  @Post(':formCode/bulk-submit')
  @Roles('ADMIN', 'DEV', 'QA')
  @ApiOperation({ summary: 'Submeter múltiplos dados de formulário em lote (Data Generator)' })
  async bulkSubmit(@Param('formCode') formCode: string, @Body() dto: BulkSubmitFormDto) {
    return this.formsService.bulkSubmit(formCode, dto);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Listar submissões de um formulário' })
  async getSubmissions(@Param('id') id: string) {
    return this.formsService.getSubmissions(id);
  }
}
