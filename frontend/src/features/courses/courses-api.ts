import { apiRequest } from '@/shared/api';
import type {
  CreateModuleReviewBody,
  ModuleReview,
  NusModuleDetail,
  NusModuleSearchResponse,
  SearchNusModulesQuery,
} from '@/shared/types';

export type {
  ModuleReview,
  NusModuleDetail,
  NusModuleListItem,
  NusModuleSearchResponse,
} from '@/shared/types';

export function searchNusModules(query: SearchNusModulesQuery = {}) {
  return apiRequest<NusModuleSearchResponse>('/nusmodule', { query });
}

export function getNusModule(moduleCode: string) {
  return apiRequest<NusModuleDetail>(
    `/nusmodule/${encodeURIComponent(moduleCode)}`,
  );
}

export function getModuleReviews(moduleCode: string) {
  return apiRequest<ModuleReview[]>(
    `/module-reviews/module/${encodeURIComponent(moduleCode)}`,
  );
}

export function createModuleReview(
  token: string,
  body: CreateModuleReviewBody,
) {
  return apiRequest<ModuleReview>('/module-reviews', {
    method: 'POST',
    token,
    body,
  });
}
