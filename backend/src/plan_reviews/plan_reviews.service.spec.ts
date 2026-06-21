import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from '../public_plans/public_plans.service';
import { PlanReviewsService } from './plan_reviews.service';

describe('PlanReviewsService', () => {
  let service: PlanReviewsService;
  let prisma: {
    planReview: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };
  let publicPlansService: { findOne: jest.Mock };

  const review = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    publicPlanId: '33333333-3333-3333-3333-333333333333',
    rating: 8,
    content: 'Helpful plan',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      planReview: {
        create: jest.fn().mockResolvedValue(review),
        findMany: jest.fn().mockResolvedValue([review]),
        findUnique: jest.fn().mockResolvedValue(review),
        delete: jest.fn().mockResolvedValue(review),
      },
    };
    publicPlansService = {
      findOne: jest.fn().mockResolvedValue({ id: review.publicPlanId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PublicPlansService, useValue: publicPlansService },
      ],
    }).compile();

    service = module.get<PlanReviewsService>(PlanReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a plan review after validating the public plan exists', async () => {
    const data = {
      publicPlanId: review.publicPlanId,
      rating: 8,
      content: 'Helpful plan',
    };

    await expect(service.create(review.userId, data)).resolves.toEqual(review);
    expect(publicPlansService.findOne).toHaveBeenCalledWith(
      review.publicPlanId,
    );
    expect(prisma.planReview.create).toHaveBeenCalledWith({
      data: { ...data, userId: review.userId },
    });
  });

  it('throws a bad request when the public plan does not exist', async () => {
    publicPlansService.findOne.mockRejectedValue(new Error('missing'));

    await expect(
      service.create(review.userId, {
        publicPlanId: review.publicPlanId,
        rating: 8,
        content: 'Helpful plan',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.planReview.create).not.toHaveBeenCalled();
  });

  it('finds reviews by public plan ordered newest first', async () => {
    await expect(service.findByPlan(review.publicPlanId)).resolves.toEqual([
      review,
    ]);
    expect(prisma.planReview.findMany).toHaveBeenCalledWith({
      where: { publicPlanId: review.publicPlanId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('finds one plan review', async () => {
    await expect(service.findOne(review.id)).resolves.toEqual(review);
    expect(prisma.planReview.findUnique).toHaveBeenCalledWith({
      where: { id: review.id },
    });
  });

  it('throws when a plan review does not exist', async () => {
    prisma.planReview.findUnique.mockResolvedValue(null);

    await expect(service.findOne(review.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes a plan review for the owner', async () => {
    await expect(service.remove(review.userId, review.id)).resolves.toEqual(
      review,
    );
    expect(prisma.planReview.delete).toHaveBeenCalledWith({
      where: { id: review.id },
    });
  });

  it('rejects deleting another user plan review', async () => {
    await expect(
      service.remove('44444444-4444-4444-4444-444444444444', review.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
