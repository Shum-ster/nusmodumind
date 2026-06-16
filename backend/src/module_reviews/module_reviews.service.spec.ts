import { Test, TestingModule } from '@nestjs/testing';
import { ModuleReviewsService } from './module_reviews.service';

describe('ModuleReviewsService', () => {
  let service: ModuleReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModuleReviewsService],
    }).compile();

    service = module.get<ModuleReviewsService>(ModuleReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
