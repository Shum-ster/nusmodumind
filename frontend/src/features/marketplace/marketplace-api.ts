import { apiRequest } from "@/shared/api";

export type MarketplaceAuthor = {
  username: string | null;
  faculty: string | null;
  degree: string | null;
};

export type PlanReview = {
  id: string;
  userId: string;
  publicPlanId: string;
  rating: number;
  content: string;
  createdAt: string;
  user: MarketplaceAuthor;
};

export type PublicPlan = {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  planSnapshot: unknown;
  upvotes: number;
  createdAt: string;
  author: MarketplaceAuthor;
};

export type PublicPlanDetail = PublicPlan & {
  reviews: PlanReview[];
};

type PublicPlansQuery = {
  faculty?: string | null;
  degree?: string | null;
};

type CreatePublicPlanBody = {
  title: string;
  description?: string;
  planSnapshot: unknown;
};

type CreatePlanReviewBody = {
  publicPlanId: string;
  rating: number;
  content: string;
};

export function getPublicPlans(query: PublicPlansQuery = {}) {
  return apiRequest<PublicPlan[]>("/public-plans", { query });
}

export function getPublicPlan(id: string) {
  return apiRequest<PublicPlanDetail>(`/public-plans/${encodeURIComponent(id)}`);
}

export function createPublicPlan(token: string, body: CreatePublicPlanBody) {
  return apiRequest<PublicPlan>("/public-plans", {
    method: "POST",
    token,
    body,
  });
}

export function deletePublicPlan(token: string, id: string) {
  return apiRequest<PublicPlan>(`/public-plans/${encodeURIComponent(id)}`, {
    method: "DELETE",
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
  return apiRequest<PlanReview>("/plan-reviews", {
    method: "POST",
    token,
    body,
  });
}

export function deletePlanReview(token: string, id: string) {
  return apiRequest<PlanReview>(`/plan-reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
}
