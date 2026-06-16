import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlannedModuleDto } from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';
import { PlannedModule } from '@prisma/client';

@Injectable()
export class PlannedModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPlannedModuleDto: CreatePlannedModuleDto): Promise<PlannedModule> {
    return this.prisma.plannedModule.create({
      data: {
        ...createPlannedModuleDto,
        moduleCode: createPlannedModuleDto.moduleCode.toUpperCase(),
      },
    });
  }

  async findOne(id: string): Promise<PlannedModule> {
    const plannedModule = await this.prisma.plannedModule.findUnique({
      where: { id },
      include: { module: true },
    });
    if (!plannedModule) {
      throw new NotFoundException(`Planned module item with ID ${id} not found`);
    }
    return plannedModule;
  }

  async update(id: string, updatePlannedModuleDto: UpdatePlannedModuleDto): Promise<PlannedModule> {
    await this.findOne(id);
    return this.prisma.plannedModule.update({
      where: { id },
      data: {
        ...updatePlannedModuleDto,
        moduleCode: updatePlannedModuleDto.moduleCode?.toUpperCase(),
      },
    });
  }

  async remove(id: string): Promise<PlannedModule> {
    await this.findOne(id);
    return this.prisma.plannedModule.delete({
      where: { id },
    });
  }
}