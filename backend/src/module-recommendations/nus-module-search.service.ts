import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CompactNusModule } from './module-recommendation.types';
import type { SearchNusModulesInput } from './module-recommendation.schemas';

const databaseResultLimit = 100;
const descriptionLimit = 500;
const attributeLimit = 10;

@Injectable()
export class NusModuleSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(input: SearchNusModulesInput): Promise<CompactNusModule[]> {
    const selectors: Prisma.NusModuleWhereInput[] = [];
    const normalizedModuleCodes = input.moduleCodes?.map((moduleCode) =>
      moduleCode.toUpperCase(),
    );

    if (normalizedModuleCodes?.length) {
      selectors.push({ moduleCode: { in: normalizedModuleCodes } });
    }

    for (const prefix of input.moduleCodePrefixes ?? []) {
      selectors.push({
        moduleCode: { startsWith: prefix.toUpperCase(), mode: 'insensitive' },
      });
    }

    if (input.searchText) {
      selectors.push(
        { moduleCode: { contains: input.searchText, mode: 'insensitive' } },
        { title: { contains: input.searchText, mode: 'insensitive' } },
        { description: { contains: input.searchText, mode: 'insensitive' } },
      );
    }

    const modules = await this.prisma.nusModule.findMany({
      where: {
        ...(selectors.length ? { OR: selectors } : {}),
        ...(input.faculty
          ? { faculty: { contains: input.faculty, mode: 'insensitive' } }
          : {}),
        ...(input.department
          ? {
              department: {
                contains: input.department,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: { moduleCode: 'asc' },
      take: databaseResultLimit,
      select: {
        moduleCode: true,
        title: true,
        description: true,
        moduleCredit: true,
        faculty: true,
        department: true,
        prerequisite: true,
        preclusion: true,
        corequisite: true,
        workload: true,
        semesterData: true,
        gradingBasisDescription: true,
        attributes: true,
      },
    });

    return modules
      .map(compactNusModule)
      .filter(
        (module) =>
          input.semester === null ||
          module.availableSemesters.includes(input.semester),
      )
      .slice(0, input.limit);
  }
}

export function compactNusModule(module: {
  moduleCode: string;
  title: string;
  description: string | null;
  moduleCredit: string;
  faculty: string;
  department: string | null;
  prerequisite: string | null;
  preclusion: string | null;
  corequisite: string | null;
  workload: Prisma.JsonValue | null;
  semesterData: Prisma.JsonValue | null;
  gradingBasisDescription: string | null;
  attributes: Prisma.JsonValue | null;
}): CompactNusModule {
  return {
    moduleCode: module.moduleCode.toUpperCase(),
    title: module.title,
    description: truncateText(module.description, descriptionLimit),
    moduleCredit: parseNullableNumber(module.moduleCredit),
    faculty: module.faculty,
    department: module.department,
    prerequisite: module.prerequisite,
    preclusion: module.preclusion,
    corequisite: module.corequisite,
    workloadHours: sumWorkload(module.workload),
    availableSemesters: extractAvailableSemesters(module.semesterData),
    gradingBasisDescription: module.gradingBasisDescription,
    attributes: compactAttributes(module.attributes),
  };
}

function extractAvailableSemesters(semesterData: Prisma.JsonValue | null) {
  if (!Array.isArray(semesterData)) {
    return [];
  }

  return Array.from(
    new Set(
      semesterData
        .map((entry) =>
          isJsonObject(entry) ? Number(entry.semester) : Number.NaN,
        )
        .filter((semester) => Number.isInteger(semester)),
    ),
  ).sort((left, right) => left - right);
}

function sumWorkload(workload: Prisma.JsonValue | null) {
  if (!Array.isArray(workload)) {
    return null;
  }

  const values = workload
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return values.length
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

function compactAttributes(attributes: Prisma.JsonValue | null) {
  if (!isJsonObject(attributes)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes)
      .filter((entry): entry is [string, boolean | number | string] =>
        ['boolean', 'number', 'string'].includes(typeof entry[1]),
      )
      .slice(0, attributeLimit),
  );
}

function isJsonObject(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseNullableNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function truncateText(value: string | null, limit: number) {
  if (!value || value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 3)}...`;
}
