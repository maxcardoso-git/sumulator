import { IsString, IsOptional, IsArray, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScenarioDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiProperty({ example: 'Payment Flow Test' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'PAYMENT_FLOW_V1' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Testa o fluxo completo de pagamento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['payment', 'integration'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: { timeout: 30000 } })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
