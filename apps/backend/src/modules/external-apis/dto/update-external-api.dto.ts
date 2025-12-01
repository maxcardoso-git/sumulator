import { PartialType } from '@nestjs/swagger';
import { CreateExternalApiDto } from './create-external-api.dto';

export class UpdateExternalApiDto extends PartialType(CreateExternalApiDto) {}
