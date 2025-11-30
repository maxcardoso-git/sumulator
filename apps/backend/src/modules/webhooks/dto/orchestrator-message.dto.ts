import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrchestratorMessageDto {
  @ApiProperty({ example: 'session-uuid-or-external-id' })
  @IsString()
  session_id: string;

  @ApiPropertyOptional({ enum: ['outbound'], default: 'outbound' })
  @IsOptional()
  @IsIn(['outbound'])
  direction?: string;

  @ApiProperty({ example: 'Olá! Como posso ajudar?' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: { buttons: [{ label: 'Sim' }, { label: 'Não' }] } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'correlation-uuid' })
  @IsOptional()
  @IsString()
  correlation_id?: string;

  @ApiPropertyOptional({ example: 'run-uuid' })
  @IsOptional()
  @IsString()
  run_id?: string;
}
