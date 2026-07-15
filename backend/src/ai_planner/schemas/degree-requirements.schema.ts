import { z } from 'zod';

const coreModuleRequirementSchema = z
  .object({
    moduleCode: z.string().min(1),
    title: z.string().min(1).nullable(),
    units: z.number().nonnegative().nullable(),
    notes: z.string().min(1).nullable(),
  })
  .strict();

const electiveBucketSchema = z
  .object({
    name: z.string().min(1),
    minimumUnits: z.number().nonnegative().nullable(),
    minimumCourses: z.number().int().nonnegative().nullable(),
    moduleCodes: z.array(z.string().min(1)),
    rules: z.array(z.string().min(1)),
  })
  .strict();

export const degreeRequirementsModelOutputSchema = z
  .object({
    coreModules: z.array(coreModuleRequirementSchema),
    electiveBuckets: z.array(electiveBucketSchema),
  })
  .strict();

export type DegreeRequirementsModelOutput = z.infer<
  typeof degreeRequirementsModelOutputSchema
>;
