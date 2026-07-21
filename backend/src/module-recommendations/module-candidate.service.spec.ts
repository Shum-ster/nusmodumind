import {
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OpenAiGateway } from '../openai/openai.gateway';
import type { RecommendationBaseContext } from './module-recommendation.types';
import type { SearchNusModulesInput } from './module-recommendation.schemas';
import type { ValidatedModuleCandidate } from './module-recommendation.types';
import { ModuleRecommendationService } from './module-recommendation.service';
import { NusModuleSearchService } from './nus-module-search.service';
import { RecommendationContextService } from './recommendation-context.service';

describe('ModuleRecommendationService', () => {
  let gateway: {
    runStructuredToolWorkflow: jest.Mock;
    runStructuredGeneration: jest.Mock;
  };
  let contextService: {
    loadBaseContext: jest.Mock;
    loadRankingContext: jest.Mock;
  };
  let searchService: { search: jest.Mock };
  let service: ModuleRecommendationService;

  beforeEach(() => {
    gateway = {
      runStructuredToolWorkflow: jest.fn(),
      runStructuredGeneration: jest.fn(),
    };
    contextService = {
      loadBaseContext: jest.fn().mockResolvedValue(baseContext()),
      loadRankingContext: jest
        .fn()
        .mockImplementation(
          (
            base: RecommendationBaseContext,
            candidates: ValidatedModuleCandidate[],
          ) =>
            Promise.resolve({
              ...base,
              candidates,
              reviewsByModuleCode: Object.fromEntries(
                candidates.map((candidate) => [
                  candidate.moduleCode,
                  {
                    averageRating:
                      candidate.moduleCode === 'CS2103T' ? 4.5 : null,
                    reviewCount: candidate.moduleCode === 'CS2103T' ? 12 : 0,
                    recentExcerpts: [],
                  },
                ]),
              ),
            }),
        ),
    };
    searchService = { search: jest.fn() };
    service = new ModuleRecommendationService(
      gateway as unknown as OpenAiGateway,
      contextService as unknown as RecommendationContextService,
      searchService as unknown as NusModuleSearchService,
    );
  });

  it('discovers, validates, and ranks five canonical modules', async () => {
    const searchedModules = [
      compactModule('CS2103T', [1, 2]),
      compactModule('CS4101', [1]),
      compactModule('CS4102', [1]),
      compactModule('CS4103', [1]),
      compactModule('CS4104', []),
      compactModule('CS4105', [2]),
      compactModule('CS4106', [1], 'CS1010S'),
      compactModule('CS1010S', [1]),
    ];
    searchService.search.mockResolvedValue(searchedModules);
    gateway.runStructuredToolWorkflow.mockImplementation(
      async (request: ToolRequest) => {
        await request.executeTool({
          moduleCodes: ['CS2103T'],
          moduleCodePrefixes: ['CS4'],
          searchText: null,
          faculty: null,
          department: null,
          semester: 1,
          limit: 20,
        });

        return {
          data: {
            candidates: searchedModules.map((module) => ({
              moduleCode: module.moduleCode,
              matchedRequirementIds:
                module.moduleCode === 'CS2103T'
                  ? ['software-engineering-core']
                  : ['level-4000-electives'],
              selectionReason: 'Matches an outstanding requirement.',
              prerequisiteStatus: 'UNCERTAIN',
              cautions: [],
            })),
          },
        };
      },
    );
    gateway.runStructuredGeneration.mockResolvedValue({
      data: {
        recommendations: [
          'CS2103T',
          'CS4101',
          'CS4102',
          'CS4103',
          'CS4104',
        ].map((moduleCode) => ({
          moduleCode,
          matchedRequirementIds: ['model-output-is-not-authoritative'],
          rationale: `Take ${moduleCode} for requirement progress.`,
          lifestyleFit: null,
          cautions: [],
        })),
      },
    });

    const result = await service.generate(
      'user-id',
      'Prefer software security modules with manageable workload.',
    );

    expect(contextService.loadRankingContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          moduleCode: 'CS2103T',
          matchedRequirementIds: ['software-engineering-core'],
        }),
      ]),
    );
    const rankingCandidates = getCallArgument<ValidatedModuleCandidate[]>(
      contextService.loadRankingContext,
      0,
      1,
    );
    expect(rankingCandidates.map((candidate) => candidate.moduleCode)).toEqual([
      'CS2103T',
      'CS4101',
      'CS4102',
      'CS4103',
      'CS4104',
    ]);
    expect(result.candidateCount).toBe(5);
    expect(result.recommendations).toHaveLength(5);
    expect(result.recommendations[0]).toMatchObject({
      rank: 1,
      moduleCode: 'CS2103T',
      title: 'Canonical CS2103T title',
      matchedRequirementIds: ['software-engineering-core'],
      reviewSummary: { averageRating: 4.5, reviewCount: 12 },
    });
    expect(result.workflowVersion).toBe('module-recommendations-v1');
    const rankingRequest = getCallArgument<{
      input: string;
      reasoningEffort: string;
    }>(gateway.runStructuredGeneration, 0);
    expect(rankingRequest.reasoningEffort).toBe('medium');
    expect(rankingRequest.input).toContain(
      'Prefer software security modules with manageable workload.',
    );
    const candidateRequest = getCallArgument<{ input: string }>(
      gateway.runStructuredToolWorkflow,
      0,
    );
    expect(candidateRequest.input).toContain(
      'Prefer software security modules with manageable workload.',
    );
    expect(rankingRequest.input).not.toContain('semesterData');
    expect(rankingRequest.input).not.toContain('selectedLessons');
  });

  it('rejects candidates that were not returned by the search tool', async () => {
    searchService.search.mockResolvedValue([]);
    gateway.runStructuredToolWorkflow.mockImplementation(
      async (request: ToolRequest) => {
        await request.executeTool({
          moduleCodes: ['CS2103T'],
          moduleCodePrefixes: null,
          searchText: null,
          faculty: null,
          department: null,
          semester: 1,
          limit: 20,
        });

        return {
          data: {
            candidates: [
              candidateOutput('CS2103T', 'software-engineering-core'),
            ],
          },
        };
      },
    );

    await expect(service.generate('user-id')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(gateway.runStructuredGeneration).not.toHaveBeenCalled();
  });

  it('returns 422 when every retrieved candidate is already addressed', async () => {
    const module = compactModule('CS1010S', [1]);
    searchService.search.mockResolvedValue([module]);
    gateway.runStructuredToolWorkflow.mockImplementation(
      async (request: ToolRequest) => {
        await request.executeTool({
          moduleCodes: ['CS1010S'],
          moduleCodePrefixes: null,
          searchText: null,
          faculty: null,
          department: null,
          semester: 1,
          limit: 20,
        });

        return {
          data: {
            candidates: [candidateOutput('CS1010S', 'level-4000-electives')],
          },
        };
      },
    );

    await expect(service.generate('user-id')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});

function baseContext(): RecommendationBaseContext {
  return {
    requirements: {
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      academicYear: 'AY2024/2025',
      coreRequirements: [
        {
          requirementId: 'software-engineering-core',
          name: 'Software Engineering',
          kind: 'CORE',
          moduleCodes: ['CS2103T'],
          minimumCourses: 1,
          units: 4,
          notes: null,
          allowsDoubleCounting: false,
          manualReviewReason: null,
        },
      ],
      electiveBuckets: [
        {
          requirementId: 'level-4000-electives',
          name: 'Level 4000 electives',
          kind: 'MAJOR_ELECTIVE',
          minimumUnits: 16,
          minimumCourses: 4,
          eligibleModuleCodes: [],
          eligibleModuleCodePatterns: ['CS4XXX'],
          allowsAnyModule: false,
          minimumLevel: 4000,
          maximumLevel: 4999,
          excludedModuleCodes: [],
          allowsDoubleCounting: false,
          rules: [],
          manualReviewReason: null,
        },
      ],
      sources: [
        {
          title: 'www.comp.nus.edu.sg',
          url: 'https://www.comp.nus.edu.sg/cugresource/',
        },
      ],
      generatedAt: '2026-07-19T00:00:00.000Z',
      promptVersion: 'degree-requirements-v2',
    },
    lifestylePreferences: 'Prefer morning classes.',
    targetSemester: { acadYear: '2026/2027', semesterNumber: 1 },
    addressedModuleCodes: ['CS1010S'],
    completedModuleCodes: ['CS1010S'],
    currentPlan: [],
    gpa: 4,
    gradedUnits: 40,
  };
}

function compactModule(
  moduleCode: string,
  availableSemesters: number[],
  preclusion: string | null = null,
) {
  return {
    moduleCode,
    title: `Canonical ${moduleCode} title`,
    description: 'Compact catalogue description.',
    moduleCredit: 4,
    faculty: 'School of Computing',
    department: 'Computer Science',
    prerequisite: null,
    preclusion,
    corequisite: null,
    workloadHours: 10,
    availableSemesters,
    gradingBasisDescription: 'Graded',
    attributes: {},
  };
}

function candidateOutput(moduleCode: string, requirementId: string) {
  return {
    moduleCode,
    matchedRequirementIds: [requirementId],
    selectionReason: 'Matches a requirement.',
    prerequisiteStatus: 'UNCERTAIN' as const,
    cautions: [],
  };
}

type ToolRequest = {
  executeTool: (input: SearchNusModulesInput) => Promise<unknown>;
};

function getCallArgument<T>(
  mock: jest.Mock,
  callIndex: number,
  argumentIndex = 0,
): T {
  const calls = mock.mock.calls as unknown[][];

  return calls[callIndex][argumentIndex] as T;
}
