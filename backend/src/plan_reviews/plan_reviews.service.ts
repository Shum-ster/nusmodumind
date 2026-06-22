import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from '../public_plans/public_plans.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';
import { PlanReview, Prisma } from '@prisma/client';

const planReviewUserSelect = {
  username: true,
  faculty: true,
  degree: true,
} satisfies Prisma.UserSelect;

type PlanReviewWithUser = Prisma.PlanReviewGetPayload<{
  include: {
    user: {
      select: typeof planReviewUserSelect;
    };
  };
}>;

@Injectable()
export class PlanReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicPlansService: PublicPlansService,
  ) {}

  async create(
    userId: string,
    createPlanReviewDto: CreatePlanReviewDto,
  ): Promise<PlanReview> {
    try {
      await this.publicPlansService.findOne(createPlanReviewDto.publicPlanId);
    } catch {
      throw new BadRequestException(
        'Cannot review a plan that does not exist.',
      );
    }

    return this.prisma.planReview.create({
      data: {
        ...createPlanReviewDto,
        userId,
      },
    });
  }

  async findByPlan(publicPlanId: string): Promise<PlanReviewWithUser[]> {
    return this.prisma.planReview.findMany({
      where: { publicPlanId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: planReviewUserSelect },
      },
    });
  }

  async findOne(id: string): Promise<PlanReviewWithUser> {
    const review = await this.prisma.planReview.findUnique({
      where: { id },
      include: {
        user: { select: planReviewUserSelect },
      },
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
