import { Test, TestingModule } from '@nestjs/testing';
import { NusmoduleService } from './nusmodule.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NusmoduleService', () => {
  let service: NusmoduleService;
  let prisma: { nusModule: { findMany: jest.Mock; findUnique: jest.Mock } };

  const nusModule = {
    moduleCode: 'CS1010S',
    title: 'Programming Methodology',
    description: 'Introductory programming module',
    moduleCredit: '4',
    department: 'Computer Science',
    faculty: 'School of Computing',
    gradingBasisDescription: 'Graded',
    prerequisite: null,
    preclusion: null,
    corequisite: null,
    workload: [2, 1, 1, 3, 3],
    semesterData: [{ semester: 1 }],
    attributes: { su: true },
    lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
  };

  const listItem = {
    moduleCode: nusModule.moduleCode,
    title: nusModule.title,
    description: nusModule.description,
    moduleCredit: nusModule.moduleCredit,
    department: nusModule.department,
    faculty: nusModule.faculty,
    gradingBasisDescription: nusModule.gradingBasisDescription,
    prerequisite: nusModule.prerequisite,
    semesterData: nusModule.semesterData,
    workload: nusModule.workload,
  };

  beforeEach(async () => {
    prisma = {
      nusModule: {
        findMany: jest.fn().mockResolvedValue([listItem]),
        findUnique: jest.fn().mockResolvedValue(nusModule),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NusmoduleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NusmoduleService>(NusmoduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('finds modules with default pagination and lightweight fields', async () => {
    await expect(service.findAll()).resolves.toEqual({
      items: [listItem],
      nextCursor: null,
    });
    expect(prisma.nusModule.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { moduleCode: 'asc' },
      take: 21,
      select: {
        moduleCode: true,
        title: true,
        description: true,
        faculty: true,
        department: true,
        moduleCredit: true,
        prerequisite: true,
        semesterData: true,
        workload: true,
        attributes: true,
        gradingBasisDescription: true,
      },
    });
  });

  it('returns nextCursor when more rows exist than the requested limit', async () => {
    const secondItem = { ...listItem, moduleCode: 'CS1231S' };
    prisma.nusModule.findMany.mockResolvedValue([listItem, secondItem]);

    await expect(service.findAll({ limit: 1 })).resolves.toEqual({
      items: [listItem],
      nextCursor: listItem.moduleCode,
    });
    expect(prisma.nusModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });

  it('clamps limit to 50 and applies cursor/search/filter options', async () => {
    await service.findAll({
      cursor: 'cs1010s',
      department: 'Computer Science',
      faculty: 'School of Computing',
      limit: 500,
      moduleCodePrefix: 'cs',
      search: 'programming',
    });

    expect(prisma.nusModule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
        where: {
          moduleCode: {
            gt: 'CS1010S',
            startsWith: 'CS',
            mode: 'insensitive',
          },
          department: 'Computer Science',
          faculty: 'School of Computing',
          OR: [
            {
              moduleCode: {
                contains: 'PROGRAMMING',
                mode: 'insensitive',
              },
            },
            {
              title: {
                contains: 'programming',
                mode: 'insensitive',
              },
            },
            {
              faculty: {
                contains: 'programming',
                mode: 'insensitive',
              },
            },
            {
              department: {
                contains: 'programming',
                mode: 'insensitive',
              },
            },
          ],
        },
      }),
    );
  });

  it('finds one module by code', async () => {
    await expect(service.findOne('CS1010S')).resolves.toEqual(nusModule);
    expect(prisma.nusModule.findUnique).toHaveBeenCalledWith({
      where: { moduleCode: 'CS1010S' },
    });
  });
});
