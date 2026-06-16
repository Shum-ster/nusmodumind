import { PartialType } from '@nestjs/mapped-types';
import { CreateModuleReviewDto } from './create-module_review.dto';

export class UpdateModuleReviewDto extends PartialType(CreateModuleReviewDto) {}
