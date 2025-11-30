import { IsString, IsOptional, IsObject, IsUUID, IsNumber, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiEndpointDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-scenario' })
  @IsOptional()
  @IsUUID()
  scenario_id?: string;

  @ApiProperty({ example: 'GET', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method: string;

  @ApiProperty({ example: '/api/customers/{id}' })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    example: {
      id: '{{request.query.id}}',
      name: 'John Doe',
      email: 'john@example.com',
    },
  })
  @IsOptional()
  @IsObject()
  response_template?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(599)
  status_code?: number;

  @ApiPropertyOptional({ example: 100, description: 'Latency in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  latency_ms?: number;

  @ApiPropertyOptional({ example: 5, description: 'Error rate percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  error_rate?: number;

  @ApiPropertyOptional({
    example: 'response.body.timestamp = new Date().toISOString();',
    description: 'JavaScript code to customize response',
  })
  @IsOptional()
  @IsString()
  script?: string;
}
