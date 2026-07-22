import type { Prisma } from '@prisma/client';

export const planAuthorSelect = {
  username: true,
  faculty: true,
  degree: true,
} satisfies Prisma.UserSelect;

export type FindAllPublicPlansOptions = {
  degree?: string;
  degrees?: string[];
  faculty?: string;
  faculties?: string[];
};

export type PublicPlanListItem = Prisma.PublicPlanGetPayload<{
  include: {
    author: {
      select: typeof planAuthorSelect;
    };
  };
}>;

export type PublicPlanDetail = Prisma.PublicPlanGetPayload<{
  include: {
    author: {
      select: typeof planAuthorSelect;
    };
    reviews: {
      include: {
        user: {
          select: typeof planAuthorSelect;
        };
      };
    };
  };
}>;
