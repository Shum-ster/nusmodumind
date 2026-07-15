import type { PlanReview } from './reviews.types';

export type PlanAuthorSummary = {
  username: string | null;
  faculty: string | null;
  degree: string | null;
};

export type PublicPlan = {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  planSnapshot: unknown;
  upvotes: number;
  createdAt: string;
  author: PlanAuthorSummary;
};

export type PublicPlanDetail = PublicPlan & {
  reviews: PlanReview[];
};

export type PublicPlansQuery = {
  faculty?: string | null;
  degree?: string | null;
};

export type CreatePublicPlanBody = {
  title: string;
  description?: string;
  planSnapshot: unknown;
};
