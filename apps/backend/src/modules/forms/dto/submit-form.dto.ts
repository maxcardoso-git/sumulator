import { IsObject, IsUUID, IsOptional } from 'class-validator';
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
