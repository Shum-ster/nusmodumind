import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { NusmoduleService } from './nusmodule.service';

@Controller('nusmodule')
export class NusmoduleController {
  constructor(private readonly nusmoduleService: NusmoduleService) {}

  @Get()
  findAll(
    @Query('cursor') cursor?: string,
    @Query('department') department?: string,
    @Query('faculty') faculty?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    return this.nusmoduleService.findAll({
      cursor,
      department,
      faculty,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
      search,
    });
  }

  @Get(':moduleCode')
  async findOne(@Param('moduleCode') moduleCode: string) {
    const normalizedModuleCode = moduleCode.trim().toUpperCase();
    const nusModule = await this.nusmoduleService.findOne(normalizedModuleCode);

    if (!nusModule) {
      throw new NotFoundException(
        `NUS module ${normalizedModuleCode} was not found`,
      );
    }

    return nusModule;
  }
}
