import { IsString, IsObject, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormDto {
  @ApiProperty({ example: 'uuid-of-environment' })
  @IsUUID()
  environment_id: string;

  @ApiProperty({ example: 'Customer Registration Form' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CUSTOMER_REG_FORM' })
  @IsString()
  code: string;

  @ApiProperty({
    example: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Nome' },
        email: { type: 'string', format: 'email', title: 'Email' },
        age: { type: 'number', title: 'Idade' },
      },
      required: ['name', 'email'],
    },
  })
  @IsObject()
  schema: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      'ui:order': ['name', 'email', 'age'],
    },
  })
  @IsOptional()
  @IsObject()
  ui_schema?: Record<string, unknown>;
}
