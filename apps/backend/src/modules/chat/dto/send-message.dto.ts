import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiPropertyOptional({ enum: ['text', 'json', 'file', 'image', 'quick_reply'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'json', 'file', 'image', 'quick_reply'])
  type?: string;

  @ApiProperty({ example: 'Olá, gostaria de consultar meu saldo' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: { intent: 'balance_inquiry' } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
