export type DashboardModule = {
  code: string;
  title: string;
  faculty: string;
  credits: number;
  estimatedWorkload: number;
  prerequisite?: string | null;
  semesterData?: unknown;
};
