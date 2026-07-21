import {
  BadGatewayException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OpenAiGateway } from '../openai/openai.gateway';
import type { ModuleRecommendationsResponse } from '../shared/types';
import {
  buildModuleCandidatesInput,
  buildModuleRankingInput,
  moduleCandidatesInstructions,
  moduleCandidatesPromptVersion,
  moduleRankingInstructions,
  moduleRankingPromptVersion,
} from './module-recommendation.prompts';
import {
  moduleCandidateOutputSchema,
  moduleRankingOutputSchema,
  searchNusModulesInputSchema,
} from './module-recommendation.schemas';
import { searchNusModulesTool } from './module-recommendation.tools';
import type {
  CompactNusModule,
  RecommendationBaseContext,
  RecommendationRankingContext,
  ValidatedModuleCandidate,
} from './module-recommendation.types';
import { NusModuleSearchService } from './nus-module-search.service';
import { RecommendationContextService } from './recommendation-context.service';

const workflowVersion = 'module-recommendations-v1' as const;
const maximumCandidates = 20;
const maximumToolRounds = 6;
const cautionTextLimit = 500;
const moduleCodePattern = /\b[A-Z]{2,4}\d{4}[A-Z]?\b/gi;

@Injectable()
export class ModuleRecommendationService {
  constructor(
    private readonly openAiGateway: OpenAiGateway,
    private readonly contextService: RecommendationContextService,
    private readonly nusModuleSearchService: NusModuleSearchService,
  ) {}

  async generate(userId: string): Promise<ModuleRecommendationsResponse> {
    const baseContext = await this.contextService.loadBaseContext(userId);
    const searchedModules = new Map<string, CompactNusModule>();
    const candidateResult = await this.openAiGateway.runStructuredToolWorkflow({
      instructions: moduleCandidatesInstructions,
      input: buildModuleCandidatesInput(baseContext),
      promptVersion: moduleCandidatesPromptVersion,
      reasoningEffort: 'low',
      schema: moduleCandidateOutputSchema,
      schemaName: 'module_candidates',
      tool: searchNusModulesTool,
      toolInputSchema: searchNusModulesInputSchema,
      maxToolRounds: maximumToolRounds,
      executeTool: async (input) => {
        const modules = await this.nusModuleSearchService.search(input);

        for (const module of modules) {
          searchedModules.set(module.moduleCode, module);
        }

        return { modules };
      },
    });
    const validatedCandidates = validateCandidates(
      candidateResult.data.candidates,
      searchedModules,
      baseContext,
    );

    if (!validatedCandidates.length) {
      throw new UnprocessableEntityException(
        'No eligible modules matched the outstanding requirements',
      );
    }

    const rankingContext = await this.contextService.loadRankingContext(
      baseContext,
      validatedCandidates,
    );

    if (!rankingContext.candidates.length) {
      throw new UnprocessableEntityException(
        'No eligible modules remain in the current catalogue',
      );
    }

    const rankingResult = await this.openAiGateway.runStructuredGeneration({
      instructions: moduleRankingInstructions,
      input: buildModuleRankingInput(rankingContext),
      promptVersion: moduleRankingPromptVersion,
      reasoningEffort: 'medium',
      schema: moduleRankingOutputSchema,
      schemaName: 'module_ranking',
    });
    const recommendations = buildRecommendations(
      rankingResult.data.recommendations,
      rankingContext,
    );

    return {
      targetSemester: baseContext.targetSemester,
      candidateCount: rankingContext.candidates.length,
      recommendations,
      generatedAt: new Date().toISOString(),
      workflowVersion,
    };
  }
}

function validateCandidates(
  candidates: Array<{
    moduleCode: string;
    matchedRequirementIds: string[];
    selectionReason: string;
    prerequisiteStatus: 'SATISFIED' | 'UNSATISFIED' | 'UNCERTAIN';
    cautions: string[];
  }>,
  searchedModules: Map<string, CompactNusModule>,
  context: RecommendationBaseContext,
) {
  const normalizedCodes = candidates.map((candidate) =>
    candidate.moduleCode.trim().toUpperCase(),
  );

  if (new Set(normalizedCodes).size !== normalizedCodes.length) {
    throw new BadGatewayException(
      'OpenAI returned duplicate module candidates',
    );
  }

  const addressedCodes = new Set(context.addressedModuleCodes);
  const requirementPriority = buildRequirementPriority(context);

  return candidates
    .slice(0, maximumCandidates)
    .flatMap((candidate): ValidatedModuleCandidate[] => {
      const moduleCode = candidate.moduleCode.trim().toUpperCase();
      const module = searchedModules.get(moduleCode);

      if (!module) {
        throw new BadGatewayException(
          `OpenAI selected module ${moduleCode} without retrieving it`,
        );
      }

      if (
        addressedCodes.has(moduleCode) ||
        candidate.prerequisiteStatus === 'UNSATISFIED' ||
        isUnavailableInTargetSemester(module, context) ||
        isExplicitlyPrecluded(module, addressedCodes)
      ) {
        return [];
      }

      const matchedRequirementIds = Array.from(
        new Set(candidate.matchedRequirementIds),
      ).filter((requirementId) =>
        moduleMatchesRequirement(moduleCode, requirementId, context),
      );

      if (!matchedRequirementIds.length) {
        return [];
      }

      return [
        {
          ...module,
          matchedRequirementIds,
          selectionReason: candidate.selectionReason,
          prerequisiteStatus:
            module.prerequisite || module.corequisite
              ? 'UNCERTAIN'
              : candidate.prerequisiteStatus,
          cautions: buildCandidateCautions(module, candidate.cautions),
        },
      ];
    })
    .sort(
      (left, right) =>
        getCandidatePriority(left, requirementPriority) -
          getCandidatePriority(right, requirementPriority) ||
        left.moduleCode.localeCompare(right.moduleCode),
    );
}

function buildRequirementPriority(context: RecommendationBaseContext) {
  return new Map([
    ...context.requirements.coreRequirements.map(
      (requirement, index) => [requirement.requirementId, index] as const,
    ),
    ...context.requirements.electiveBuckets.map(
      (requirement, index) =>
        [
          requirement.requirementId,
          context.requirements.coreRequirements.length + index,
        ] as const,
    ),
  ]);
}

function getCandidatePriority(
  candidate: ValidatedModuleCandidate,
  priorities: Map<string, number>,
) {
  return Math.min(
    ...candidate.matchedRequirementIds.map(
      (requirementId) =>
        priorities.get(requirementId) ?? Number.MAX_SAFE_INTEGER,
    ),
  );
}

function moduleMatchesRequirement(
  moduleCode: string,
  requirementId: string,
  context: RecommendationBaseContext,
) {
  const coreRequirement = context.requirements.coreRequirements.find(
    (requirement) => requirement.requirementId === requirementId,
  );

  if (coreRequirement) {
    const addressedCount = coreRequirement.moduleCodes.filter((code) =>
      context.addressedModuleCodes.includes(code.toUpperCase()),
    ).length;

    return (
      addressedCount < coreRequirement.minimumCourses &&
      coreRequirement.moduleCodes.some(
        (code) => code.toUpperCase() === moduleCode,
      )
    );
  }

  const electiveBucket = context.requirements.electiveBuckets.find(
    (requirement) => requirement.requirementId === requirementId,
  );

  if (!electiveBucket) {
    return false;
  }

  if (
    electiveBucket.excludedModuleCodes.some(
      (code) => code.toUpperCase() === moduleCode,
    ) ||
    !matchesModuleLevel(
      moduleCode,
      electiveBucket.minimumLevel,
      electiveBucket.maximumLevel,
    )
  ) {
    return false;
  }

  return (
    electiveBucket.eligibleModuleCodes.some(
      (code) => code.toUpperCase() === moduleCode,
    ) ||
    electiveBucket.eligibleModuleCodePatterns.some((pattern) =>
      matchesRequirementPattern(moduleCode, pattern),
    )
  );
}

function matchesRequirementPattern(moduleCode: string, pattern: string) {
  const escapedPattern = pattern
    .trim()
    .toUpperCase()
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/X/g, '[0-9A-Z]')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escapedPattern}$`).test(moduleCode);
}

function matchesModuleLevel(
  moduleCode: string,
  minimumLevel: number | null,
  maximumLevel: number | null,
) {
  const levelMatch = moduleCode.match(/^[A-Z]+(\d)/);

  if (!levelMatch) {
    return minimumLevel === null && maximumLevel === null;
  }

  const level = Number(levelMatch[1]) * 1000;

  return (
    (minimumLevel === null || level >= normalizeLevel(minimumLevel)) &&
    (maximumLevel === null || level <= normalizeLevel(maximumLevel))
  );
}

function normalizeLevel(level: number) {
  return level < 10 ? level * 1000 : level;
}

function isUnavailableInTargetSemester(
  module: CompactNusModule,
  context: RecommendationBaseContext,
) {
  return Boolean(
    context.targetSemester &&
    module.availableSemesters.length &&
    !module.availableSemesters.includes(context.targetSemester.semesterNumber),
  );
}

function isExplicitlyPrecluded(
  module: CompactNusModule,
  addressedCodes: Set<string>,
) {
  return extractModuleCodes(module.preclusion).some((moduleCode) =>
    addressedCodes.has(moduleCode),
  );
}

function buildCandidateCautions(
  module: CompactNusModule,
  modelCautions: string[],
) {
  const cautions = [...modelCautions];

  if (module.prerequisite) {
    cautions.push(`Verify prerequisites: ${module.prerequisite}`);
  }

  if (module.corequisite) {
    cautions.push(`Verify corequisites: ${module.corequisite}`);
  }

  if (!module.availableSemesters.length) {
    cautions.push('Semester availability is not recorded in the catalogue.');
  }

  return Array.from(
    new Set(cautions.map((caution) => truncate(caution, cautionTextLimit))),
  );
}

function extractModuleCodes(value: string | null) {
  return value?.toUpperCase().match(moduleCodePattern) ?? [];
}

function buildRecommendations(
  recommendations: Array<{
    moduleCode: string;
    matchedRequirementIds: string[];
    rationale: string;
    lifestyleFit: string | null;
    cautions: string[];
  }>,
  context: RecommendationRankingContext,
): ModuleRecommendationsResponse['recommendations'] {
  const expectedCount = Math.min(5, context.candidates.length);
  const normalizedCodes = recommendations.map((recommendation) =>
    recommendation.moduleCode.trim().toUpperCase(),
  );

  if (
    recommendations.length !== expectedCount ||
    new Set(normalizedCodes).size !== normalizedCodes.length
  ) {
    throw new BadGatewayException(
      'OpenAI returned an invalid recommendation count',
    );
  }

  const candidateByCode = new Map(
    context.candidates.map((candidate) => [candidate.moduleCode, candidate]),
  );

  return recommendations.map((recommendation, index) => {
    const moduleCode = recommendation.moduleCode.trim().toUpperCase();
    const candidate = candidateByCode.get(moduleCode);

    if (!candidate) {
      throw new BadGatewayException(
        `OpenAI ranked module ${moduleCode} outside the candidate set`,
      );
    }

    const review = context.reviewsByModuleCode[moduleCode] ?? {
      averageRating: null,
      reviewCount: 0,
      recentExcerpts: [],
    };

    return {
      rank: index + 1,
      moduleCode,
      title: candidate.title,
      moduleCredit: candidate.moduleCredit,
      workloadHours: candidate.workloadHours,
      availableSemesters: candidate.availableSemesters,
      matchedRequirementIds: candidate.matchedRequirementIds,
      rationale: recommendation.rationale,
      lifestyleFit: recommendation.lifestyleFit,
      reviewSummary: {
        averageRating: review.averageRating,
        reviewCount: review.reviewCount,
      },
      cautions: Array.from(
        new Set([...candidate.cautions, ...recommendation.cautions]),
      ),
    };
  });
}

function truncate(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit - 3)}...`;
}
