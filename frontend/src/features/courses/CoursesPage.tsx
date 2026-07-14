'use client';

import { BookOpen, GraduationCap, Star } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { UIEvent } from 'react';
import {
  getModuleReviews,
  getNusModule,
  searchNusModules,
  type ModuleReview,
  type NusModuleDetail,
  type NusModuleListItem,
} from './courses-api';
import { CourseAdditionalInfo } from './components/CourseAdditionalInfo';
import { CourseLastUpdated } from './components/CourseLastUpdated';
import { CoursePreclusionAlerts } from './components/CoursePreclusionAlerts';
import { CourseWorkloadDiagram } from './components/CourseWorkloadDiagram';
import { PrerequisiteTree } from './components/PrerequisiteTree';
import { formatCourseDateTime } from './course-utils';

type CoursesPageProps = {
  selectedModuleCode?: string | null;
};

type ModuleCatalogProps = {
  selectedModuleCode?: string | null;
};

type DetailRowProps = {
  label: string;
  value?: string | number | null;
};

const moduleCatalogPageSize = 50;

function DetailRow({ label, value }: DetailRowProps) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-bold uppercase text-gray-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium leading-6 text-gray-900">
        {value}
      </dd>
    </div>
  );
}

function formatRating(rating: number) {
  return `${rating.toFixed(1)} / 10`;
}

function getReviewAuthor(review: ModuleReview) {
  return review.user?.username?.trim() || 'NUS student';
}

function ModuleCatalog({ selectedModuleCode }: ModuleCatalogProps) {
  const [modules, setModules] = useState<NusModuleListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moduleListError, setModuleListError] = useState<string | null>(null);

  const loadMoreModules = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setModuleListError(null);

    try {
      const response = await searchNusModules({
        cursor: nextCursor,
        limit: moduleCatalogPageSize,
      });

      setModules((currentModules) => [...currentModules, ...response.items]);
      setNextCursor(response.nextCursor);
    } catch (error) {
      setModuleListError(
        error instanceof Error ? error.message : 'Unable to load modules.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor]);

  useEffect(() => {
    let ignoreResult = false;

    async function loadInitialModules() {
      try {
        const response = await searchNusModules({
          limit: moduleCatalogPageSize,
        });

        if (!ignoreResult) {
          setModules(response.items);
          setNextCursor(response.nextCursor);
          setModuleListError(null);
        }
      } catch (error) {
        if (!ignoreResult) {
          setModuleListError(
            error instanceof Error ? error.message : 'Unable to load modules.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadInitialModules();

    return () => {
      ignoreResult = true;
    };
  }, []);

  function handleCatalogScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 160;

    if (isNearBottom && nextCursor && !isInitialLoading && !isLoadingMore) {
      void loadMoreModules();
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm">
      <div className="border-b border-gray-200 p-5">
        <h1 className="text-2xl font-bold text-gray-950">Courses</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Browse available modules and open the one you want to inspect.
        </p>
      </div>

      <div
        onScroll={handleCatalogScroll}
        className="max-h-[calc(100vh-13rem)] overflow-y-auto p-3"
      >
        {isInitialLoading ? (
          <p className="rounded border border-dashed border-gray-300 px-4 py-6 text-center text-sm font-medium text-gray-500">
            Loading modules...
          </p>
        ) : moduleListError && modules.length === 0 ? (
          <p className="rounded border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-700">
            {moduleListError}
          </p>
        ) : (
          <div className="grid gap-2">
            {modules.map((module) => {
              const isSelected = selectedModuleCode === module.moduleCode;

              return (
                <Link
                  key={module.moduleCode}
                  href={`/courses?module=${encodeURIComponent(module.moduleCode)}`}
                  className={`rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                    isSelected
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/60'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-orange-600">
                        {module.moduleCode}
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-gray-950">
                        {module.title}
                      </p>
                    </div>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600">
                      {module.moduleCredit} MC
                    </span>
                  </div>
                  <p className="mt-2 max-h-16 overflow-hidden text-sm leading-5 text-gray-600">
                    {module.description || 'No description available.'}
                  </p>
                </Link>
              );
            })}

            {moduleListError ? (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {moduleListError}
              </p>
            ) : null}

            {nextCursor ? (
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={loadMoreModules}
                className="rounded-md border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-70"
              >
                {isLoadingMore
                  ? 'Loading more modules...'
                  : 'Load more modules'}
              </button>
            ) : modules.length > 0 ? (
              <p className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                All loaded modules are shown.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

export function CoursesPage({ selectedModuleCode }: CoursesPageProps) {
  const [module, setModule] = useState<NusModuleDetail | null>(null);
  const [reviews, setReviews] = useState<ModuleReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedModuleCode) {
      return;
    }

    let ignoreResult = false;
    const moduleCode = selectedModuleCode;

    async function loadCourseDetails() {
      setIsLoading(true);
      setErrorMessage(null);
      setModule(null);
      setReviews([]);

      try {
        const [nextModule, nextReviews] = await Promise.all([
          getNusModule(moduleCode),
          getModuleReviews(moduleCode).catch(() => []),
        ]);

        if (!ignoreResult) {
          setModule(nextModule);
          setReviews(nextReviews);
        }
      } catch (error) {
        if (!ignoreResult) {
          setModule(null);
          setReviews([]);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load this module.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadCourseDetails();

    return () => {
      ignoreResult = true;
    };
  }, [selectedModuleCode]);

  const courseDetail = (() => {
    if (!selectedModuleCode) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-gray-900 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Select a module from the catalog to view prerequisites, semester
            availability, S/U status, and reviews.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Loading {selectedModuleCode} details...
          </p>
        </div>
      );
    }

    if (errorMessage || !module) {
      return (
        <div className="rounded-lg border border-red-200 bg-white p-6 text-gray-900 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">
            {selectedModuleCode}
          </h1>
          <p className="mt-2 text-sm font-medium text-red-600">
            {errorMessage ?? 'Module details were not found.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-5">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-950">
                  {module.moduleCode}
                </h1>
                <span className="rounded border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">
                  {module.moduleCredit} MC
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-gray-900">
                {module.title}
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
                {module.description}
              </p>
            </div>
            <CourseLastUpdated value={module.lastUpdated} />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold text-gray-950">
                Course Details
              </h2>
            </div>
            <dl>
              <DetailRow label="Faculty" value={module.faculty} />
              <DetailRow label="Department" value={module.department} />
              <DetailRow
                label="Grading"
                value={module.gradingBasisDescription}
              />
              <DetailRow label="Prerequisite" value={module.prerequisite} />
              <DetailRow label="Corequisite" value={module.corequisite} />
            </dl>
          </section>

          <CourseAdditionalInfo
            attributes={module.attributes}
            semesterData={module.semesterData}
          />
        </div>

        <CourseWorkloadDiagram workload={module.workload} />
        <CoursePreclusionAlerts preclusion={module.preclusion} />
        <PrerequisiteTree module={module} />

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-950">Student Reviews</h2>
          </div>

          {reviews.length > 0 ? (
            <div className="grid gap-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-gray-950">
                        {getReviewAuthor(review)}
                      </p>
                      <div className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-gray-950">
                        <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                        {formatRating(review.rating)}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-gray-500">
                      {formatCourseDateTime(review.createdAt)}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {review.content}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500">
              No reviews have been added for this module yet.
            </p>
          )}
        </section>
      </div>
    );
  })();

  return (
    <div className="grid items-start gap-5 text-gray-900 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
      <ModuleCatalog selectedModuleCode={selectedModuleCode} />
      <div className="min-w-0">{courseDetail}</div>
    </div>
  );
}
