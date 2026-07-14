import { PartialType } from '@nestjs/mapped-types';
import { CreatePlannedModuleDto } from './create-planned_module.dto';

export class UpdatePlannedModuleDto extends PartialType(
  CreatePlannedModuleDto,
) {}
