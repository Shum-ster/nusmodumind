import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../shared/types';
import { PublicPlansService } from './public_plans.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';
import { UpdatePublicPlanDto } from './dto/update-public_plan.dto';

@Controller('public-plans')
export class PublicPlansController {
  constructor(private readonly publicPlansService: PublicPlansService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPublicPlanDto: CreatePublicPlanDto,
  ) {
    return this.publicPlansService.create(user.id, createPublicPlanDto);
  }

  @Get()
  findAll(
    @Query('faculty') faculty?: string,
    @Query('degree') degree?: string,
    @Query('faculties') faculties?: string,
    @Query('degrees') degrees?: string,
  ) {
    return this.publicPlansService.findAll({
      degree,
      degrees: parseDelimitedQueryValues(degrees),
      faculties: parseDelimitedQueryValues(faculties),
      faculty,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  findCurrentUserPlan(@CurrentUser() user: AuthenticatedUser) {
    return this.publicPlansService.findCurrentUserPlan(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicPlansService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePublicPlanDto: UpdatePublicPlanDto,
  ) {
    return this.publicPlansService.update(user.id, id, updatePublicPlanDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publicPlansService.remove(user.id, id);
  }
}

function parseDelimitedQueryValues(value?: string) {
  return value
    ?.split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}
