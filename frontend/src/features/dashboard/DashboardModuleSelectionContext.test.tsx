import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DashboardModuleSelectionProvider,
  useDashboardModuleSelection,
} from './DashboardModuleSelectionContext';
import {
  createPlannedModule,
  createSemester,
  getCurrentUserPlan,
  updatePlannedModule,
} from '@/features/planner';

vi.mock('@/features/auth/lib/token-storage', () => ({
  getToken: () => 'token',
}));

vi.mock('@/features/user', () => ({
  useUserProfile: () => ({
    profile: { graduationYear: 2030, matriculationYear: 2026 },
  }),
}));

vi.mock('@/features/planner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/planner')>();

  return {
    ...actual,
    createPlannedModule: vi.fn(),
    createSemester: vi.fn(),
    deletePlannedModule: vi.fn(),
    getCurrentUserPlan: vi.fn(),
    updatePlannedModule: vi.fn(),
  };
});

const emptyPlan = { plannedModules: [], semesters: [] };
const dashboardModule = {
  code: 'CS1010S',
  credits: 4,
  estimatedWorkload: 10,
  faculty: 'School of Computing',
  sourceAcadYear: '2026/2027',
  title: 'Programming Methodology',
};
const semester = {
  acadYear: '2026/2027',
  id: 'semester-1',
  semesterNumber: 1,
  userId: 'user-1',
};
const secondSemester = {
  ...semester,
  id: 'semester-2',
  semesterNumber: 2,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function ContextProbe() {
  const context = useDashboardModuleSelection();
  const plannedCount = context.semesterModules['year-1-semester-1'].length;
  const secondSemesterPlannedCount =
    context.semesterModules['year-1-semester-2'].length;

  return (
    <>
      <button
        type="button"
        onClick={() =>
          context.moveModuleToSemester(
            'year-1-semester-1',
            dashboardModule.code,
            dashboardModule,
          )
        }
      >
        Place module in semester 1
      </button>
      <button
        type="button"
        onClick={() =>
          context.moveModuleToSemester(
            'year-1-semester-2',
            dashboardModule.code,
            dashboardModule,
          )
        }
      >
        Place module in semester 2
      </button>
      <button
        type="button"
        onClick={() => {
          void context
            .waitForPendingPlanWrites()
            .then(() => document.body.setAttribute('data-write-state', 'done'))
            .catch(() =>
              document.body.setAttribute('data-write-state', 'failed'),
            );
        }}
      >
        Wait for writes
      </button>
      <span data-testid="planned-count">{plannedCount}</span>
      <span data-testid="second-semester-planned-count">
        {secondSemesterPlannedCount}
      </span>
      <span>{context.planSaveError}</span>
    </>
  );
}

describe('Dashboard plan persistence', () => {
  beforeEach(() => {
    document.body.removeAttribute('data-write-state');
    vi.mocked(getCurrentUserPlan).mockReset().mockResolvedValue(emptyPlan);
    vi.mocked(createSemester).mockReset();
    vi.mocked(createPlannedModule).mockReset();
    vi.mocked(updatePlannedModule).mockReset();
  });

  it('keeps Timetable-facing reads behind pending placement writes', async () => {
    const semesterWrite = deferred<typeof semester>();
    const plannedModuleWrite =
      deferred<Awaited<ReturnType<typeof createPlannedModule>>>();
    vi.mocked(createSemester).mockReturnValue(semesterWrite.promise);
    vi.mocked(createPlannedModule).mockReturnValue(plannedModuleWrite.promise);

    render(
      <DashboardModuleSelectionProvider>
        <ContextProbe />
      </DashboardModuleSelectionProvider>,
    );
    await waitFor(() => expect(getCurrentUserPlan).toHaveBeenCalledOnce());

    fireEvent.click(
      screen.getByRole('button', { name: 'Place module in semester 1' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wait for writes' }));
    expect(document.body).not.toHaveAttribute('data-write-state');

    await act(async () => semesterWrite.resolve(semester));
    await waitFor(() => expect(createPlannedModule).toHaveBeenCalledOnce());

    await act(async () =>
      plannedModuleWrite.resolve({ id: 'planned-1' } as Awaited<
        ReturnType<typeof createPlannedModule>
      >),
    );
    await waitFor(() =>
      expect(document.body).toHaveAttribute('data-write-state', 'done'),
    );
  });

  it('serializes rapid placements so the newest destination wins', async () => {
    const firstSemesterWrite = deferred<typeof semester>();
    const plannedModuleWrite =
      deferred<Awaited<ReturnType<typeof createPlannedModule>>>();
    vi.mocked(createSemester)
      .mockReturnValueOnce(firstSemesterWrite.promise)
      .mockResolvedValueOnce(secondSemester);
    vi.mocked(createPlannedModule).mockReturnValue(plannedModuleWrite.promise);
    vi.mocked(updatePlannedModule).mockResolvedValue({
      id: 'planned-1',
    } as Awaited<ReturnType<typeof updatePlannedModule>>);

    render(
      <DashboardModuleSelectionProvider>
        <ContextProbe />
      </DashboardModuleSelectionProvider>,
    );
    await waitFor(() => expect(getCurrentUserPlan).toHaveBeenCalledOnce());

    fireEvent.click(
      screen.getByRole('button', { name: 'Place module in semester 1' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Place module in semester 2' }),
    );

    await waitFor(() => expect(createSemester).toHaveBeenCalledOnce());
    expect(screen.getByTestId('planned-count')).toHaveTextContent('0');
    expect(
      screen.getByTestId('second-semester-planned-count'),
    ).toHaveTextContent('1');

    await act(async () => firstSemesterWrite.resolve(semester));
    await waitFor(() => expect(createPlannedModule).toHaveBeenCalledOnce());
    await act(async () =>
      plannedModuleWrite.resolve({ id: 'planned-1' } as Awaited<
        ReturnType<typeof createPlannedModule>
      >),
    );

    await waitFor(() => expect(createSemester).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(updatePlannedModule).toHaveBeenCalledWith(
        'token',
        'planned-1',
        expect.objectContaining({
          semesterId: secondSemester.id,
          status: 'PLANNED',
        }),
      ),
    );
  });

  it('restores saved state and exposes an error when persistence fails', async () => {
    vi.mocked(createSemester).mockRejectedValue(new Error('save failed'));

    render(
      <DashboardModuleSelectionProvider>
        <ContextProbe />
      </DashboardModuleSelectionProvider>,
    );
    await waitFor(() => expect(getCurrentUserPlan).toHaveBeenCalledOnce());

    fireEvent.click(
      screen.getByRole('button', { name: 'Place module in semester 1' }),
    );
    expect(screen.getByTestId('planned-count')).toHaveTextContent('1');

    await waitFor(() =>
      expect(
        screen.getByText(/Unable to save one or more plan changes/),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByTestId('planned-count')).toHaveTextContent('0'),
    );
    expect(getCurrentUserPlan).toHaveBeenCalledTimes(2);
  });
});
