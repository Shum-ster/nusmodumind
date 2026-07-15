export type DegreeRequirementsResponse = {
  faculty: string;
  degree: string;
  matriculationYear: number;
  academicYear: string;
  coreModules: Array<{
    moduleCode: string;
    title: string | null;
    units: number | null;
    notes: string | null;
  }>;
  electiveBuckets: Array<{
    name: string;
    minimumUnits: number | null;
    minimumCourses: number | null;
    moduleCodes: string[];
    rules: string[];
  }>;
  sources: Array<{
    title: string;
    url: string;
  }>;
  generatedAt: string;
  promptVersion: 'degree-requirements-v1';
};
