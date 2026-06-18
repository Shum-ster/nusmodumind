import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';
import { Prisma, PublicPlan } from '@prisma/client';

@Injectable()
export class PublicPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPublicPlanDto: CreatePublicPlanDto): Promise<PublicPlan> {
    return this.prisma.publicPlan.create({
      data: createPublicPlanDto,
    });
  }

  // Fetch all plans for the marketplace, ordered by popularity
  async findAll(): Promise<PublicPlan[]> {
    return this.prisma.publicPlan.findMany({
      orderBy: { upvotes: 'desc' },
      include: {
        author: { select: { email: true } }, // Only expose email, not password
      },
    });
  }

  async findOne(id: string): Promise<PublicPlan> {
    const plan = await this.prisma.publicPlan.findUnique({
      where: { id },
      include: {
        author: { select: { email: true } },
        reviews: {
          include: { user: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Public Plan with ID ${id} not found`);
    }
    return plan;
  }
  
  async remove(id: string): Promise<PublicPlan> {
    // 1. Ensure the plan exists (findOne throws a NotFoundException if it doesn't)
    await this.findOne(id); 

    // 2. Delete the plan (and PostgreSQL will cascade delete the reviews)
    return this.prisma.publicPlan.delete({
      where: { id },
    });
  }
}