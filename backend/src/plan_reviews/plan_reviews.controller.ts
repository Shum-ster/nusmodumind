import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlanReviewsService } from './plan_reviews.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';

@Controller('plan-reviews')
export class PlanReviewsController {
  constructor(private readonly planReviewsService: PlanReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: { id: string; email: string },
    @Body() createPlanReviewDto: CreatePlanReviewDto,
  ) {
    return this.planReviewsService.create(user.id, createPlanReviewDto);
  }

  @Get('plan/:publicPlanId')
  findByPlan(@Param('publicPlanId', ParseUUIDPipe) publicPlanId: string) {
    return this.planReviewsService.findByPlan(publicPlanId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.planReviewsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string; email: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.planReviewsService.remove(user.id, id);
  }
}
