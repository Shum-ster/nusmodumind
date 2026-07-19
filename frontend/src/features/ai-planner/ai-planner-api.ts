import { apiRequest } from '@/shared/api';
import type {
  DegreeRequirementsResponse,
  RequirementAuditResponse,
} from '@/shared/types';

export function researchDegreeRequirements(token: string) {
  return apiRequest<DegreeRequirementsResponse>(
    '/ai-planner/degree-requirements',
    {
      method: 'POST',
      token,
    },
  );
}

export function auditDegreeRequirements(token: string) {
  return apiRequest<RequirementAuditResponse>(
    '/ai-planner/requirement-audit',
    {
      method: 'POST',
      token,
    },
  );
}
