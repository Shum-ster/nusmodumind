import type { PlanAuthorSummary } from './public-plan.types';

export type ModuleReview = {
  id: string;
  userId: string;
  moduleCode: string;
  rating: number;
  content: string;
  createdAt: string;
  user?: {
    username: string | null;
  };
};

export type CreateModuleReviewBody = {
  moduleCode: string;
  rating: number;
  content: string;
};

export type PlanReview = {
  id: string;
  userId: string;
  publicPlanId: string;
  rating: number;
  content: string;
  createdAt: string;
  user: PlanAuthorSummary;
};

export type CreatePlanReviewBody = {
  publicPlanId: string;
  rating: number;
  content: string;
};

export type UpdatePlanReviewBody = {
  rating: number;
  content: string;
};
