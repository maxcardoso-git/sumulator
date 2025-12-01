import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExternalApisService } from './external-apis.service';
import { CreateExternalApiDto, UpdateExternalApiDto, InvokeExternalApiDto } from './dto';

@ApiTags('External APIs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('external-apis')
export class ExternalApisController {
  constructor(private readonly externalApisService: ExternalApisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new external API configuration' })
  create(@Body() dto: CreateExternalApiDto) {
    return this.externalApisService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all external APIs' })
  @ApiQuery({ name: 'environment_id', required: false })
  findAll(@Query('environment_id') environmentId?: string) {
    return this.externalApisService.findAll(environmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get external API by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.externalApisService.findOne(id);
  }

  @Get('by-form/:formId')
  @ApiOperation({ summary: 'Get external APIs associated with a form' })
  findByForm(@Param('formId', ParseUUIDPipe) formId: string) {
    return this.externalApisService.findByFormId(formId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update external API configuration' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExternalApiDto,
  ) {
    return this.externalApisService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete external API configuration' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.externalApisService.remove(id);
  }

  @Post(':id/invoke')
  @ApiOperation({ summary: 'Invoke/test external API' })
  invoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvokeExternalApiDto,
  ) {
    return this.externalApisService.invoke(id, dto);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test external API with sample data' })
  test(@Param('id', ParseUUIDPipe) id: string) {
    return this.externalApisService.invoke(id, {
      payload: { sample: 'test data', timestamp: new Date().toISOString() },
    });
  }
}
