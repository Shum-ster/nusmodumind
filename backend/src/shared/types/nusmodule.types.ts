import type { Prisma } from '@prisma/client';

export type FindAllModulesOptions = {
  cursor?: string;
  department?: string;
  faculty?: string;
  limit?: number;
  moduleCodePrefix?: string;
  search?: string;
};

export type NusModsModuleInfo = {
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

export type NusModuleUpsertData = Omit<
  Prisma.NusModuleUncheckedCreateInput,
  'moduleCode' | 'lastUpdated'
>;
