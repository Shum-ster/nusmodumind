import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';
import { Prisma, PublicPlan } from '@prisma/client';

const marketplaceAuthorSelect = {
  username: true,
  faculty: true,
  degree: true,
} satisfies Prisma.UserSelect;

type FindAllPublicPlansOptions = {
  degree?: string;
  faculty?: string;
};

type PublicPlanListItem = Prisma.PublicPlanGetPayload<{
  include: {
    author: {
      select: typeof marketplaceAuthorSelect;
    };
  };
}>;

type PublicPlanDetail = Prisma.PublicPlanGetPayload<{
  include: {
    author: {
      select: typeof marketplaceAuthorSelect;
    };
    reviews: {
      include: {
        user: {
          select: typeof marketplaceAuthorSelect;
        };
      };
    };
  };
}>;

@Injectable()
export class PublicPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    createPublicPlanDto: CreatePublicPlanDto,
  ): Promise<PublicPlan> {
    return this.prisma.publicPlan.create({
      data: {
        ...createPublicPlanDto,
        authorId,
      },
    });
  }

  async findAll(
    options: FindAllPublicPlansOptions = {},
  ): Promise<PublicPlanListItem[]> {
    const faculty = options.faculty?.trim();
    const degree = options.degree?.trim();
    const where: Prisma.PublicPlanWhereInput =
      faculty || degree
        ? {
            author: {
              ...(faculty ? { faculty } : {}),
              ...(degree ? { degree } : {}),
            },
          }
        : {};

    return this.prisma.publicPlan.findMany({
      where,
      orderBy: { upvotes: 'desc' },
      include: {
        author: { select: marketplaceAuthorSelect },
      },
    });
  }

  async findOne(id: string): Promise<PublicPlanDetail> {
    const plan = await this.prisma.publicPlan.findUnique({
      where: { id },
      include: {
        author: { select: marketplaceAuthorSelect },
        reviews: {
          include: { user: { select: marketplaceAuthorSelect } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Public Plan with ID ${id} not found`);
    }
    return plan;
  }

  async remove(authorId: string, id: string): Promise<PublicPlan> {
    // Ensure the plan exists
    const plan = await this.findOne(id);

    if (plan.authorId !== authorId) {
      throw new ForbiddenException('You cannot delete this public plan.');
    }

    return this.prisma.publicPlan.delete({
      where: { id },
    });
  }
}
