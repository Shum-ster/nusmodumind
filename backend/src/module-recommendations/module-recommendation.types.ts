import type { PlannedModuleStatus } from '@prisma/client';
import type {
  DegreeRequirementsResponse,
  RecommendationTargetSemester,
} from '../shared/types';

export type CompactNusModule = {
  moduleCode: string;
  title: string;
  description: string | null;
  moduleCredit: number | null;
  faculty: string;
  department: string | null;
  prerequisite: string | null;
  preclusion: string | null;
  corequisite: string | null;
  workloadHours: number | null;
  availableSemesters: number[];
  gradingBasisDescription: string | null;
  attributes: Record<string, boolean | number | string>;
};

export type CompactPlanModule = {
  moduleCode: string;
  status: PlannedModuleStatus;
  acadYear: string | null;
  semesterNumber: number | null;
  expectedGrade: string | null;
  actualGrade: string | null;
};

export type CandidateReviewContext = {
  averageRating: number | null;
  reviewCount: number;
  recentExcerpts: string[];
};

export type ValidatedModuleCandidate = CompactNusModule & {
  matchedRequirementIds: string[];
  selectionReason: string;
  prerequisiteStatus: 'SATISFIED' | 'UNCERTAIN';
  cautions: string[];
};

export type RecommendationBaseContext = {
  requirements: DegreeRequirementsResponse;
  lifestylePreferences: string | null;
  targetSemester: RecommendationTargetSemester | null;
  addressedModuleCodes: string[];
  completedModuleCodes: string[];
  currentPlan: CompactPlanModule[];
  gpa: number | null;
  gradedUnits: number;
};

export type RecommendationRankingContext = RecommendationBaseContext & {
  candidates: ValidatedModuleCandidate[];
  reviewsByModuleCode: Record<string, CandidateReviewContext>;
};

export type ModuleRecommendationProgressStage = 'searching' | 'ranking';
