import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddSynonymDto {
  @ApiProperty({ example: 'reembolso' })
  @IsString()
  term: string;

  @ApiPropertyOptional({ example: 'pt-BR' })
  @IsOptional()
  @IsString()
  language?: string;
}
