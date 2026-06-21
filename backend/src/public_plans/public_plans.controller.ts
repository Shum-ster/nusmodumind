import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicPlansService } from './public_plans.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';

@Controller('public-plans')
export class PublicPlansController {
  constructor(private readonly publicPlansService: PublicPlansService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @CurrentUser() user: { id: string; email: string },
    @Body() createPublicPlanDto: CreatePublicPlanDto,
  ) {
    return this.publicPlansService.create(user.id, createPublicPlanDto);
  }

  @Get()
  findAll() {
    return this.publicPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.publicPlansService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string; email: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.publicPlansService.remove(user.id, id);
  }
}
