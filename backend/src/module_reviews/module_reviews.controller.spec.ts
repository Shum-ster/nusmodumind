import { Test, TestingModule } from '@nestjs/testing';
import { ModuleReviewsController } from './module_reviews.controller';
import { ModuleReviewsService } from './module_reviews.service';
import { CreateModuleReviewDto } from './dto/create-module_review.dto';
import { UpdateModuleReviewDto } from './dto/update-module_review.dto';

describe('ModuleReviewsController', () => {
  let controller: ModuleReviewsController;
  let service: {
    create: jest.Mock;
    findByModule: jest.Mock;
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
    moduleCode: 'CS1010S',
    rating: 9,
    content: 'Good module',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(review),
      findByModule: jest.fn().mockResolvedValue([review]),
      findOne: jest.fn().mockResolvedValue(review),
      update: jest.fn().mockResolvedValue(review),
      remove: jest.fn().mockResolvedValue(review),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModuleReviewsController],
      providers: [{ provide: ModuleReviewsService, useValue: service }],
    }).compile();

    controller = module.get<ModuleReviewsController>(ModuleReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a module review for the current user', async () => {
    const dto: CreateModuleReviewDto = {
      moduleCode: 'cs1010s',
      rating: 9,
      content: 'Good module',
    };

    await expect(controller.create(user, dto)).resolves.toEqual(review);
    expect(service.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('finds reviews by module', async () => {
    await expect(controller.findByModule('cs1010s')).resolves.toEqual([review]);
    expect(service.findByModule).toHaveBeenCalledWith('cs1010s');
  });

  it('finds one review', async () => {
    await expect(controller.findOne(review.id)).resolves.toEqual(review);
    expect(service.findOne).toHaveBeenCalledWith(review.id);
  });

  it('updates a review for the current user', async () => {
    const dto: UpdateModuleReviewDto = { rating: 8 };

    await expect(controller.update(user, review.id, dto)).resolves.toEqual(
      review,
    );
    expect(service.update).toHaveBeenCalledWith(user.id, review.id, dto);
  });

  it('removes a review for the current user', async () => {
    await expect(controller.remove(user, review.id)).resolves.toEqual(review);
    expect(service.remove).toHaveBeenCalledWith(user.id, review.id);
  });
});
