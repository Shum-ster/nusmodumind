import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from '../public_plans/public_plans.service';
import { PlanReviewsService } from './plan_reviews.service';

describe('PlanReviewsService', () => {
  let service: PlanReviewsService;
  let prisma: {
    planReview: {
      create: jest.Mock;
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
      userId: review.userId,
      publicPlanId: review.publicPlanId,
      rating: 8,
      content: 'Helpful plan',
    };

    await expect(service.create(data)).resolves.toEqual(review);
    expect(publicPlansService.findOne).toHaveBeenCalledWith(
      review.publicPlanId,
    );
    expect(prisma.planReview.create).toHaveBeenCalledWith({ data });
  });

  it('throws a bad request when the public plan does not exist', async () => {
    publicPlansService.findOne.mockRejectedValue(new Error('missing'));

    await expect(
      service.create({
        userId: review.userId,
        publicPlanId: review.publicPlanId,
        rating: 8,
        content: 'Helpful plan',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.planReview.create).not.toHaveBeenCalled();
  });

  it('removes a plan review', async () => {
    await expect(service.remove(review.id)).resolves.toEqual(review);
    expect(prisma.planReview.delete).toHaveBeenCalledWith({
      where: { id: review.id },
    });
  });
});
