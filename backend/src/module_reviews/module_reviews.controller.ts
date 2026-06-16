import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ModuleReviewsService } from './module_reviews.service';
import { CreateModuleReviewDto } from './dto/create-module_review.dto';
import { UpdateModuleReviewDto } from './dto/update-module_review.dto';

@Controller('module-reviews')
export class ModuleReviewsController {
  constructor(private readonly moduleReviewsService: ModuleReviewsService) {}

  @Post()
  create(@Body() createModuleReviewDto: CreateModuleReviewDto) {
    return this.moduleReviewsService.create(createModuleReviewDto);
  }

  @Get('module/:moduleCode')
  findByModule(@Param('moduleCode') moduleCode: string) {
    return this.moduleReviewsService.findByModule(moduleCode);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleReviewsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateModuleReviewDto: UpdateModuleReviewDto) {
    return this.moduleReviewsService.update(id, updateModuleReviewDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.moduleReviewsService.remove(id);
  }
}