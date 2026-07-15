import { searchNusModules } from './courses-api';
import type {
  NusModuleListItem,
  NusModsSemesterData,
  SemesterKey,
} from '@/shared/types';

const moduleCodePattern = /\b[A-Z]{2,4}\d{4}[A-Z]{0,3}\b/g;
const maxModulePageSize = 50;

export type PrerequisiteGroup = {
  codes: string[];
  relation: 'all of' | 'one of';
};

export function extractModuleCodes(text?: string | null) {
  if (!text) {
    return [];
  }

  return Array.from(new Set(text.match(moduleCodePattern) ?? []));
}

export function getSemesterData(semesterData: unknown): NusModsSemesterData[] {
  return Array.isArray(semesterData) ? semesterData as NusModsSemesterData[] : [];
}

export function parsePrerequisiteGroups(prerequisite?: string | null): PrerequisiteGroup[] {
  if (!prerequisite) {
    return [];
  }

  const normalizedPrerequisite = prerequisite
    .replace(/\bAND\b/g, ' AND ')
    .replace(/\bOR\b/g, ' OR ')
    .replace(/([A-Z])AND(?=must|\()/g, '$1 AND ')
    .replace(/\)OR\(/g, ') OR (')
    .replace(/\s+/g, ' ');
  const segments = normalizedPrerequisite
    .split(/\s+AND\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.flatMap((segment) => {
    const codes = extractModuleCodes(segment);

    if (codes.length === 0) {
      return [];
    }

    return [{
      codes,
      relation: segment.includes('/') || codes.length > 1 ? 'one of' : 'all of',
    }];
  });
}

export function formatDashboardSemesterLabel(semesterKey: SemesterKey) {
  const [, yearText, , semesterText] = semesterKey.split('-');

  return `year ${yearText} semester ${semesterText}`;
}

export function formatCourseDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => (
    parts.find((part) => part.type === type)?.value ?? ''
  );
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');
  const dayPeriod = getPart('dayPeriod').toLowerCase();

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

export async function fetchAllNusModules() {
  const modules: NusModuleListItem[] = [];
  let cursor: string | null = null;

  do {
    const response = await searchNusModules({
      cursor,
      limit: maxModulePageSize,
    });

    modules.push(...response.items);
    cursor = response.nextCursor;
  } while (cursor);

  return modules;
}
