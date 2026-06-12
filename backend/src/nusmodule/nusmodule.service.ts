import { Injectable } from '@nestjs/common';
import { NusModule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NusmoduleService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<NusModule[]> {
    return this.prisma.nusModule.findMany({
      orderBy: { moduleCode: 'asc' },
    });
  }

  async findOne(moduleCode: string): Promise<NusModule | null> {
    return this.prisma.nusModule.findUnique({
      where: { moduleCode },
    });
  }
}
