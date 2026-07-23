import { BadRequestException, Injectable } from '@nestjs/common';
import { PlannedModuleStatus } from '@prisma/client';
import { degreeRequirementsResponseSchema } from '../ai_planner/schemas/degree-requirements.schema';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CandidateReviewContext,
  RecommendationBaseContext,
  RecommendationRankingContext,
  ValidatedModuleCandidate,
} from './module-recommendation.types';
import { NusModuleSearchService } from './nus-module-search.service';

const reviewExcerptLimit = 300;

const gradePointByGrade: Record<string, number> = {
  'A+': 5,
  A: 5,
  'A-': 4.5,
  'B+': 4,
  B: 3.5,
  'B-': 3,
  'C+': 2.5,
  C: 2,
  'D+': 1.5,
  D: 1,
  F: 0,
};

@Injectable()
export class RecommendationContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nusModuleSearchService: NusModuleSearchService,
  ) {}

  async loadBaseContext(
    userId: string,
    now = new Date(),
  ): Promise<RecommendationBaseContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        graduationRequirements: true,
        lifestylePreferences: true,
        semesters: {
          orderBy: [{ acadYear: 'asc' }, { semesterNumber: 'asc' }],
          select: { acadYear: true, semesterNumber: true },
        },
        plannedModules: {
          orderBy: [{ moduleCode: 'asc' }],
          select: {
            moduleCode: true,
            status: true,
            expectedGrade: true,
            actualGrade: true,
            semester: {
              select: { acadYear: true, semesterNumber: true },
            },
            module: { select: { moduleCredit: true } },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User profile was not found');
    }

    const requirements = degreeRequirementsResponseSchema.safeParse(
      user.graduationRequirements,
    );

    if (!requirements.success) {
      throw new BadRequestException(
        'Graduation requirements must be generated before recommendations',
      );
    }

    const addressedModuleCodes = Array.from(
      new Set(
        user.plannedModules.map((module) => module.moduleCode.toUpperCase()),
      ),
    );
    const completedModuleCodes = Array.from(
      new Set(
        user.plannedModules
          .filter(
            (module) =>
              module.status === PlannedModuleStatus.EXEMPTED ||
              isPassingGrade(module.actualGrade),
          )
          .map((module) => module.moduleCode.toUpperCase()),
      ),
    );
    const gpaTotals = user.plannedModules.reduce(
      (totals, module) => {
        const gradePoint = getGradePoint(module.actualGrade);
        const units = Number(module.module.moduleCredit);

        if (gradePoint === null || !Number.isFinite(units) || units <= 0) {
          return totals;
        }

        return {
          gradedUnits: totals.gradedUnits + units,
          gradePoints: totals.gradePoints + gradePoint * units,
        };
      },
      { gradedUnits: 0, gradePoints: 0 },
    );

    return {
      requirements: requirements.data,
      lifestylePreferences: user.lifestylePreferences,
      targetSemester: getTargetSemester(user.semesters, now),
      addressedModuleCodes,
      completedModuleCodes,
      currentPlan: user.plannedModules.map((module) => ({
        moduleCode: module.moduleCode.toUpperCase(),
        status: module.status,
        acadYear: module.semester?.acadYear ?? null,
        semesterNumber: module.semester?.semesterNumber ?? null,
        expectedGrade: module.expectedGrade,
        actualGrade: module.actualGrade,
      })),
      gpa:
        gpaTotals.gradedUnits > 0
          ? gpaTotals.gradePoints / gpaTotals.gradedUnits
          : null,
      gradedUnits: gpaTotals.gradedUnits,
    };
  }

  async loadRankingContext(
    baseContext: RecommendationBaseContext,
    validatedCandidates: ValidatedModuleCandidate[],
  ): Promise<RecommendationRankingContext> {
    const candidateCodes = validatedCandidates.map(
      (candidate) => candidate.moduleCode,
    );
    const candidates = await this.nusModuleSearchService.search({
      moduleCodes: candidateCodes,
      moduleCodePrefixes: null,
      searchText: null,
      faculty: null,
      department: null,
      semester: null,
      limit: Math.min(candidateCodes.length, 25),
    });
    const reviewsByModuleCode = await this.loadReviewContext(candidateCodes);
    const canonicalByCode = new Map(
      candidates.map((candidate) => [candidate.moduleCode, candidate]),
    );

    return {
      ...baseContext,
      candidates: validatedCandidates.flatMap((candidate) => {
        const canonicalModule = canonicalByCode.get(candidate.moduleCode);

        return canonicalModule ? [{ ...canonicalModule, ...candidate }] : [];
      }),
      reviewsByModuleCode,
    };
  }

  private async loadReviewContext(candidateCodes: string[]) {
    if (!candidateCodes.length) {
      return {};
    }

    const [reviewAggregates, recentReviewGroups] = await Promise.all([
      this.prisma.moduleReview.groupBy({
        by: ['moduleCode'],
        where: { moduleCode: { in: candidateCodes } },
        orderBy: { moduleCode: 'asc' },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      Promise.all(
        candidateCodes.map((moduleCode) =>
          this.prisma.moduleReview.findMany({
            where: { moduleCode },
            orderBy: { createdAt: 'desc' },
            take: 2,
            select: { content: true },
          }),
        ),
      ),
    ]);
    const aggregateByCode = new Map(
      reviewAggregates.map((aggregate) => [
        aggregate.moduleCode.toUpperCase(),
        aggregate,
      ]),
    );

    return Object.fromEntries(
      candidateCodes.map((moduleCode, index) => {
        const normalizedCode = moduleCode.toUpperCase();
        const aggregate = aggregateByCode.get(normalizedCode);
        const context: CandidateReviewContext = {
          averageRating: aggregate?._avg.rating ?? null,
          reviewCount: aggregate?._count._all ?? 0,
          recentExcerpts: recentReviewGroups[index].map((review) =>
            truncateReview(review.content),
          ),
        };

        return [normalizedCode, context];
      }),
    );
  }
}

function getTargetSemester(
  semesters: Array<{ acadYear: string; semesterNumber: number }>,
  now: Date,
) {
  const currentOrFutureSemester = semesters.find(
    (semester) => getSemesterEndDate(semester) >= now,
  );

  if (
    currentOrFutureSemester &&
    (currentOrFutureSemester.semesterNumber === 1 ||
      currentOrFutureSemester.semesterNumber === 2)
  ) {
    return {
      acadYear: currentOrFutureSemester.acadYear,
      semesterNumber: currentOrFutureSemester.semesterNumber,
    } as const;
  }

  const year = now.getFullYear();
  const month = now.getMonth();

  return month <= 4
    ? {
        acadYear: `${year - 1}/${year}`,
        semesterNumber: 2 as const,
      }
    : {
        acadYear: `${year}/${year + 1}`,
        semesterNumber: 1 as const,
      };
}

function getSemesterEndDate(semester: {
  acadYear: string;
  semesterNumber: number;
}) {
  const [startYearText, endYearText] = semester.acadYear.split('/');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);

  if (!Number.isInteger(startYear) || !Number.isInteger(endYear)) {
    return new Date(0);
  }

  return semester.semesterNumber === 1
    ? new Date(startYear, 11, 31, 23, 59, 59, 999)
    : new Date(endYear, 4, 31, 23, 59, 59, 999);
}

function getGradePoint(grade: string | null) {
  if (!grade) {
    return null;
  }

  return gradePointByGrade[grade.trim().toUpperCase()] ?? null;
}

function isPassingGrade(grade: string | null) {
  if (!grade) {
    return false;
  }

  const normalizedGrade = grade.trim().toUpperCase();
  const gradePoint = getGradePoint(normalizedGrade);

  return (
    normalizedGrade === 'S' ||
    normalizedGrade === 'CS' ||
    (gradePoint !== null && gradePoint > 0)
  );
}

function truncateReview(content: string) {
  const normalizedContent = content.trim();

  return normalizedContent.length <= reviewExcerptLimit
    ? normalizedContent
    : `${normalizedContent.slice(0, reviewExcerptLimit - 3)}...`;
}
