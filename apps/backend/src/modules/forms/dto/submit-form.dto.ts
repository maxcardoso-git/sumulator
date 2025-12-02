import { IsObject, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  data: Record<string, unknown>[];
}
