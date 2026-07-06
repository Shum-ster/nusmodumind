import type { DashboardGrade } from './dashboard-grades';

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
