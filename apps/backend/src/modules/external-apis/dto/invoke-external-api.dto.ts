import { IsObject, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InvokeExternalApiDto {
  @ApiPropertyOptional({
    example: { data: [{ valor: 1000, tipo: 'venda' }] },
    description: 'Dados a serem enviados para a API (substituirá {{DATA}} no request_body)',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { 'X-Custom-Header': 'value' },
    description: 'Headers adicionais para a requisição',
  })
  @IsOptional()
  @IsObject()
  extra_headers?: Record<string, string>;
}
