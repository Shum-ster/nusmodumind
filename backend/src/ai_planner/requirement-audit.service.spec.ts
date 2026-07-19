import { PlannedModuleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DegreeRequirementsResponse,
  ElectiveBucket,
} from '../shared/types';
import {
  evaluateDegreeRequirements,
  RequirementAuditService,
  type RequirementAuditPlannedModule,
} from './requirement-audit.service';

describe('RequirementAuditService', () => {
  const baseRequirements: DegreeRequirementsResponse = {
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
    generatedAt: '2026-07-17T00:00:00.000Z',
    promptVersion: 'degree-requirements-v2',
  };

  it('loads only the authenticated user plan before evaluating it', async () => {
    const prisma = {
      plannedModule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new RequirementAuditService(
      prisma as unknown as PrismaService,
    );

    const result = await service.audit('user-id', baseRequirements);

    expect(prisma.plannedModule.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      include: {
        module: {
          select: {
            moduleCode: true,
            moduleCredit: true,
          },
        },
      },
    });
    expect(result.evaluatorVersion).toBe('requirement-audit-v1');
  });

  it('prioritises core requirements and keeps selected modules as candidates', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        coreRequirements: [
          {
            requirementId: 'programming-methodology',
            name: 'Programming Methodology',
            kind: 'CORE',
            moduleCodes: ['CS1010'],
            minimumCourses: 1,
            units: 4,
            notes: null,
            allowsDoubleCounting: false,
            manualReviewReason: null,
          },
        ],
        electiveBuckets: [electiveBucket()],
      },
      [
        plannedModule('CS1010', PlannedModuleStatus.PLANNED, 'A'),
        plannedModule('CS2040', PlannedModuleStatus.PLANNED),
        plannedModule('CS2030', PlannedModuleStatus.SELECTED),
      ],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'CLEARED',
      completedModuleCodes: ['CS1010'],
    });
    expect(result.requirements[1]).toMatchObject({
      status: 'COVERED_BY_PLAN',
      completedModuleCodes: [],
      plannedModuleCodes: ['CS2040'],
      selectedCandidateModuleCodes: ['CS2030'],
    });
  });

  it('evaluates narrow elective buckets before broad buckets without reordering the response', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        electiveBuckets: [
          electiveBucket({
            requirementId: 'unrestricted-electives',
            name: 'Unrestricted electives',
            kind: 'UNRESTRICTED',
            allowsAnyModule: true,
            eligibleModuleCodePatterns: [],
          }),
          electiveBucket({
            requirementId: 'computing-electives',
            name: 'Computing electives',
          }),
        ],
      },
      [
        plannedModule('CS3244', PlannedModuleStatus.EXEMPTED),
        plannedModule('MA1521', PlannedModuleStatus.EXEMPTED),
      ],
    );

    expect(
      result.requirements.map((requirement) => requirement.requirementId),
    ).toEqual(['unrestricted-electives', 'computing-electives']);
    expect(result.requirements[0]).toMatchObject({
      status: 'CLEARED',
      completedModuleCodes: ['MA1521'],
    });
    expect(result.requirements[1]).toMatchObject({
      status: 'CLEARED',
      completedModuleCodes: ['CS3244'],
    });
  });

  it('does not count failed grades and flags unresolved S/U outcomes', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        coreRequirements: [
          {
            requirementId: 'discrete-structures',
            name: 'Discrete Structures',
            kind: 'CORE',
            moduleCodes: ['CS1231S'],
            minimumCourses: 1,
            units: 4,
            notes: null,
            allowsDoubleCounting: false,
            manualReviewReason: null,
          },
        ],
        electiveBuckets: [electiveBucket()],
      },
      [
        plannedModule('CS1231S', PlannedModuleStatus.PLANNED, 'F'),
        plannedModule('CS2040', PlannedModuleStatus.PLANNED, 'S/U'),
      ],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'UNPLANNED',
      completedModuleCodes: [],
      plannedModuleCodes: [],
    });
    expect(result.requirements[1]).toMatchObject({
      status: 'NEEDS_REVIEW',
      completedModuleCodes: [],
      plannedModuleCodes: [],
    });
  });

  it('allows explicit double counting but prevents it by default', () => {
    const coreRequirement = {
      requirementId: 'capstone',
      name: 'Capstone',
      kind: 'PROJECT' as const,
      moduleCodes: ['CS3216'],
      minimumCourses: 1,
      units: 4,
      notes: null,
      allowsDoubleCounting: false,
      manualReviewReason: null,
    };
    const withoutDoubleCounting = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        coreRequirements: [coreRequirement],
        electiveBuckets: [electiveBucket({ eligibleModuleCodes: ['CS3216'] })],
      },
      [plannedModule('CS3216', PlannedModuleStatus.EXEMPTED)],
    );
    const withDoubleCounting = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        coreRequirements: [coreRequirement],
        electiveBuckets: [
          electiveBucket({
            eligibleModuleCodes: ['CS3216'],
            allowsDoubleCounting: true,
          }),
        ],
      },
      [plannedModule('CS3216', PlannedModuleStatus.EXEMPTED)],
    );

    expect(withoutDoubleCounting.requirements[1].status).toBe('UNPLANNED');
    expect(withDoubleCounting.requirements[1]).toMatchObject({
      status: 'CLEARED',
      completedModuleCodes: ['CS3216'],
    });
  });

  it('does not double count a module across overlapping core requirements', () => {
    const coreRequirement = {
      requirementId: 'first-core-choice',
      name: 'First core choice',
      kind: 'CORE' as const,
      moduleCodes: ['CS1010'],
      minimumCourses: 1,
      units: 4,
      notes: null,
      allowsDoubleCounting: false,
      manualReviewReason: null,
    };
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        coreRequirements: [
          coreRequirement,
          {
            ...coreRequirement,
            requirementId: 'second-core-choice',
            name: 'Second core choice',
          },
        ],
      },
      [plannedModule('CS1010', PlannedModuleStatus.EXEMPTED)],
    );

    expect(result.requirements[0].status).toBe('CLEARED');
    expect(result.requirements[1].status).toBe('UNPLANNED');
  });

  it('does not let an impossible elective bucket consume modules from a completable bucket', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        electiveBuckets: [
          electiveBucket({
            requirementId: 'eight-unit-specialisation',
            minimumUnits: 8,
            minimumCourses: null,
            eligibleModuleCodes: ['CS2040'],
            eligibleModuleCodePatterns: [],
          }),
          electiveBucket({
            requirementId: 'four-unit-major-elective',
            minimumUnits: 4,
            minimumCourses: null,
            eligibleModuleCodes: ['CS2040'],
            eligibleModuleCodePatterns: [],
          }),
        ],
      },
      [plannedModule('CS2040', PlannedModuleStatus.EXEMPTED)],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'UNPLANNED',
      completedModuleCodes: [],
      remainingUnits: 8,
    });
    expect(result.requirements[1]).toMatchObject({
      status: 'CLEARED',
      completedModuleCodes: ['CS2040'],
    });
  });

  it('applies wildcard, level, and exclusion eligibility rules', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        electiveBuckets: [
          electiveBucket({
            minimumUnits: 8,
            minimumCourses: 2,
            eligibleModuleCodePatterns: ['CS*'],
            minimumLevel: 3000,
            maximumLevel: 4000,
            excludedModuleCodes: ['CS3244'],
          }),
        ],
      },
      [
        plannedModule('CS2100', PlannedModuleStatus.EXEMPTED),
        plannedModule('CS3230', PlannedModuleStatus.EXEMPTED),
        plannedModule('CS3244', PlannedModuleStatus.EXEMPTED),
        plannedModule('CS4238', PlannedModuleStatus.PLANNED),
        plannedModule('CS5231', PlannedModuleStatus.EXEMPTED),
      ],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'COVERED_BY_PLAN',
      completedModuleCodes: ['CS3230'],
      plannedModuleCodes: ['CS4238'],
    });
  });

  it('reports partial unit and course deficits deterministically', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        electiveBuckets: [
          electiveBucket({ minimumUnits: 12, minimumCourses: 3 }),
        ],
      },
      [
        plannedModule('CS2040', PlannedModuleStatus.EXEMPTED),
        plannedModule('CS2100', PlannedModuleStatus.PLANNED),
      ],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'PARTIAL',
      completedModuleCodes: ['CS2040'],
      plannedModuleCodes: ['CS2100'],
      remainingUnits: 4,
      remainingCourses: 1,
    });
    expect(result.summary.unplannedRequirements).toBe(1);
  });

  it('returns manual review rather than guessing an ambiguous requirement', () => {
    const result = evaluateDegreeRequirements(
      {
        ...baseRequirements,
        electiveBuckets: [
          electiveBucket({
            eligibleModuleCodePatterns: [],
            manualReviewReason:
              'The official source requires departmental approval.',
          }),
        ],
      },
      [plannedModule('CS2040', PlannedModuleStatus.EXEMPTED)],
    );

    expect(result.requirements[0]).toMatchObject({
      status: 'NEEDS_REVIEW',
      explanation: 'The official source requires departmental approval.',
    });
    expect(result.summary.needsReviewRequirements).toBe(1);
  });
});

function electiveBucket(
  overrides: Partial<ElectiveBucket> = {},
): ElectiveBucket {
  return {
    requirementId: 'computing-electives',
    name: 'Computing electives',
    kind: 'MAJOR_ELECTIVE',
    minimumUnits: 4,
    minimumCourses: 1,
    eligibleModuleCodes: [],
    eligibleModuleCodePatterns: ['CS*'],
    allowsAnyModule: false,
    minimumLevel: null,
    maximumLevel: null,
    excludedModuleCodes: [],
    allowsDoubleCounting: false,
    rules: ['Complete one approved computing elective.'],
    manualReviewReason: null,
    ...overrides,
  };
}

function plannedModule(
  moduleCode: string,
  status: PlannedModuleStatus,
  actualGrade: string | null = null,
  moduleCredit = '4',
): RequirementAuditPlannedModule {
  return {
    moduleCode,
    status,
    actualGrade,
    module: {
      moduleCode,
      moduleCredit,
    },
  };
}
