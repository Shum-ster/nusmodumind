import type { CurrentUserPlan, NusModuleDetail } from '@/shared/types';
import { describe, expect, it } from 'vitest';
import { buildCurrentUserTimetable } from './current-user-timetable-adapter';

const semester = {
  id: 'semester-1',
  acadYear: '2026/2027',
  semesterNumber: 1,
  userId: 'user-1',
};

function makeModule(sourceAcadYear: string): NusModuleDetail {
  return {
    moduleCode: 'CS1010S',
    sourceAcadYear,
    title: 'Programming Methodology',
    description: '',
    moduleCredit: '4',
    department: 'Computer Science',
    faculty: 'School of Computing',
    gradingBasisDescription: 'Graded',
    prerequisite: null,
    preclusion: null,
    corequisite: null,
    workload: [],
    semesterData: [
      {
        semester: 1,
        examDate: '2026-11-30T01:00:00.000Z',
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
    attributes: {},
    lastUpdated: '2026-08-10T00:00:00.000Z',
  };
}

function makePlan(sourceAcadYear: string): CurrentUserPlan {
  return {
    semesters: [semester],
    plannedModules: [
      {
        id: 'planned-1',
        semesterId: semester.id,
        userId: semester.userId,
        moduleCode: 'CS1010S',
        status: 'PLANNED',
        expectedGrade: null,
        actualGrade: null,
        selectedLessons: null,
        module: makeModule(sourceAcadYear),
        semester,
      },
    ],
  };
}

describe('buildCurrentUserTimetable', () => {
  it('uses lecture and exam data from the matching academic year', () => {
    const timetable = buildCurrentUserTimetable(
      makePlan('2026/2027'),
      semester.id,
    );

    expect(timetable.modules[0]).toMatchObject({
      examDate: '2026-11-30T01:00:00.000Z',
      isTimetableDataAvailable: true,
    });
    expect(timetable.modules[0].availableLessons).toHaveLength(1);
    expect(timetable.modules[0].selectedLessons).toHaveLength(1);
  });

  it('does not reuse AY26/27 data for another academic year', () => {
    const timetable = buildCurrentUserTimetable(
      makePlan('2025/2026'),
      semester.id,
    );

    expect(timetable.modules[0]).toMatchObject({
      availableLessons: [],
      examDate: null,
      isTimetableDataAvailable: false,
      selectedLessons: [],
    });
  });
});
