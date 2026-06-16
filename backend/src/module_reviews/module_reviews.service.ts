import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleReviewDto } from './dto/create-module_review.dto';
import { UpdateModuleReviewDto } from './dto/update-module_review.dto';
import { ModuleReview } from '@prisma/client';

@Injectable()
export class ModuleReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createModuleReviewDto: CreateModuleReviewDto): Promise<ModuleReview> {
    return this.prisma.moduleReview.create({
      data: {
        ...createModuleReviewDto,
        moduleCode: createModuleReviewDto.moduleCode.toUpperCase(),
      },
    });
  }

  async findByModule(moduleCode: string): Promise<ModuleReview[]> {
    return this.prisma.moduleReview.findMany({
      where: { moduleCode: moduleCode.toUpperCase() },
      orderBy: { createdAt: 'desc' },
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

  async update(id: string, updateModuleReviewDto: UpdateModuleReviewDto): Promise<ModuleReview> {
    await this.findOne(id);
    return this.prisma.moduleReview.update({
      where: { id },
      data: {
        ...updateModuleReviewDto,
        moduleCode: updateModuleReviewDto.moduleCode?.toUpperCase(),
      },
    });
  }

  async remove(id: string): Promise<ModuleReview> {
    await this.findOne(id);
    return this.prisma.moduleReview.delete({
      where: { id },
    });
  }
}