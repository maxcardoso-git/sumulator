import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Development' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DEV' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/api/v1/orchestrator' })
  @IsOptional()
  @IsString()
  orchestrator_base_url?: string;

  @ApiPropertyOptional({ example: 'http://localhost:3001/api/v1/worker' })
  @IsOptional()
  @IsString()
  worker_base_url?: string;

  @ApiPropertyOptional({ example: 'bearer' })
  @IsOptional()
  @IsString()
  auth_type?: string;

  @ApiPropertyOptional({ example: { token: 'xxx' } })
  @IsOptional()
  @IsObject()
  auth_config?: Record<string, unknown>;
}
