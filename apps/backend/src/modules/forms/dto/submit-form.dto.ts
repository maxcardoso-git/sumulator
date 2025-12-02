import { IsObject, IsUUID, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitFormDto {
  @ApiPropertyOptional({ example: 'uuid-of-session' })
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiProperty({
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    },
  })
  @IsObject()
  data: Record<string, unknown>;
}

export class BulkSubmitFormDto {
  @ApiPropertyOptional({ example: 'uuid-of-session' })
  @IsOptional()
  @IsUUID()
  session_id?: string;

  @ApiProperty({
    description: 'Array of data objects to submit',
    example: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Doe', email: 'jane@example.com' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  data: Record<string, unknown>[];
}
