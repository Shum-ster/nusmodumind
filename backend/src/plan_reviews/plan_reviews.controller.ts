import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../shared/types';
import { PlanReviewsService } from './plan_reviews.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';
import { UpdatePlanReviewDto } from './dto/update-plan_review.dto';

@Controller('plan-reviews')
export class PlanReviewsController {
  constructor(private readonly planReviewsService: PlanReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
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
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanReviewDto: UpdatePlanReviewDto,
  ) {
    return this.planReviewsService.update(user.id, id, updatePlanReviewDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.planReviewsService.remove(user.id, id);
  }
}
