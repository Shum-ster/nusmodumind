import { apiRequest } from "@/features/api";
import type { NusModuleDetail } from "@/features/courses/courses-api";

export type PlannedModuleStatus = "SELECTED" | "EXEMPTED" | "PLANNED";

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
  expectedGrade?: string;
  actualGrade?: string;
  selectedLessons?: unknown;
};

type CreateSemesterBody = {
  acadYear: string;
  semesterNumber: number;
};

export function getCurrentUserPlan(token: string) {
  return apiRequest<CurrentUserPlan>("/semesters/me/plan", { token });
}

export function createSemester(token: string, body: CreateSemesterBody) {
  return apiRequest<SemesterRecord>("/semesters", {
    method: "POST",
    token,
    body,
  });
}

export function createPlannedModule(
  token: string,
  body: PlannedModulePayload,
) {
  return apiRequest<PlannedModuleRecord>("/planned-modules", {
    method: "POST",
    token,
    body,
  });
}

export function updatePlannedModule(
  token: string,
  id: string,
  body: Partial<PlannedModulePayload>,
) {
  return apiRequest<PlannedModuleRecord>(`/planned-modules/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deletePlannedModule(token: string, id: string) {
  return apiRequest<PlannedModuleRecord>(`/planned-modules/${id}`, {
    method: "DELETE",
    token,
  });
}
