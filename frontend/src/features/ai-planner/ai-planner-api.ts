import { apiRequest } from '@/shared/api';
import type { DegreeRequirementsResponse } from '@/shared/types';

export function researchDegreeRequirements(token: string) {
  return apiRequest<DegreeRequirementsResponse>(
    '/ai-planner/degree-requirements',
    {
      method: 'POST',
      token,
    },
  );
}
