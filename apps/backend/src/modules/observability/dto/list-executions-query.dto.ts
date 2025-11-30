import { IsString, IsOptional, IsUUID, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListExecutionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scenario_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiPropertyOptional({ enum: ['pending', 'running', 'completed', 'failed'] })
  @IsOptional()
  @IsIn(['pending', 'running', 'completed', 'failed'])
  status?: string;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}
