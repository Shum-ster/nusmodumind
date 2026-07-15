import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../shared/types';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createSemesterDto: CreateSemesterDto,
  ) {
    return this.semestersService.create(user.id, createSemesterDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/plan')
  findCurrentUserPlan(@CurrentUser() user: AuthenticatedUser) {
    return this.semestersService.findCurrentUserPlan(user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('user/:userId')
  findUserPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    if (userId !== user.id) {
      throw new ForbiddenException("You cannot access another user's plan.");
    }

    return this.semestersService.findUserPlan(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.semestersService.findOne(id, user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSemesterDto: UpdateSemesterDto,
  ) {
    return this.semestersService.update(id, user.id, updateSemesterDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.semestersService.remove(id, user.id);
  }
}
