import { BadRequestException } from '@nestjs/common';
import { PlannedModuleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NusModuleSearchService } from './nus-module-search.service';
import type { ValidatedModuleCandidate } from './module-recommendation.types';
import { RecommendationContextService } from './recommendation-context.service';

describe('RecommendationContextService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    moduleReview: { groupBy: jest.Mock; findMany: jest.Mock };
  };
  let searchService: { search: jest.Mock };
  let service: RecommendationContextService;

  const requirements = {
    faculty: 'School of Computing',
    degree: 'Computer Science',
    matriculationYear: 2024,
    academicYear: 'AY2024/2025',
    coreRequirements: [],
    electiveBuckets: [],
    sources: [
      {
        title: 'www.comp.nus.edu.sg',
        url: 'https://www.comp.nus.edu.sg/cugresource/',
      },
    ],
    generatedAt: '2026-07-19T00:00:00.000Z',
    promptVersion: 'degree-requirements-v2',
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      moduleReview: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
    };
    searchService = { search: jest.fn() };
    service = new RecommendationContextService(
      prisma as unknown as PrismaService,
      searchService as unknown as NusModuleSearchService,
    );
  });

  it('builds addressed, completed, GPA, plan, and target-semester context', async () => {
    prisma.user.findUnique.mockResolvedValue({
      graduationRequirements: requirements,
      lifestylePreferences: 'Prefer morning classes and a balanced workload.',
      semesters: [
        { acadYear: '2026/2027', semesterNumber: 1 },
        { acadYear: '2026/2027', semesterNumber: 2 },
      ],
      plannedModules: [
        plannedModule('CS1010S', PlannedModuleStatus.SELECTED, 'A'),
        plannedModule('CS1231S', PlannedModuleStatus.PLANNED, 'S'),
        plannedModule('CS2030S', PlannedModuleStatus.PLANNED, 'F'),
        plannedModule('CS2040S', PlannedModuleStatus.PLANNED, 'PASS'),
        plannedModule('CS2100', PlannedModuleStatus.PLANNED, 'U'),
        plannedModule('GEA1000', PlannedModuleStatus.PLANNED, 'CS'),
        plannedModule('GEC1000', PlannedModuleStatus.PLANNED, 'CU'),
        plannedModule('MA1521', PlannedModuleStatus.EXEMPTED, null),
      ],
    });

    const context = await service.loadBaseContext(
      'user-id',
      new Date('2026-07-20T00:00:00.000Z'),
    );

    expect(context.addressedModuleCodes).toEqual([
      'CS1010S',
      'CS1231S',
      'CS2030S',
      'CS2040S',
      'CS2100',
      'GEA1000',
      'GEC1000',
      'MA1521',
    ]);
    expect(context.completedModuleCodes).toEqual([
      'CS1010S',
      'CS1231S',
      'GEA1000',
      'MA1521',
    ]);
    expect(context.gradedUnits).toBe(8);
    expect(context.gpa).toBe(2.5);
    expect(context.targetSemester).toEqual({
      acadYear: '2026/2027',
      semesterNumber: 1,
    });
    expect(context.currentPlan[0]).not.toHaveProperty('selectedLessons');
  });

  it('rejects missing or invalid stored graduation requirements', async () => {
    prisma.user.findUnique.mockResolvedValue({
      graduationRequirements: null,
      lifestylePreferences: null,
      semesters: [],
      plannedModules: [],
    });

    await expect(service.loadBaseContext('user-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('loads review aggregates and at most two compact excerpts per candidate', async () => {
    const candidate = compactCandidate();
    searchService.search.mockResolvedValue([candidate]);
    prisma.moduleReview.groupBy.mockResolvedValue([
      {
        moduleCode: 'CS2103T',
        _avg: { rating: 4.5 },
        _count: { _all: 8 },
      },
    ]);
    prisma.moduleReview.findMany.mockResolvedValue([
      { content: 'A'.repeat(400) },
      { content: 'Useful project module.' },
    ]);
    const baseContext = {
      requirements,
      lifestylePreferences: null,
      targetSemester: { acadYear: '2026/2027', semesterNumber: 1 as const },
      addressedModuleCodes: [],
      completedModuleCodes: [],
      currentPlan: [],
      gpa: null,
      gradedUnits: 0,
    };

    const result = await service.loadRankingContext(baseContext, [candidate]);

    expect(prisma.moduleReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    expect(result.reviewsByModuleCode.CS2103T).toMatchObject({
      averageRating: 4.5,
      reviewCount: 8,
    });
    expect(result.reviewsByModuleCode.CS2103T.recentExcerpts[0]).toHaveLength(
      300,
    );
  });
});

function plannedModule(
  moduleCode: string,
  status: PlannedModuleStatus,
  actualGrade: string | null,
) {
  return {
    moduleCode,
    status,
    expectedGrade: null,
    actualGrade,
    semester: { acadYear: '2025/2026', semesterNumber: 2 },
    module: { moduleCredit: '4' },
  };
}

function compactCandidate(): ValidatedModuleCandidate {
  return {
    moduleCode: 'CS2103T',
    title: 'Software Engineering',
    description: 'Team software engineering project.',
    moduleCredit: 4,
    faculty: 'School of Computing',
    department: 'Computer Science',
    prerequisite: 'CS2030S and CS2040S',
    preclusion: null,
    corequisite: null,
    workloadHours: 10,
    availableSemesters: [1, 2],
    gradingBasisDescription: 'Graded',
    attributes: {},
    matchedRequirementIds: ['software-engineering'],
    selectionReason: 'Outstanding core requirement.',
    prerequisiteStatus: 'UNCERTAIN',
    cautions: ['Verify prerequisites.'],
  };
}
