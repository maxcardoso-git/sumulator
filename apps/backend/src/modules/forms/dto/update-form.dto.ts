import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFormDto } from './create-form.dto';

export class UpdateFormDto extends PartialType(OmitType(CreateFormDto, ['environment_id'])) {}
