import { apiRequest } from "@/shared/api";
import type {
  CreateSemesterBody,
  CurrentUserPlan,
  PlannedModulePayload,
  PlannedModuleRecord,
  SemesterRecord,
} from "@/shared/types";

export type {
  CurrentUserPlan,
  PlannedModulePayload,
  PlannedModuleRecord,
  PlannedModuleStatus,
  SemesterRecord,
} from "@/shared/types";

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
  return apiRequest<PlannedModuleRecord>(
    `/planned-modules/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deletePlannedModule(token: string, id: string) {
  return apiRequest<PlannedModuleRecord>(
    `/planned-modules/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      token,
    },
  );
}
