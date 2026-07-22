import { z } from 'zod';

const moduleCodeSchema = z.string().trim().min(2).max(20);

export const searchNusModulesInputSchema = z
  .object({
    moduleCodes: z.array(moduleCodeSchema).max(50).nullable(),
    moduleCodePrefixes: z.array(moduleCodeSchema).max(10).nullable(),
    searchText: z.string().trim().min(1).max(100).nullable(),
    faculty: z.string().trim().min(1).max(120).nullable(),
    department: z.string().trim().min(1).max(120).nullable(),
    semester: z.number().int().min(1).max(2).nullable(),
    limit: z.number().int().min(1).max(25),
  })
  .strict()
  .refine(
    (input) =>
      Boolean(
        input.moduleCodes?.length ||
        input.moduleCodePrefixes?.length ||
        input.searchText ||
        input.faculty ||
        input.department,
      ),
    { message: 'At least one module search filter is required' },
  );

const requirementMatchSchema = z
  .object({
    moduleCode: moduleCodeSchema,
    matchedRequirementIds: z.array(z.string().min(1)).min(1),
    selectionReason: z.string().min(1).max(800),
    prerequisiteStatus: z.enum(['SATISFIED', 'UNSATISFIED', 'UNCERTAIN']),
    cautions: z.array(z.string().min(1).max(500)),
  })
  .strict();

export const moduleCandidateOutputSchema = z
  .object({
    candidates: z.array(requirementMatchSchema).max(20),
  })
  .strict();

const rankedRecommendationSchema = z
  .object({
    moduleCode: moduleCodeSchema,
    matchedRequirementIds: z.array(z.string().min(1)).min(1),
    rationale: z.string().min(1).max(1200),
    lifestyleFit: z.string().min(1).max(800).nullable(),
    cautions: z.array(z.string().min(1).max(500)),
  })
  .strict();

export const moduleRankingOutputSchema = z
  .object({
    recommendations: z.array(rankedRecommendationSchema).max(5),
  })
  .strict();

export type SearchNusModulesInput = z.infer<typeof searchNusModulesInputSchema>;
