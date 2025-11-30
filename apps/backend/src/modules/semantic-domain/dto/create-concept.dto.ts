import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConceptDto {
  @ApiProperty({ example: 'finance' })
  @IsString()
  domain: string;

  @ApiProperty({ example: 'credit_limit' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Limite de Crédito' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'Valor máximo disponível para operações de crédito' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { unit: 'currency' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
