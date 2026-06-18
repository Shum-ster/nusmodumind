import { Test, TestingModule } from '@nestjs/testing';
import { PlanReviewsController } from './plan_reviews.controller';
import { PlanReviewsService } from './plan_reviews.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';

describe('PlanReviewsController', () => {
  let controller: PlanReviewsController;
  let service: {
    create: jest.Mock;
    remove: jest.Mock;
  };

  const review = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    publicPlanId: '33333333-3333-3333-3333-333333333333',
    rating: 8,
    content: 'Helpful plan',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(review),
      remove: jest.fn().mockResolvedValue(review),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanReviewsController],
      providers: [{ provide: PlanReviewsService, useValue: service }],
    }).compile();

    controller = module.get<PlanReviewsController>(PlanReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a plan review', async () => {
    const dto: CreatePlanReviewDto = {
      userId: review.userId,
      publicPlanId: review.publicPlanId,
      rating: 8,
      content: 'Helpful plan',
    };

    await expect(controller.create(dto)).resolves.toEqual(review);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('removes a plan review', async () => {
    await expect(controller.remove(review.id)).resolves.toEqual(review);
    expect(service.remove).toHaveBeenCalledWith(review.id);
  });
});
