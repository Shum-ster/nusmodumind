import { apiRequest } from "@/features/api";
import type { NusModuleSearchResponse } from "@/features/courses/courses-api";

type SearchHeaderModulesQuery = {
  limit?: number;
  moduleCodePrefix?: string;
  search?: string;
};

export function searchHeaderModules({ limit = 8, moduleCodePrefix, search }: SearchHeaderModulesQuery) {
  return apiRequest<NusModuleSearchResponse>("/nusmodule", {
    query: {
      moduleCodePrefix,
      search,
      limit,
    },
  });
}
