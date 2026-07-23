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
  planImageDataUrl: string | null;
  coverImageDataUrl: string | null;
  upvotes: number;
  viewCount: number;
  createdAt: string;
  author: PlanAuthorSummary;
};

export type PublicPlanDetail = PublicPlan & {
  reviews: PlanReview[];
};

export type PublicPlansQuery = {
  faculty?: string | null;
  degree?: string | null;
  faculties?: string | null;
  degrees?: string | null;
};

export type CreatePublicPlanBody = {
  title: string;
  description?: string;
  planSnapshot: unknown;
  planImageDataUrl: string;
  coverImageDataUrl?: string | null;
};

export type UpdatePublicPlanBody = Partial<CreatePublicPlanBody>;
