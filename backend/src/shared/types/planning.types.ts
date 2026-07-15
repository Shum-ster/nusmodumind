import type { PlannedModuleStatus } from '@prisma/client';
import type {
  CreatePlannedModuleDto,
  PlannedModuleStatusDto,
} from '../../planned_modules/dto/create-planned_module.dto';

export type PlannedModuleDataInput = Omit<CreatePlannedModuleDto, 'status'> & {
  status?: PlannedModuleStatusDto | PlannedModuleStatus;
};
