import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { Semester } from '@prisma/client';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createSemesterDto: CreateSemesterDto,
  ): Promise<Semester> {
    return this.prisma.semester.upsert({
      where: {
        userId_acadYear_semesterNumber: {
          userId,
          acadYear: createSemesterDto.acadYear,
          semesterNumber: createSemesterDto.semesterNumber,
        },
      },
      create: { ...createSemesterDto, userId },
      update: {},
    });
  }

  async findUserPlan(userId: string): Promise<Semester[]> {
    return this.prisma.semester.findMany({
      where: { userId },
      orderBy: [{ acadYear: 'asc' }, { semesterNumber: 'asc' }],
      include: {
        plannedModules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async findCurrentUserPlan(userId: string) {
    const [semesters, plannedModules] = await this.prisma.$transaction([
      this.prisma.semester.findMany({
        where: { userId },
        orderBy: [{ acadYear: 'asc' }, { semesterNumber: 'asc' }],
      }),
      this.prisma.plannedModule.findMany({
        where: { userId },
        orderBy: [{ status: 'asc' }, { moduleCode: 'asc' }],
        include: {
          module: true,
          semester: true,
        },
      }),
    ]);

    return {
      semesters,
      plannedModules,
    };
  }

  async findOne(id: string, userId?: string): Promise<Semester> {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: { plannedModules: true },
    });
    if (!semester) {
      throw new NotFoundException(`Semester with ID ${id} not found`);
    }
    if (userId && semester.userId !== userId) {
      throw new ForbiddenException('You cannot access this semester.');
    }
    return semester;
  }

  async update(
    id: string,
    userId: string,
    updateSemesterDto: UpdateSemesterDto,
  ): Promise<Semester> {
    await this.findOne(id, userId); // Ensure exists and belongs to the user

    try {
      return await this.prisma.semester.update({
        where: { id },
        data: updateSemesterDto,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'A semester already exists for this academic year and semester number.',
        );
      }

      throw error;
    }
  }

  async remove(id: string, userId: string): Promise<Semester> {
    await this.findOne(id, userId); // Ensure exists and belongs to the user
    return this.prisma.semester.delete({
      where: { id },
    });
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
