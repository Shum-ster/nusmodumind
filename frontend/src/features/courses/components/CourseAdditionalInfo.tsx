'use client';

import { Check, X } from 'lucide-react';
import { isModuleSuEligible } from '@/features/dashboard/dashboard-grades';
import { getSemesterData } from '../course-utils';

type CourseAdditionalInfoProps = {
  attributes: unknown;
  semesterData: unknown;
};

type InfoLineProps = {
  isAvailable: boolean;
  text: string;
};

function getAttributeFlag(attributes: unknown, key: 'mpes1' | 'mpes2') {
  if (!attributes || typeof attributes !== 'object' || !(key in attributes)) {
    return null;
  }

  return (attributes as Record<string, unknown>)[key] === true;
}

function isIncludedInSemester(attributes: unknown, semesterData: unknown, semesterNumber: 1 | 2) {
  const attributeFlag = getAttributeFlag(attributes, semesterNumber === 1 ? 'mpes1' : 'mpes2');

  if (attributeFlag !== null) {
    return attributeFlag;
  }

  return getSemesterData(semesterData).some((semester) => Number(semester.semester) === semesterNumber);
}

function InfoLine({ isAvailable, text }: InfoLineProps) {
  const Icon = isAvailable ? Check : X;

  return (
    <li className="flex items-start gap-3 text-sm font-medium text-gray-700">
      <Icon
        className={`mt-0.5 h-5 w-5 flex-none ${isAvailable ? 'text-green-600' : 'text-red-600'}`}
        aria-hidden="true"
      />
      <span>{text}</span>
    </li>
  );
}

export function CourseAdditionalInfo({ attributes, semesterData }: CourseAdditionalInfoProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">Additional Information</h2>
      <ul className="mt-4 grid gap-3">
        <InfoLine
          isAvailable={isIncludedInSemester(attributes, semesterData, 1)}
          text="Included in Semester 1's Course Planning Exercise"
        />
        <InfoLine
          isAvailable={isIncludedInSemester(attributes, semesterData, 2)}
          text="Included in Semester 2's Course Planning Exercise"
        />
        <InfoLine
          isAvailable={isModuleSuEligible(attributes)}
          text="Has S/U option for Undergraduate students only"
        />
      </ul>
    </section>
  );
}
