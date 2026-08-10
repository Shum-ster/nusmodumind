import {
  buildPlanSemesterOptions,
  getEffectiveMatriculationYear,
  getSemesterKeyFromRecord,
} from './academic-year';
import { describe, expect, it } from 'vitest';

describe('academic year mapping', () => {
  it('keeps a sparse saved Year 2 semester in Year 2', () => {
    const savedSemester = {
      id: 'semester-2-1',
      acadYear: '2025/2026',
      semesterNumber: 1,
      userId: 'user-1',
    };

    const options = buildPlanSemesterOptions([savedSemester], 2024);

    expect(options).toHaveLength(8);
    expect(options[0]).toMatchObject({
      acadYear: '2024/2025',
      id: null,
      semester: 1,
      year: 1,
    });
    expect(options[2]).toMatchObject({
      acadYear: '2025/2026',
      id: savedSemester.id,
      semester: 1,
      year: 2,
    });
  });

  it('preserves an absolute academic year when matriculation year changes', () => {
    const savedSemester = {
      id: 'semester-2-1',
      acadYear: '2025/2026',
      semesterNumber: 1,
      userId: 'user-1',
    };

    expect(getSemesterKeyFromRecord(savedSemester, 2024)).toBe(
      'year-2-semester-1',
    );
    expect(getSemesterKeyFromRecord(savedSemester, 2025)).toBe(
      'year-1-semester-1',
    );
  });

  it('uses graduation year and then the default only as fallbacks', () => {
    expect(
      getEffectiveMatriculationYear({
        graduationYear: 2030,
        matriculationYear: 2025,
      }),
    ).toBe(2025);
    expect(
      getEffectiveMatriculationYear({
        graduationYear: 2030,
        matriculationYear: null,
      }),
    ).toBe(2026);
    expect(getEffectiveMatriculationYear(null)).toBe(2026);
  });
});
