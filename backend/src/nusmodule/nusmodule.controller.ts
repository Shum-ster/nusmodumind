import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { NusmoduleService } from './nusmodule.service';

@Controller('nusmodule')
export class NusmoduleController {
  constructor(private readonly nusmoduleService: NusmoduleService) {}

  @Get()
  findAll() {
    return this.nusmoduleService.findAll();
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
