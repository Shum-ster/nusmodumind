import { Test, TestingModule } from '@nestjs/testing';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';

describe('SemestersController', () => {
  let controller: SemestersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SemestersController],
      providers: [SemestersService],
    }).compile();

    controller = module.get<SemestersController>(SemestersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
