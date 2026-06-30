import { Injectable } from '@nestjs/common';
import { NusModule, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type FindAllModulesOptions = {
  cursor?: string;
  department?: string;
  faculty?: string;
  limit?: number;
  moduleCodePrefix?: string;
  search?: string;
};

@Injectable()
export class NusmoduleService {
  constructor(private prisma: PrismaService) {}

  async findAll(options: FindAllModulesOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const normalizedCursor = options.cursor?.trim().toUpperCase();
    const normalizedModuleCodePrefix = options.moduleCodePrefix
      ?.trim()
      .toUpperCase();
    const normalizedSearch = options.search?.trim();
    const moduleCodeFilter: Prisma.StringFilter<'NusModule'> = {
      ...(normalizedCursor ? { gt: normalizedCursor } : {}),
      ...(normalizedModuleCodePrefix
        ? {
            startsWith: normalizedModuleCodePrefix,
            mode: 'insensitive',
          }
        : {}),
    };
    const where: Prisma.NusModuleWhereInput = {
      ...(Object.keys(moduleCodeFilter).length > 0
        ? { moduleCode: moduleCodeFilter }
        : {}),
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
        prerequisite: true,
        semesterData: true,
        workload: true,
        attributes: true,
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
