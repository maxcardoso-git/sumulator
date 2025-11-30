import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SemanticDomainService } from './semantic-domain.service';
import { GenerateDomainDto } from './dto/generate-domain.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { CreateRelationDto } from './dto/create-relation.dto';
import { AddSynonymDto } from './dto/add-synonym.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('semantic-domain')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('semantic-domain')
export class SemanticDomainController {
  constructor(private semanticDomainService: SemanticDomainService) {}

  @Post('generate')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Gerar vocabulário e ontologia para um domínio' })
  async generate(@Body() dto: GenerateDomainDto) {
    return this.semanticDomainService.generate(dto);
  }

  @Get('concepts')
  @ApiOperation({ summary: 'Listar conceitos de domínio' })
  async getConcepts(@Query('domain') domain?: string) {
    return this.semanticDomainService.getConcepts(domain);
  }

  @Get('concepts/:id')
  @ApiOperation({ summary: 'Buscar conceito por ID' })
  async getConceptById(@Param('id') id: string) {
    return this.semanticDomainService.getConceptById(id);
  }

  @Post('concepts')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Criar conceito de domínio' })
  async createConcept(@Body() dto: CreateConceptDto) {
    return this.semanticDomainService.createConcept(dto);
  }

  @Post('relations')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Criar relação entre conceitos' })
  async createRelation(@Body() dto: CreateRelationDto) {
    return this.semanticDomainService.createRelation(dto);
  }

  @Post('concepts/:id/synonyms')
  @Roles('ADMIN', 'DEV')
  @ApiOperation({ summary: 'Adicionar sinônimo a um conceito' })
  async addSynonym(@Param('id') id: string, @Body() dto: AddSynonymDto) {
    return this.semanticDomainService.addSynonym(id, dto.term, dto.language);
  }

  @Get('ontology/:domain')
  @ApiOperation({ summary: 'Obter grafo de ontologia de um domínio' })
  async getOntologyGraph(@Param('domain') domain: string) {
    return this.semanticDomainService.getOntologyGraph(domain);
  }
}
