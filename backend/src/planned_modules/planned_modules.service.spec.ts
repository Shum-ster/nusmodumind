import { Test, TestingModule } from '@nestjs/testing';
import { PlannedModulesService } from './planned_modules.service';

describe('PlannedModulesService', () => {
  let service: PlannedModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlannedModulesService],
    }).compile();

    service = module.get<PlannedModulesService>(PlannedModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
