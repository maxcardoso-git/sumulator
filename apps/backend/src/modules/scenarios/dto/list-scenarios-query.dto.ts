import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListScenariosQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
