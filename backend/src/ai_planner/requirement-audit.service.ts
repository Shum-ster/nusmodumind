import { Injectable } from '@nestjs/common';
import { PlannedModuleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CoreRequirement,
  DegreeRequirementsResponse,
  ElectiveBucket,
  RequirementAuditItem,
  RequirementAuditResponse,
  RequirementAuditStatus,
} from '../shared/types';
import { requirementAuditEvaluatorVersion } from './ai-planner.constants';

export type RequirementAuditPlannedModule = {
  moduleCode: string;
  status: PlannedModuleStatus;
  actualGrade: string | null;
  module: {
    moduleCode: string;
    moduleCredit: string;
  };
};

type ModuleProgressState =
  | 'CLEARED'
  | 'COVERED'
  | 'SELECTED'
  | 'FAILED'
  | 'UNRESOLVED';

type AuditableModule = {
  code: string;
  state: ModuleProgressState;
  units: number;
};

const passingGrades = new Set([
  'A+',
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'D+',
  'D',
  'S',
]);
const failingGrades = new Set(['F', 'U']);
const progressStatePriority: Record<ModuleProgressState, number> = {
  CLEARED: 5,
  COVERED: 4,
  SELECTED: 3,
  UNRESOLVED: 2,
  FAILED: 1,
};

@Injectable()
export class RequirementAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async audit(
    userId: string,
    degreeRequirements: DegreeRequirementsResponse,
  ): Promise<RequirementAuditResponse> {
    const plannedModules = await this.prisma.plannedModule.findMany({
      where: { userId },
      include: {
        module: {
          select: {
            moduleCode: true,
            moduleCredit: true,
          },
        },
      },
    });

    return evaluateDegreeRequirements(degreeRequirements, plannedModules);
  }
}

export function evaluateDegreeRequirements(
  degreeRequirements: DegreeRequirementsResponse,
  plannedModules: RequirementAuditPlannedModule[],
): RequirementAuditResponse {
  const modules = normalizePlannedModules(plannedModules);
  const reservedModuleCodes = new Set<string>();
  const coreAudits = degreeRequirements.coreRequirements.map((requirement) =>
    evaluateCoreRequirement(requirement, modules, reservedModuleCodes),
  );
  const electiveAudits = evaluateElectiveBuckets(
    degreeRequirements.electiveBuckets,
    modules,
    reservedModuleCodes,
  );
  const requirements = [...coreAudits, ...electiveAudits];

  return {
    academicYear: degreeRequirements.academicYear,
    summary: buildSummary(requirements),
    requirements,
    sources: degreeRequirements.sources,
    generatedAt: new Date().toISOString(),
    promptVersion: degreeRequirements.promptVersion,
    evaluatorVersion: requirementAuditEvaluatorVersion,
  };
}

function evaluateCoreRequirement(
  requirement: CoreRequirement,
  modules: AuditableModule[],
  reservedModuleCodes: Set<string>,
): RequirementAuditItem {
  const eligibleCodes = normalizeCodes(requirement.moduleCodes);
  const eligibleCodeSet = new Set(eligibleCodes);
  const matchingModules = modules.filter(
    (module) =>
      eligibleCodeSet.has(module.code) &&
      (requirement.allowsDoubleCounting ||
        !reservedModuleCodes.has(module.code)),
  );
  const countableModules = matchingModules
    .filter(
      (module) => module.state === 'CLEARED' || module.state === 'COVERED',
    )
    .sort(compareProgressThenCode)
    .slice(0, requirement.minimumCourses);
  const completedModules = countableModules.filter(
    (module) => module.state === 'CLEARED',
  );
  const coveredModules = countableModules.filter(
    (module) => module.state === 'COVERED',
  );
  const selectedCandidateModuleCodes = matchingModules
    .filter((module) => module.state === 'SELECTED')
    .map((module) => module.code)
    .sort();
  const unresolvedModuleCodes = matchingModules
    .filter((module) => module.state === 'UNRESOLVED')
    .map((module) => module.code)
    .sort();
  const completedCount = completedModules.length;
  const coveredCount = completedCount + coveredModules.length;
  const remainingCourses = Math.max(
    0,
    requirement.minimumCourses - coveredCount,
  );
  const allocatedUnits = countableModules.reduce(
    (total, module) => total + module.units,
    0,
  );
  const remainingUnits =
    requirement.units === null
      ? null
      : Math.max(0, requirement.units - allocatedUnits);
  const isCovered = coveredCount >= requirement.minimumCourses;
  const reviewReason = getCoreReviewReason(
    requirement,
    unresolvedModuleCodes,
    isCovered,
  );
  const status = reviewReason
    ? 'NEEDS_REVIEW'
    : getRequirementStatus(
        completedCount >= requirement.minimumCourses,
        isCovered,
        coveredCount > 0,
      );

  if (!reviewReason && !requirement.allowsDoubleCounting) {
    countableModules.forEach((module) => reservedModuleCodes.add(module.code));
  }

  return {
    requirementId: requirement.requirementId,
    name: requirement.name,
    kind: requirement.kind,
    status,
    completedModuleCodes: completedModules.map((module) => module.code),
    plannedModuleCodes: coveredModules.map((module) => module.code),
    selectedCandidateModuleCodes,
    missingRequiredModuleCodes:
      remainingCourses > 0
        ? eligibleCodes.filter(
            (code) => !countableModules.some((module) => module.code === code),
          )
        : [],
    remainingUnits,
    remainingCourses,
    eligibleModuleCodes: eligibleCodes,
    explanation: reviewReason ?? buildCoreExplanation(status, remainingCourses),
  };
}

function evaluateElectiveBuckets(
  buckets: ElectiveBucket[],
  modules: AuditableModule[],
  reservedModuleCodes: Set<string>,
) {
  const automaticBuckets = buckets.filter(
    (bucket) => !bucket.manualReviewReason && hasThreshold(bucket),
  );
  const eligibilityCountByCode = new Map(
    modules.map((module) => [
      module.code,
      automaticBuckets.filter((bucket) => isModuleEligible(module, bucket))
        .length,
    ]),
  );
  const evaluationOrder = buckets
    .map((bucket, index) => ({
      bucket,
      eligibleModules: modules.filter(
        (module) =>
          (module.state === 'CLEARED' || module.state === 'COVERED') &&
          isModuleEligible(module, bucket) &&
          (bucket.allowsDoubleCounting ||
            !reservedModuleCodes.has(module.code)),
      ),
      index,
    }))
    .sort(
      (left, right) =>
        Number(Boolean(left.bucket.manualReviewReason)) -
          Number(Boolean(right.bucket.manualReviewReason)) ||
        Number(!satisfiesThreshold(left.eligibleModules, left.bucket)) -
          Number(!satisfiesThreshold(right.eligibleModules, right.bucket)) ||
        Number(left.bucket.allowsAnyModule) -
          Number(right.bucket.allowsAnyModule) ||
        left.eligibleModules.length - right.eligibleModules.length ||
        left.index - right.index,
    );
  const auditByIndex = new Map<number, RequirementAuditItem>();

  for (const { bucket, index } of evaluationOrder) {
    auditByIndex.set(
      index,
      evaluateElectiveBucket(
        bucket,
        modules,
        reservedModuleCodes,
        eligibilityCountByCode,
      ),
    );
  }

  return buckets.map((_, index) => auditByIndex.get(index)!);
}

function evaluateElectiveBucket(
  bucket: ElectiveBucket,
  modules: AuditableModule[],
  reservedModuleCodes: Set<string>,
  eligibilityCountByCode: Map<string, number>,
): RequirementAuditItem {
  const matchingModules = modules.filter((module) =>
    isModuleEligible(module, bucket),
  );
  const availableModules = matchingModules.filter(
    (module) =>
      bucket.allowsDoubleCounting || !reservedModuleCodes.has(module.code),
  );
  const selectedCandidateModuleCodes = availableModules
    .filter((module) => module.state === 'SELECTED')
    .map((module) => module.code)
    .sort();
  const unresolvedModuleCodes = availableModules
    .filter((module) => module.state === 'UNRESOLVED')
    .map((module) => module.code)
    .sort();
  const reviewReason = getElectiveReviewReason(bucket);

  if (reviewReason) {
    return buildReviewAudit(bucket, selectedCandidateModuleCodes, reviewReason);
  }

  const clearedModules = sortElectiveCandidates(
    availableModules.filter((module) => module.state === 'CLEARED'),
    eligibilityCountByCode,
  );
  const coveredModules = sortElectiveCandidates(
    availableModules.filter((module) => module.state === 'COVERED'),
    eligibilityCountByCode,
  );
  const allocatedCleared = takeUntilThreshold(clearedModules, bucket, []);
  const clearedSatisfies = satisfiesThreshold(allocatedCleared, bucket);
  const allocatedCovered = clearedSatisfies
    ? []
    : takeUntilThreshold(coveredModules, bucket, allocatedCleared);
  const allocatedModules = [...allocatedCleared, ...allocatedCovered];
  const coveredSatisfies = satisfiesThreshold(allocatedModules, bucket);
  const unresolvedReviewReason =
    !coveredSatisfies && unresolvedModuleCodes.length > 0
      ? `${unresolvedModuleCodes.join(', ')} has an unrecognised actual grade.`
      : null;
  const remainingUnits = getRemainingUnits(allocatedModules, bucket);
  const remainingCourses = getRemainingCourses(allocatedModules, bucket);
  const status = unresolvedReviewReason
    ? 'NEEDS_REVIEW'
    : getRequirementStatus(
        clearedSatisfies,
        coveredSatisfies,
        allocatedModules.length > 0,
      );

  if (!unresolvedReviewReason && !bucket.allowsDoubleCounting) {
    allocatedModules.forEach((module) => reservedModuleCodes.add(module.code));
  }

  return {
    requirementId: bucket.requirementId,
    name: bucket.name,
    kind: bucket.kind,
    status,
    completedModuleCodes: allocatedCleared.map((module) => module.code).sort(),
    plannedModuleCodes: allocatedCovered.map((module) => module.code).sort(),
    selectedCandidateModuleCodes,
    missingRequiredModuleCodes: [],
    remainingUnits,
    remainingCourses,
    eligibleModuleCodes: normalizeCodes(bucket.eligibleModuleCodes),
    explanation:
      unresolvedReviewReason ??
      buildElectiveExplanation(status, remainingUnits, remainingCourses),
  };
}

function normalizePlannedModules(
  plannedModules: RequirementAuditPlannedModule[],
) {
  const bestModuleByCode = new Map<string, AuditableModule>();

  for (const plannedModule of plannedModules) {
    const module = {
      code: normalizeCode(plannedModule.moduleCode),
      state: getModuleProgressState(plannedModule),
      units: parseModuleUnits(plannedModule.module.moduleCredit),
    };
    const currentBest = bestModuleByCode.get(module.code);

    if (
      !currentBest ||
      progressStatePriority[module.state] >
        progressStatePriority[currentBest.state]
    ) {
      bestModuleByCode.set(module.code, module);
    }
  }

  return [...bestModuleByCode.values()].sort((left, right) =>
    left.code.localeCompare(right.code),
  );
}

function getModuleProgressState(
  plannedModule: RequirementAuditPlannedModule,
): ModuleProgressState {
  if (plannedModule.status === PlannedModuleStatus.EXEMPTED) {
    return 'CLEARED';
  }

  if (plannedModule.status === PlannedModuleStatus.SELECTED) {
    return 'SELECTED';
  }

  const grade = plannedModule.actualGrade?.trim().toUpperCase();

  if (!grade) {
    return 'COVERED';
  }

  if (passingGrades.has(grade)) {
    return 'CLEARED';
  }

  if (failingGrades.has(grade)) {
    return 'FAILED';
  }

  return 'UNRESOLVED';
}

function getRequirementStatus(
  isCleared: boolean,
  isCovered: boolean,
  isPartial: boolean,
): RequirementAuditStatus {
  if (isCleared) {
    return 'CLEARED';
  }

  if (isCovered) {
    return 'COVERED_BY_PLAN';
  }

  return isPartial ? 'PARTIAL' : 'UNPLANNED';
}

function isModuleEligible(module: AuditableModule, bucket: ElectiveBucket) {
  const code = module.code;

  if (normalizeCodes(bucket.excludedModuleCodes).includes(code)) {
    return false;
  }

  const level = getModuleLevel(code);

  if (bucket.minimumLevel !== null && level < bucket.minimumLevel) {
    return false;
  }

  if (bucket.maximumLevel !== null && level > bucket.maximumLevel) {
    return false;
  }

  return (
    bucket.allowsAnyModule ||
    normalizeCodes(bucket.eligibleModuleCodes).includes(code) ||
    bucket.eligibleModuleCodePatterns.some((pattern) =>
      matchesModuleCodePattern(code, pattern),
    )
  );
}

function matchesModuleCodePattern(code: string, pattern: string) {
  const normalizedPattern = normalizeCode(pattern);
  const escapedPattern = normalizedPattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');

  return new RegExp(`^${escapedPattern}$`).test(code);
}

function getModuleLevel(code: string) {
  const match = code.match(/[A-Z]+(\d)/);

  return match ? Number(match[1]) * 1000 : 0;
}

function takeUntilThreshold(
  candidates: AuditableModule[],
  bucket: ElectiveBucket,
  startingModules: AuditableModule[],
) {
  const selectedModules: AuditableModule[] = [];

  for (const candidate of candidates) {
    if (satisfiesThreshold([...startingModules, ...selectedModules], bucket)) {
      break;
    }

    selectedModules.push(candidate);
  }

  return selectedModules;
}

function satisfiesThreshold(
  modules: AuditableModule[],
  bucket: ElectiveBucket,
) {
  const satisfiesUnits =
    bucket.minimumUnits === null ||
    getTotalUnits(modules) >= bucket.minimumUnits;
  const satisfiesCourses =
    bucket.minimumCourses === null || modules.length >= bucket.minimumCourses;

  return satisfiesUnits && satisfiesCourses;
}

function hasThreshold(bucket: ElectiveBucket) {
  return bucket.minimumUnits !== null || bucket.minimumCourses !== null;
}

function getRemainingUnits(modules: AuditableModule[], bucket: ElectiveBucket) {
  return bucket.minimumUnits === null
    ? null
    : Math.max(0, bucket.minimumUnits - getTotalUnits(modules));
}

function getRemainingCourses(
  modules: AuditableModule[],
  bucket: ElectiveBucket,
) {
  return bucket.minimumCourses === null
    ? null
    : Math.max(0, bucket.minimumCourses - modules.length);
}

function getTotalUnits(modules: AuditableModule[]) {
  return modules.reduce((total, module) => total + module.units, 0);
}

function sortElectiveCandidates(
  modules: AuditableModule[],
  eligibilityCountByCode: Map<string, number>,
) {
  return [...modules].sort(
    (left, right) =>
      (eligibilityCountByCode.get(left.code) ?? 0) -
        (eligibilityCountByCode.get(right.code) ?? 0) ||
      right.units - left.units ||
      left.code.localeCompare(right.code),
  );
}

function compareProgressThenCode(
  left: AuditableModule,
  right: AuditableModule,
) {
  return (
    progressStatePriority[right.state] - progressStatePriority[left.state] ||
    left.code.localeCompare(right.code)
  );
}

function getCoreReviewReason(
  requirement: CoreRequirement,
  unresolvedModuleCodes: string[],
  isCovered: boolean,
) {
  if (requirement.manualReviewReason) {
    return requirement.manualReviewReason;
  }

  if (requirement.minimumCourses > requirement.moduleCodes.length) {
    return 'The requirement asks for more courses than its module list provides.';
  }

  if (!isCovered && unresolvedModuleCodes.length > 0) {
    return `${unresolvedModuleCodes.join(', ')} has an unrecognised actual grade.`;
  }

  return null;
}

function getElectiveReviewReason(bucket: ElectiveBucket) {
  if (bucket.manualReviewReason) {
    return bucket.manualReviewReason;
  }

  if (!hasThreshold(bucket)) {
    return 'The requirement has no course or unit threshold to evaluate.';
  }

  if (
    !bucket.allowsAnyModule &&
    bucket.eligibleModuleCodes.length === 0 &&
    bucket.eligibleModuleCodePatterns.length === 0
  ) {
    return 'The requirement has no machine-evaluable module eligibility rule.';
  }

  return null;
}

function buildReviewAudit(
  bucket: ElectiveBucket,
  selectedCandidateModuleCodes: string[],
  explanation: string,
): RequirementAuditItem {
  return {
    requirementId: bucket.requirementId,
    name: bucket.name,
    kind: bucket.kind,
    status: 'NEEDS_REVIEW',
    completedModuleCodes: [],
    plannedModuleCodes: [],
    selectedCandidateModuleCodes,
    missingRequiredModuleCodes: [],
    remainingUnits: bucket.minimumUnits,
    remainingCourses: bucket.minimumCourses,
    eligibleModuleCodes: normalizeCodes(bucket.eligibleModuleCodes),
    explanation,
  };
}

function buildCoreExplanation(
  status: RequirementAuditStatus,
  remainingCourses: number,
) {
  if (status === 'CLEARED') {
    return 'This core requirement has been cleared.';
  }

  if (status === 'COVERED_BY_PLAN') {
    return 'This core requirement is covered by the committed plan.';
  }

  return `${remainingCourses} required core course${remainingCourses === 1 ? '' : 's'} remain unplanned.`;
}

function buildElectiveExplanation(
  status: RequirementAuditStatus,
  remainingUnits: number | null,
  remainingCourses: number | null,
) {
  if (status === 'CLEARED') {
    return 'This elective requirement has been cleared.';
  }

  if (status === 'COVERED_BY_PLAN') {
    return 'This elective requirement is covered by the committed plan.';
  }

  const remaining: string[] = [];

  if (remainingUnits !== null && remainingUnits > 0) {
    remaining.push(`${remainingUnits} unit${remainingUnits === 1 ? '' : 's'}`);
  }

  if (remainingCourses !== null && remainingCourses > 0) {
    remaining.push(
      `${remainingCourses} course${remainingCourses === 1 ? '' : 's'}`,
    );
  }

  return remaining.length > 0
    ? `${remaining.join(' and ')} remain unplanned.`
    : 'This requirement is not yet covered.';
}

function buildSummary(requirements: RequirementAuditItem[]) {
  return {
    clearedRequirements: requirements.filter(
      (requirement) => requirement.status === 'CLEARED',
    ).length,
    coveredRequirements: requirements.filter(
      (requirement) => requirement.status === 'COVERED_BY_PLAN',
    ).length,
    unplannedRequirements: requirements.filter(
      (requirement) =>
        requirement.status === 'UNPLANNED' || requirement.status === 'PARTIAL',
    ).length,
    needsReviewRequirements: requirements.filter(
      (requirement) => requirement.status === 'NEEDS_REVIEW',
    ).length,
  };
}

function parseModuleUnits(moduleCredit: string) {
  const units = Number(moduleCredit);

  return Number.isFinite(units) && units >= 0 ? units : 0;
}

function normalizeCodes(codes: string[]) {
  return [...new Set(codes.map(normalizeCode))].sort();
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}
