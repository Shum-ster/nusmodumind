'use client';

import {
  LoaderCircle,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import { useUserProfile } from '@/features/user';
import type { PlanReview } from '@/shared/types';
import {
  createPlanReview,
  deletePlanReview,
  updatePlanReview,
} from '../popular-choices-api';

type PlanReviewsSectionProps = {
  initialReviews: PlanReview[];
  planId: string;
};

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PlanReviewsSection({
  initialReviews,
  planId,
}: PlanReviewsSectionProps) {
  const { profile } = useUserProfile();
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState('8');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'save' | 'delete' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownReview = useMemo(
    () => reviews.find((review) => review.userId === profile?.id) ?? null,
    [profile?.id, reviews],
  );

  function beginEditing() {
    if (!ownReview) {
      return;
    }

    setRating(String(ownReview.rating));
    setContent(ownReview.content);
    setIsEditing(true);
    setErrorMessage(null);
  }

  function cancelEditing() {
    setRating('8');
    setContent('');
    setIsEditing(false);
    setErrorMessage(null);
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    const numericRating = Number(rating);
    const normalizedContent = content.trim();

    if (!token) {
      setErrorMessage('Log in again before saving a review.');
      return;
    }

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 10
    ) {
      setErrorMessage('Rating must be a whole number from 1 to 10.');
      return;
    }

    if (!normalizedContent) {
      setErrorMessage('Review content is required.');
      return;
    }

    setPendingAction('save');
    setErrorMessage(null);

    try {
      const savedReview =
        isEditing && ownReview
          ? await updatePlanReview(token, ownReview.id, {
              content: normalizedContent,
              rating: numericRating,
            })
          : await createPlanReview(token, {
              content: normalizedContent,
              publicPlanId: planId,
              rating: numericRating,
            });

      setReviews((currentReviews) => [
        savedReview,
        ...currentReviews.filter((review) => review.id !== savedReview.id),
      ]);
      setRating('8');
      setContent('');
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save this review.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function removeOwnReview() {
    if (
      !ownReview ||
      !window.confirm('Delete your review from this public plan?')
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      setErrorMessage('Log in again before deleting a review.');
      return;
    }

    setPendingAction('delete');
    setErrorMessage(null);

    try {
      await deletePlanReview(token, ownReview.id);
      setReviews((currentReviews) =>
        currentReviews.filter((review) => review.id !== ownReview.id),
      );
      cancelEditing();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete this review.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  const showForm = !ownReview || isEditing;
  const isPending = pendingAction !== null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-bold text-gray-950">Reviews</h2>
        </div>

        {ownReview && !isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={beginEditing}
              disabled={isPending}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-60"
              aria-label="Edit your review"
              title="Edit your review"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void removeOwnReview()}
              disabled={isPending}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              aria-label="Delete your review"
              title="Delete your review"
            >
              {pendingAction === 'delete' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={(event) => void saveReview(event)}
          className="mb-5 grid gap-3 border-b border-gray-200 pb-5"
        >
          <div className="grid gap-1 sm:max-w-32">
            <label
              htmlFor="plan-review-rating"
              className="text-sm font-bold text-gray-700"
            >
              Rating
            </label>
            <select
              id="plan-review-rating"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              disabled={isPending}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value} / 10
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid gap-1">
            <label
              htmlFor="plan-review-content"
              className="text-sm font-bold text-gray-700"
            >
              Comment
            </label>
            <textarea
              id="plan-review-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={isPending}
              rows={4}
              maxLength={2000}
              placeholder="Share what makes this plan useful."
              className="resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex min-h-9 items-center gap-2 rounded bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60"
            >
              {pendingAction === 'save' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {isEditing ? 'Save changes' : 'Add review'}
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isPending}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      {reviews.length > 0 ? (
        <div className="grid gap-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="break-words text-sm font-bold text-gray-950">
                  {review.user.username?.trim() || 'NUS student'}
                  {review.userId === profile?.id ? ' (you)' : ''}
                </p>
                <p className="text-xs font-medium text-gray-500">
                  {formatReviewDate(review.createdAt)}
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
  );
}
