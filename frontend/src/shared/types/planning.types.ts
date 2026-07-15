import type { NusModuleDetail } from './nusmodule.types';

export type PlannedModuleStatus = 'SELECTED' | 'EXEMPTED' | 'PLANNED';

export type SemesterRecord = {
  id: string;
  acadYear: string;
  semesterNumber: number;
  userId: string;
};

export type PlannedModuleRecord = {
  id: string;
  semesterId: string | null;
  userId: string;
  moduleCode: string;
  status: PlannedModuleStatus;
  expectedGrade: string | null;
  actualGrade: string | null;
  selectedLessons: unknown;
  module: NusModuleDetail;
  semester: SemesterRecord | null;
};

export type CurrentUserPlan = {
  semesters: SemesterRecord[];
  plannedModules: PlannedModuleRecord[];
};

export type PlannedModulePayload = {
  moduleCode: string;
  status?: PlannedModuleStatus;
  semesterId?: string | null;
  expectedGrade?: string | null;
  actualGrade?: string | null;
  selectedLessons?: unknown;
};

export type CreateSemesterBody = {
  acadYear: string;
  semesterNumber: number;
};
