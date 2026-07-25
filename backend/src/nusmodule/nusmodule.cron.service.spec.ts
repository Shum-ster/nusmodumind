import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NusModulesCronService } from './nusmodule.cron.service';
import { Prisma } from '@prisma/client';
import { ModuleChangeDetectorService } from './module-change-detector.service';
import { ModuleChangeNotificationService } from './module-change-notification.service';

describe('NusModulesCronService', () => {
  let service: NusModulesCronService;
  let httpService: { get: jest.Mock };
  let prisma: {
    nusModule: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let transaction: {
    $executeRaw: jest.Mock;
    moduleUpdateNotification: { createMany: jest.Mock };
  };
  let changeDetector: {
    detect: jest.Mock;
  };
  let notificationService: {
    buildDrafts: jest.Mock;
    dispatchPending: jest.Mock;
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

  function getExecutedQuery(index = 0) {
    const calls = transaction.$executeRaw.mock.calls as [Prisma.Sql][];
    return calls[index][0];
  }

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    };
    transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      moduleUpdateNotification: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma = {
      nusModule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(
        async (callback: (client: typeof transaction) => Promise<void>) =>
          callback(transaction),
      ),
    };
    changeDetector = {
      detect: jest.fn().mockReturnValue(null),
    };
    notificationService = {
      buildDrafts: jest.fn().mockResolvedValue([]),
      dispatchPending: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NusModulesCronService,
        { provide: HttpService, useValue: httpService },
        { provide: PrismaService, useValue: prisma },
        { provide: ModuleChangeDetectorService, useValue: changeDetector },
        {
          provide: ModuleChangeNotificationService,
          useValue: notificationService,
        },
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
      'https://api.nusmods.com/v2/2026-2027/moduleInfo.json',
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.nusmods.com/v2/2026-2027/modules/CS1010S.json',
    );
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(notificationService.buildDrafts).toHaveBeenCalledWith(
      [],
      '2026/2027',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(notificationService.dispatchPending).toHaveBeenCalledTimes(1);

    const query = getExecutedQuery();
    expect(query.sql).toContain('INSERT INTO "nus_modules"');
    expect(query.sql).toContain('ON CONFLICT ("module_code") DO UPDATE SET');
    expect(query.sql).toContain('"last_updated" = CURRENT_TIMESTAMP');
    expect(query.values).toEqual([
      moduleDetail.moduleCode,
      expectedModuleData.title,
      expectedModuleData.description,
      expectedModuleData.moduleCredit,
      expectedModuleData.department,
      expectedModuleData.faculty,
      expectedModuleData.gradingBasisDescription,
      expectedModuleData.prerequisite,
      expectedModuleData.preclusion,
      expectedModuleData.corequisite,
      JSON.stringify(expectedModuleData.workload),
      JSON.stringify(expectedModuleData.semesterData),
      JSON.stringify(expectedModuleData.attributes),
    ]);
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

    const query = getExecutedQuery();
    expect(query.values[11]).toBe('[]');
  });

  it('processes upserts in 100-module batches', async () => {
    const modules = Array.from({ length: 501 }, (_, index) => ({
      ...moduleInfo,
      moduleCode: `CS${index}`,
    }));
    mockNusModsResponses(modules);

    await service.syncNusModsData();

    expect(httpService.get).toHaveBeenCalledTimes(502);
    expect(prisma.$transaction).toHaveBeenCalledTimes(6);
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(6);

    const firstQuery = getExecutedQuery();
    const lastQuery = getExecutedQuery(5);
    expect(firstQuery.values).toHaveLength(1_300);
    expect(lastQuery.values).toHaveLength(13);
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

    const query = getExecutedQuery();
    expect(query.values).toEqual([
      incompleteModule.moduleCode,
      incompleteModule.title,
      '',
      '',
      null,
      'Unknown',
      'Unknown',
      null,
      null,
      null,
      null,
      '[]',
      null,
    ]);
  });

  it('propagates sync failures so scheduled runners report a failed job', async () => {
    const syncError = new Error('NUSMods API unavailable');
    httpService.get.mockReturnValueOnce(throwError(() => syncError));

    await expect(service.syncNusModsData()).rejects.toThrow(syncError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(notificationService.dispatchPending).not.toHaveBeenCalled();
  });

  it('atomically queues notifications with the module upsert', async () => {
    const detectedChange = {
      moduleCode: moduleInfo.moduleCode,
      moduleTitle: moduleInfo.title,
      globalChanges: [
        {
          category: 'requirements' as const,
          summary: 'Prerequisites changed.',
        },
      ],
      semesterChanges: {},
    };
    const notificationDraft = {
      userId: 'user-id',
      moduleCode: moduleInfo.moduleCode,
      acadYear: '2026/2027',
      semesterNumber: 1,
      changes: {
        moduleTitle: moduleInfo.title,
        changes: detectedChange.globalChanges,
      },
      fingerprint: 'fingerprint',
    };
    httpService.get
      .mockReturnValueOnce(of({ data: [moduleInfo] }))
      .mockReturnValueOnce(of({ data: moduleDetail }));
    prisma.nusModule.findMany.mockResolvedValueOnce([moduleInfo]);
    changeDetector.detect.mockReturnValueOnce(detectedChange);
    notificationService.buildDrafts.mockResolvedValueOnce([notificationDraft]);

    await service.syncNusModsData();

    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(
      transaction.moduleUpdateNotification.createMany,
    ).toHaveBeenCalledWith({
      data: [notificationDraft],
      skipDuplicates: true,
    });
  });

  it('preserves stored semester data when a module detail fetch fails', async () => {
    httpService.get
      .mockReturnValueOnce(of({ data: [moduleInfo] }))
      .mockReturnValueOnce(throwError(() => new Error('Detail unavailable')));

    await service.syncNusModsData();

    const query = getExecutedQuery();
    expect(query.values[11]).toBeNull();
    expect(query.sql).toContain('COALESCE(');
  });
});
