import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateDomainDto {
  @ApiPropertyOptional({ example: 'uuid-of-environment' })
  @IsOptional()
  @IsUUID()
  environment_id?: string;

  @ApiProperty({ example: 'finance', description: 'Available: finance, customer_service' })
  @IsString()
  domain: string;

  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  include_synonyms?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  include_relations?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  contextual_rules?: boolean;
}
