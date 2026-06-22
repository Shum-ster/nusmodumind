import { Test, TestingModule } from '@nestjs/testing';
import { PlannedModuleStatus } from '@prisma/client';
import { PlannedModulesController } from './planned_modules.controller';
import { PlannedModulesService } from './planned_modules.service';
import { CreatePlannedModuleDto } from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';

describe('PlannedModulesController', () => {
  let controller: PlannedModulesController;
  let service: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'student@example.com',
  };
  const plannedModule = {
    id: '11111111-1111-1111-1111-111111111111',
    semesterId: '22222222-2222-2222-2222-222222222222',
    userId: user.id,
    moduleCode: 'CS1010S',
    status: PlannedModuleStatus.PLANNED,
    expectedGrade: 'A',
    actualGrade: null,
    selectedLessons: null,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(plannedModule),
      findOne: jest.fn().mockResolvedValue(plannedModule),
      update: jest.fn().mockResolvedValue(plannedModule),
      remove: jest.fn().mockResolvedValue(plannedModule),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlannedModulesController],
      providers: [{ provide: PlannedModulesService, useValue: service }],
    }).compile();

    controller = module.get<PlannedModulesController>(PlannedModulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a planned module for the current user', async () => {
    const dto: CreatePlannedModuleDto = {
      semesterId: plannedModule.semesterId,
      moduleCode: 'cs1010s',
      expectedGrade: 'A',
    };

    await expect(controller.create(user, dto)).resolves.toEqual(plannedModule);
    expect(service.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('finds one planned module for the current user', async () => {
    await expect(controller.findOne(user, plannedModule.id)).resolves.toEqual(
      plannedModule,
    );
    expect(service.findOne).toHaveBeenCalledWith(plannedModule.id, user.id);
  });

  it('updates a planned module for the current user', async () => {
    const dto: UpdatePlannedModuleDto = { actualGrade: 'A-' };

    await expect(controller.update(user, plannedModule.id, dto)).resolves.toEqual(
      plannedModule,
    );
    expect(service.update).toHaveBeenCalledWith(user.id, plannedModule.id, dto);
  });

  it('removes a planned module for the current user', async () => {
    await expect(controller.remove(user, plannedModule.id)).resolves.toEqual(
      plannedModule,
    );
    expect(service.remove).toHaveBeenCalledWith(user.id, plannedModule.id);
  });
});
