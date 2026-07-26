import type { PlanReview } from './reviews.types';

export type PlanAuthorSummary = {
  username: string | null;
  faculty: string | null;
  degree: string | null;
};

export type PublicPlanListItem = {
  id: string;
  title: string;
  coverImageDataUrl: string | null;
  upvotes: number;
  viewCount: number;
  createdAt: string;
  author: PlanAuthorSummary;
};

export type PublicPlansPage = {
  items: PublicPlanListItem[];
  nextPage: number | null;
};

export type PublicPlan = PublicPlanListItem & {
  authorId: string;
  description: string | null;
  planSnapshot: unknown;
  planImageDataUrl: string | null;
};

export type PublicPlanDetail = PublicPlan & {
  reviews: PlanReview[];
};

export type PublicPlansQuery = {
  faculty?: string | null;
  degree?: string | null;
  faculties?: string | null;
  degrees?: string | null;
  page?: number | null;
};

export type PublicPlanLikeState = {
  liked: boolean;
  canLike: boolean;
  upvotes: number;
};

export type CreatePublicPlanBody = {
  title: string;
  description?: string;
  planSnapshot: unknown;
  planImageDataUrl: string;
  coverImageDataUrl?: string | null;
};

export type UpdatePublicPlanBody = Partial<CreatePublicPlanBody>;
