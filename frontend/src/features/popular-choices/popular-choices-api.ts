import { apiRequest } from '@/shared/api';
import type {
  CreatePlanReviewBody,
  CreatePublicPlanBody,
  PlanReview,
  PublicPlan,
  PublicPlanDetail,
  PublicPlansQuery,
} from '@/shared/types';

export type {
  CreatePlanReviewBody,
  CreatePublicPlanBody,
  PlanAuthorSummary,
  PlanReview,
  PublicPlan,
  PublicPlanDetail,
  PublicPlansQuery,
} from '@/shared/types';

export function getPublicPlans(query: PublicPlansQuery = {}) {
  return apiRequest<PublicPlan[]>('/public-plans', { query });
}

export function getPublicPlan(id: string) {
  return apiRequest<PublicPlanDetail>(`/public-plans/${encodeURIComponent(id)}`);
}

export function createPublicPlan(token: string, body: CreatePublicPlanBody) {
  return apiRequest<PublicPlan>('/public-plans', {
    method: 'POST',
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

export function deletePlanReview(token: string, id: string) {
  return apiRequest<PlanReview>(`/plan-reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}
