import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { Semester } from '@prisma/client';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSemesterDto: CreateSemesterDto): Promise<Semester> {
    return this.prisma.semester.create({
      data: createSemesterDto,
    });
  }

  async findUserPlan(userId: string): Promise<Semester[]> {
    return this.prisma.semester.findMany({
      where: { userId },
      orderBy: [
        { acadYear: 'asc' },
        { semesterNumber: 'asc' },
      ],
      include: {
        plannedModules: {
          include: {
            module: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Semester> {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
      include: { plannedModules: true },
    });
    if (!semester) {
      throw new NotFoundException(`Semester with ID ${id} not found`);
    }
    return semester;
  }

  async update(id: string, updateSemesterDto: UpdateSemesterDto): Promise<Semester> {
    await this.findOne(id); // Ensure exists
    return this.prisma.semester.update({
      where: { id },
      data: updateSemesterDto,
    });
  }

  async remove(id: string): Promise<Semester> {
    await this.findOne(id); // Ensure exists
    return this.prisma.semester.delete({
      where: { id },
    });
  }
}