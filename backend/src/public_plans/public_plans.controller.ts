import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { PublicPlansService } from './public_plans.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';

@Controller('public-plans')
export class PublicPlansController {
  constructor(private readonly publicPlansService: PublicPlansService) {}

  @Post()
  create(@Body() createPublicPlanDto: CreatePublicPlanDto) {
    return this.publicPlansService.create(createPublicPlanDto);
  }

  @Get()
  findAll() {
    return this.publicPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicPlansService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicPlansService.remove(id);
  }
}