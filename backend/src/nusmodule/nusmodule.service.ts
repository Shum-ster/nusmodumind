import { Injectable } from '@nestjs/common';
import { NusModule, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FindAllModulesOptions = {
  cursor?: string;
  department?: string;
  faculty?: string;
  limit?: number;
  search?: string;
};

@Injectable()
export class NusmoduleService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: FindAllModulesOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const normalizedCursor = options.cursor?.trim().toUpperCase();
    const normalizedSearch = options.search?.trim();
    const where: Prisma.NusModuleWhereInput = {
      ...(normalizedCursor ? { moduleCode: { gt: normalizedCursor } } : {}),
      ...(options.faculty ? { faculty: options.faculty } : {}),
      ...(options.department ? { department: options.department } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                moduleCode: {
                  contains: normalizedSearch.toUpperCase(),
                  mode: 'insensitive',
                },
              },
              {
                title: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                faculty: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                department: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const modules = await this.prisma.nusModule.findMany({
      where,
      orderBy: { moduleCode: 'asc' },
      take: limit + 1,
      select: {
        moduleCode: true,
        title: true,
        faculty: true,
        department: true,
        moduleCredit: true,
        gradingBasisDescription: true,
      },
    });
    const hasNextPage = modules.length > limit;
    const items = hasNextPage ? modules.slice(0, limit) : modules;

    return {
      items,
      nextCursor: hasNextPage ? items[items.length - 1].moduleCode : null,
    };
  }

  async findOne(moduleCode: string): Promise<NusModule | null> {
    return this.prisma.nusModule.findUnique({
      where: { moduleCode },
    });
  }
}
