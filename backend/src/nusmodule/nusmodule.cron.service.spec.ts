import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NusModulesCronService } from './nusmodule.cron.service';

describe('NusModulesCronService', () => {
  let service: NusModulesCronService;
  let httpService: { get: jest.Mock };
  let prisma: {
    nusModule: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  const moduleInfo = {
    moduleCode: 'CS1010S',
    title: 'Programming Methodology',
    description: 'Introductory programming module',
    moduleCredit: '4',
    department: 'Computer Science',
    faculty: 'School of Computing',
    prerequisite: null,
    preclusion: null,
    workload: [2, 1, 1, 3, 3],
    semesterData: [{ semester: 1 }],
  };

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    };
    prisma = {
      nusModule: {
        upsert: jest.fn().mockReturnValue({ kind: 'upsert' }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NusModulesCronService,
        { provide: HttpService, useValue: httpService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NusModulesCronService>(NusModulesCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fetches NUSMods data and upserts it into Prisma', async () => {
    httpService.get.mockReturnValue(of({ data: [moduleInfo] }));

    await service.syncNusModsData();

    const expectedModuleData = {
      title: moduleInfo.title,
      description: moduleInfo.description,
      moduleCredit: 4,
      department: moduleInfo.department,
      faculty: moduleInfo.faculty,
      prerequisite: moduleInfo.prerequisite,
      preclusion: moduleInfo.preclusion,
      workload: JSON.stringify(moduleInfo.workload),
      semesterData: moduleInfo.semesterData,
    };

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.nusmods.com/v2/2025-2026/moduleInfo.json',
    );
    expect(prisma.nusModule.upsert).toHaveBeenCalledWith({
      where: { moduleCode: moduleInfo.moduleCode },
      update: expectedModuleData,
      create: {
        moduleCode: moduleInfo.moduleCode,
        ...expectedModuleData,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([{ kind: 'upsert' }]);
  });

  it('processes upserts in 500-module batches', async () => {
    const modules = Array.from({ length: 501 }, (_, index) => ({
      ...moduleInfo,
      moduleCode: `CS${index}`,
    }));
    httpService.get.mockReturnValue(of({ data: modules }));

    await service.syncNusModsData();

    expect(prisma.nusModule.upsert).toHaveBeenCalledTimes(501);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(500);
    expect(prisma.$transaction.mock.calls[1][0]).toHaveLength(1);
  });

  it('uses safe defaults when NUSMods omits required schema fields', async () => {
    httpService.get.mockReturnValue(
      of({
        data: [
          {
            ...moduleInfo,
            department: undefined,
            faculty: undefined,
            prerequisite: undefined,
            preclusion: undefined,
            semesterData: undefined,
          },
        ],
      }),
    );

    await service.syncNusModsData();

    expect(prisma.nusModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          department: 'Unknown',
          faculty: 'Unknown',
          prerequisite: null,
          preclusion: null,
          semesterData: null,
        }),
      }),
    );
  });
});
