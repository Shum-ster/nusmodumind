import { apiRequest } from "@/shared/api";

export type NusModuleListItem = {
  moduleCode: string;
  title: string;
  faculty: string;
  department: string | null;
  moduleCredit: string;
  prerequisite?: string | null;
  semesterData?: unknown;
  workload?: unknown;
  gradingBasisDescription: string;
};

export type NusModuleSearchResponse = {
  items: NusModuleListItem[];
  nextCursor: string | null;
};

export type NusModuleDetail = {
  moduleCode: string;
  title: string;
  description: string;
  moduleCredit: string;
  department: string | null;
  faculty: string;
  gradingBasisDescription: string;
  prerequisite: string | null;
  preclusion: string | null;
  corequisite: string | null;
  workload: unknown;
  semesterData: unknown;
  attributes: unknown;
  lastUpdated: string;
};

export type ModuleReview = {
  id: string;
  userId: string;
  moduleCode: string;
  rating: number;
  content: string;
  createdAt: string;
};

type SearchNusModulesQuery = {
  cursor?: string | null;
  department?: string | null;
  faculty?: string | null;
  limit?: number | null;
  moduleCodePrefix?: string | null;
  search?: string | null;
};

type CreateModuleReviewBody = {
  moduleCode: string;
  rating: number;
  content: string;
};

export function searchNusModules(query: SearchNusModulesQuery = {}) {
  return apiRequest<NusModuleSearchResponse>("/nusmodule", { query });
}

export function getNusModule(moduleCode: string) {
  return apiRequest<NusModuleDetail>(`/nusmodule/${encodeURIComponent(moduleCode)}`);
}

export function getModuleReviews(moduleCode: string) {
  return apiRequest<ModuleReview[]>(
    `/module-reviews/module/${encodeURIComponent(moduleCode)}`,
  );
}

export function createModuleReview(token: string, body: CreateModuleReviewBody) {
  return apiRequest<ModuleReview>("/module-reviews", {
    method: "POST",
    token,
    body,
  });
}
