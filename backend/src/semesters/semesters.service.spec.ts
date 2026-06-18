import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SemestersService } from './semesters.service';

describe('SemestersService', () => {
  let service: SemestersService;
  let prisma: {
    semester: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const semester = {
    id: '11111111-1111-1111-1111-111111111111',
    acadYear: '2026/2027',
    semesterNumber: 1,
    userId: '22222222-2222-2222-2222-222222222222',
  };

  beforeEach(async () => {
    prisma = {
      semester: {
        create: jest.fn().mockResolvedValue(semester),
        findMany: jest.fn().mockResolvedValue([semester]),
        findUnique: jest.fn().mockResolvedValue(semester),
        update: jest.fn().mockResolvedValue(semester),
        delete: jest.fn().mockResolvedValue(semester),
      },
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

  it('creates a semester', async () => {
    const data = {
      acadYear: '2026/2027',
      semesterNumber: 1,
      userId: semester.userId,
    };

    await expect(service.create(data)).resolves.toEqual(semester);
    expect(prisma.semester.create).toHaveBeenCalledWith({ data });
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

  it('finds one semester with planned modules', async () => {
    await expect(service.findOne(semester.id)).resolves.toEqual(semester);
    expect(prisma.semester.findUnique).toHaveBeenCalledWith({
      where: { id: semester.id },
      include: { plannedModules: true },
    });
  });

  it('throws when a semester does not exist', async () => {
    prisma.semester.findUnique.mockResolvedValue(null);

    await expect(service.findOne(semester.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an existing semester', async () => {
    await expect(service.update(semester.id, { semesterNumber: 2 })).resolves.toEqual(
      semester,
    );
    expect(prisma.semester.update).toHaveBeenCalledWith({
      where: { id: semester.id },
      data: { semesterNumber: 2 },
    });
  });

  it('removes an existing semester', async () => {
    await expect(service.remove(semester.id)).resolves.toEqual(semester);
    expect(prisma.semester.delete).toHaveBeenCalledWith({
      where: { id: semester.id },
    });
  });
});
