import { Controller, Post, Body, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { PlanReviewsService } from './plan_reviews.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';

@Controller('plan-reviews')
export class PlanReviewsController {
  constructor(private readonly planReviewsService: PlanReviewsService) {}

  @Post()
  create(@Body() createPlanReviewDto: CreatePlanReviewDto) {
    return this.planReviewsService.create(createPlanReviewDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.planReviewsService.remove(id);
  }
}