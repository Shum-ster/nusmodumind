import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';

type NusModsModuleInfo = {
  moduleCode: string;
  title: string;
  description?: string | null;
  moduleCredit?: string | null;
  department?: string | null;
  faculty?: string | null;
  gradingBasisDescription?: string | null;
  prerequisite?: string | null;
  preclusion?: string | null;
  corequisite?: string | null;
  workload?: Prisma.InputJsonValue | null;
  semesterData?: Prisma.InputJsonValue | null;
  attributes?: Prisma.InputJsonValue | null;
};

type NusModuleUpsertData = Omit<
  Prisma.NusModuleUncheckedCreateInput,
  'moduleCode' | 'lastUpdated'
>;

@Injectable()
export class NusModulesCronService {
  private readonly logger = new Logger(NusModulesCronService.name);
  private readonly detailFetchConcurrency = 20;

  // Move the Academic Year to an env variable later
  private readonly NUSMODS_ACAD_YEAR =
    process.env.NUSMODS_ACAD_YEAR ?? '2025-2026';
  private readonly NUSMODS_API_BASE_URL = `https://api.nusmods.com/v2/${this.NUSMODS_ACAD_YEAR}`;
  private readonly NUSMODS_MODULE_INFO_URL = `${this.NUSMODS_API_BASE_URL}/moduleInfo.json`;

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
  async handleScheduledSync() {
    await this.syncNusModsData();
  }

  async syncNusModsData() {
    this.logger.log('Initiating NUSMods data sync...');

    try {
      const modules = await this.fetchNusModsModules();

      this.logger.log(
        `Fetched ${modules.length} modules from NUSMods. Starting database upsert...`,
      );

      await this.upsertNusModsModules(modules);

      this.logger.log('NUSMods data sync completed successfully.');
    } catch (error) {
      this.logger.error(
        'Failed to sync NUSMods data',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async fetchNusModsModules(): Promise<NusModsModuleInfo[]> {
    const response = await firstValueFrom(
      this.httpService.get<NusModsModuleInfo[]>(this.NUSMODS_MODULE_INFO_URL),
    );

    return this.fetchNusModsModuleDetails(response.data);
  }

  private async fetchNusModsModuleDetails(
    moduleInfos: NusModsModuleInfo[],
  ): Promise<NusModsModuleInfo[]> {
    const moduleDetails: NusModsModuleInfo[] = [];

    for (
      let index = 0;
      index < moduleInfos.length;
      index += this.detailFetchConcurrency
    ) {
      const moduleInfoChunk = moduleInfos.slice(
        index,
        index + this.detailFetchConcurrency,
      );
      const detailChunk = await Promise.all(
        moduleInfoChunk.map((moduleInfo) =>
          this.fetchNusModsModuleDetail(moduleInfo),
        ),
      );

      moduleDetails.push(...detailChunk);

      this.logger.log(
        `Fetched detailed timetable data for ${Math.min(
          index + moduleInfoChunk.length,
          moduleInfos.length,
        )}/${moduleInfos.length} modules...`,
      );
    }

    return moduleDetails;
  }

  private async fetchNusModsModuleDetail(
    moduleInfo: NusModsModuleInfo,
  ): Promise<NusModsModuleInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NusModsModuleInfo>(
          `${this.NUSMODS_API_BASE_URL}/modules/${encodeURIComponent(
            moduleInfo.moduleCode,
          )}.json`,
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch detailed NUSMods data for ${moduleInfo.moduleCode}. Falling back to moduleInfo entry.`,
        error instanceof Error ? error.stack : undefined,
      );

      return moduleInfo;
    }
  }

  private async upsertNusModsModules(modules: NusModsModuleInfo[]) {
    const batchSize = 100;
    let processedCount = 0;

    for (let i = 0; i < modules.length; i += batchSize) {
      const batch = modules.slice(i, i + batchSize);
      const upsertOperations = batch.map((moduleInfo) =>
        this.buildUpsertOperation(moduleInfo),
      );

      await this.prisma.$transaction(upsertOperations);
      processedCount += batch.length;
      this.logger.log(
        `Upserted ${processedCount}/${modules.length} modules...`,
      );
    }
  }

  private buildUpsertOperation(moduleInfo: NusModsModuleInfo) {
    const moduleData = this.mapNusModsModule(moduleInfo);

    return this.prisma.nusModule.upsert({
      where: { moduleCode: moduleInfo.moduleCode },
      update: moduleData,
      create: {
        moduleCode: moduleInfo.moduleCode,
        ...moduleData,
      },
    });
  }

  private mapNusModsModule(moduleInfo: NusModsModuleInfo): NusModuleUpsertData {
    return {
      title: moduleInfo.title,
      description: moduleInfo.description ?? '',
      moduleCredit: moduleInfo.moduleCredit ?? '',
      department: moduleInfo.department ?? null,
      faculty: moduleInfo.faculty ?? 'Unknown',
      gradingBasisDescription: moduleInfo.gradingBasisDescription ?? 'Unknown',
      prerequisite: moduleInfo.prerequisite ?? null,
      preclusion: moduleInfo.preclusion ?? null,
      corequisite: moduleInfo.corequisite ?? null,
      workload: moduleInfo.workload ?? Prisma.DbNull,
      semesterData: moduleInfo.semesterData ?? [],
      attributes: moduleInfo.attributes ?? Prisma.DbNull,
    };
  }
}
