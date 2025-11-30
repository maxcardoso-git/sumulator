import { IsString, IsNumber, IsOptional, IsObject, IsBoolean, IsUUID, IsIn, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteDataDto {
  @ApiProperty({ example: 'transactions', enum: ['transactions', 'operational_events', 'all'] })
  @IsIn(['transactions', 'operational_events', 'all'])
  target_table: string;

  @ApiPropertyOptional({ description: 'Apagar apenas dados gerados pelo simulador' })
  @IsOptional()
  @IsBoolean()
  only_simulator_data?: boolean;

  @ApiPropertyOptional({ description: 'Data inicial para filtrar exclusão' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Data final para filtrar exclusão' })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}

class AnomaliesConfig {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  count?: number;

  @ApiPropertyOptional({ example: ['outlier', 'duplicate', 'null_value'] })
  @IsOptional()
  @IsString({ each: true })
  types?: string[];
}

export class GenerateDataDto {
  @ApiPropertyOptional({ example: 'uuid-of-environment' })
  @IsOptional()
  @IsUUID()
  environment_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-scenario' })
  @IsOptional()
  @IsUUID()
  scenario_id?: string;

  @ApiProperty({ example: 'transactions', enum: ['transactions', 'operational_events'] })
  @IsIn(['transactions', 'operational_events'])
  target_table: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  @Max(100000)
  rows: number;

  @ApiPropertyOptional({
    example: {
      amount: { type: 'normal', params: { mean: 250, stdDev: 100 } },
    },
  })
  @IsOptional()
  @IsObject()
  distributions?: Record<string, { type: string; params?: Record<string, number> }>;

  @ApiPropertyOptional({
    example: {
      customer_channel: 0.7,
    },
  })
  @IsOptional()
  @IsObject()
  correlations?: Record<string, number>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  seasonality?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  anomalies?: AnomaliesConfig;
}
