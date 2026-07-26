'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DegreePlanRail } from './components';
import {
  getPublicPlans,
  type PublicPlanListItem,
} from './popular-choices-api';
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
  const [plans, setPlans] = useState<PublicPlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignoreResult = false;

    async function loadUploadedPlans() {
      setIsLoading(true);
      setNextPage(null);
      setErrorMessage(null);

      try {
        const response = await getPublicPlans({
          degrees: serializeFilterValues(
            getPopularChoiceDegreeFilterValues(degree),
          ),
          faculties: serializeFilterValues(
            getPopularChoiceFacultyFilterValues(faculty),
          ),
          page: 1,
        });

        if (!ignoreResult) {
          setPlans(response.items);
          setNextPage(response.nextPage);
        }
      } catch (error) {
        if (!ignoreResult) {
          setPlans([]);
          setNextPage(null);
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

  async function loadMorePlans() {
    if (!nextPage || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const response = await getPublicPlans({
        degrees: serializeFilterValues(
          getPopularChoiceDegreeFilterValues(degree),
        ),
        faculties: serializeFilterValues(
          getPopularChoiceFacultyFilterValues(faculty),
        ),
        page: nextPage,
      });

      setPlans((currentPlans) => {
        const existingIds = new Set(currentPlans.map((plan) => plan.id));
        return [
          ...currentPlans,
          ...response.items.filter((plan) => !existingIds.has(plan.id)),
        ];
      });
      setNextPage(response.nextPage);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load more degree plans.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

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
        <div className="grid gap-3">
          <DegreePlanRail
            key={`${degree.id}-uploaded-plans`}
            title="Uploaded Degree Plans"
            plans={plans}
          />
          {nextPage ? (
            <button
              type="button"
              onClick={() => void loadMorePlans()}
              disabled={isLoadingMore}
              className="justify-self-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoadingMore ? 'Loading more plans...' : 'Load more plans'}
            </button>
          ) : null}
        </div>
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
