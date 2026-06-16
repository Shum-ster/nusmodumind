import { Test, TestingModule } from '@nestjs/testing';
import { PlannedModulesController } from './planned_modules.controller';
import { PlannedModulesService } from './planned_modules.service';

describe('PlannedModulesController', () => {
  let controller: PlannedModulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlannedModulesController],
      providers: [PlannedModulesService],
    }).compile();

    controller = module.get<PlannedModulesController>(PlannedModulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
