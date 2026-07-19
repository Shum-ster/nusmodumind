export type CoreRequirementKind =
  | 'CORE'
  | 'COMMON_CURRICULUM'
  | 'INTERNSHIP'
  | 'PROJECT'
  | 'OTHER';

export type ElectiveRequirementKind =
  | 'COMMON_CURRICULUM'
  | 'MAJOR_ELECTIVE'
  | 'INTERNSHIP'
  | 'PROJECT'
  | 'UNRESTRICTED'
  | 'OTHER';

export type CoreRequirement = {
  requirementId: string;
  name: string;
  kind: CoreRequirementKind;
  moduleCodes: string[];
  minimumCourses: number;
  units: number | null;
  notes: string | null;
  allowsDoubleCounting: boolean;
  manualReviewReason: string | null;
};

export type ElectiveBucket = {
  requirementId: string;
  name: string;
  kind: ElectiveRequirementKind;
  minimumUnits: number | null;
  minimumCourses: number | null;
  eligibleModuleCodes: string[];
  eligibleModuleCodePatterns: string[];
  allowsAnyModule: boolean;
  minimumLevel: number | null;
  maximumLevel: number | null;
  excludedModuleCodes: string[];
  allowsDoubleCounting: boolean;
  rules: string[];
  manualReviewReason: string | null;
};

export type DegreeRequirementsResponse = {
  faculty: string;
  degree: string;
  matriculationYear: number;
  academicYear: string;
  coreRequirements: CoreRequirement[];
  electiveBuckets: ElectiveBucket[];
  sources: Array<{
    title: string;
    url: string;
  }>;
  generatedAt: string;
  promptVersion: 'degree-requirements-v2';
};

export type GeneralPromptResponse = {
  output: string;
};
