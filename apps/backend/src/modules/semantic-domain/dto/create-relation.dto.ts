import { IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRelationDto {
  @ApiProperty({ example: 'uuid-of-from-concept' })
  @IsUUID()
  from_concept_id: string;

  @ApiProperty({ example: 'uuid-of-to-concept' })
  @IsUUID()
  to_concept_id: string;

  @ApiProperty({ example: 'is_a', description: 'e.g., is_a, has, affects, generates' })
  @IsString()
  relation_type: string;

  @ApiPropertyOptional({ example: { weight: 1.0 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
