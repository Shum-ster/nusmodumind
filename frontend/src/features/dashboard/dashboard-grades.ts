import {
  dashboardGradeValues,
  csCuGradeValues,
  suGradeValues,
  type DashboardGrade,
  type DashboardCsCuGrade,
  type DashboardLetterGrade,
  type DashboardModule,
  type DashboardSuGrade,
} from '@/shared/types';

export { dashboardGradeValues, csCuGradeValues, suGradeValues };
export type {
  DashboardCsCuGrade,
  DashboardGrade,
  DashboardLetterGrade,
  DashboardSuGrade,
};

const gradePointByGrade: Record<DashboardLetterGrade, number> = {
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

const dashboardGradeSet = new Set<string>([
  ...dashboardGradeValues,
  ...suGradeValues,
  ...csCuGradeValues,
]);

export function normalizeDashboardGrade(grade?: string | null): DashboardGrade | null {
  if (!grade) {
    return null;
  }

  const normalizedGrade = grade.trim().toUpperCase();

  return dashboardGradeSet.has(normalizedGrade) ? normalizedGrade as DashboardGrade : null;
}

export function normalizeModuleActualGrade(
  grade?: string | null,
  gradingBasisDescription?: string | null,
) {
  const normalizedGrade = normalizeDashboardGrade(grade);

  if (!normalizedGrade) {
    return null;
  }

  if (isModuleCsCuGraded(gradingBasisDescription)) {
    return isCsCuGrade(normalizedGrade) ? normalizedGrade : null;
  }

  return isCsCuGrade(normalizedGrade) ? null : normalizedGrade;
}

export function getGradePoint(grade?: DashboardGrade | null) {
  if (!grade || isSuGrade(grade) || isCsCuGrade(grade)) {
    return null;
  }

  return gradePointByGrade[grade];
}

function isSuGrade(grade: DashboardGrade): grade is DashboardSuGrade {
  return grade === 'S' || grade === 'U';
}

function isCsCuGrade(grade: DashboardGrade): grade is DashboardCsCuGrade {
  return grade === 'CS' || grade === 'CU';
}

export function isGradePassingPrerequisite(grade?: DashboardGrade | null) {
  if (!grade) {
    return true;
  }

  return grade !== 'F' && grade !== 'U' && grade !== 'CU';
}

export function isModuleSuEligible(attributes: unknown) {
  if (!attributes || typeof attributes !== 'object') {
    return false;
  }

  return (attributes as { su?: unknown }).su === true;
}

export function isModuleCsCuGraded(gradingBasisDescription?: string | null) {
  if (!gradingBasisDescription) {
    return false;
  }

  return /CS\/CU|Completed Satisfactory|Completed Unsatisfactory/i.test(
    gradingBasisDescription,
  );
}

export function calculateGpa(modules: DashboardModule[]) {
  const totals = modules.reduce(
    (currentTotals, module) => {
      if (isModuleCsCuGraded(module.gradingBasisDescription)) {
        return currentTotals;
      }

      const gradePoint = getGradePoint(module.actualGrade);

      if (gradePoint === null || module.credits <= 0) {
        return currentTotals;
      }

      return {
        credits: currentTotals.credits + module.credits,
        points: currentTotals.points + gradePoint * module.credits,
      };
    },
    { credits: 0, points: 0 },
  );

  return totals.credits > 0 ? totals.points / totals.credits : null;
}

export function formatGpa(gpa: number | null) {
  return gpa === null ? '--' : gpa.toFixed(2);
}
