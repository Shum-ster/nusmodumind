import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicPlanDto } from './create-public_plan.dto';

export class UpdatePublicPlanDto extends PartialType(CreatePublicPlanDto) {}
