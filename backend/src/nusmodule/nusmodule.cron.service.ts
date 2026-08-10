import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import type { NusModsModuleInfo, NusModuleUpsertData } from '../shared/types';
import { ModuleChangeDetectorService } from './module-change-detector.service';
import { ModuleChangeNotificationService } from './module-change-notification.service';
import type { FetchedNusModsModule } from './module-change.types';

@Injectable()
export class NusModulesCronService {
  private readonly logger = new Logger(NusModulesCronService.name);
  private readonly detailFetchConcurrency = 20;
  private readonly databaseBatchSize = 100;

  private readonly NUSMODS_ACAD_YEAR =
    process.env.NUSMODS_ACAD_YEAR ?? '2026-2027';
  private readonly PLANNING_ACAD_YEAR = this.NUSMODS_ACAD_YEAR.replace(
    '-',
    '/',
  );
  private readonly NUSMODS_API_BASE_URL = `https://api.nusmods.com/v2/${this.NUSMODS_ACAD_YEAR}`;
  private readonly NUSMODS_MODULE_INFO_URL = `${this.NUSMODS_API_BASE_URL}/moduleInfo.json`;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly changeDetector: ModuleChangeDetectorService,
    private readonly notificationService: ModuleChangeNotificationService,
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
      const syncDate = new Date().toISOString().slice(0, 10);
      const modules = await this.fetchNusModsModules();

      this.logger.log(
        `Fetched ${modules.length} modules from NUSMods. Starting database upsert...`,
      );

      await this.upsertNusModsModules(modules, syncDate);

      this.logger.log('NUSMods data sync completed successfully.');
      await this.notificationService.dispatchPending();
    } catch (error) {
      this.logger.error(
        'Failed to sync NUSMods data',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  private async fetchNusModsModules(): Promise<FetchedNusModsModule[]> {
    const response = await firstValueFrom(
      this.httpService.get<NusModsModuleInfo[]>(this.NUSMODS_MODULE_INFO_URL),
    );

    return this.fetchNusModsModuleDetails(response.data);
  }

  private async fetchNusModsModuleDetails(
    moduleInfos: NusModsModuleInfo[],
  ): Promise<FetchedNusModsModule[]> {
    const moduleDetails: FetchedNusModsModule[] = [];

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
  ): Promise<FetchedNusModsModule> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NusModsModuleInfo>(
          `${this.NUSMODS_API_BASE_URL}/modules/${encodeURIComponent(
            moduleInfo.moduleCode,
          )}.json`,
        ),
      );

      return {
        moduleInfo: response.data,
        hasDetailedSemesterData: true,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to fetch detailed NUSMods data for ${moduleInfo.moduleCode}. Falling back to moduleInfo entry.`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        moduleInfo,
        hasDetailedSemesterData: false,
      };
    }
  }

  private async upsertNusModsModules(
    modules: FetchedNusModsModule[],
    syncDate: string,
  ) {
    let processedCount = 0;

    for (let i = 0; i < modules.length; i += this.databaseBatchSize) {
      const batch = modules.slice(i, i + this.databaseBatchSize);
      const existingModules = await this.prisma.nusModule.findMany({
        where: {
          moduleCode: {
            in: batch.map(({ moduleInfo }) => moduleInfo.moduleCode),
          },
        },
        select: {
          moduleCode: true,
          title: true,
          moduleCredit: true,
          gradingBasisDescription: true,
          prerequisite: true,
          preclusion: true,
          corequisite: true,
          workload: true,
          semesterData: true,
          attributes: true,
        },
      });
      const existingByModuleCode = new Map(
        existingModules.map((module) => [module.moduleCode, module]),
      );
      const detectedChanges = batch
        .map((module) =>
          this.changeDetector.detect(
            existingByModuleCode.get(module.moduleInfo.moduleCode),
            module,
          ),
        )
        .filter((change) => change !== null);
      const notificationDrafts = await this.notificationService.buildDrafts(
        detectedChanges,
        this.PLANNING_ACAD_YEAR,
        syncDate,
      );
      const rows = batch.map((module) => this.buildBulkUpsertRow(module));
      const upsertQuery = this.buildBulkUpsertQuery(rows);

      await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$executeRaw(upsertQuery);

          if (notificationDrafts.length > 0) {
            await transaction.moduleUpdateNotification.createMany({
              data: notificationDrafts,
              skipDuplicates: true,
            });
          }
        },
        {
          timeout: 30_000,
        },
      );

      processedCount += batch.length;
      this.logger.log(
        `Upserted ${processedCount}/${modules.length} modules...`,
      );
    }
  }

  private buildBulkUpsertQuery(rows: Prisma.Sql[]) {
    return Prisma.sql`
      INSERT INTO "nus_modules" (
        "module_code",
        "source_acad_year",
        "title",
        "description",
        "module_credit",
        "department",
        "faculty",
        "grading_basis_description",
        "prerequisite",
        "preclusion",
        "corequisite",
        "workload",
        "semester_data",
        "attributes"
      )
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("module_code") DO UPDATE SET
        "source_acad_year" = CASE
          WHEN EXCLUDED."semester_data" IS NULL
            THEN "nus_modules"."source_acad_year"
          ELSE EXCLUDED."source_acad_year"
        END,
        "title" = EXCLUDED."title",
        "description" = EXCLUDED."description",
        "module_credit" = EXCLUDED."module_credit",
        "department" = EXCLUDED."department",
        "faculty" = EXCLUDED."faculty",
        "grading_basis_description" = EXCLUDED."grading_basis_description",
        "prerequisite" = EXCLUDED."prerequisite",
        "preclusion" = EXCLUDED."preclusion",
        "corequisite" = EXCLUDED."corequisite",
        "workload" = EXCLUDED."workload",
        "semester_data" = COALESCE(
          EXCLUDED."semester_data",
          "nus_modules"."semester_data"
        ),
        "attributes" = EXCLUDED."attributes",
        "last_updated" = CURRENT_TIMESTAMP
    `;
  }

  private buildBulkUpsertRow(fetched: FetchedNusModsModule) {
    const { moduleInfo } = fetched;
    const moduleData = this.mapNusModsModule(moduleInfo);
    const semesterData = fetched.hasDetailedSemesterData
      ? (moduleInfo.semesterData ?? [])
      : null;

    return Prisma.sql`(
      ${moduleInfo.moduleCode},
      ${this.PLANNING_ACAD_YEAR},
      ${moduleData.title},
      ${moduleData.description},
      ${moduleData.moduleCredit},
      ${moduleData.department},
      ${moduleData.faculty},
      ${moduleData.gradingBasisDescription},
      ${moduleData.prerequisite},
      ${moduleData.preclusion},
      ${moduleData.corequisite},
      ${this.serializeJson(moduleInfo.workload)}::jsonb,
      ${this.serializeJson(semesterData)}::jsonb,
      ${this.serializeJson(moduleInfo.attributes)}::jsonb
    )`;
  }

  private serializeJson(value: Prisma.InputJsonValue | null | undefined) {
    return value == null ? null : JSON.stringify(value);
  }

  private mapNusModsModule(moduleInfo: NusModsModuleInfo): NusModuleUpsertData {
    return {
      sourceAcadYear: this.PLANNING_ACAD_YEAR,
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
