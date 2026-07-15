export type NusModuleListItem = {
  moduleCode: string;
  title: string;
  description?: string | null;
  faculty: string;
  department: string | null;
  moduleCredit: string;
  prerequisite?: string | null;
  semesterData?: unknown;
  workload?: unknown;
  attributes?: unknown;
  gradingBasisDescription: string;
};

export type NusModuleSearchResponse = {
  items: NusModuleListItem[];
  nextCursor: string | null;
};

export type NusModuleDetail = {
  moduleCode: string;
  title: string;
  description: string;
  moduleCredit: string;
  department: string | null;
  faculty: string;
  gradingBasisDescription: string;
  prerequisite: string | null;
  preclusion: string | null;
  corequisite: string | null;
  workload: unknown;
  semesterData: unknown;
  attributes: unknown;
  lastUpdated: string;
};

export type SearchNusModulesQuery = {
  cursor?: string | null;
  department?: string | null;
  faculty?: string | null;
  limit?: number | null;
  moduleCodePrefix?: string | null;
  search?: string | null;
};
