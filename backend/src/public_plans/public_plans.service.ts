import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';
import { UpdatePublicPlanDto } from './dto/update-public_plan.dto';
import { Prisma, PublicPlan } from '@prisma/client';
import {
  planAuthorSelect,
  type FindAllPublicPlansOptions,
  type PublicPlanDetail,
  type PublicPlanLikeState,
  type PublicPlansPage,
} from '../shared/types';

const publicPlanPageSize = 20;

const publicPlanDetailInclude = {
  author: { select: planAuthorSelect },
  reviews: {
    include: { user: { select: planAuthorSelect } },
    orderBy: { createdAt: 'desc' },
  },
  _count: { select: { likes: true } },
} satisfies Prisma.PublicPlanInclude;

const publicPlanListSelect = {
  id: true,
  title: true,
  coverImageDataUrl: true,
  viewCount: true,
  createdAt: true,
  author: { select: planAuthorSelect },
  _count: { select: { likes: true } },
} satisfies Prisma.PublicPlanSelect;

@Injectable()
export class PublicPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    createPublicPlanDto: CreatePublicPlanDto,
  ): Promise<PublicPlanDetail> {
    await this.assertAuthorCanSubmit(authorId);

    const existingPlan = await this.prisma.publicPlan.findUnique({
      where: { authorId },
      select: { id: true },
    });

    if (existingPlan) {
      throw new ConflictException(
        'Each user can only submit one public degree plan.',
      );
    }

    try {
      const plan = await this.prisma.publicPlan.create({
        data: {
          ...createPublicPlanDto,
          authorId,
        },
        include: publicPlanDetailInclude,
      });

      return withUpvotes(plan);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Each user can only submit one public degree plan.',
        );
      }

      throw error;
    }
  }

  async findAll(
    options: FindAllPublicPlansOptions = {},
  ): Promise<PublicPlansPage> {
    const faculties = normalizeFilterValues(options.faculties, options.faculty);
    const degrees = normalizeFilterValues(options.degrees, options.degree);
    const page = Math.max(options.page ?? 1, 1);
    const where: Prisma.PublicPlanWhereInput =
      faculties.length > 0 || degrees.length > 0
        ? {
            author: {
              ...(faculties.length > 0
                ? { faculty: toStringFilter(faculties) }
                : {}),
              ...(degrees.length > 0
                ? { degree: toStringFilter(degrees) }
                : {}),
            },
          }
        : {};

    const plans = await this.prisma.publicPlan.findMany({
      where,
      orderBy: [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
      skip: (page - 1) * publicPlanPageSize,
      take: publicPlanPageSize + 1,
      select: publicPlanListSelect,
    });
    const hasNextPage = plans.length > publicPlanPageSize;
    const items = (
      hasNextPage ? plans.slice(0, publicPlanPageSize) : plans
    ).map(withUpvotes);

    return {
      items,
      nextPage: hasNextPage ? page + 1 : null,
    };
  }

  async findOne(id: string): Promise<PublicPlanDetail> {
    try {
      const plan = await this.prisma.publicPlan.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        include: publicPlanDetailInclude,
      });

      return withUpvotes(plan);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw new NotFoundException(`Public Plan with ID ${id} not found`);
      }

      throw error;
    }
  }

  async findOneWithoutViewIncrement(id: string): Promise<PublicPlanDetail> {
    const plan = await this.prisma.publicPlan.findUnique({
      where: { id },
      include: publicPlanDetailInclude,
    });

    if (!plan) {
      throw new NotFoundException(`Public Plan with ID ${id} not found`);
    }
    return withUpvotes(plan);
  }

  async findCurrentUserPlan(
    authorId: string,
  ): Promise<PublicPlanDetail | null> {
    const plan = await this.prisma.publicPlan.findUnique({
      where: { authorId },
      include: publicPlanDetailInclude,
    });

    return plan ? withUpvotes(plan) : null;
  }

  async update(
    authorId: string,
    id: string,
    updatePublicPlanDto: UpdatePublicPlanDto,
  ): Promise<PublicPlanDetail> {
    await this.assertAuthorCanSubmit(authorId);

    const plan = await this.findOneWithoutViewIncrement(id);

    if (plan.authorId !== authorId) {
      throw new ForbiddenException('You cannot update this public plan.');
    }

    const updatedPlan = await this.prisma.publicPlan.update({
      where: { id },
      data: updatePublicPlanDto,
      include: publicPlanDetailInclude,
    });

    return withUpvotes(updatedPlan);
  }

  async getLikeState(userId: string, id: string): Promise<PublicPlanLikeState> {
    const plan = await this.findLikeContext(userId, id);

    return {
      canLike: plan.authorId !== userId,
      liked: plan.likes.length > 0,
      upvotes: plan._count.likes,
    };
  }

  async like(userId: string, id: string): Promise<PublicPlanLikeState> {
    const plan = await this.findLikeContext(userId, id);

    if (plan.authorId === userId) {
      throw new ForbiddenException('You cannot like your own public plan.');
    }

    await this.prisma.publicPlanLike.upsert({
      where: {
        userId_publicPlanId: {
          publicPlanId: id,
          userId,
        },
      },
      create: {
        publicPlanId: id,
        userId,
      },
      update: {},
    });

    return {
      canLike: true,
      liked: true,
      upvotes: await this.prisma.publicPlanLike.count({
        where: { publicPlanId: id },
      }),
    };
  }

  async unlike(userId: string, id: string): Promise<PublicPlanLikeState> {
    const plan = await this.findLikeContext(userId, id);

    await this.prisma.publicPlanLike.deleteMany({
      where: {
        publicPlanId: id,
        userId,
      },
    });

    return {
      canLike: plan.authorId !== userId,
      liked: false,
      upvotes: await this.prisma.publicPlanLike.count({
        where: { publicPlanId: id },
      }),
    };
  }

  private async assertAuthorCanSubmit(authorId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { degree: true, faculty: true },
    });

    if (!author?.degree || !author.faculty) {
      throw new BadRequestException(
        'Faculty and major are required before submitting a public degree plan.',
      );
    }
  }

  private async findLikeContext(userId: string, id: string) {
    const plan = await this.prisma.publicPlan.findUnique({
      where: { id },
      select: {
        authorId: true,
        likes: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
        _count: { select: { likes: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Public Plan with ID ${id} not found`);
    }

    return plan;
  }

  async remove(authorId: string, id: string): Promise<PublicPlan> {
    const plan = await this.findOneWithoutViewIncrement(id);

    if (plan.authorId !== authorId) {
      throw new ForbiddenException('You cannot delete this public plan.');
    }

    return this.prisma.publicPlan.delete({
      where: { id },
    });
  }
}

function isRecordNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function normalizeFilterValues(values?: string[], value?: string) {
  return Array.from(
    new Set(
      [...(values ?? []), value]
        .map((filterValue) => filterValue?.trim())
        .filter((filterValue): filterValue is string => Boolean(filterValue)),
    ),
  );
}

function toStringFilter(values: string[]) {
  return values.length === 1 ? values[0] : { in: values };
}

function withUpvotes<T extends { _count: { likes: number } }>(
  plan: T,
): Omit<T, '_count'> & { upvotes: number } {
  const { _count, ...publicPlan } = plan;

  return {
    ...publicPlan,
    upvotes: _count.likes,
  };
}
