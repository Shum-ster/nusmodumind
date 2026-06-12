import { Test, TestingModule } from '@nestjs/testing';
import { NusmoduleService } from './nusmodule.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NusmoduleService', () => {
  let service: NusmoduleService;
  let prisma: { nusModule: { findMany: jest.Mock; findUnique: jest.Mock } };

  const nusModule = {
    moduleCode: 'CS1010S',
    title: 'Programming Methodology',
    description: null,
    moduleCredit: 4,
    department: 'Computer Science',
    faculty: 'School of Computing',
    prerequisite: null,
    preclusion: null,
    workload: null,
    semesterData: null,
    lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      nusModule: {
        findMany: jest.fn().mockResolvedValue([nusModule]),
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

  it('finds all modules ordered by code', async () => {
    await expect(service.findAll()).resolves.toEqual([nusModule]);
    expect(prisma.nusModule.findMany).toHaveBeenCalledWith({
      orderBy: { moduleCode: 'asc' },
    });
  });

  it('finds one module by code', async () => {
    await expect(service.findOne('CS1010S')).resolves.toEqual(nusModule);
    expect(prisma.nusModule.findUnique).toHaveBeenCalledWith({
      where: { moduleCode: 'CS1010S' },
    });
  });
});
