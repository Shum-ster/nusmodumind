import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlannedModulesService } from './planned_modules.service';
import { CreatePlannedModuleDto } from './dto/create-planned_module.dto';
import { UpdatePlannedModuleDto } from './dto/update-planned_module.dto';

@Controller('planned-modules')
export class PlannedModulesController {
  constructor(private readonly plannedModulesService: PlannedModulesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: { id: string; email: string },
    @Body() createPlannedModuleDto: CreatePlannedModuleDto,
  ) {
    return this.plannedModulesService.create(user.id, createPlannedModuleDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string; email: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plannedModulesService.findOne(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @CurrentUser() user: { id: string; email: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlannedModuleDto: UpdatePlannedModuleDto,
  ) {
    return this.plannedModulesService.update(user.id, id, updatePlannedModuleDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string; email: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plannedModulesService.remove(user.id, id);
  }
}
