import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  DegreePlanSnapshotView,
  normalizePlanSnapshot,
} from './DegreePlanSnapshotView';

describe('DegreePlanSnapshotView', () => {
  it('renders current dashboard snapshot plans', () => {
    render(
      <DegreePlanSnapshotView
        snapshot={{
          exemptedModules: [{ code: 'MA1301', credits: 4, title: 'Introductory Mathematics' }],
          generatedAt: '2026-07-27T00:00:00.000Z',
          matriculationYear: 2026,
          selectedModules: [{ code: 'CS1231S', credits: 4, title: 'Discrete Structures' }],
          years: [
            {
              academicYear: '2026/2027',
              label: 'Year 1',
              semesters: [
                {
                  key: 'year-1-semester-1',
                  label: 'Semester 1',
                  modules: [
                    {
                      code: 'CS1010S',
                      credits: 4,
                      title: 'Programming Methodology',
                    },
                  ],
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Year 1')).toBeInTheDocument();
    expect(screen.getByText('CS1010S')).toBeInTheDocument();
    expect(screen.getByText('Programming Methodology')).toBeInTheDocument();
    expect(screen.getByText('Selected modules')).toBeInTheDocument();
    expect(screen.getByText('CS1231S')).toBeInTheDocument();
    expect(screen.getByText('MA1301')).toBeInTheDocument();
  });

  it('renders legacy semester snapshots without exposing raw backend fields', () => {
    render(
      <DegreePlanSnapshotView
        snapshot={{
          semesters: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              userId: '22222222-2222-2222-2222-222222222222',
              acadYear: '2025/2026',
              semesterNumber: 1,
              plannedModules: [
                {
                  moduleCode: 'CS2030S',
                  module: {
                    moduleCode: 'CS2030S',
                    moduleCredit: '4',
                    title: 'Programming Methodology II',
                  },
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Saved semesters')).toBeInTheDocument();
    expect(screen.getByText('AY2025/2026 Semester 1')).toBeInTheDocument();
    expect(screen.getByText('CS2030S')).toBeInTheDocument();
    expect(screen.getByText('Programming Methodology II')).toBeInTheDocument();
    expect(
      screen.queryByText('22222222-2222-2222-2222-222222222222'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('userId')).not.toBeInTheDocument();
  });

  it('shows a clean empty state for unusable snapshots', () => {
    render(<DegreePlanSnapshotView snapshot={{ semesters: [] }} />);

    expect(
      screen.getByText('No rendered degree plan is available for this submission.'),
    ).toBeInTheDocument();
  });

  it('normalizes planned module only legacy snapshots', () => {
    expect(
      normalizePlanSnapshot({
        plannedModules: [
          {
            moduleCode: 'BT1101',
            module: { moduleCredit: '4', title: 'Introduction to Business Analytics' },
          },
        ],
      }),
    ).toMatchObject({
      selectedModules: [
        {
          code: 'BT1101',
          credits: 4,
          title: 'Introduction to Business Analytics',
        },
      ],
    });
  });
});
