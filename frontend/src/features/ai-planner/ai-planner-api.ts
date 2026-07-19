import { apiRequest } from "@/shared/api";
import type { DegreeRequirementsResponse } from "@/shared/types";

export function getDegreeRequirements(token: string) {
  return apiRequest<DegreeRequirementsResponse | null>(
    "/ai-planner/degree-requirements",
    { token },
  );
}
