import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { PlannedModulesService } from './planned_modules.service';
import { CreatePlannedModuleDto } from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';

@Controller('planned-modules')
export class PlannedModulesController {
  constructor(private readonly plannedModulesService: PlannedModulesService) {}

  @Post()
  create(@Body() createPlannedModuleDto: CreatePlannedModuleDto) {
    return this.plannedModulesService.create(createPlannedModuleDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plannedModulesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updatePlannedModuleDto: UpdatePlannedModuleDto) {
    return this.plannedModulesService.update(id, updatePlannedModuleDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.plannedModulesService.remove(id);
  }
}