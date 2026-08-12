import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SemestersService } from './semesters.service';

describe('SemestersService', () => {
  let service: SemestersService;
  let prisma: {
    semester: {
      create: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    plannedModule: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const semester = {
    id: '11111111-1111-1111-1111-111111111111',
    acadYear: '2026/2027',
    semesterNumber: 1,
    userId: '22222222-2222-2222-2222-222222222222',
  };
  const plannedModule = {
    id: '33333333-3333-3333-3333-333333333333',
    semesterId: semester.id,
    userId: semester.userId,
    moduleCode: 'CS1010S',
    status: 'PLANNED',
  };

  beforeEach(async () => {
    prisma = {
      semester: {
        create: jest.fn().mockResolvedValue(semester),
        upsert: jest.fn().mockResolvedValue(semester),
        findMany: jest.fn().mockResolvedValue([semester]),
        findUnique: jest.fn().mockResolvedValue(semester),
        update: jest.fn().mockResolvedValue(semester),
        delete: jest.fn().mockResolvedValue(semester),
      },
      plannedModule: {
        findMany: jest.fn().mockResolvedValue([plannedModule]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemestersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SemestersService>(SemestersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a semester with the current user id', async () => {
    const data = {
      acadYear: '2026/2027',
      semesterNumber: 1,
    };

    await expect(service.create(semester.userId, data)).resolves.toEqual(
      semester,
    );
    expect(prisma.semester.upsert).toHaveBeenCalledWith({
      where: {
        userId_acadYear_semesterNumber: {
          userId: semester.userId,
          acadYear: data.acadYear,
          semesterNumber: data.semesterNumber,
        },
      },
      create: { ...data, userId: semester.userId },
      update: {},
    });
  });

  it('finds a user plan ordered by academic period with planned modules', async () => {
    await expect(service.findUserPlan(semester.userId)).resolves.toEqual([
      semester,
    ]);
    expect(prisma.semester.findMany).toHaveBeenCalledWith({
      where: { userId: semester.userId },
      orderBy: [{ acadYear: 'asc' }, { semesterNumber: 'asc' }],
      include: {
        plannedModules: {
          include: {
            module: true,
          },
        },
      },
    });
  });

  it('finds the current user plan with semesters and planned modules', async () => {
    await expect(service.findCurrentUserPlan(semester.userId)).resolves.toEqual(
      {
        semesters: [semester],
        plannedModules: [plannedModule],
      },
    );
    expect(prisma.semester.findMany).toHaveBeenCalledWith({
      where: { userId: semester.userId },
      orderBy: [{ acadYear: 'asc' }, { semesterNumber: 'asc' }],
    });
    expect(prisma.plannedModule.findMany).toHaveBeenCalledWith({
      where: { userId: semester.userId },
      orderBy: [{ status: 'asc' }, { moduleCode: 'asc' }],
      include: {
        module: true,
        semester: true,
      },
    });
  });

  it('finds one semester with planned modules for the owner', async () => {
    await expect(
      service.findOne(semester.id, semester.userId),
    ).resolves.toEqual(semester);
    expect(prisma.semester.findUnique).toHaveBeenCalledWith({
      where: { id: semester.id },
      include: { plannedModules: true },
    });
  });

  it('throws when a semester does not exist', async () => {
    prisma.semester.findUnique.mockResolvedValue(null);

    await expect(
      service.findOne(semester.id, semester.userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the semester belongs to another user', async () => {
    await expect(
      service.findOne(semester.id, '33333333-3333-3333-3333-333333333333'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates an existing semester for the owner', async () => {
    await expect(
      service.update(semester.id, semester.userId, { semesterNumber: 2 }),
    ).resolves.toEqual(semester);
    expect(prisma.semester.update).toHaveBeenCalledWith({
      where: { id: semester.id },
      data: { semesterNumber: 2 },
    });
  });

  it('returns a conflict when an update duplicates another semester', async () => {
    prisma.semester.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.update(semester.id, semester.userId, { semesterNumber: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('removes an existing semester for the owner', async () => {
    await expect(service.remove(semester.id, semester.userId)).resolves.toEqual(
      semester,
    );
    expect(prisma.semester.delete).toHaveBeenCalledWith({
      where: { id: semester.id },
    });
  });
});
