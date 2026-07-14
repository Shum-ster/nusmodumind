import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleReviewDto } from './dto/create-module_review.dto';
import { UpdateModuleReviewDto } from './dto/update-module_review.dto';
import { ModuleReview, Prisma } from '@prisma/client';

type ModuleReviewWithAuthor = Prisma.ModuleReviewGetPayload<{
  include: {
    user: {
      select: {
        username: true;
      };
    };
  };
}>;

@Injectable()
export class ModuleReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createModuleReviewDto: CreateModuleReviewDto,
  ): Promise<ModuleReview> {
    return this.prisma.moduleReview.create({
      data: {
        ...createModuleReviewDto,
        userId,
        moduleCode: createModuleReviewDto.moduleCode.toUpperCase(),
      },
    });
  }

  async findByModule(moduleCode: string): Promise<ModuleReviewWithAuthor[]> {
    return this.prisma.moduleReview.findMany({
      where: { moduleCode: moduleCode.toUpperCase() },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<ModuleReview> {
    const review = await this.prisma.moduleReview.findUnique({
      where: { id },
    });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    return review;
  }

  async update(
    userId: string,
    id: string,
    updateModuleReviewDto: UpdateModuleReviewDto,
  ): Promise<ModuleReview> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot update this review.');
    }

    return this.prisma.moduleReview.update({
      where: { id },
      data: {
        ...updateModuleReviewDto,
        moduleCode: updateModuleReviewDto.moduleCode?.toUpperCase(),
      },
    });
  }

  async remove(userId: string, id: string): Promise<ModuleReview> {
    const review = await this.findOne(id);

    if (review.userId !== userId) {
      throw new ForbiddenException('You cannot delete this review.');
    }

    return this.prisma.moduleReview.delete({
      where: { id },
    });
  }
}
