import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerEventDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-scenario' })
  @IsOptional()
  @IsUUID()
  scenario_id?: string;

  @ApiProperty({ example: 'payment.completed' })
  @IsString()
  event_type: string;

  @ApiProperty({
    example: {
      transaction_id: '12345',
      amount: 150.0,
      customer_id: 'cust-789',
    },
  })
  @IsObject()
  payload: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      'X-Custom-Header': 'value',
    },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}
