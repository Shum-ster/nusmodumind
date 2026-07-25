import { ModuleChangeDetectorService } from './module-change-detector.service';
import type {
  FetchedNusModsModule,
  NusModuleChangeSnapshot,
} from './module-change.types';

describe('ModuleChangeDetectorService', () => {
  const service = new ModuleChangeDetectorService();
  const lesson = {
    classNo: '1',
    day: 'Monday',
    endTime: '1000',
    lessonType: 'Lecture',
    startTime: '0800',
    venue: 'LT19',
    weeks: [1, 2, 3],
  };
  const existing = buildExistingModule({
    semesterData: [
      {
        semester: 1,
        examDate: '2026-11-30T09:00:00.000Z',
        examDuration: 120,
        timetable: [lesson],
      },
    ],
  });
  const fetched = buildFetchedModule();

  it('does not report newly inserted modules as changes', () => {
    expect(service.detect(undefined, fetched)).toBeNull();
  });

  it('ignores timetable ordering and non-student-facing lesson fields', () => {
    const secondLesson = {
      ...lesson,
      classNo: '2',
      day: 'Tuesday',
    };
    const previous = buildExistingModule({
      semesterData: [
        {
          semester: 1,
          examDate: '2026-11-30T09:00:00.000Z',
          examDuration: 120,
          timetable: [
            { ...lesson, size: 300 },
            { ...secondLesson, size: 40 },
          ],
        },
      ],
    });
    const next = buildFetchedModule({
      semesterData: [
        {
          semester: 1,
          examDate: '2026-11-30T09:00:00.000Z',
          examDuration: 120,
          timetable: [
            { ...secondLesson, size: 45 },
            { ...lesson, size: 350 },
          ],
        },
      ],
    });

    expect(service.detect(previous, next)).toBeNull();
  });

  it('reports semester-specific time, venue, teaching-week and exam changes', () => {
    const next = buildFetchedModule({
      semesterData: [
        {
          semester: 1,
          examDate: '2026-12-01T09:00:00.000Z',
          examDuration: 180,
          timetable: [
            {
              ...lesson,
              day: 'Tuesday',
              startTime: '1000',
              endTime: '1200',
              venue: 'COM1-0208',
              weeks: [2, 3, 4],
            },
          ],
        },
      ],
    });

    const result = service.detect(existing, next);
    const changes = result?.semesterChanges[1] ?? [];

    expect(result?.globalChanges).toEqual([]);
    expect(
      changes.some(
        (change) =>
          change.category === 'exam' &&
          change.summary.includes('Exam date changed'),
      ),
    ).toBe(true);
    expect(
      changes.some(
        (change) =>
          change.category === 'exam' &&
          change.summary.includes('Exam duration changed'),
      ),
    ).toBe(true);
    expect(
      changes.some(
        (change) =>
          change.category === 'schedule' &&
          change.summary.includes(
            'Lecture 1 changed from Monday 08:00-10:00 at LT19',
          ),
      ),
    ).toBe(true);
  });

  it('reports essential top-level planning changes but ignores descriptions', () => {
    const next = buildFetchedModule({
      description: 'A rewritten description only students may read.',
      moduleCredit: '5',
      gradingBasisDescription: 'Satisfactory/Unsatisfactory',
      prerequisite: 'CS1010S',
      corequisite: 'CS1231S',
      preclusion: 'CS2030',
      workload: [2, 1, 2, 4, 3],
      attributes: { mpes1: false },
    });

    const result = service.detect(existing, next);
    const summaries =
      result?.globalChanges.map((change) => change.summary) ?? [];

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Module units changed'),
        expect.stringContaining('Grading basis changed'),
        expect.stringContaining('Prerequisites changed'),
        expect.stringContaining('Corequisites changed'),
        expect.stringContaining('Preclusions changed'),
        expect.stringContaining('Estimated workload changed'),
        expect.stringContaining('availability flags changed'),
      ]),
    );
    expect(summaries.join(' ')).not.toContain('description');
  });

  it('skips semester comparisons when the detail endpoint failed', () => {
    const next = buildFetchedModule(
      {
        semesterData: [],
      },
      false,
    );

    expect(service.detect(existing, next)).toBeNull();
  });

  it('reports when a module is removed from a semester', () => {
    const next = buildFetchedModule({
      semesterData: [],
    });

    expect(service.detect(existing, next)?.semesterChanges[1]).toContainEqual({
      category: 'availability',
      summary: 'The module is no longer listed for Semester 1.',
    });
  });
});

function buildExistingModule(
  overrides: Partial<NusModuleChangeSnapshot> = {},
): NusModuleChangeSnapshot {
  return {
    moduleCode: 'CS2030S',
    title: 'Programming Methodology II',
    moduleCredit: '4',
    gradingBasisDescription: 'Graded',
    prerequisite: null,
    preclusion: null,
    corequisite: null,
    workload: [2, 1, 2, 3, 2],
    semesterData: [
      {
        semester: 1,
        examDate: '2026-11-30T09:00:00.000Z',
        examDuration: 120,
        timetable: [],
      },
    ],
    attributes: { mpes1: true },
    ...overrides,
  };
}

function buildFetchedModule(
  overrides: Partial<FetchedNusModsModule['moduleInfo']> = {},
  hasDetailedSemesterData = true,
): FetchedNusModsModule {
  return {
    hasDetailedSemesterData,
    moduleInfo: {
      moduleCode: 'CS2030S',
      title: 'Programming Methodology II',
      description: 'Object-oriented programming',
      moduleCredit: '4',
      department: 'Computer Science',
      faculty: 'School of Computing',
      gradingBasisDescription: 'Graded',
      prerequisite: null,
      preclusion: null,
      corequisite: null,
      workload: [2, 1, 2, 3, 2],
      semesterData: [
        {
          semester: 1,
          examDate: '2026-11-30T09:00:00.000Z',
          examDuration: 120,
          timetable: [
            {
              classNo: '1',
              day: 'Monday',
              endTime: '1000',
              lessonType: 'Lecture',
              startTime: '0800',
              venue: 'LT19',
              weeks: [1, 2, 3],
            },
          ],
        },
      ],
      attributes: { mpes1: true },
      ...overrides,
    },
  };
}
