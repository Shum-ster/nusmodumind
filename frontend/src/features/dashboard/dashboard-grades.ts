import type { DashboardModule } from './types';

export const dashboardGradeValues = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D+', 'D', 'F'] as const;
export const suGradeValue = 'S/U';

export type DashboardLetterGrade = (typeof dashboardGradeValues)[number];
export type DashboardGrade = DashboardLetterGrade | typeof suGradeValue;

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

const dashboardGradeSet = new Set<string>([...dashboardGradeValues, suGradeValue]);

export function normalizeDashboardGrade(grade?: string | null): DashboardGrade | null {
  if (!grade) {
    return null;
  }

  const normalizedGrade = grade.trim().toUpperCase();

  return dashboardGradeSet.has(normalizedGrade) ? normalizedGrade as DashboardGrade : null;
}

export function getGradePoint(grade?: DashboardGrade | null) {
  if (!grade || grade === suGradeValue) {
    return null;
  }

  return gradePointByGrade[grade];
}

export function isGradePassingPrerequisite(grade?: DashboardGrade | null) {
  if (!grade) {
    return true;
  }

  return grade !== 'F';
}

export function isModuleSuEligible(attributes: unknown) {
  if (!attributes || typeof attributes !== 'object') {
    return false;
  }

  return (attributes as { su?: unknown }).su === true;
}

export function calculateGpa(modules: DashboardModule[]) {
  const totals = modules.reduce(
    (currentTotals, module) => {
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
