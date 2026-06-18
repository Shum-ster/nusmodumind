'use client';

import { useMemo, useState } from 'react';
import type { MockNusModule } from '@/features/dashboard/mockModules';
import type { SemesterKey, SemesterNumber, YearNumber } from '@/features/dashboard/DashboardModuleSelectionContext';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import { CurrentModuleLayout } from './components/currentModuleLayout';
import { ScrollFeature } from './components/scrollFeature';

type SemesterOption = {
  key: SemesterKey;
  semester: SemesterNumber;
  year: YearNumber;
};

type TimetableEvent = {
  module: MockNusModule;
  room: string;
  color: string;
};

type TimeSlot = {
  hour: number;
  label: string;
};

const semesterOptions: SemesterOption[] = [
  { key: 'year-1-semester-1', year: 1, semester: 1 },
  { key: 'year-1-semester-2', year: 1, semester: 2 },
  { key: 'year-2-semester-1', year: 2, semester: 1 },
  { key: 'year-2-semester-2', year: 2, semester: 2 },
  { key: 'year-3-semester-1', year: 3, semester: 1 },
  { key: 'year-3-semester-2', year: 3, semester: 2 },
  { key: 'year-4-semester-1', year: 4, semester: 1 },
  { key: 'year-4-semester-2', year: 4, semester: 2 },
];

const moduleEventColors = [
  'border-blue-300 bg-blue-100 text-blue-700',
  'border-emerald-300 bg-emerald-100 text-emerald-700',
  'border-purple-300 bg-purple-100 text-purple-700',
  'border-amber-300 bg-amber-100 text-amber-700',
  'border-rose-300 bg-rose-100 text-rose-700',
  'border-cyan-300 bg-cyan-100 text-cyan-700',
];

const mockRooms = ['COM1-0201', 'COM2-0413', 'LT19', 'I3-AUD', 'E-Learn', 'SR3'];
const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const defaultStartHour = 10;
const defaultEndHour = 17;

function formatHour(hour: number) {
  if (hour === 0) {
    return '12 AM';
  }

  if (hour === 12) {
    return '12 PM';
  }

  if (hour > 12) {
    return `${hour - 12} PM`;
  }

  return `${hour} AM`;
}

function buildTimeSlots(startHour = defaultStartHour, endHour = defaultEndHour): TimeSlot[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index;

    return {
      hour,
      label: formatHour(hour),
    };
  });
}

function buildTimetableSchedule(modules: MockNusModule[], days: string[], timeSlots: TimeSlot[]) {
  return modules.reduce<Record<string, TimetableEvent>>((schedule, module, moduleIndex) => {
    const day = days[moduleIndex % days.length];
    const timeSlot = timeSlots[moduleIndex % timeSlots.length];

    schedule[`${day}-${timeSlot.hour}`] = {
      module,
      room: mockRooms[moduleIndex % mockRooms.length],
      color: moduleEventColors[moduleIndex % moduleEventColors.length],
    };

    return schedule;
  }, {});
}

export function TimetablePage() {
  const { semesterModules } = useDashboardModuleSelection();
  const [activeSemesterIndex, setActiveSemesterIndex] = useState(0);
  const activeSemester = semesterOptions[activeSemesterIndex];
  const activeModules = semesterModules[activeSemester.key];
  const timetableTimeSlots = useMemo(() => buildTimeSlots(), []);

  const schedule = useMemo(
    () => buildTimetableSchedule(activeModules, timetableDays, timetableTimeSlots),
    [activeModules, timetableTimeSlots],
  );

  const showPreviousSemester = () => {
    setActiveSemesterIndex((currentIndex) => (
      currentIndex === 0 ? semesterOptions.length - 1 : currentIndex - 1
    ));
  };

  const showNextSemester = () => {
    setActiveSemesterIndex((currentIndex) => (
      currentIndex === semesterOptions.length - 1 ? 0 : currentIndex + 1
    ));
  };

  return (
    <div className="space-y-5">
      <ScrollFeature
        year={activeSemester.year}
        semester={activeSemester.semester}
        onPrevious={showPreviousSemester}
        onNext={showNextSemester}
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <div
          className="min-w-[900px]"
          style={{ gridTemplateColumns: `120px repeat(${timetableTimeSlots.length}, minmax(96px, 1fr))` }}
        >
          <div
            className="grid border-b border-gray-200 bg-gray-50 text-center text-sm font-semibold text-gray-600"
            style={{ gridTemplateColumns: `120px repeat(${timetableTimeSlots.length}, minmax(96px, 1fr))` }}
          >
            <div className="flex min-h-12 items-center justify-center border-r border-gray-200">Day</div>
            {timetableTimeSlots.map((timeSlot) => (
              <div
                key={timeSlot.hour}
                className="flex min-h-12 items-center justify-center border-r border-gray-100 last:border-r-0"
              >
                {timeSlot.label}
              </div>
            ))}
          </div>

          <div>
            {timetableDays.map(day => (
              <div
                key={day}
                className="grid min-h-[104px] items-stretch border-b border-gray-100 last:border-b-0"
                style={{ gridTemplateColumns: `120px repeat(${timetableTimeSlots.length}, minmax(96px, 1fr))` }}
              >
                <div className="flex items-center justify-center border-r border-gray-100 bg-gray-50/50 px-3 text-sm font-semibold text-gray-500">
                  {day}
                </div>
                {timetableTimeSlots.map((timeSlot) => {
                  const slotKey = `${day}-${timeSlot.hour}`;
                  const event = schedule[slotKey];

                  return (
                    <div key={slotKey} className="flex flex-col justify-center border-r border-gray-100 p-2 last:border-r-0">
                      {event ? (
                        <div className={`rounded border p-2 text-xs ${event.color}`}>
                          <p className="font-bold">{event.module.code}</p>
                          <p className="mt-1 line-clamp-2 font-medium opacity-90">{event.module.title}</p>
                          <p className="opacity-80">{event.room}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CurrentModuleLayout modules={activeModules} />
    </div>
  );
}
