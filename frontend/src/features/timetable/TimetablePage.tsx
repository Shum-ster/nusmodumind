'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import {
  getCurrentUserPlan,
  updatePlannedModule,
  type SemesterRecord,
} from '@/features/planner-api';
import {
  getCurrentUserTimetable,
  type CurrentUserTimetable,
  type TimetableLesson,
  type TimetableModule,
} from './timetable-api';
import {
  LessonSelection,
  type LessonSelectionPalette,
  type LessonSelectionVariant,
} from './components/LessonSelection';
import { CurrentModuleLayout } from './components/currentModuleLayout';
import { ScrollFeature } from './components/scrollFeature';

type SemesterOption = {
  id: string | null;
  acadYear: string;
  label: string;
  semester: number;
  year: number;
};

type ActiveLessonSelection = {
  lessonType: string;
  moduleCode: string;
  plannedModuleId: string;
  selectedLessonId: string;
};

type VisibleTimetableLesson = {
  isActive: boolean;
  lesson: TimetableLesson;
  module: TimetableModule;
  palette: LessonSelectionPalette;
  variant: LessonSelectionVariant;
};

type PlacedTimetableLesson = VisibleTimetableLesson & {
  endIndex: number;
  lane: number;
  startIndex: number;
};

const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const dayOrder = new Map(timetableDays.map((day, index) => [day, index]));
const defaultMatriculationYear = 2026;
const yearsInPlan = [1, 2, 3, 4];
const semestersInYear = [1, 2];

const lessonPalettes: LessonSelectionPalette[] = [
  {
    active: 'ring-2 ring-blue-400 ring-offset-1',
    available: 'border-blue-300 bg-blue-50/20 text-blue-800 opacity-70 hover:bg-blue-100 hover:opacity-100',
    selected: 'border-blue-300 bg-blue-100 text-blue-800',
  },
  {
    active: 'ring-2 ring-emerald-400 ring-offset-1',
    available: 'border-emerald-300 bg-emerald-50/20 text-emerald-800 opacity-70 hover:bg-emerald-100 hover:opacity-100',
    selected: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  },
  {
    active: 'ring-2 ring-violet-400 ring-offset-1',
    available: 'border-violet-300 bg-violet-50/20 text-violet-800 opacity-70 hover:bg-violet-100 hover:opacity-100',
    selected: 'border-violet-300 bg-violet-100 text-violet-800',
  },
  {
    active: 'ring-2 ring-amber-400 ring-offset-1',
    available: 'border-amber-300 bg-amber-50/20 text-amber-800 opacity-70 hover:bg-amber-100 hover:opacity-100',
    selected: 'border-amber-300 bg-amber-100 text-amber-800',
  },
  {
    active: 'ring-2 ring-rose-400 ring-offset-1',
    available: 'border-rose-300 bg-rose-50/20 text-rose-800 opacity-70 hover:bg-rose-100 hover:opacity-100',
    selected: 'border-rose-300 bg-rose-100 text-rose-800',
  },
  {
    active: 'ring-2 ring-cyan-400 ring-offset-1',
    available: 'border-cyan-300 bg-cyan-50/20 text-cyan-800 opacity-70 hover:bg-cyan-100 hover:opacity-100',
    selected: 'border-cyan-300 bg-cyan-100 text-cyan-800',
  },
];

function getAcademicYearStart(acadYear: string) {
  const yearMatch = acadYear.match(/\d{4}/);

  return yearMatch ? Number(yearMatch[0]) : null;
}

function buildSemesterOptions(semesters: SemesterRecord[]): SemesterOption[] {
  const firstAcademicYear = semesters
    .map((semester) => getAcademicYearStart(semester.acadYear))
    .filter((year): year is number => year !== null)
    .sort((firstYear, secondYear) => firstYear - secondYear)[0] ?? defaultMatriculationYear;

  return yearsInPlan.flatMap((year) => (
    semestersInYear.map((semesterNumber) => {
      const academicYearStart = firstAcademicYear + year - 1;
      const acadYear = `${academicYearStart}/${academicYearStart + 1}`;
      const matchingSavedSemester = semesters.find((semester) => (
        getAcademicYearStart(semester.acadYear) === academicYearStart &&
        semester.semesterNumber === semesterNumber
      ));

      return {
        id: matchingSavedSemester?.id ?? null,
        acadYear,
        label: `AY${acadYear} Semester ${semesterNumber}`,
        semester: semesterNumber,
        year,
      };
    })
  ));
}

function normalizeTime(time: string) {
  const normalizedTime = time.trim().padStart(4, '0');

  if (!/^\d{4}$/.test(normalizedTime)) {
    return null;
  }

  const hours = Number(normalizedTime.slice(0, 2));
  const minutes = Number(normalizedTime.slice(2));

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return normalizedTime;
}

function getTimeMinutes(time: string) {
  const normalizedTime = normalizeTime(time);

  if (!normalizedTime) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(normalizedTime.slice(0, 2)) * 60 + Number(normalizedTime.slice(2));
}

function formatTimeLabel(time: string) {
  const normalizedTime = normalizeTime(time);

  if (!normalizedTime) {
    return time;
  }

  const hours = Number(normalizedTime.slice(0, 2));
  const minutes = normalizedTime.slice(2);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHour}:${minutes} ${suffix}`;
}

function buildTimeBoundaries(lessons: VisibleTimetableLesson[]) {
  const boundaries = new Set<string>();

  lessons.forEach(({ lesson }) => {
    const startTime = normalizeTime(lesson.startTime);
    const endTime = normalizeTime(lesson.endTime);

    if (startTime && endTime && getTimeMinutes(startTime) < getTimeMinutes(endTime)) {
      boundaries.add(startTime);
      boundaries.add(endTime);
    }
  });

  return Array.from(boundaries).sort((firstTime, secondTime) => (
    getTimeMinutes(firstTime) - getTimeMinutes(secondTime)
  ));
}

function sortLessonsByDayAndTime(lessons: TimetableLesson[]) {
  return [...lessons].sort((firstLesson, secondLesson) => {
    const firstDay = dayOrder.get(firstLesson.day) ?? Number.MAX_SAFE_INTEGER;
    const secondDay = dayOrder.get(secondLesson.day) ?? Number.MAX_SAFE_INTEGER;

    return firstDay - secondDay
      || getTimeMinutes(firstLesson.startTime) - getTimeMinutes(secondLesson.startTime)
      || getTimeMinutes(firstLesson.endTime) - getTimeMinutes(secondLesson.endTime)
      || firstLesson.lessonType.localeCompare(secondLesson.lessonType)
      || firstLesson.classNo.localeCompare(secondLesson.classNo);
  });
}

function getModulePalette(moduleIndex: number) {
  return lessonPalettes[moduleIndex % lessonPalettes.length];
}

function getSelectedClassNo(module: TimetableModule, lessonType: string) {
  return module.selectedLessons.find((lesson) => lesson.lessonType === lessonType)?.classNo ?? null;
}

function buildSelectedLessonsPayload(selectedLessons: TimetableLesson[]) {
  return selectedLessons.reduce<Record<string, string>>((payload, lesson) => {
    payload[lesson.lessonType] = lesson.classNo;

    return payload;
  }, {});
}

function updateSelectedLesson(
  module: TimetableModule,
  selectedLesson: TimetableLesson,
): TimetableLesson[] {
  const selectedLessonsForType = module.availableLessons.filter(
    (lesson) =>
      lesson.lessonType === selectedLesson.lessonType &&
      lesson.classNo === selectedLesson.classNo,
  );
  const otherSelectedLessons = module.selectedLessons.filter(
    (lesson) => lesson.lessonType !== selectedLesson.lessonType,
  );

  return sortLessonsByDayAndTime([
    ...otherSelectedLessons,
    ...(selectedLessonsForType.length > 0 ? selectedLessonsForType : [selectedLesson]),
  ]);
}

function updateTimetableModuleSelection(
  timetable: CurrentUserTimetable,
  plannedModuleId: string,
  selectedLesson: TimetableLesson,
) {
  return {
    ...timetable,
    modules: timetable.modules.map((module) => (
      module.plannedModuleId === plannedModuleId
        ? {
          ...module,
          selectedLessons: updateSelectedLesson(module, selectedLesson),
        }
        : module
    )),
  };
}

function buildPlacedLessons(
  lessons: VisibleTimetableLesson[],
  timeBoundaries: string[],
): PlacedTimetableLesson[] {
  const laneEndTimes: number[] = [];

  return [...lessons]
    .sort((firstLesson, secondLesson) => (
      getTimeMinutes(firstLesson.lesson.startTime) - getTimeMinutes(secondLesson.lesson.startTime)
      || getTimeMinutes(firstLesson.lesson.endTime) - getTimeMinutes(secondLesson.lesson.endTime)
    ))
    .reduce<PlacedTimetableLesson[]>((placedLessons, visibleLesson) => {
      const startTime = normalizeTime(visibleLesson.lesson.startTime);
      const endTime = normalizeTime(visibleLesson.lesson.endTime);
      const startIndex = startTime ? timeBoundaries.indexOf(startTime) : -1;
      const endIndex = endTime ? timeBoundaries.indexOf(endTime) : -1;

      if (startIndex < 0 || endIndex <= startIndex) {
        return placedLessons;
      }

      const startMinutes = getTimeMinutes(visibleLesson.lesson.startTime);
      const endMinutes = getTimeMinutes(visibleLesson.lesson.endTime);
      let lane = laneEndTimes.findIndex((laneEndTime) => laneEndTime <= startMinutes);

      if (lane === -1) {
        lane = laneEndTimes.length;
      }

      laneEndTimes[lane] = endMinutes;

      return [
        ...placedLessons,
        {
          ...visibleLesson,
          endIndex,
          lane,
          startIndex,
        },
      ];
    }, []);
}

export function TimetablePage() {
  const [activeLessonSelection, setActiveLessonSelection] = useState<ActiveLessonSelection | null>(null);
  const [activeSemesterIndex, setActiveSemesterIndex] = useState(0);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(() => Boolean(getToken()));
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>(() => buildSemesterOptions([]));
  const [timetable, setTimetable] = useState<CurrentUserTimetable | null>(null);
  const [token] = useState(() => getToken());
  const timetableRequestIdRef = useRef(0);

  const activeSemester = semesterOptions[activeSemesterIndex] ?? null;
  const lessonSelection = activeLessonSelection !== null;
  const currentLoadError = loadError ?? (!token ? 'Unable to load timetable without a saved login.' : null);

  const loadTimetableForSemester = useCallback(async (storedToken: string, semesterId: string) => {
    const requestId = timetableRequestIdRef.current + 1;

    timetableRequestIdRef.current = requestId;
    setActiveLessonSelection(null);
    setIsLoadingTimetable(true);
    setLoadError(null);
    setSaveError(null);

    try {
      const currentTimetable = await getCurrentUserTimetable(storedToken, semesterId);

      if (timetableRequestIdRef.current === requestId) {
        setTimetable(currentTimetable);
      }
    } catch {
      if (timetableRequestIdRef.current === requestId) {
        setTimetable(null);
        setLoadError('Unable to load timetable lessons for this semester.');
      }
    } finally {
      if (timetableRequestIdRef.current === requestId) {
        setIsLoadingTimetable(false);
      }
    }
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!token) {
      return () => {
        isCurrentRequest = false;
      };
    }

    getCurrentUserPlan(token)
      .then((plan) => {
        if (!isCurrentRequest) {
          return;
        }

        const nextSemesterOptions = buildSemesterOptions(plan.semesters);

        setSemesterOptions(nextSemesterOptions);
        setActiveSemesterIndex(0);

        if (nextSemesterOptions[0]?.id) {
          void loadTimetableForSemester(token, nextSemesterOptions[0].id);
        } else {
          setTimetable(null);
        }
      })
      .catch(() => {
        if (isCurrentRequest) {
          setLoadError('Unable to load your semesters.');
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoadingSemesters(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [loadTimetableForSemester, token]);

  const paletteByModuleId = useMemo(() => {
    const palettes = new Map<string, LessonSelectionPalette>();

    timetable?.modules.forEach((module, moduleIndex) => {
      palettes.set(module.plannedModuleId, getModulePalette(moduleIndex));
    });

    return palettes;
  }, [timetable]);

  const visibleLessons = useMemo<VisibleTimetableLesson[]>(() => {
    if (!timetable) {
      return [];
    }

    const selectedLessons = timetable.modules.flatMap((module) => (
      module.selectedLessons.map((lesson) => {
        const isActiveLessonType = activeLessonSelection?.plannedModuleId === module.plannedModuleId
          && activeLessonSelection.lessonType === lesson.lessonType;
        const selectedClassNo = isActiveLessonType
          ? getSelectedClassNo(module, lesson.lessonType)
          : null;

        return {
          isActive: isActiveLessonType
            && (lesson.id === activeLessonSelection?.selectedLessonId || lesson.classNo === selectedClassNo),
          lesson,
          module,
          palette: paletteByModuleId.get(module.plannedModuleId) ?? getModulePalette(0),
          variant: 'selected' as const,
        };
      })
    ));

    if (!lessonSelection || !activeLessonSelection) {
      return selectedLessons;
    }

    const activeModule = timetable.modules.find(
      (module) => module.plannedModuleId === activeLessonSelection.plannedModuleId,
    );

    if (!activeModule) {
      return selectedLessons;
    }

    const selectedClassNo = getSelectedClassNo(activeModule, activeLessonSelection.lessonType);
    const availableLessons = activeModule.availableLessons
      .filter((lesson) =>
        lesson.lessonType === activeLessonSelection.lessonType &&
        lesson.classNo !== selectedClassNo,
      )
      .map((lesson) => ({
        isActive: false,
        lesson,
        module: activeModule,
        palette: paletteByModuleId.get(activeModule.plannedModuleId) ?? getModulePalette(0),
        variant: 'available' as const,
      }));

    return [...selectedLessons, ...availableLessons];
  }, [activeLessonSelection, lessonSelection, paletteByModuleId, timetable]);

  const timeBoundaries = useMemo(() => buildTimeBoundaries(visibleLessons), [visibleLessons]);
  const intervalCount = Math.max(timeBoundaries.length - 1, 0);
  const gridTemplateColumns = `120px repeat(${intervalCount}, minmax(108px, 1fr))`;

  const showSemesterAtIndex = useCallback((nextSemesterIndex: number) => {
    const nextSemester = semesterOptions[nextSemesterIndex];

    if (!nextSemester) {
      return;
    }

    setActiveSemesterIndex(nextSemesterIndex);

    if (!token || !nextSemester.id) {
      setActiveLessonSelection(null);
      setLoadError(null);
      setSaveError(null);
      setTimetable(null);
      return;
    }

    void loadTimetableForSemester(token, nextSemester.id);
  }, [loadTimetableForSemester, semesterOptions, token]);

  const showPreviousSemester = () => {
    showSemesterAtIndex(activeSemesterIndex === 0 ? semesterOptions.length - 1 : activeSemesterIndex - 1);
  };

  const showNextSemester = () => {
    showSemesterAtIndex(activeSemesterIndex === semesterOptions.length - 1 ? 0 : activeSemesterIndex + 1);
  };

  const selectCurrentLesson = useCallback((module: TimetableModule, lesson: TimetableLesson) => {
    setSaveError(null);
    setActiveLessonSelection({
      lessonType: lesson.lessonType,
      moduleCode: module.moduleCode,
      plannedModuleId: module.plannedModuleId,
      selectedLessonId: lesson.id,
    });
  }, []);

  const selectAvailableLesson = useCallback(async (module: TimetableModule, lesson: TimetableLesson) => {
    if (!token || !timetable || pendingLessonId) {
      return;
    }

    const previousTimetable = timetable;
    const previousLessonSelection = activeLessonSelection;
    const nextTimetable = updateTimetableModuleSelection(timetable, module.plannedModuleId, lesson);
    const nextModule = nextTimetable.modules.find(
      (currentModule) => currentModule.plannedModuleId === module.plannedModuleId,
    );

    if (!nextModule) {
      return;
    }

    setActiveLessonSelection({
      lessonType: lesson.lessonType,
      moduleCode: module.moduleCode,
      plannedModuleId: module.plannedModuleId,
      selectedLessonId: lesson.id,
    });
    setPendingLessonId(lesson.id);
    setSaveError(null);
    setTimetable(nextTimetable);

    try {
      await updatePlannedModule(token, module.plannedModuleId, {
        selectedLessons: buildSelectedLessonsPayload(nextModule.selectedLessons),
      });
    } catch {
      setTimetable(previousTimetable);
      setActiveLessonSelection(previousLessonSelection);
      setSaveError('Unable to save the selected lesson. Your previous timetable has been restored.');
    } finally {
      setPendingLessonId(null);
    }
  }, [activeLessonSelection, pendingLessonId, timetable, token]);

  const renderEmptyTimetableShell = (message: string, tone: 'neutral' | 'error' = 'neutral') => {
    const emptyGridTemplateColumns = '120px minmax(360px, 1fr)';
    const messageClass = tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-dashed border-gray-300 bg-gray-50 text-gray-500';

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="min-w-[560px]">
          <div
            className="grid border-b border-gray-200 bg-gray-50 text-center text-sm font-semibold text-gray-600"
            style={{ gridTemplateColumns: emptyGridTemplateColumns }}
          >
            <div className="flex min-h-12 items-center justify-center border-r border-gray-200">Day</div>
            <div className="flex min-h-12 items-center justify-center px-3">Schedule</div>
          </div>

          <div>
            {timetableDays.map((day, dayIndex) => (
              <div
                key={day}
                className="grid min-h-[112px] items-stretch border-b border-gray-100 last:border-b-0"
                style={{ gridTemplateColumns: emptyGridTemplateColumns }}
              >
                <div className="flex items-center justify-center border-r border-gray-100 bg-gray-50/80 px-3 text-sm font-semibold text-gray-500">
                  {day}
                </div>
                <div className="flex items-center justify-center px-4">
                  {dayIndex === 0 ? (
                    <div className={`rounded border px-4 py-3 text-center text-sm font-medium ${messageClass}`}>
                      {message}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTimetableGrid = () => {
    if (isLoadingSemesters || isLoadingTimetable) {
      return renderEmptyTimetableShell('Loading timetable...');
    }

    if (currentLoadError) {
      return renderEmptyTimetableShell(currentLoadError, 'error');
    }

    if (!timetable || visibleLessons.length === 0 || intervalCount === 0) {
      return renderEmptyTimetableShell('No timetable lessons are available for this semester.');
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div
          style={{ minWidth: `${120 + intervalCount * 116}px` }}
        >
          <div
            className="grid border-b border-gray-200 bg-gray-50 text-center text-sm font-semibold text-gray-600"
            style={{ gridTemplateColumns }}
          >
            <div className="flex min-h-12 items-center justify-center border-r border-gray-200">Day</div>
            {timeBoundaries.slice(0, -1).map((timeBoundary) => (
              <div
                key={timeBoundary}
                className="flex min-h-12 items-center justify-center border-r border-gray-100 px-2 last:border-r-0"
              >
                {formatTimeLabel(timeBoundary)}
              </div>
            ))}
          </div>

          <div>
            {timetableDays.map((day) => {
              const placedLessons = buildPlacedLessons(
                visibleLessons.filter(({ lesson }) => lesson.day === day),
                timeBoundaries,
              );
              const laneCount = placedLessons.reduce(
                (currentLaneCount, lesson) => Math.max(currentLaneCount, lesson.lane + 1),
                1,
              );
              const rowHeight = Math.max(132, laneCount * 96 + 20);

              return (
                <div
                  key={day}
                  className="grid items-stretch border-b border-gray-100 last:border-b-0"
                  style={{
                    gridTemplateColumns,
                    minHeight: `${rowHeight}px`,
                  }}
                >
                  <div
                    className="z-10 flex items-center justify-center border-r border-gray-100 bg-gray-50/80 px-3 text-sm font-semibold text-gray-500"
                    style={{ gridColumn: 1, gridRow: 1 }}
                  >
                    {day}
                  </div>

                  {timeBoundaries.slice(0, -1).map((timeBoundary, timeIndex) => (
                    <div
                      key={`${day}-${timeBoundary}`}
                      className="border-r border-gray-100 last:border-r-0"
                      style={{ gridColumn: timeIndex + 2, gridRow: 1 }}
                    />
                  ))}

                  {placedLessons.map((placedLesson) => {
                    const lessonStyle: CSSProperties = {
                      alignSelf: 'start',
                      gridColumn: `${placedLesson.startIndex + 2} / ${placedLesson.endIndex + 2}`,
                      gridRow: 1,
                      marginLeft: '8px',
                      marginRight: '8px',
                      marginTop: `${placedLesson.lane * 92 + 8}px`,
                    };
                    const handleSelect = placedLesson.variant === 'available'
                      ? () => selectAvailableLesson(placedLesson.module, placedLesson.lesson)
                      : () => selectCurrentLesson(placedLesson.module, placedLesson.lesson);

                    return (
                      <LessonSelection
                        key={`${placedLesson.variant}-${placedLesson.module.plannedModuleId}-${placedLesson.lesson.id}`}
                        isActive={placedLesson.isActive}
                        isPending={pendingLessonId === placedLesson.lesson.id}
                        lesson={placedLesson.lesson}
                        onSelect={handleSelect}
                        palette={placedLesson.palette}
                        style={lessonStyle}
                        variant={placedLesson.variant}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {activeSemester ? (
        <ScrollFeature
          year={activeSemester.year}
          semester={activeSemester.semester}
          onPrevious={showPreviousSemester}
          onNext={showNextSemester}
        />
      ) : null}

      {saveError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {saveError}
        </div>
      ) : null}

      {renderTimetableGrid()}

      {timetable ? <CurrentModuleLayout modules={timetable.modules} /> : null}
    </div>
  );
}
