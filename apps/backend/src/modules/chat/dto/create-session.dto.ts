import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-scenario' })
  @IsOptional()
  @IsUUID()
  scenario_id?: string;

  @ApiPropertyOptional({ example: 'external-session-123' })
  @IsOptional()
  @IsString()
  external_session_id?: string;

  @ApiPropertyOptional({ example: { user_label: 'Test User', channel: 'web' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
