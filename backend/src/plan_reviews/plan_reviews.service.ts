import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(userId: string, createPlanReviewDto: CreatePlanReviewDto): Promise<PlanReview> {
    // Validates the public plan exists
    try {
      await this.publicPlansService.findOne(createPlanReviewDto.publicPlanId);
    } catch (error) {
      throw new BadRequestException('Cannot review a plan that does not exist.');
    }

    return this.prisma.planReview.create({
      data: {
        ...createPlanReviewDto,
        userId,
      },
    });
  }

  async findByPlan(publicPlanId: string): Promise<PlanReview[]> {
    return this.prisma.planReview.findMany({
      where: { publicPlanId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<PlanReview> {
    const review = await this.prisma.planReview.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException(`Plan review with ID ${id} not found`);
    }

    return review;
  }

  async remove(userId: string, id: string) {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot delete this plan review.');
    }

    return this.prisma.planReview.delete({
      where: { id },
    });
  }
}
