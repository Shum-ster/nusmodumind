import { apiRequest } from '@/shared/api';
import type {
  CreatePlanReviewBody,
  CreatePublicPlanBody,
  PlanReview,
  PublicPlan,
  PublicPlanDetail,
  PublicPlanLikeState,
  PublicPlansPage,
  PublicPlansQuery,
  UpdatePlanReviewBody,
  UpdatePublicPlanBody,
} from '@/shared/types';

export type {
  CreatePlanReviewBody,
  CreatePublicPlanBody,
  PlanAuthorSummary,
  PlanReview,
  PublicPlan,
  PublicPlanDetail,
  PublicPlanLikeState,
  PublicPlanListItem,
  PublicPlansPage,
  PublicPlansQuery,
  UpdatePlanReviewBody,
  UpdatePublicPlanBody,
} from '@/shared/types';

export function getPublicPlans(query: PublicPlansQuery = {}) {
  return apiRequest<PublicPlansPage>('/public-plans', { query });
}

export function getPublicPlan(id: string) {
  return apiRequest<PublicPlanDetail>(`/public-plans/${encodeURIComponent(id)}`);
}

export function getCurrentUserPublicPlan(token: string) {
  return apiRequest<PublicPlanDetail | null>('/public-plans/me', { token });
}

export function createPublicPlan(token: string, body: CreatePublicPlanBody) {
  return apiRequest<PublicPlan>('/public-plans', {
    method: 'POST',
    token,
    body,
  });
}

export function updatePublicPlan(
  token: string,
  id: string,
  body: UpdatePublicPlanBody,
) {
  return apiRequest<PublicPlan>(`/public-plans/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body,
  });
}

export function deletePublicPlan(token: string, id: string) {
  return apiRequest<PublicPlan>(`/public-plans/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export function getPublicPlanLikeState(token: string, id: string) {
  return apiRequest<PublicPlanLikeState>(
    `/public-plans/${encodeURIComponent(id)}/like`,
    { token },
  );
}

export function likePublicPlan(token: string, id: string) {
  return apiRequest<PublicPlanLikeState>(
    `/public-plans/${encodeURIComponent(id)}/like`,
    {
      method: 'PUT',
      token,
    },
  );
}

export function unlikePublicPlan(token: string, id: string) {
  return apiRequest<PublicPlanLikeState>(
    `/public-plans/${encodeURIComponent(id)}/like`,
    {
      method: 'DELETE',
      token,
    },
  );
}

export function getPlanReviews(publicPlanId: string) {
  return apiRequest<PlanReview[]>(
    `/plan-reviews/plan/${encodeURIComponent(publicPlanId)}`,
  );
}

export function getPlanReview(id: string) {
  return apiRequest<PlanReview>(`/plan-reviews/${encodeURIComponent(id)}`);
}

export function createPlanReview(token: string, body: CreatePlanReviewBody) {
  return apiRequest<PlanReview>('/plan-reviews', {
    method: 'POST',
    token,
    body,
  });
}

export function updatePlanReview(
  token: string,
  id: string,
  body: UpdatePlanReviewBody,
) {
  return apiRequest<PlanReview>(`/plan-reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    token,
    body,
  });
}

export function deletePlanReview(token: string, id: string) {
  return apiRequest<PlanReview>(`/plan-reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}
