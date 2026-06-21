import { apiRequest } from "@/features/api";
import type { NusModuleSearchResponse } from "@/features/courses/courses-api";

export function searchHeaderModules(search: string) {
  return apiRequest<NusModuleSearchResponse>("/nusmodule", {
    query: {
      search,
      limit: 8,
    },
  });
}
