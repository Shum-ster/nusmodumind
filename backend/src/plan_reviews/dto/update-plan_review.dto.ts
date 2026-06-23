import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanReviewDto } from './create-plan_review.dto';

export class UpdatePlanReviewDto extends PartialType(CreatePlanReviewDto) {}
