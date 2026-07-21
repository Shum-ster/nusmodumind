export const dashboardGradeValues = [
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
  'F',
] as const;

export const suGradeValues = ['S', 'U'] as const;

export type DashboardLetterGrade = (typeof dashboardGradeValues)[number];
export type DashboardSuGrade = (typeof suGradeValues)[number];
export type DashboardGrade = DashboardLetterGrade | DashboardSuGrade;

export type DashboardModule = {
  code: string;
  title: string;
  faculty: string;
  credits: number;
  estimatedWorkload: number;
  actualGrade?: DashboardGrade | null;
  isSuEligible?: boolean;
  prerequisite?: string | null;
  semesterData?: unknown;
};

export type YearNumber = 1 | 2 | 3 | 4;
export type SemesterNumber = 1 | 2;
export type SemesterKey = `year-${YearNumber}-semester-${SemesterNumber}`;

export type UnsatisfiedModuleIssue = {
  moduleCode: string;
  reasons: string[];
};
