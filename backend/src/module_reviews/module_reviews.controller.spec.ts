import { Test, TestingModule } from '@nestjs/testing';
import { ModuleReviewsController } from './module_reviews.controller';
import { ModuleReviewsService } from './module_reviews.service';

describe('ModuleReviewsController', () => {
  let controller: ModuleReviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModuleReviewsController],
      providers: [ModuleReviewsService],
    }).compile();

    controller = module.get<ModuleReviewsController>(ModuleReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
