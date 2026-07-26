'use client';

import { Heart, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import {
  getPublicPlanLikeState,
  likePublicPlan,
  unlikePublicPlan,
} from '../popular-choices-api';

type PublicPlanLikeButtonProps = {
  initialUpvotes: number;
  planId: string;
};

export function PublicPlanLikeButton({
  initialUpvotes,
  planId,
}: PublicPlanLikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [canLike, setCanLike] = useState(true);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignoreResult = false;

    async function loadLikeState() {
      const token = getToken();

      if (!token) {
        if (!ignoreResult) {
          setCanLike(false);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const state = await getPublicPlanLikeState(token, planId);

        if (!ignoreResult) {
          setLiked(state.liked);
          setCanLike(state.canLike);
          setUpvotes(state.upvotes);
        }
      } catch (error) {
        if (!ignoreResult) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load like status.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadLikeState();

    return () => {
      ignoreResult = true;
    };
  }, [planId]);

  async function toggleLike() {
    const token = getToken();

    if (!token || !canLike || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const state = liked
        ? await unlikePublicPlan(token, planId)
        : await likePublicPlan(token, planId);

      setLiked(state.liked);
      setCanLike(state.canLike);
      setUpvotes(state.upvotes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update this like.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  const disabledReason = !canLike
    ? 'You cannot like your own public plan.'
    : undefined;

  return (
    <div className="grid gap-1">
      <button
        type="button"
        aria-label={liked ? 'Unlike this public plan' : 'Like this public plan'}
        aria-pressed={liked}
        title={disabledReason}
        onClick={() => void toggleLike()}
        disabled={!canLike || isLoading}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" />
        ) : (
          <Heart
            className={`h-4 w-4 ${
              liked
                ? 'fill-orange-500 text-orange-500'
                : 'text-gray-500'
            }`}
          />
        )}
        {upvotes.toLocaleString()} {upvotes === 1 ? 'like' : 'likes'}
      </button>
      {errorMessage ? (
        <p role="alert" className="max-w-48 text-xs font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
