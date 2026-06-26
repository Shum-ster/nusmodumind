import type { CSSProperties } from 'react';
import type { TimetableLesson } from '../timetable-api';

type LessonSelectionVariant = 'selected' | 'available';

type LessonSelectionPalette = {
  active: string;
  available: string;
  availableHover: string;
  selected: string;
};

type LessonSelectionProps = {
  isActive: boolean;
  isPending: boolean;
  lesson: TimetableLesson;
  onSelect: () => void;
  palette: LessonSelectionPalette;
  style: CSSProperties;
  variant: LessonSelectionVariant;
};

export function LessonSelection({
  isActive,
  isPending,
  lesson,
  onSelect,
  palette,
  style,
  variant,
}: LessonSelectionProps) {
  const colorClass = variant === 'available' ? palette.available : palette.selected;
  const hoverClass = variant === 'available' ? palette.availableHover : '';
  const activeClass = isActive ? palette.active : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      style={style}
      className={`z-10 flex min-h-[84px] flex-col justify-between rounded border p-2 text-left text-xs font-medium shadow-sm transition ${colorClass} ${hoverClass} ${activeClass} ${isPending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-bold">{lesson.moduleCode}</span>
        <span className="shrink-0 rounded-sm bg-white/60 px-1.5 py-0.5 text-[10px] font-bold">
          {lesson.lessonType} {lesson.classNo}
        </span>
      </span>

      <span className="mt-1 grid gap-0.5">
        <span>{lesson.venue}</span>
        {lesson.weeks ? <span>Weeks {lesson.weeks}</span> : null}
      </span>
    </button>
  );
}

export type { LessonSelectionPalette, LessonSelectionVariant };
