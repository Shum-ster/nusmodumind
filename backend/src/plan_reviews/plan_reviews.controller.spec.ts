import { Test, TestingModule } from '@nestjs/testing';
import { PlanReviewsController } from './plan_reviews.controller';
import { PlanReviewsService } from './plan_reviews.service';
import { CreatePlanReviewDto } from './dto/create-plan_review.dto';

describe('PlanReviewsController', () => {
  let controller: PlanReviewsController;
  let service: {
    create: jest.Mock;
    findByPlan: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'student@example.com',
  };
  const review = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: user.id,
    publicPlanId: '33333333-3333-3333-3333-333333333333',
    rating: 8,
    content: 'Helpful plan',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(review),
      findByPlan: jest.fn().mockResolvedValue([review]),
      findOne: jest.fn().mockResolvedValue(review),
      update: jest.fn().mockResolvedValue(review),
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

  it('creates a plan review for the current user', async () => {
    const dto: CreatePlanReviewDto = {
      publicPlanId: review.publicPlanId,
      rating: 8,
      content: 'Helpful plan',
    };

    await expect(controller.create(user, dto)).resolves.toEqual(review);
    expect(service.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('finds reviews by public plan', async () => {
    await expect(controller.findByPlan(review.publicPlanId)).resolves.toEqual([
      review,
    ]);
    expect(service.findByPlan).toHaveBeenCalledWith(review.publicPlanId);
  });

  it('finds one plan review', async () => {
    await expect(controller.findOne(review.id)).resolves.toEqual(review);
    expect(service.findOne).toHaveBeenCalledWith(review.id);
  });

  it('removes a plan review for the current user', async () => {
    await expect(controller.remove(user, review.id)).resolves.toEqual(review);
    expect(service.remove).toHaveBeenCalledWith(user.id, review.id);
  });

  it('updates a plan review for the current user', async () => {
    const dto = { rating: 9, content: 'Updated review' };

    await expect(controller.update(user, review.id, dto)).resolves.toEqual(
      review,
    );
    expect(service.update).toHaveBeenCalledWith(user.id, review.id, dto);
  });
});
