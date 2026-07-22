import { z } from 'zod';

const coreRequirementKindSchema = z.enum([
  'CORE',
  'COMMON_CURRICULUM',
  'INTERNSHIP',
  'PROJECT',
  'OTHER',
]);

const electiveRequirementKindSchema = z.enum([
  'COMMON_CURRICULUM',
  'MAJOR_ELECTIVE',
  'INTERNSHIP',
  'PROJECT',
  'UNRESTRICTED',
  'OTHER',
]);

const coreRequirementSchema = z
  .object({
    requirementId: z.string().min(1),
    name: z.string().min(1),
    kind: coreRequirementKindSchema,
    moduleCodes: z.array(z.string().min(1)).min(1),
    minimumCourses: z.number().int().positive(),
    units: z.number().nonnegative().nullable(),
    notes: z.string().min(1).nullable(),
    allowsDoubleCounting: z.boolean(),
    manualReviewReason: z.string().min(1).nullable(),
  })
  .strict();

const electiveBucketSchema = z
  .object({
    requirementId: z.string().min(1),
    name: z.string().min(1),
    kind: electiveRequirementKindSchema,
    minimumUnits: z.number().nonnegative().nullable(),
    minimumCourses: z.number().int().nonnegative().nullable(),
    eligibleModuleCodes: z.array(z.string().min(1)),
    eligibleModuleCodePatterns: z.array(z.string().min(1)),
    allowsAnyModule: z.boolean(),
    minimumLevel: z.number().int().nonnegative().nullable(),
    maximumLevel: z.number().int().nonnegative().nullable(),
    excludedModuleCodes: z.array(z.string().min(1)),
    allowsDoubleCounting: z.boolean(),
    rules: z.array(z.string().min(1)),
    manualReviewReason: z.string().min(1).nullable(),
  })
  .strict();

export const degreeRequirementsModelOutputSchema = z
  .object({
    coreRequirements: z.array(coreRequirementSchema),
    electiveBuckets: z.array(electiveBucketSchema),
  })
  .strict();

export const degreeRequirementsResponseSchema = z
  .object({
    faculty: z.string().min(1),
    degree: z.string().min(1),
    matriculationYear: z.number().int(),
    academicYear: z.string().min(1),
    coreRequirements: z.array(coreRequirementSchema),
    electiveBuckets: z.array(electiveBucketSchema),
    sources: z
      .array(
        z
          .object({
            title: z.string().min(1),
            url: z.string().url(),
          })
          .strict(),
      )
      .min(1),
    generatedAt: z.string().datetime(),
    promptVersion: z.literal('degree-requirements-v2'),
  })
  .strict();

export type DegreeRequirementsModelOutput = z.infer<
  typeof degreeRequirementsModelOutputSchema
>;
