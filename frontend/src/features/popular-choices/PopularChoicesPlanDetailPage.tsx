'use client';

import { ArrowLeft, Eye, Heart, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPublicPlan, type PublicPlanDetail } from './popular-choices-api';

type PopularChoicesPlanDetailPageProps = {
  planId: string;
};

function formatPlanDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getAuthorLabel(plan: PublicPlanDetail) {
  return plan.author.username?.trim() || 'NUS student';
}

export function PopularChoicesPlanDetailPage({
  planId,
}: PopularChoicesPlanDetailPageProps) {
  const [plan, setPlan] = useState<PublicPlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignoreResult = false;

    async function loadPlan() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextPlan = await getPublicPlan(planId);

        if (!ignoreResult) {
          setPlan(nextPlan);
        }
      } catch (error) {
        if (!ignoreResult) {
          setPlan(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load this degree plan.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      ignoreResult = true;
    };
  }, [planId]);

  if (isLoading) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Loading degree plan...
        </p>
      </section>
    );
  }

  if (errorMessage || !plan) {
    return (
      <section className="rounded-lg border border-red-200 bg-white p-6 text-gray-900 shadow-sm">
        <Link
          href="/popular-choices"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Popular Choices
        </Link>
        <p className="text-sm font-medium text-red-600">
          {errorMessage ?? 'Degree plan not found.'}
        </p>
      </section>
    );
  }

  const coverImageUrl = plan.coverImageDataUrl || plan.planImageDataUrl;

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/popular-choices"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Popular Choices
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-950">{plan.title}</h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {getAuthorLabel(plan)}
              {plan.author.faculty ? ` - ${plan.author.faculty}` : ''}
              {plan.author.degree ? ` - ${plan.author.degree}` : ''}
            </p>
            {plan.description ? (
              <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-6 text-gray-700">
                {plan.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm font-bold text-gray-700 sm:grid-cols-2">
            <div className="inline-flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
              <Heart className="h-4 w-4 fill-orange-500 text-orange-500" />
              {plan.upvotes.toLocaleString()} likes
            </div>
            <div className="inline-flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
              <Eye className="h-4 w-4 text-gray-500" />
              {plan.viewCount.toLocaleString()} views
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs font-medium text-gray-500">
          Uploaded {formatPlanDate(plan.createdAt)}
        </p>
      </section>

      {coverImageUrl ? (
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt={`${plan.title} cover`}
            className="max-h-[28rem] w-full object-cover"
          />
        </section>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Degree Plan</h2>
        {plan.planImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.planImageDataUrl}
            alt={`${plan.title} degree plan`}
            className="mt-4 w-full rounded-md border border-gray-200"
          />
        ) : (
          <pre className="mt-4 max-h-[32rem] overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-5 text-gray-100">
            {JSON.stringify(plan.planSnapshot, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-bold text-gray-950">Reviews</h2>
        </div>

        {plan.reviews.length > 0 ? (
          <div className="grid gap-3">
            {plan.reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-bold text-gray-950">
                    {review.user.username?.trim() || 'NUS student'}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    {formatPlanDate(review.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm font-bold text-gray-950">
                  {review.rating.toFixed(1)} / 10
                </p>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                  {review.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500">
            No reviews have been added for this degree plan yet.
          </p>
        )}
      </section>
    </div>
  );
}
