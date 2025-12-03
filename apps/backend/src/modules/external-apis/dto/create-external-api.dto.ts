import {
  IsString,
  IsObject,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExternalApiDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-form' })
  @IsOptional()
  @IsUUID()
  form_id?: string;

  @ApiProperty({ example: 'API de Analise IA' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ANALISE_IA_API' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'API do Orquestrador para analise de dados com IA' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'CONSULTA_IA', default: 'CONSULTA_IA' })
  @IsOptional()
  @IsIn(['CHAT', 'CONSULTA_IA'])
  api_type?: string;

  @ApiProperty({ example: 'https://api.orchestrator.com' })
  @IsString()
  base_url: string;

  @ApiProperty({ example: '/v1/analyze' })
  @IsString()
  endpoint: string;

  @ApiPropertyOptional({ example: 'POST', default: 'POST' })
  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: string;

  @ApiPropertyOptional({
    example: { 'Content-Type': 'application/json' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ example: 'BEARER_TOKEN' })
  @IsOptional()
  @IsIn(['NONE', 'BEARER_TOKEN', 'API_KEY', 'BASIC', 'OAUTH2_PASSWORD'])
  auth_type?: string;

  @ApiPropertyOptional({
    example: { token: 'your-api-token' },
  })
  @IsOptional()
  @IsObject()
  auth_config?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { prompt: 'Analise os dados', data: '{{DATA}}' },
  })
  @IsOptional()
  @IsObject()
  request_body?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 30000, default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
