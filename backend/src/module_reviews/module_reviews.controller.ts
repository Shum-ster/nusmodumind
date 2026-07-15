import {
  Body,
  Controller,
  Delete,
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
import { ModuleReviewsService } from './module_reviews.service';
import { CreateModuleReviewDto } from './dto/create-module_review.dto';
import { UpdateModuleReviewDto } from './dto/update-module_review.dto';

@Controller('module-reviews')
export class ModuleReviewsController {
  constructor(private readonly moduleReviewsService: ModuleReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createModuleReviewDto: CreateModuleReviewDto,
  ) {
    return this.moduleReviewsService.create(user.id, createModuleReviewDto);
  }

  @Get('module/:moduleCode')
  findByModule(@Param('moduleCode') moduleCode: string) {
    return this.moduleReviewsService.findByModule(moduleCode);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleReviewsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateModuleReviewDto: UpdateModuleReviewDto,
  ) {
    return this.moduleReviewsService.update(user.id, id, updateModuleReviewDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.moduleReviewsService.remove(user.id, id);
  }
}
