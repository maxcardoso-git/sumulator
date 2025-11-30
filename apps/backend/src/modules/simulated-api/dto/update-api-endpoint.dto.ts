import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateApiEndpointDto } from './create-api-endpoint.dto';

export class UpdateApiEndpointDto extends PartialType(
  OmitType(CreateApiEndpointDto, ['environment_id', 'scenario_id']),
) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
