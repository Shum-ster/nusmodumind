import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from '../public_plans/public_plans.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';
import { PlanReview } from '@prisma/client';

@Injectable()
export class PlanReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicPlansService: PublicPlansService,
  ) {}

  async create(createPlanReviewDto: CreatePlanReviewDto): Promise<PlanReview> {
    // Validates the public plan exists
    try {
      await this.publicPlansService.findOne(createPlanReviewDto.publicPlanId);
    } catch (error) {
      throw new BadRequestException('Cannot review a plan that does not exist.');
    }

    return this.prisma.planReview.create({
      data: createPlanReviewDto,
    });
  }

  async remove(id: string) {
    return this.prisma.planReview.delete({
      where: { id },
    });
  }
}