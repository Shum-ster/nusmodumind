import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannedModuleDto } from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';
import { PlannedModule } from '@prisma/client';

@Injectable()
export class PlannedModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createPlannedModuleDto: CreatePlannedModuleDto): Promise<PlannedModule> {
    await this.ensureSemesterBelongsToUser(createPlannedModuleDto.semesterId, userId);

    return this.prisma.plannedModule.create({
      data: {
        ...createPlannedModuleDto,
        moduleCode: createPlannedModuleDto.moduleCode.toUpperCase(),
      },
    });
  }

  async findOne(id: string, userId?: string): Promise<PlannedModule> {
    const plannedModule = await this.prisma.plannedModule.findUnique({
      where: { id },
      include: { module: true, semester: true },
    });
    if (!plannedModule) {
      throw new NotFoundException(`Planned module item with ID ${id} not found`);
    }
    if (userId && plannedModule.semester.userId !== userId) {
      throw new ForbiddenException('You cannot access this planned module.');
    }
    return plannedModule;
  }

  async update(userId: string, id: string, updatePlannedModuleDto: UpdatePlannedModuleDto): Promise<PlannedModule> {
    await this.findOne(id, userId);

    if (updatePlannedModuleDto.semesterId) {
      await this.ensureSemesterBelongsToUser(updatePlannedModuleDto.semesterId, userId);
    }

    return this.prisma.plannedModule.update({
      where: { id },
      data: {
        ...updatePlannedModuleDto,
        moduleCode: updatePlannedModuleDto.moduleCode?.toUpperCase(),
      },
    });
  }

  async remove(userId: string, id: string): Promise<PlannedModule> {
    await this.findOne(id, userId);
    return this.prisma.plannedModule.delete({
      where: { id },
    });
  }

  private async ensureSemesterBelongsToUser(semesterId: string, userId: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      select: { userId: true },
    });

    if (!semester) {
      throw new NotFoundException(`Semester with ID ${semesterId} not found`);
    }

    if (semester.userId !== userId) {
      throw new ForbiddenException('You cannot use another user\'s semester.');
    }
  }
}
