'use client';

import { BookOpen, GraduationCap, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getModuleReviews,
  getNusModule,
  type ModuleReview,
  type NusModuleDetail,
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

type DetailRowProps = {
  label: string;
  value?: string | number | null;
};

function DetailRow({ label, value }: DetailRowProps) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-bold uppercase text-gray-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium leading-6 text-gray-900">{value}</dd>
    </div>
  );
}

function formatRating(rating: number) {
  return `${rating.toFixed(1)} / 5`;
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
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load this module.');
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

  if (!selectedModuleCode) {
    return (
      <div className="grid gap-5 text-gray-900">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">Courses</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Use the search bar in the top navigation to open a module detail page.
          </p>
        </section>

        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Module details, prerequisites, preclusions, semester availability, S/U status, and reviews will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <p className="text-sm font-medium text-gray-500">Loading {selectedModuleCode} details...</p>
      </div>
    );
  }

  if (errorMessage || !module) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 text-gray-900 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-950">{selectedModuleCode}</h1>
        <p className="mt-2 text-sm font-medium text-red-600">
          {errorMessage ?? 'Module details were not found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-950">{module.moduleCode}</h1>
              <span className="rounded border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">
                {module.moduleCredit} MC
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{module.title}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">{module.description}</p>
          </div>
          <CourseLastUpdated value={module.lastUpdated} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-gray-950">Course Details</h2>
          </div>
          <dl>
            <DetailRow label="Faculty" value={module.faculty} />
            <DetailRow label="Department" value={module.department} />
            <DetailRow label="Grading" value={module.gradingBasisDescription} />
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
              <article key={review.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-950">
                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                    {formatRating(review.rating)}
                  </div>
                  <p className="text-xs font-medium text-gray-500">
                    {formatCourseDateTime(review.createdAt)}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{review.content}</p>
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
}
