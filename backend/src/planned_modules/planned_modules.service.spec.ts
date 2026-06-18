import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PlannedModulesService } from './planned_modules.service';

describe('PlannedModulesService', () => {
  let service: PlannedModulesService;
  let prisma: {
    plannedModule: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const plannedModule = {
    id: '11111111-1111-1111-1111-111111111111',
    semesterId: '22222222-2222-2222-2222-222222222222',
    moduleCode: 'CS1010S',
    expectedGrade: 'A',
    actualGrade: null,
    selectedLessons: null,
  };

  beforeEach(async () => {
    prisma = {
      plannedModule: {
        create: jest.fn().mockResolvedValue(plannedModule),
        findUnique: jest.fn().mockResolvedValue(plannedModule),
        update: jest.fn().mockResolvedValue(plannedModule),
        delete: jest.fn().mockResolvedValue(plannedModule),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannedModulesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlannedModulesService>(PlannedModulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a planned module with uppercase module code', async () => {
    await expect(
      service.create({
        semesterId: plannedModule.semesterId,
        moduleCode: 'cs1010s',
        expectedGrade: 'A',
      }),
    ).resolves.toEqual(plannedModule);
    expect(prisma.plannedModule.create).toHaveBeenCalledWith({
      data: {
        semesterId: plannedModule.semesterId,
        moduleCode: 'CS1010S',
        expectedGrade: 'A',
      },
    });
  });

  it('finds one planned module with module details', async () => {
    await expect(service.findOne(plannedModule.id)).resolves.toEqual(
      plannedModule,
    );
    expect(prisma.plannedModule.findUnique).toHaveBeenCalledWith({
      where: { id: plannedModule.id },
      include: { module: true },
    });
  });

  it('throws when a planned module does not exist', async () => {
    prisma.plannedModule.findUnique.mockResolvedValue(null);

    await expect(service.findOne(plannedModule.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an existing planned module with uppercase module code', async () => {
    await expect(
      service.update(plannedModule.id, {
        moduleCode: 'ma1521',
        actualGrade: 'A-',
      }),
    ).resolves.toEqual(plannedModule);
    expect(prisma.plannedModule.update).toHaveBeenCalledWith({
      where: { id: plannedModule.id },
      data: {
        moduleCode: 'MA1521',
        actualGrade: 'A-',
      },
    });
  });

  it('removes an existing planned module', async () => {
    await expect(service.remove(plannedModule.id)).resolves.toEqual(
      plannedModule,
    );
    expect(prisma.plannedModule.delete).toHaveBeenCalledWith({
      where: { id: plannedModule.id },
    });
  });
});
