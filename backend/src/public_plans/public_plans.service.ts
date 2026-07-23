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
  type PublicPlanListItem,
} from '../shared/types';

const publicPlanDetailInclude = {
  author: { select: planAuthorSelect },
  reviews: {
    include: { user: { select: planAuthorSelect } },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.PublicPlanInclude;

@Injectable()
export class PublicPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    createPublicPlanDto: CreatePublicPlanDto,
  ): Promise<PublicPlan> {
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
      return await this.prisma.publicPlan.create({
        data: {
          ...createPublicPlanDto,
          authorId,
        },
      });
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
  ): Promise<PublicPlanListItem[]> {
    const faculties = normalizeFilterValues(options.faculties, options.faculty);
    const degrees = normalizeFilterValues(options.degrees, options.degree);
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

    return this.prisma.publicPlan.findMany({
      where,
      orderBy: { upvotes: 'desc' },
      include: {
        author: { select: planAuthorSelect },
      },
    });
  }

  async findOne(id: string): Promise<PublicPlanDetail> {
    try {
      return await this.prisma.publicPlan.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
        include: publicPlanDetailInclude,
      });
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
    return plan;
  }

  async findCurrentUserPlan(
    authorId: string,
  ): Promise<PublicPlanDetail | null> {
    return this.prisma.publicPlan.findUnique({
      where: { authorId },
      include: publicPlanDetailInclude,
    });
  }

  async update(
    authorId: string,
    id: string,
    updatePublicPlanDto: UpdatePublicPlanDto,
  ): Promise<PublicPlan> {
    await this.assertAuthorCanSubmit(authorId);

    const plan = await this.findOneWithoutViewIncrement(id);

    if (plan.authorId !== authorId) {
      throw new ForbiddenException('You cannot update this public plan.');
    }

    return this.prisma.publicPlan.update({
      where: { id },
      data: updatePublicPlanDto,
    });
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
