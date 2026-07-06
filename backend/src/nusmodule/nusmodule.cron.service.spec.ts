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
  const moduleDetail = {
    ...moduleInfo,
    semesterData: [
      {
        semester: 1,
        examDate: '2026-05-01T09:00:00.000Z',
        timetable: [
          {
            classNo: '1',
            day: 'Monday',
            endTime: '1000',
            lessonType: 'Lecture',
            startTime: '0800',
            venue: 'LT19',
            weeks: [1, 2, 3],
          },
        ],
      },
    ],
  };

  function mockNusModsResponses(modules: (typeof moduleInfo)[]) {
    httpService.get.mockImplementation((url: string) => {
      if (url.endsWith('/moduleInfo.json')) {
        return of({ data: modules });
      }

      const moduleCode = url.match(/\/modules\/(.+)\.json$/)?.[1];
      const matchingModule = modules.find(
        (currentModule) => currentModule.moduleCode === moduleCode,
      );

      return of({
        data: matchingModule ? { ...matchingModule } : moduleDetail,
      });
    });
  }

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
    httpService.get
      .mockReturnValueOnce(of({ data: [moduleInfo] }))
      .mockReturnValueOnce(of({ data: moduleDetail }));

    await service.syncNusModsData();

    const expectedModuleData = {
      title: moduleDetail.title,
      description: moduleDetail.description,
      moduleCredit: moduleDetail.moduleCredit,
      department: moduleDetail.department,
      faculty: moduleDetail.faculty,
      gradingBasisDescription: moduleDetail.gradingBasisDescription,
      prerequisite: moduleDetail.prerequisite,
      preclusion: moduleDetail.preclusion,
      corequisite: moduleDetail.corequisite,
      workload: moduleDetail.workload,
      semesterData: moduleDetail.semesterData,
      attributes: moduleDetail.attributes,
    };

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.nusmods.com/v2/2025-2026/moduleInfo.json',
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.nusmods.com/v2/2025-2026/modules/CS1010S.json',
    );
    expect(prisma.nusModule.upsert).toHaveBeenCalledWith({
      where: { moduleCode: moduleDetail.moduleCode },
      update: expectedModuleData,
      create: {
        moduleCode: moduleDetail.moduleCode,
        ...expectedModuleData,
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith([{ kind: 'upsert' }]);
  });

  it('keeps modules with empty semesterData', async () => {
    const moduleWithoutSemesterData = {
      ...moduleInfo,
      semesterData: [],
    };

    httpService.get
      .mockReturnValueOnce(of({ data: [moduleWithoutSemesterData] }))
      .mockReturnValueOnce(of({ data: moduleWithoutSemesterData }));

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
    mockNusModsResponses(modules);

    await service.syncNusModsData();

    expect(httpService.get).toHaveBeenCalledTimes(502);
    expect(prisma.nusModule.upsert).toHaveBeenCalledTimes(501);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    const transactionCalls = prisma.$transaction.mock.calls as [unknown[]][];
    expect(transactionCalls[0][0]).toHaveLength(500);
    expect(transactionCalls[1][0]).toHaveLength(1);
  });

  it('uses safe defaults when NUSMods omits required schema fields', async () => {
    const incompleteModule = {
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
    };

    httpService.get
      .mockReturnValueOnce(of({ data: [incompleteModule] }))
      .mockReturnValueOnce(of({ data: incompleteModule }));

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
