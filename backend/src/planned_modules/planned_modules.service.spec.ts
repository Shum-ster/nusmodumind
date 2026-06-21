import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PlannedModulesService } from './planned_modules.service';

describe('PlannedModulesService', () => {
  let service: PlannedModulesService;
  let prisma: {
    semester: {
      findUnique: jest.Mock;
    };
    plannedModule: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const userId = '33333333-3333-3333-3333-333333333333';
  const semester = {
    id: '22222222-2222-2222-2222-222222222222',
    userId,
  };
  const plannedModule = {
    id: '11111111-1111-1111-1111-111111111111',
    semesterId: semester.id,
    moduleCode: 'CS1010S',
    expectedGrade: 'A',
    actualGrade: null,
    selectedLessons: null,
    semester,
  };

  beforeEach(async () => {
    prisma = {
      semester: {
        findUnique: jest.fn().mockResolvedValue(semester),
      },
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

  it('creates a planned module with uppercase module code for an owned semester', async () => {
    await expect(
      service.create(userId, {
        semesterId: plannedModule.semesterId,
        moduleCode: 'cs1010s',
        expectedGrade: 'A',
      }),
    ).resolves.toEqual(plannedModule);
    expect(prisma.semester.findUnique).toHaveBeenCalledWith({
      where: { id: plannedModule.semesterId },
      select: { userId: true },
    });
    expect(prisma.plannedModule.create).toHaveBeenCalledWith({
      data: {
        semesterId: plannedModule.semesterId,
        moduleCode: 'CS1010S',
        expectedGrade: 'A',
      },
    });
  });

  it('rejects creating a planned module in another user semester', async () => {
    prisma.semester.findUnique.mockResolvedValue({
      userId: '44444444-4444-4444-4444-444444444444',
    });

    await expect(
      service.create(userId, {
        semesterId: plannedModule.semesterId,
        moduleCode: 'cs1010s',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('finds one planned module with module and semester details for the owner', async () => {
    await expect(service.findOne(plannedModule.id, userId)).resolves.toEqual(
      plannedModule,
    );
    expect(prisma.plannedModule.findUnique).toHaveBeenCalledWith({
      where: { id: plannedModule.id },
      include: { module: true, semester: true },
    });
  });

  it('throws when a planned module does not exist', async () => {
    prisma.plannedModule.findUnique.mockResolvedValue(null);

    await expect(service.findOne(plannedModule.id, userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the planned module belongs to another user', async () => {
    await expect(
      service.findOne(plannedModule.id, '44444444-4444-4444-4444-444444444444'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates an existing planned module with uppercase module code for the owner', async () => {
    await expect(
      service.update(userId, plannedModule.id, {
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

  it('removes an existing planned module for the owner', async () => {
    await expect(service.remove(userId, plannedModule.id)).resolves.toEqual(
      plannedModule,
    );
    expect(prisma.plannedModule.delete).toHaveBeenCalledWith({
      where: { id: plannedModule.id },
    });
  });
});
