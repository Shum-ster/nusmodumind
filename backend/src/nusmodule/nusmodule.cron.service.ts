import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NusModulesCronService {
  private readonly logger = new Logger(NusModulesCronService.name);

  // Move the Academic Year to an env variable later
  private readonly NUSMODS_API_URL = 'https://api.nusmods.com/v2/2025-2026/moduleInfo.json';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  // This runs automatically at midnight every day
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'nusmods-module-sync',
    timeZone: 'Asia/Singapore',
    waitForCompletion: true,
  })
  async syncNusModsData() {
    this.logger.log('Initiating daily NUSMods data sync...');

    try {
      // Fetch data from NUSMods
      const response = await firstValueFrom(
        this.httpService.get(this.NUSMODS_API_URL),
      );
      const modules = response.data;

      this.logger.log(
        `Fetched ${modules.length} modules from NUSMods. Starting database upsert...`,
      );

      // Batch process
      const BATCH_SIZE = 500;
      let processedCount = 0;

      for (let i = 0; i < modules.length; i += BATCH_SIZE) {
        const batch = modules.slice(i, i + BATCH_SIZE);

        const upsertPromises = batch.map((mod) => {
          const creditInt = parseInt(mod.moduleCredit, 10);
          const parsedCredit = isNaN(creditInt) ? 0 : creditInt;

          // Map NUSMods data to your Prisma schema
          const moduleData = {
            title: mod.title,
            description: mod.description ?? null,
            moduleCredit: parsedCredit,
            department: mod.department ?? 'Unknown',
            faculty: mod.faculty ?? 'Unknown',
            prerequisite: mod.prerequisite ?? null,
            preclusion: mod.preclusion ?? null,
            // NUSMods returns workload as an array or string, stringify for db
            workload: mod.workload ? JSON.stringify(mod.workload) : null,
            semesterData: mod.semesterData ?? null,
          };

          return this.prisma.nusModule.upsert({
            where: { moduleCode: mod.moduleCode },
            update: moduleData,
            create: {
              moduleCode: mod.moduleCode,
              ...moduleData,
            },
          });
        });

        // Execute the batch transaction
        await this.prisma.$transaction(upsertPromises);
        processedCount += batch.length;
        this.logger.log(`Upserted ${processedCount}/${modules.length} modules...`);
      }

      this.logger.log('NUSMods data sync completed successfully.');
    } catch (error) {
      this.logger.error('Failed to sync NUSMods data', error.stack);
    }
  }
}
