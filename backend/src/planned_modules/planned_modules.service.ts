import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePlannedModuleDto,
  PlannedModuleStatusDto,
} from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';
import { PlannedModule, PlannedModuleStatus, Prisma } from '@prisma/client';

type PlannedModuleDataInput = Omit<CreatePlannedModuleDto, 'status'> & {
  status?: PlannedModuleStatusDto | PlannedModuleStatus;
};

@Injectable()
export class PlannedModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    createPlannedModuleDto: CreatePlannedModuleDto,
  ): Promise<PlannedModule> {
    const normalizedData = await this.normalizePlannedModuleData(
      userId,
      createPlannedModuleDto,
    );

    return this.prisma.plannedModule.create({
      data: normalizedData,
      include: { module: true, semester: true },
    });
  }

  async findOne(id: string, userId?: string): Promise<PlannedModule> {
    const plannedModule = await this.prisma.plannedModule.findUnique({
      where: { id },
      include: { module: true, semester: true },
    });
    if (!plannedModule) {
      throw new NotFoundException(
        `Planned module item with ID ${id} not found`,
      );
    }
    if (userId && plannedModule.userId !== userId) {
      throw new ForbiddenException('You cannot access this planned module.');
    }
    return plannedModule;
  }

  async update(
    userId: string,
    id: string,
    updatePlannedModuleDto: UpdatePlannedModuleDto,
  ): Promise<PlannedModule> {
    const existingPlannedModule = await this.findOne(id, userId);
    const status =
      updatePlannedModuleDto.status ??
      (updatePlannedModuleDto.semesterId
        ? PlannedModuleStatus.PLANNED
        : existingPlannedModule.status);
    const normalizedData = await this.normalizePlannedModuleData(userId, {
      moduleCode:
        updatePlannedModuleDto.moduleCode ?? existingPlannedModule.moduleCode,
      semesterId:
        updatePlannedModuleDto.semesterId === undefined
          ? existingPlannedModule.semesterId
          : updatePlannedModuleDto.semesterId,
      status,
      expectedGrade:
        updatePlannedModuleDto.expectedGrade === undefined
          ? (existingPlannedModule.expectedGrade ?? undefined)
          : updatePlannedModuleDto.expectedGrade,
      actualGrade:
        updatePlannedModuleDto.actualGrade === undefined
          ? (existingPlannedModule.actualGrade ?? undefined)
          : updatePlannedModuleDto.actualGrade,
      selectedLessons:
        updatePlannedModuleDto.selectedLessons === undefined
          ? (existingPlannedModule.selectedLessons ?? undefined)
          : updatePlannedModuleDto.selectedLessons,
    });

    return this.prisma.plannedModule.update({
      where: { id },
      data: normalizedData,
      include: { module: true, semester: true },
    });
  }

  async remove(userId: string, id: string): Promise<PlannedModule> {
    await this.findOne(id, userId);
    return this.prisma.plannedModule.delete({
      where: { id },
    });
  }

  private async normalizePlannedModuleData(
    userId: string,
    plannedModuleDto: PlannedModuleDataInput,
  ): Promise<Prisma.PlannedModuleUncheckedCreateInput> {
    const status =
      plannedModuleDto.status ??
      (plannedModuleDto.semesterId
        ? PlannedModuleStatus.PLANNED
        : PlannedModuleStatus.SELECTED);
    const data = {
      userId,
      moduleCode: plannedModuleDto.moduleCode.toUpperCase(),
      status,
      semesterId: plannedModuleDto.semesterId ?? null,
      expectedGrade: plannedModuleDto.expectedGrade,
      actualGrade: plannedModuleDto.actualGrade,
      selectedLessons: plannedModuleDto.selectedLessons,
    };

    if (data.status === PlannedModuleStatus.PLANNED) {
      if (!data.semesterId) {
        throw new BadRequestException('PLANNED modules require semesterId.');
      }

      await this.ensureSemesterBelongsToUser(data.semesterId, userId);
      return data;
    }

    return {
      ...data,
      semesterId: null,
    };
  }

  private async ensureSemesterBelongsToUser(
    semesterId: string,
    userId: string,
  ) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      select: { userId: true },
    });

    if (!semester) {
      throw new NotFoundException(`Semester with ID ${semesterId} not found`);
    }

    if (semester.userId !== userId) {
      throw new ForbiddenException("You cannot use another user's semester.");
    }
  }
}
