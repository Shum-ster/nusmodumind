'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import {
  getCurrentUserPlan,
  updatePlannedModule,
} from '@/features/planner';
import type {
  CurrentUserTimetable,
  SemesterRecord,
  TimetableLesson,
  TimetableModule,
} from '@/shared/types';
import {
  buildCurrentUserTimetable,
} from './adapters/current-user-timetable-adapter';
import { formatSingaporeTimetableTime } from './timetable-time';
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

type TimetableImagePalette = {
  border: string;
  fill: string;
  text: string;
};

const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const dayOrder = new Map(timetableDays.map((day, index) => [day, index]));
const defaultMatriculationYear = 2026;
const dayColumnWidth = 76;
const filledTimeIntervalMinWidth = 112;
const lessonLaneMinHeight = 78;
const emptyTimeBoundaries = [
  '0800',
  '0900',
  '1000',
  '1100',
  '1200',
  '1300',
  '1400',
  '1500',
  '1600',
  '1700',
];
const yearsInPlan = [1, 2, 3, 4];
const semestersInYear = [1, 2];

const lessonPalettes: LessonSelectionPalette[] = [
  {
    active: 'ring-2 ring-blue-400 ring-offset-1',
    available: 'border-blue-200 bg-blue-50/20 text-blue-800 opacity-70',
    availableHover:
      'hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 hover:opacity-100',
    selected: 'border-blue-300 bg-blue-100 text-blue-800',
  },
  {
    active: 'ring-2 ring-emerald-400 ring-offset-1',
    available:
      'border-emerald-200 bg-emerald-50/20 text-emerald-800 opacity-70',
    availableHover:
      'hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 hover:opacity-100',
    selected: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  },
  {
    active: 'ring-2 ring-violet-400 ring-offset-1',
    available: 'border-violet-200 bg-violet-50/20 text-violet-800 opacity-70',
    availableHover:
      'hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800 hover:opacity-100',
    selected: 'border-violet-300 bg-violet-100 text-violet-800',
  },
  {
    active: 'ring-2 ring-amber-400 ring-offset-1',
    available: 'border-amber-200 bg-amber-50/20 text-amber-800 opacity-70',
    availableHover:
      'hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 hover:opacity-100',
    selected: 'border-amber-300 bg-amber-100 text-amber-800',
  },
  {
    active: 'ring-2 ring-rose-400 ring-offset-1',
    available: 'border-rose-200 bg-rose-50/20 text-rose-800 opacity-70',
    availableHover:
      'hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 hover:opacity-100',
    selected: 'border-rose-300 bg-rose-100 text-rose-800',
  },
  {
    active: 'ring-2 ring-cyan-400 ring-offset-1',
    available: 'border-cyan-200 bg-cyan-50/20 text-cyan-800 opacity-70',
    availableHover:
      'hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-800 hover:opacity-100',
    selected: 'border-cyan-300 bg-cyan-100 text-cyan-800',
  },
];

const timetableImagePalettes: TimetableImagePalette[] = [
  { border: '#93c5fd', fill: '#dbeafe', text: '#1e3a8a' },
  { border: '#6ee7b7', fill: '#d1fae5', text: '#065f46' },
  { border: '#c4b5fd', fill: '#ede9fe', text: '#5b21b6' },
  { border: '#fcd34d', fill: '#fef3c7', text: '#92400e' },
  { border: '#fda4af', fill: '#ffe4e6', text: '#9f1239' },
  { border: '#67e8f9', fill: '#cffafe', text: '#155e75' },
];

function getAcademicYearStart(acadYear: string) {
  const yearMatch = acadYear.match(/\d{4}/);

  return yearMatch ? Number(yearMatch[0]) : null;
}

function buildSemesterOptions(semesters: SemesterRecord[]): SemesterOption[] {
  const firstAcademicYear =
    semesters
      .map((semester) => getAcademicYearStart(semester.acadYear))
      .filter((year): year is number => year !== null)
      .sort((firstYear, secondYear) => firstYear - secondYear)[0] ??
    defaultMatriculationYear;

  return yearsInPlan.flatMap((year) =>
    semestersInYear.map((semesterNumber) => {
      const academicYearStart = firstAcademicYear + year - 1;
      const acadYear = `${academicYearStart}/${academicYearStart + 1}`;
      const matchingSavedSemester = semesters.find(
        (semester) =>
          getAcademicYearStart(semester.acadYear) === academicYearStart &&
          semester.semesterNumber === semesterNumber,
      );

      return {
        id: matchingSavedSemester?.id ?? null,
        acadYear,
        label: `AY${acadYear} Semester ${semesterNumber}`,
        semester: semesterNumber,
        year,
      };
    }),
  );
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

  return (
    Number(normalizedTime.slice(0, 2)) * 60 + Number(normalizedTime.slice(2))
  );
}

function buildTimeBoundaries(lessons: VisibleTimetableLesson[]) {
  const boundaries = new Set(emptyTimeBoundaries);

  lessons.forEach(({ lesson }) => {
    const startTime = normalizeTime(lesson.startTime);
    const endTime = normalizeTime(lesson.endTime);

    if (
      startTime &&
      endTime &&
      getTimeMinutes(startTime) < getTimeMinutes(endTime)
    ) {
      boundaries.add(startTime);
      boundaries.add(endTime);
    }
  });

  return Array.from(boundaries).sort(
    (firstTime, secondTime) =>
      getTimeMinutes(firstTime) - getTimeMinutes(secondTime),
  );
}

function sortLessonsByDayAndTime(lessons: TimetableLesson[]) {
  return [...lessons].sort((firstLesson, secondLesson) => {
    const firstDay = dayOrder.get(firstLesson.day) ?? Number.MAX_SAFE_INTEGER;
    const secondDay = dayOrder.get(secondLesson.day) ?? Number.MAX_SAFE_INTEGER;

    return (
      firstDay - secondDay ||
      getTimeMinutes(firstLesson.startTime) -
        getTimeMinutes(secondLesson.startTime) ||
      getTimeMinutes(firstLesson.endTime) -
        getTimeMinutes(secondLesson.endTime) ||
      firstLesson.lessonType.localeCompare(secondLesson.lessonType) ||
      firstLesson.classNo.localeCompare(secondLesson.classNo)
    );
  });
}

function getModulePalette(moduleIndex: number) {
  return lessonPalettes[moduleIndex % lessonPalettes.length];
}

function getTimetableImagePalette(moduleIndex: number) {
  return timetableImagePalettes[moduleIndex % timetableImagePalettes.length];
}

function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function getWrappedCanvasLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    lines.push(word);
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  const lastLine = visibleLines[visibleLines.length - 1];
  let truncatedLine = `${lastLine}...`;

  while (
    truncatedLine.length > 3 &&
    context.measureText(truncatedLine).width > maxWidth
  ) {
    truncatedLine = `${truncatedLine.slice(0, -4)}...`;
  }

  visibleLines[visibleLines.length - 1] = truncatedLine;

  return visibleLines;
}

function triggerCanvasDownload(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');

  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}

function getSelectedClassNo(module: TimetableModule, lessonType: string) {
  return (
    module.selectedLessons.find((lesson) => lesson.lessonType === lessonType)
      ?.classNo ?? null
  );
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
    ...(selectedLessonsForType.length > 0
      ? selectedLessonsForType
      : [selectedLesson]),
  ]);
}

function updateTimetableModuleSelection(
  timetable: CurrentUserTimetable,
  plannedModuleId: string,
  selectedLesson: TimetableLesson,
) {
  return {
    ...timetable,
    modules: timetable.modules.map((module) =>
      module.plannedModuleId === plannedModuleId
        ? {
            ...module,
            selectedLessons: updateSelectedLesson(module, selectedLesson),
          }
        : module,
    ),
  };
}

function buildPlacedLessons(
  lessons: VisibleTimetableLesson[],
  timeBoundaries: string[],
): PlacedTimetableLesson[] {
  const laneEndTimes: number[] = [];

  return [...lessons]
    .sort(
      (firstLesson, secondLesson) =>
        getTimeMinutes(firstLesson.lesson.startTime) -
          getTimeMinutes(secondLesson.lesson.startTime) ||
        getTimeMinutes(firstLesson.lesson.endTime) -
          getTimeMinutes(secondLesson.lesson.endTime),
    )
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
      let lane = laneEndTimes.findIndex(
        (laneEndTime) => laneEndTime <= startMinutes,
      );

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
  const [activeLessonSelection, setActiveLessonSelection] =
    useState<ActiveLessonSelection | null>(null);
  const [activeSemesterIndex, setActiveSemesterIndex] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isLoadingSemesters, setIsLoadingSemesters] = useState(true);
  const [isLoadingTimetable, setIsLoadingTimetable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>(() =>
    buildSemesterOptions([]),
  );
  const [timetable, setTimetable] = useState<CurrentUserTimetable | null>(null);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const timetableRequestIdRef = useRef(0);

  const activeSemester = semesterOptions[activeSemesterIndex] ?? null;
  const lessonSelection = activeLessonSelection !== null;
  const currentLoadError =
    loadError ??
    (token === null ? 'Unable to load timetable without a saved login.' : null);

  const loadTimetableForSemester = useCallback(
    async (storedToken: string, semesterId: string) => {
      const requestId = timetableRequestIdRef.current + 1;

      timetableRequestIdRef.current = requestId;
      setActiveLessonSelection(null);
      setIsLoadingTimetable(true);
      setLoadError(null);
      setSaveError(null);

      try {
        const plan = await getCurrentUserPlan(storedToken);
        const currentTimetable = buildCurrentUserTimetable(plan, semesterId);

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
    },
    [],
  );

  useEffect(() => {
    let isCurrentRequest = true;

    if (token === undefined) {
      queueMicrotask(() => {
        if (!isCurrentRequest) {
          return;
        }

        const storedToken = getToken();

        setToken(storedToken);

        if (!storedToken) {
          setIsLoadingSemesters(false);
        }
      });

      return () => {
        isCurrentRequest = false;
      };
    }

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

    const selectedLessons = timetable.modules.flatMap((module) =>
      module.selectedLessons.map((lesson) => {
        const isActiveLessonType =
          activeLessonSelection?.plannedModuleId === module.plannedModuleId &&
          activeLessonSelection.lessonType === lesson.lessonType;
        const selectedClassNo = isActiveLessonType
          ? getSelectedClassNo(module, lesson.lessonType)
          : null;

        return {
          isActive:
            isActiveLessonType &&
            (lesson.id === activeLessonSelection?.selectedLessonId ||
              lesson.classNo === selectedClassNo),
          lesson,
          module,
          palette:
            paletteByModuleId.get(module.plannedModuleId) ??
            getModulePalette(0),
          variant: 'selected' as const,
        };
      }),
    );

    if (!lessonSelection || !activeLessonSelection) {
      return selectedLessons;
    }

    const activeModule = timetable.modules.find(
      (module) =>
        module.plannedModuleId === activeLessonSelection.plannedModuleId,
    );

    if (!activeModule) {
      return selectedLessons;
    }

    const selectedClassNo = getSelectedClassNo(
      activeModule,
      activeLessonSelection.lessonType,
    );
    const availableLessons = activeModule.availableLessons
      .filter(
        (lesson) =>
          lesson.lessonType === activeLessonSelection.lessonType &&
          lesson.classNo !== selectedClassNo,
      )
      .map((lesson) => ({
        isActive: false,
        lesson,
        module: activeModule,
        palette:
          paletteByModuleId.get(activeModule.plannedModuleId) ??
          getModulePalette(0),
        variant: 'available' as const,
      }));

    return [...selectedLessons, ...availableLessons];
  }, [activeLessonSelection, lessonSelection, paletteByModuleId, timetable]);

  const selectedLessonsForDownload = useMemo<VisibleTimetableLesson[]>(() => {
    if (!timetable) {
      return [];
    }

    return timetable.modules.flatMap((module) =>
      module.selectedLessons.map((lesson) => ({
        isActive: false,
        lesson,
        module,
        palette:
          paletteByModuleId.get(module.plannedModuleId) ?? getModulePalette(0),
        variant: 'selected' as const,
      })),
    );
  }, [paletteByModuleId, timetable]);

  const timeBoundaries = useMemo(
    () => buildTimeBoundaries(visibleLessons),
    [visibleLessons],
  );
  const intervalCount = Math.max(timeBoundaries.length - 1, 0);
  const gridTemplateColumns = `${dayColumnWidth}px repeat(${intervalCount}, minmax(${filledTimeIntervalMinWidth}px, 1fr))`;
  const timetableMinWidth =
    dayColumnWidth + intervalCount * filledTimeIntervalMinWidth;

  const showSemesterAtIndex = useCallback(
    (nextSemesterIndex: number) => {
      const nextSemester = semesterOptions[nextSemesterIndex];

      if (!nextSemester) {
        return;
      }

      setActiveSemesterIndex(nextSemesterIndex);
      setDownloadError(null);

      if (!token || !nextSemester.id) {
        setActiveLessonSelection(null);
        setLoadError(null);
        setSaveError(null);
        setTimetable(null);
        return;
      }

      void loadTimetableForSemester(token, nextSemester.id);
    },
    [loadTimetableForSemester, semesterOptions, token],
  );

  const showPreviousSemester = () => {
    showSemesterAtIndex(
      activeSemesterIndex === 0
        ? semesterOptions.length - 1
        : activeSemesterIndex - 1,
    );
  };

  const showNextSemester = () => {
    showSemesterAtIndex(
      activeSemesterIndex === semesterOptions.length - 1
        ? 0
        : activeSemesterIndex + 1,
    );
  };

  const selectCurrentLesson = useCallback(
    (module: TimetableModule, lesson: TimetableLesson) => {
      setSaveError(null);
      setActiveLessonSelection({
        lessonType: lesson.lessonType,
        moduleCode: module.moduleCode,
        plannedModuleId: module.plannedModuleId,
        selectedLessonId: lesson.id,
      });
    },
    [],
  );

  const selectAvailableLesson = useCallback(
    async (module: TimetableModule, lesson: TimetableLesson) => {
      if (!token || !timetable || pendingLessonId) {
        return;
      }

      const previousTimetable = timetable;
      const previousLessonSelection = activeLessonSelection;
      const nextTimetable = updateTimetableModuleSelection(
        timetable,
        module.plannedModuleId,
        lesson,
      );
      const nextModule = nextTimetable.modules.find(
        (currentModule) =>
          currentModule.plannedModuleId === module.plannedModuleId,
      );

      if (!nextModule) {
        return;
      }

      setActiveLessonSelection(null);
      setPendingLessonId(lesson.id);
      setSaveError(null);
      setTimetable(nextTimetable);

      try {
        await updatePlannedModule(token, module.plannedModuleId, {
          selectedLessons: buildSelectedLessonsPayload(
            nextModule.selectedLessons,
          ),
        });
      } catch {
        setTimetable(previousTimetable);
        setActiveLessonSelection(previousLessonSelection);
        setSaveError(
          'Unable to save the selected lesson. Your previous timetable has been restored.',
        );
      } finally {
        setPendingLessonId(null);
      }
    },
    [activeLessonSelection, pendingLessonId, timetable, token],
  );

  const downloadTimetableImage = useCallback(() => {
    if (
      !activeSemester ||
      !timetable ||
      selectedLessonsForDownload.length === 0
    ) {
      setDownloadError(
        'No selected lessons are available to download for this semester.',
      );
      return;
    }

    try {
      const downloadTimeBoundaries = buildTimeBoundaries(
        selectedLessonsForDownload,
      );
      const downloadIntervalCount = Math.max(
        downloadTimeBoundaries.length - 1,
        0,
      );

      if (downloadIntervalCount === 0) {
        setDownloadError(
          'No timetable grid is available to download for this semester.',
        );
        return;
      }

      const imagePaletteByModuleId = new Map(
        timetable.modules.map((module, moduleIndex) => [
          module.plannedModuleId,
          getTimetableImagePalette(moduleIndex),
        ]),
      );
      const leftColumnWidth = 112;
      const intervalWidth = 148;
      const pagePadding = 32;
      const titleHeight = 76;
      const headerHeight = 42;
      const laneHeight = 88;
      const minimumDayHeight = 112;
      const gridWidth = leftColumnWidth + downloadIntervalCount * intervalWidth;
      const dayRows = timetableDays.map((day) => {
        const placedLessons = buildPlacedLessons(
          selectedLessonsForDownload.filter(({ lesson }) => lesson.day === day),
          downloadTimeBoundaries,
        );
        const laneCount = placedLessons.reduce(
          (currentLaneCount, lesson) =>
            Math.max(currentLaneCount, lesson.lane + 1),
          1,
        );

        return {
          day,
          laneCount,
          placedLessons,
          rowHeight: Math.max(minimumDayHeight, laneCount * laneHeight),
        };
      });
      const imageWidth = pagePadding * 2 + gridWidth;
      const imageHeight =
        pagePadding * 2 +
        titleHeight +
        headerHeight +
        dayRows.reduce((totalHeight, row) => totalHeight + row.rowHeight, 0);
      const scale = Math.max(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        setDownloadError('Unable to create the timetable image.');
        return;
      }

      canvas.width = imageWidth * scale;
      canvas.height = imageHeight * scale;
      context.scale(scale, scale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, imageWidth, imageHeight);

      context.fillStyle = '#111827';
      context.font = '700 26px Arial, sans-serif';
      context.fillText('Timetable', pagePadding, pagePadding + 28);
      context.font = '600 15px Arial, sans-serif';
      context.fillStyle = '#4b5563';
      context.fillText(activeSemester.label, pagePadding, pagePadding + 54);

      const gridX = pagePadding;
      let currentY = pagePadding + titleHeight;

      context.fillStyle = '#f9fafb';
      context.fillRect(gridX, currentY, gridWidth, headerHeight);
      context.strokeStyle = '#e5e7eb';
      context.strokeRect(gridX, currentY, gridWidth, headerHeight);
      context.fillStyle = '#4b5563';
      context.font = '700 11px Arial, sans-serif';
      context.textBaseline = 'middle';
      context.fillText('Day', gridX + 16, currentY + headerHeight / 2);

      downloadTimeBoundaries.slice(0, -1).forEach((timeBoundary, timeIndex) => {
        const cellX = gridX + leftColumnWidth + timeIndex * intervalWidth;

        context.strokeStyle = '#e5e7eb';
        context.strokeRect(cellX, currentY, intervalWidth, headerHeight);
        context.fillStyle = '#4b5563';
        context.fillText(
          formatSingaporeTimetableTime(timeBoundary),
          cellX + 10,
          currentY + headerHeight / 2,
        );

        if (timeIndex === downloadTimeBoundaries.length - 2) {
          context.textAlign = 'right';
          context.fillText(
            formatSingaporeTimetableTime(
              downloadTimeBoundaries[downloadTimeBoundaries.length - 1],
            ),
            cellX + intervalWidth - 10,
            currentY + headerHeight / 2,
          );
          context.textAlign = 'left';
        }
      });

      currentY += headerHeight;

      dayRows.forEach((row) => {
        context.fillStyle = '#f9fafb';
        context.fillRect(gridX, currentY, leftColumnWidth, row.rowHeight);
        context.strokeStyle = '#e5e7eb';
        context.strokeRect(gridX, currentY, gridWidth, row.rowHeight);
        context.fillStyle = '#4b5563';
        context.font = '700 12px Arial, sans-serif';
        context.textBaseline = 'middle';
        context.fillText(row.day, gridX + 16, currentY + row.rowHeight / 2);

        downloadTimeBoundaries.slice(0, -1).forEach((_, timeIndex) => {
          const cellX = gridX + leftColumnWidth + timeIndex * intervalWidth;

          context.strokeStyle = '#f3f4f6';
          context.beginPath();
          context.moveTo(cellX, currentY);
          context.lineTo(cellX, currentY + row.rowHeight);
          context.stroke();
        });

        row.placedLessons.forEach((placedLesson) => {
          const imagePalette =
            imagePaletteByModuleId.get(placedLesson.module.plannedModuleId) ??
            getTimetableImagePalette(0);
          const lessonX =
            gridX +
            leftColumnWidth +
            placedLesson.startIndex * intervalWidth +
            6;
          const lessonY = currentY + placedLesson.lane * laneHeight + 6;
          const lessonWidth =
            (placedLesson.endIndex - placedLesson.startIndex) * intervalWidth -
            12;
          const lessonHeight = Math.min(
            laneHeight - 12,
            row.rowHeight - placedLesson.lane * laneHeight - 12,
          );

          context.fillStyle = imagePalette.fill;
          context.strokeStyle = imagePalette.border;
          drawRoundedRectangle(
            context,
            lessonX,
            lessonY,
            lessonWidth,
            lessonHeight,
            8,
          );
          context.fill();
          context.stroke();

          context.fillStyle = imagePalette.text;
          context.textBaseline = 'top';
          context.font = '700 13px Arial, sans-serif';
          context.fillText(
            placedLesson.lesson.moduleCode,
            lessonX + 10,
            lessonY + 9,
          );
          context.font = '700 11px Arial, sans-serif';
          context.fillText(
            `${placedLesson.lesson.lessonType} ${placedLesson.lesson.classNo}`,
            lessonX + 10,
            lessonY + 29,
          );

          context.font = '600 10px Arial, sans-serif';
          getWrappedCanvasLines(
            context,
            placedLesson.lesson.venue,
            lessonWidth - 20,
            2,
          ).forEach((line, lineIndex) => {
            context.fillText(line, lessonX + 10, lessonY + 48 + lineIndex * 13);
          });

          context.fillStyle = '#374151';
          context.font = '600 10px Arial, sans-serif';
          context.fillText(
            `${formatSingaporeTimetableTime(placedLesson.lesson.startTime)} - ${formatSingaporeTimetableTime(placedLesson.lesson.endTime)}`,
            lessonX + 10,
            lessonY + lessonHeight - 22,
          );
        });

        currentY += row.rowHeight;
      });

      triggerCanvasDownload(
        canvas,
        `timetable-year-${activeSemester.year}-semester-${activeSemester.semester}.png`,
      );
      setDownloadError(null);
    } catch {
      setDownloadError('Unable to download the timetable image.');
    }
  }, [activeSemester, selectedLessonsForDownload, timetable]);

  const renderTimeAxisCells = (boundaries: string[]) =>
    boundaries.slice(0, -1).map((timeBoundary, timeIndex) => {
      const isLastInterval = timeIndex === boundaries.length - 2;

      return (
        <div
          key={timeBoundary}
          className={`flex min-h-8 min-w-0 items-center border-r border-gray-100 px-1 last:border-r-0 ${
            isLastInterval ? 'justify-between' : 'justify-start'
          }`}
        >
          <span>{formatSingaporeTimetableTime(timeBoundary)}</span>
          {isLastInterval ? (
            <span>
              {formatSingaporeTimetableTime(boundaries[boundaries.length - 1])}
            </span>
          ) : null}
        </div>
      );
    });

  const renderEmptyTimetableShell = (
    message: string,
    tone: 'neutral' | 'error' = 'neutral',
  ) => {
    const emptyIntervalCount = emptyTimeBoundaries.length - 1;
    const emptyGridTemplateColumns = `${dayColumnWidth}px repeat(${emptyIntervalCount}, minmax(0, 1fr))`;
    const messageClass =
      tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-dashed border-gray-300 bg-gray-50 text-gray-500';

    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div>
          <div
            className="grid border-b border-gray-200 bg-gray-50 text-[10px] font-semibold leading-tight text-gray-600"
            style={{ gridTemplateColumns: emptyGridTemplateColumns }}
          >
            <div className="flex min-h-8 items-center justify-center border-r border-gray-200 px-1">
              Day
            </div>
            {renderTimeAxisCells(emptyTimeBoundaries)}
          </div>

          <div>
            {timetableDays.map((day, dayIndex) => (
              <div
                key={day}
                className="relative grid min-h-[78px] items-stretch border-b border-gray-100 last:border-b-0"
                style={{ gridTemplateColumns: emptyGridTemplateColumns }}
              >
                <div className="flex items-center justify-center border-r border-gray-100 bg-gray-50/80 px-2 text-xs font-semibold text-gray-500">
                  {day}
                </div>
                {emptyTimeBoundaries
                  .slice(0, -1)
                  .map((timeBoundary, timeIndex) => (
                    <div
                      key={`${day}-${timeBoundary}`}
                      className="pointer-events-none border-r border-gray-100 last:border-r-0"
                      style={{ gridColumn: timeIndex + 2, gridRow: 1 }}
                    />
                  ))}
                {dayIndex === 0 ? (
                  <div
                    className="flex items-center justify-center px-4"
                    style={{
                      gridColumn: `2 / ${emptyIntervalCount + 2}`,
                      gridRow: 1,
                    }}
                  >
                    <div
                      className={`rounded border px-3 py-2 text-center text-xs font-medium ${messageClass}`}
                    >
                      {message}
                    </div>
                  </div>
                ) : null}
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
      return renderEmptyTimetableShell(
        'No timetable lessons are available for this semester.',
      );
    }

    return (
      <div className="relative isolate max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="w-full" style={{ minWidth: `${timetableMinWidth}px` }}>
          <div
            className="sticky top-0 z-40 grid border-b border-gray-200 bg-gray-50 text-[10px] font-semibold leading-tight text-gray-600"
            style={{ gridTemplateColumns }}
          >
            <div className="sticky left-0 z-50 flex min-h-8 items-center justify-center border-r border-gray-200 bg-gray-50 px-1">
              Day
            </div>
            {renderTimeAxisCells(timeBoundaries)}
          </div>

          <div>
            {timetableDays.map((day) => {
              const placedLessons = buildPlacedLessons(
                visibleLessons.filter(({ lesson }) => lesson.day === day),
                timeBoundaries,
              );
              const laneCount = placedLessons.reduce(
                (currentLaneCount, lesson) =>
                  Math.max(currentLaneCount, lesson.lane + 1),
                1,
              );
              const rowHeight = Math.max(
                lessonLaneMinHeight,
                laneCount * lessonLaneMinHeight,
              );

              return (
                <div
                  key={day}
                  className="relative grid items-stretch border-b border-gray-100 last:border-b-0"
                  style={{
                    gridTemplateColumns,
                    gridTemplateRows: `repeat(${laneCount}, minmax(${lessonLaneMinHeight}px, auto))`,
                    minHeight: `${rowHeight}px`,
                  }}
                >
                  <div
                    className="sticky left-0 z-30 flex items-center justify-center border-r border-gray-100 bg-gray-50/95 px-1 text-[10px] font-semibold text-gray-500"
                    style={{ gridColumn: 1, gridRow: `1 / ${laneCount + 1}` }}
                  >
                    {day}
                  </div>

                  {timeBoundaries
                    .slice(0, -1)
                    .map((timeBoundary, timeIndex) => (
                      <div
                        key={`${day}-${timeBoundary}`}
                        className="pointer-events-none relative z-20 border-r border-gray-100 last:border-r-0"
                        style={{
                          gridColumn: timeIndex + 2,
                          gridRow: `1 / ${laneCount + 1}`,
                        }}
                      />
                    ))}

                  {placedLessons.map((placedLesson) => {
                    const lessonStyle: CSSProperties = {
                      alignSelf: 'stretch',
                      gridColumn: `${placedLesson.startIndex + 2} / ${placedLesson.endIndex + 2}`,
                      gridRow: placedLesson.lane + 1,
                      marginLeft: '3px',
                      marginRight: '3px',
                      marginTop: '3px',
                      marginBottom: '3px',
                    };
                    const handleSelect =
                      placedLesson.variant === 'available'
                        ? () =>
                            selectAvailableLesson(
                              placedLesson.module,
                              placedLesson.lesson,
                            )
                        : () =>
                            selectCurrentLesson(
                              placedLesson.module,
                              placedLesson.lesson,
                            );

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
          isDownloadDisabled={
            isLoadingSemesters ||
            isLoadingTimetable ||
            Boolean(currentLoadError) ||
            selectedLessonsForDownload.length === 0
          }
          onDownload={downloadTimetableImage}
          onPrevious={showPreviousSemester}
          onNext={showNextSemester}
        />
      ) : null}

      {downloadError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {downloadError}
        </div>
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
