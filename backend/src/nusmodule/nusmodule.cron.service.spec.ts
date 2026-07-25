import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { NusModulesCronService } from './nusmodule.cron.service';
import { Prisma } from '@prisma/client';

describe('NusModulesCronService', () => {
  let service: NusModulesCronService;
  let httpService: { get: jest.Mock };
  let prisma: {
    $executeRaw: jest.Mock;
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
    const calls = prisma.$executeRaw.mock.calls as [Prisma.Sql][];
    return calls[index][0];
  }

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
    };
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
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
      'https://api.nusmods.com/v2/2026-2027/moduleInfo.json',
    );
    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.nusmods.com/v2/2026-2027/modules/CS1010S.json',
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

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
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(6);

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
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
