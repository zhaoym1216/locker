import { PartialType } from '@nestjs/swagger';
import { CreateCircleDto } from './create-circle.dto';

export class UpdateCircleDto extends PartialType(CreateCircleDto) {}
