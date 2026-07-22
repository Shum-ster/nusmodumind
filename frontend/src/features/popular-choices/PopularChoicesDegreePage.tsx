'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DegreePlanRail } from './components';
import { getPublicPlans, type PublicPlan } from './popular-choices-api';
import {
  getPopularChoiceDegreeFilterValues,
  getPopularChoiceFacultyFilterValues,
  type PopularChoiceDegree,
  type PopularChoiceFaculty,
} from './popularChoicesData';

type PopularChoicesDegreePageProps = {
  faculty: PopularChoiceFaculty;
  degree: PopularChoiceDegree;
};

export function PopularChoicesDegreePage({
  faculty,
  degree,
}: PopularChoicesDegreePageProps) {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignoreResult = false;

    async function loadUploadedPlans() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const uploadedPlans = await getPublicPlans({
          degrees: serializeFilterValues(
            getPopularChoiceDegreeFilterValues(degree),
          ),
          faculties: serializeFilterValues(
            getPopularChoiceFacultyFilterValues(faculty),
          ),
        });

        if (!ignoreResult) {
          setPlans(uploadedPlans);
        }
      } catch (error) {
        if (!ignoreResult) {
          setPlans([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load uploaded degree plans.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadUploadedPlans();

    return () => {
      ignoreResult = true;
    };
  }, [degree, faculty]);

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/popular-choices"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Select your degree
        </Link>
        <p className="text-sm font-bold uppercase text-gray-500">
          {faculty.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-950">
          {degree.title}
        </h1>
      </section>

      {isLoading ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Loading uploaded degree plans...
          </p>
        </section>
      ) : errorMessage ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-red-700">{errorMessage}</p>
        </section>
      ) : plans.length > 0 ? (
        <DegreePlanRail
          key={`${degree.id}-uploaded-plans`}
          title="Uploaded Degree Plans"
          plans={plans}
        />
      ) : (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            there are no degree plans uploaded yet
          </p>
        </section>
      )}
    </div>
  );
}

function serializeFilterValues(values: string[]) {
  return values.join('|');
}
