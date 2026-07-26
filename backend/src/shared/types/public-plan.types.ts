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
  page?: number;
};

export type PublicPlanListItem = {
  id: string;
  title: string;
  coverImageDataUrl: string | null;
  upvotes: number;
  viewCount: number;
  createdAt: Date;
  author: Prisma.UserGetPayload<{ select: typeof planAuthorSelect }>;
};

export type PublicPlansPage = {
  items: PublicPlanListItem[];
  nextPage: number | null;
};

type PublicPlanDetailPayload = Prisma.PublicPlanGetPayload<{
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
    _count: {
      select: {
        likes: true;
      };
    };
  };
}>;

export type PublicPlanDetail = Omit<PublicPlanDetailPayload, '_count'> & {
  upvotes: number;
};

export type PublicPlanLikeState = {
  liked: boolean;
  canLike: boolean;
  upvotes: number;
};
