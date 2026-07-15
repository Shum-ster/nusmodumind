import type { Prisma } from '@prisma/client';
import { planAuthorSelect } from './public-plan.types';

export const moduleReviewAuthorSelect = {
  username: true,
} satisfies Prisma.UserSelect;

export type ModuleReviewWithAuthor = Prisma.ModuleReviewGetPayload<{
  include: {
    user: {
      select: typeof moduleReviewAuthorSelect;
    };
  };
}>;

export type PlanReviewWithUser = Prisma.PlanReviewGetPayload<{
  include: {
    user: {
      select: typeof planAuthorSelect;
    };
  };
}>;
