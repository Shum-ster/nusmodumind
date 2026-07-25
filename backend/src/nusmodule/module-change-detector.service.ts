import { Injectable } from '@nestjs/common';
import type {
  DetectedModuleChanges,
  FetchedNusModsModule,
  ModuleChange,
  NusModuleChangeSnapshot,
} from './module-change.types';

type SemesterSnapshot = {
  examDate: string | null;
  examDuration: number | null;
  lessons: LessonSlot[];
};

type LessonSlot = {
  classNo: string;
  day: string;
  endTime: string;
  lessonType: string;
  startTime: string;
  venue: string;
  weeks: string;
};

@Injectable()
export class ModuleChangeDetectorService {
  detect(
    existing: NusModuleChangeSnapshot | undefined,
    fetched: FetchedNusModsModule,
  ): DetectedModuleChanges | null {
    if (!existing) {
      return null;
    }

    const globalChanges = detectGlobalChanges(existing, fetched.moduleInfo);
    const semesterChanges = fetched.hasDetailedSemesterData
      ? detectSemesterChanges(
          existing.semesterData,
          fetched.moduleInfo.semesterData,
        )
      : {};

    if (
      globalChanges.length === 0 &&
      Object.values(semesterChanges).every((changes) => changes.length === 0)
    ) {
      return null;
    }

    return {
      moduleCode: fetched.moduleInfo.moduleCode,
      moduleTitle: fetched.moduleInfo.title,
      globalChanges,
      semesterChanges,
    };
  }
}

function detectGlobalChanges(
  existing: NusModuleChangeSnapshot,
  incoming: FetchedNusModsModule['moduleInfo'],
) {
  const changes: ModuleChange[] = [];

  addValueChange(
    changes,
    'module',
    'Module title',
    existing.title,
    incoming.title,
  );
  addValueChange(
    changes,
    'module',
    'Module units',
    existing.moduleCredit,
    incoming.moduleCredit ?? '',
  );
  addValueChange(
    changes,
    'module',
    'Grading basis',
    existing.gradingBasisDescription,
    incoming.gradingBasisDescription ?? 'Unknown',
  );
  addValueChange(
    changes,
    'requirements',
    'Prerequisites',
    existing.prerequisite,
    incoming.prerequisite ?? null,
  );
  addValueChange(
    changes,
    'requirements',
    'Corequisites',
    existing.corequisite,
    incoming.corequisite ?? null,
  );
  addValueChange(
    changes,
    'requirements',
    'Preclusions',
    existing.preclusion,
    incoming.preclusion ?? null,
  );

  if (!jsonEquals(existing.workload, incoming.workload ?? null)) {
    changes.push({
      category: 'workload',
      summary: `Estimated workload changed from ${formatWorkload(existing.workload)} to ${formatWorkload(incoming.workload)}.`,
    });
  }

  if (!jsonEquals(existing.attributes, incoming.attributes ?? null)) {
    changes.push({
      category: 'attributes',
      summary:
        'Module attributes or special programme availability flags changed.',
    });
  }

  return changes;
}

function detectSemesterChanges(existingValue: unknown, incomingValue: unknown) {
  const existingSemesters = parseSemesters(existingValue);
  const incomingSemesters = parseSemesters(incomingValue);
  const semesterNumbers = new Set([
    ...existingSemesters.keys(),
    ...incomingSemesters.keys(),
  ]);
  const changes: Record<number, ModuleChange[]> = {};

  Array.from(semesterNumbers)
    .sort((left, right) => left - right)
    .forEach((semesterNumber) => {
      const existing = existingSemesters.get(semesterNumber);
      const incoming = incomingSemesters.get(semesterNumber);
      const semesterChanges: ModuleChange[] = [];

      if (existing && !incoming) {
        semesterChanges.push({
          category: 'availability',
          summary: `The module is no longer listed for Semester ${semesterNumber}.`,
        });
      } else if (!existing && incoming) {
        semesterChanges.push({
          category: 'availability',
          summary: `The module is now listed for Semester ${semesterNumber}.`,
        });
      } else if (existing && incoming) {
        semesterChanges.push(
          ...detectExamChanges(existing, incoming),
          ...detectTimetableChanges(existing.lessons, incoming.lessons),
        );
      }

      if (semesterChanges.length > 0) {
        changes[semesterNumber] = semesterChanges;
      }
    });

  return changes;
}

function detectExamChanges(
  existing: SemesterSnapshot,
  incoming: SemesterSnapshot,
) {
  const changes: ModuleChange[] = [];

  if (existing.examDate !== incoming.examDate) {
    changes.push({
      category: 'exam',
      summary: `Exam date changed from ${formatExamDate(existing.examDate)} to ${formatExamDate(incoming.examDate)}.`,
    });
  }

  if (existing.examDuration !== incoming.examDuration) {
    changes.push({
      category: 'exam',
      summary: `Exam duration changed from ${formatDuration(existing.examDuration)} to ${formatDuration(incoming.examDuration)}.`,
    });
  }

  return changes;
}

function detectTimetableChanges(
  existingLessons: LessonSlot[],
  incomingLessons: LessonSlot[],
) {
  const existingBySignature = new Map(
    existingLessons.map((lesson) => [lessonSignature(lesson), lesson]),
  );
  const incomingBySignature = new Map(
    incomingLessons.map((lesson) => [lessonSignature(lesson), lesson]),
  );
  const removed = existingLessons.filter(
    (lesson) => !incomingBySignature.has(lessonSignature(lesson)),
  );
  const added = incomingLessons.filter(
    (lesson) => !existingBySignature.has(lessonSignature(lesson)),
  );

  if (removed.length === 0 && added.length === 0) {
    return [];
  }

  const changes: ModuleChange[] = [];
  const remainingRemoved = new Set(removed);
  const remainingAdded = new Set(added);
  const identities = new Set([
    ...removed.map(lessonIdentity),
    ...added.map(lessonIdentity),
  ]);

  identities.forEach((identity) => {
    const oldMatches = removed.filter(
      (lesson) => lessonIdentity(lesson) === identity,
    );
    const newMatches = added.filter(
      (lesson) => lessonIdentity(lesson) === identity,
    );

    if (oldMatches.length === 1 && newMatches.length === 1) {
      const previousLesson = oldMatches[0];
      const nextLesson = newMatches[0];
      remainingRemoved.delete(previousLesson);
      remainingAdded.delete(nextLesson);
      changes.push({
        category: 'schedule',
        summary: `${lessonLabel(previousLesson)} changed from ${formatLessonDetails(previousLesson)} to ${formatLessonDetails(nextLesson)}.`,
      });
    }
  });

  changes.push(
    ...summarizeLessonSet('added', Array.from(remainingAdded)),
    ...summarizeLessonSet('removed', Array.from(remainingRemoved)),
  );

  return changes;
}

function summarizeLessonSet(
  action: 'added' | 'removed',
  lessons: LessonSlot[],
) {
  const lessonsByType = new Map<string, LessonSlot[]>();

  lessons.forEach((lesson) => {
    const current = lessonsByType.get(lesson.lessonType) ?? [];
    current.push(lesson);
    lessonsByType.set(lesson.lessonType, current);
  });

  return Array.from(lessonsByType.entries()).map(
    ([lessonType, lessons]): ModuleChange => ({
      category: 'schedule',
      summary: `${lessonType} slots ${action}: ${formatLessonList(lessons)}.`,
    }),
  );
}

function parseSemesters(value: unknown) {
  const semesters = new Map<number, SemesterSnapshot>();

  if (!Array.isArray(value)) {
    return semesters;
  }

  value.forEach((entry) => {
    if (!isRecord(entry)) {
      return;
    }

    const semesterNumber = Number(entry.semester);
    if (!Number.isInteger(semesterNumber)) {
      return;
    }

    semesters.set(semesterNumber, {
      examDate: typeof entry.examDate === 'string' ? entry.examDate : null,
      examDuration:
        typeof entry.examDuration === 'number' ? entry.examDuration : null,
      lessons: parseLessons(entry.timetable),
    });
  });

  return semesters;
}

function parseLessons(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry): LessonSlot | null => {
      if (!isRecord(entry)) {
        return null;
      }

      const lessonType = toString(entry.lessonType);
      const classNo = toString(entry.classNo);
      const day = toString(entry.day);
      const startTime = toString(entry.startTime);
      const endTime = toString(entry.endTime);

      if (!lessonType || !classNo || !day || !startTime || !endTime) {
        return null;
      }

      return {
        lessonType,
        classNo,
        day,
        startTime,
        endTime,
        venue: toString(entry.venue) || 'TBA',
        weeks: normalizeWeeks(entry.weeks),
      };
    })
    .filter((lesson): lesson is LessonSlot => lesson !== null)
    .sort((left, right) =>
      lessonSignature(left).localeCompare(lessonSignature(right)),
    );
}

function addValueChange(
  changes: ModuleChange[],
  category: ModuleChange['category'],
  label: string,
  previousValue: unknown,
  nextValue: unknown,
) {
  if (normalizeText(previousValue) === normalizeText(nextValue)) {
    return;
  }

  changes.push({
    category,
    summary: `${label} changed from ${formatText(previousValue)} to ${formatText(nextValue)}.`,
  });
}

function lessonSignature(lesson: LessonSlot) {
  return JSON.stringify(lesson);
}

function lessonIdentity(lesson: LessonSlot) {
  return `${lesson.lessonType}\u0000${lesson.classNo}`;
}

function lessonLabel(lesson: LessonSlot) {
  return `${lesson.lessonType} ${lesson.classNo}`;
}

function formatLessonDetails(lesson: LessonSlot) {
  return `${lesson.day} ${formatTime(lesson.startTime)}-${formatTime(lesson.endTime)} at ${lesson.venue}${lesson.weeks ? ` (${lesson.weeks})` : ''}`;
}

function formatLessonList(lessons: LessonSlot[]) {
  const visibleLessons = lessons.slice(0, 2).map((lesson) => {
    return `${lessonLabel(lesson)}, ${formatLessonDetails(lesson)}`;
  });
  const remainingCount = lessons.length - visibleLessons.length;

  return remainingCount > 0
    ? `${visibleLessons.join('; ')}; and ${remainingCount} more`
    : visibleLessons.join('; ');
}

function normalizeWeeks(value: unknown) {
  if (!Array.isArray(value)) {
    if (value == null) {
      return '';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return `weeks ${String(value)}`;
    }

    return `weeks ${stableJson(value)}`;
  }

  const weeks = value
    .map(Number)
    .filter(Number.isInteger)
    .sort((left, right) => left - right);

  if (weeks.length === 0) {
    return '';
  }

  const ranges: string[] = [];
  let rangeStart = weeks[0];
  let previousWeek = weeks[0];

  for (let index = 1; index <= weeks.length; index += 1) {
    const currentWeek = weeks[index];

    if (currentWeek === previousWeek + 1) {
      previousWeek = currentWeek;
      continue;
    }

    ranges.push(
      rangeStart === previousWeek
        ? String(rangeStart)
        : `${rangeStart}-${previousWeek}`,
    );
    rangeStart = currentWeek;
    previousWeek = currentWeek;
  }

  return `weeks ${ranges.join(', ')}`;
}

function formatTime(value: string) {
  return /^\d{4}$/.test(value)
    ? `${value.slice(0, 2)}:${value.slice(2)}`
    : value;
}

function formatExamDate(value: string | null) {
  if (!value) {
    return 'not scheduled';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore',
  }).format(date);
}

function formatDuration(value: number | null) {
  return value === null ? 'not specified' : `${value} minutes`;
}

function formatWorkload(value: unknown) {
  if (
    !Array.isArray(value) ||
    !value.every((part) => typeof part === 'number')
  ) {
    return value == null ? 'not specified' : formatText(value);
  }

  const total = value.reduce<number>((sum, part) => sum + part, 0);
  return `${value.join('-')} hours (${total} hours/week)`;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : (value ?? null);
}

function formatText(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '"not specified"';
  }

  const text = typeof value === 'string' ? value : stableJson(value);
  const shortened = text.length > 120 ? `${text.slice(0, 117)}...` : text;
  return `"${shortened}"`;
}

function jsonEquals(left: unknown, right: unknown) {
  return stableJson(left ?? null) === stableJson(right ?? null);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  if (isRecord(value)) {
    const properties = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`);
    return `{${properties.join(',')}}`;
  }

  return JSON.stringify(value) ?? String(value);
}

function toString(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
