import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NusModulesCronService } from './nusmodule.cron.service';
import { Prisma } from '@prisma/client';

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
    gradingBasisDescription: 'Graded',
    prerequisite: null,
    preclusion: null,
    corequisite: 'CS1231S',
    workload: [2, 1, 1, 3, 3],
    semesterData: [{ semester: 1, examDate: '2026-05-01T09:00:00.000Z' }],
    attributes: { su: true },
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

  it('fetches NUSMods data and upserts all current top-level fields into Prisma', async () => {
    httpService.get.mockReturnValue(of({ data: [moduleInfo] }));

    await service.syncNusModsData();

    const expectedModuleData = {
      title: moduleInfo.title,
      description: moduleInfo.description,
      moduleCredit: moduleInfo.moduleCredit,
      department: moduleInfo.department,
      faculty: moduleInfo.faculty,
      gradingBasisDescription: moduleInfo.gradingBasisDescription,
      prerequisite: moduleInfo.prerequisite,
      preclusion: moduleInfo.preclusion,
      corequisite: moduleInfo.corequisite,
      workload: moduleInfo.workload,
      semesterData: moduleInfo.semesterData,
      attributes: moduleInfo.attributes,
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

  it('keeps modules with empty semesterData', async () => {
    httpService.get.mockReturnValue(
      of({
        data: [
          {
            ...moduleInfo,
            semesterData: [],
          },
        ],
      }),
    );

    await service.syncNusModsData();

    const expectedUpdate: unknown = expect.objectContaining({
      semesterData: [],
    });

    expect(prisma.nusModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expectedUpdate,
      }),
    );
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
    const transactionCalls = prisma.$transaction.mock.calls as [unknown[]][];
    expect(transactionCalls[0][0]).toHaveLength(500);
    expect(transactionCalls[1][0]).toHaveLength(1);
  });

  it('uses safe defaults when NUSMods omits required schema fields', async () => {
    httpService.get.mockReturnValue(
      of({
        data: [
          {
            ...moduleInfo,
            description: undefined,
            department: undefined,
            faculty: undefined,
            gradingBasisDescription: undefined,
            moduleCredit: undefined,
            prerequisite: undefined,
            preclusion: undefined,
            corequisite: undefined,
            workload: undefined,
            semesterData: undefined,
            attributes: undefined,
          },
        ],
      }),
    );

    await service.syncNusModsData();

    const expectedUpdate: unknown = expect.objectContaining({
      description: '',
      department: null,
      faculty: 'Unknown',
      gradingBasisDescription: 'Unknown',
      moduleCredit: '',
      prerequisite: null,
      preclusion: null,
      corequisite: null,
      workload: Prisma.DbNull,
      semesterData: [],
      attributes: Prisma.DbNull,
    });

    expect(prisma.nusModule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expectedUpdate,
      }),
    );
  });
});
