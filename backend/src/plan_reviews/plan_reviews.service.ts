import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from '../public_plans/public_plans.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';
import { Prisma } from '@prisma/client';
import { planAuthorSelect, type PlanReviewWithUser } from '../shared/types';
import { UpdatePlanReviewDto } from './dto/update-plan_review.dto';

@Injectable()
export class PlanReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicPlansService: PublicPlansService,
  ) {}

  async create(
    userId: string,
    createPlanReviewDto: CreatePlanReviewDto,
  ): Promise<PlanReviewWithUser> {
    try {
      await this.publicPlansService.findOneWithoutViewIncrement(
        createPlanReviewDto.publicPlanId,
      );
    } catch {
      throw new BadRequestException(
        'Cannot review a plan that does not exist.',
      );
    }

    try {
      return await this.prisma.planReview.create({
        data: {
          ...createPlanReviewDto,
          userId,
        },
        include: {
          user: { select: planAuthorSelect },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'You already reviewed this public plan. Edit your existing review instead.',
        );
      }

      throw error;
    }
  }

  async findByPlan(publicPlanId: string): Promise<PlanReviewWithUser[]> {
    return this.prisma.planReview.findMany({
      where: { publicPlanId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: planAuthorSelect },
      },
    });
  }

  async findOne(id: string): Promise<PlanReviewWithUser> {
    const review = await this.prisma.planReview.findUnique({
      where: { id },
      include: {
        user: { select: planAuthorSelect },
      },
    });

    if (!review) {
      throw new NotFoundException(`Plan review with ID ${id} not found`);
    }

    return review;
  }

  async update(
    userId: string,
    id: string,
    updatePlanReviewDto: UpdatePlanReviewDto,
  ): Promise<PlanReviewWithUser> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot edit this plan review.');
    }

    return this.prisma.planReview.update({
      where: { id },
      data: updatePlanReviewDto,
      include: {
        user: { select: planAuthorSelect },
      },
    });
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
