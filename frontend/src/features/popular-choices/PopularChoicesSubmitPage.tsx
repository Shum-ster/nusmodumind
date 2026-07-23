'use client';

import { ArrowLeft, ImagePlus, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import {
  buildDashboardPlanIssues,
  buildDashboardPlanSnapshot,
  formatDashboardPlanIssueMessage,
  readDashboardPlanDraft,
  renderDashboardPlanImage,
  type DashboardPlanDraft,
} from '@/features/dashboard/dashboard-plan-export';
import { useUserProfile } from '@/features/user';
import {
  createPublicPlan,
  getCurrentUserPublicPlan,
  type PublicPlanDetail,
} from './popular-choices-api';
import { readImageFileAsDataUrl } from './image-file';

export function PopularChoicesSubmitPage() {
  const dashboardPlan = useDashboardModuleSelection();
  const { isLoadingProfile, profile } = useUserProfile();
  const router = useRouter();
  const [draft, setDraft] = useState<DashboardPlanDraft | null>(null);
  const [existingPlan, setExistingPlan] = useState<PublicPlanDetail | null>(
    null,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageDataUrl, setCoverImageDataUrl] = useState<string | null>(
    null,
  );
  const [isPreparingDraft, setIsPreparingDraft] = useState(true);
  const [isCheckingExistingPlan, setIsCheckingExistingPlan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewImageUrl = coverImageDataUrl ?? draft?.planImageDataUrl ?? null;

  useEffect(() => {
    let ignoreResult = false;

    async function prepareDraft() {
      setIsPreparingDraft(true);
      setErrorMessage(null);

      try {
        const issues = buildDashboardPlanIssues({
          exemptedModules: dashboardPlan.exemptedModules,
          semesterModules: dashboardPlan.semesterModules,
        });
        const issueMessage = formatDashboardPlanIssueMessage(issues);

        if (issueMessage) {
          setDraft(null);
          setErrorMessage(issueMessage);
          return;
        }

        const storedDraft = readDashboardPlanDraft();

        if (storedDraft) {
          setDraft(storedDraft);
          return;
        }

        const snapshot = buildDashboardPlanSnapshot(dashboardPlan);
        const planImageDataUrl = await renderDashboardPlanImage(snapshot);

        if (!ignoreResult) {
          setDraft({ planImageDataUrl, snapshot });
        }
      } catch (error) {
        if (!ignoreResult) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to prepare the degree plan preview.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsPreparingDraft(false);
        }
      }
    }

    void prepareDraft();

    return () => {
      ignoreResult = true;
    };
  }, [dashboardPlan]);

  useEffect(() => {
    let ignoreResult = false;

    async function loadExistingPlan() {
      const token = getToken();

      if (!token) {
        if (!ignoreResult) {
          setIsCheckingExistingPlan(false);
        }
        return;
      }

      try {
        const plan = await getCurrentUserPublicPlan(token);

        if (!ignoreResult) {
          setExistingPlan(plan);
        }
      } catch {
        // The submission form can still surface create-time API errors.
      } finally {
        if (!ignoreResult) {
          setIsCheckingExistingPlan(false);
        }
      }
    }

    void loadExistingPlan();

    return () => {
      ignoreResult = true;
    };
  }, []);

  async function handleCoverImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setCoverImageDataUrl(null);
      return;
    }

    try {
      setCoverImageDataUrl(await readImageFileAsDataUrl(file));
      setErrorMessage(null);
    } catch (error) {
      setCoverImageDataUrl(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to read cover image.',
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const token = getToken();

    if (!token) {
      setErrorMessage('Your session has expired. Please log in again.');
      return;
    }

    if (!profile?.faculty || !profile.degree) {
      setErrorMessage(
        'Add your faculty and major in Settings before submitting a public degree plan.',
      );
      return;
    }

    if (existingPlan) {
      setErrorMessage(
        'You already submitted a degree plan. Use My Submitted Degree Plan to edit or delete it.',
      );
      return;
    }

    if (!draft) {
      setErrorMessage('The degree plan preview is not ready yet.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Add a title before submitting your degree plan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const plan = await createPublicPlan(token, {
        coverImageDataUrl,
        description: description.trim() || undefined,
        planImageDataUrl: draft.planImageDataUrl,
        planSnapshot: draft.snapshot,
        title: title.trim(),
      });

      router.push(`/popular-choices/plans/${encodeURIComponent(plan.id)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit this degree plan.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 text-gray-900">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-950">
          Upload to Popular Choices
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Submit your current dashboard plan to the public library.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]"
      >
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Title
              <input
                type="text"
                value={title}
                placeholder={
                  profile?.degree ? `${profile.degree} Degree Plan` : undefined
                }
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Description
              <textarea
                value={description}
                rows={5}
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 resize-y rounded-md border border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-gray-700">
              Cover Image
              <span className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-200">
                <ImagePlus className="h-4 w-4" />
                Choose optional cover
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                  className="sr-only"
                />
              </span>
            </label>

            {coverImageDataUrl ? (
              <button
                type="button"
                onClick={() => setCoverImageDataUrl(null)}
                className="justify-self-start text-sm font-bold text-orange-700 hover:text-orange-800"
              >
                Use degree plan image as cover
              </button>
            ) : null}

            {errorMessage ? (
              <p className="whitespace-pre-line rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {existingPlan ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                You already have a submitted degree plan. Edit or delete it from
                My Submitted Degree Plan.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                isPreparingDraft ||
                isCheckingExistingPlan ||
                isSubmitting ||
                isLoadingProfile ||
                Boolean(existingPlan)
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:bg-gray-300"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Degree Plan'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Preview</h2>
          {previewImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImageUrl}
              alt="Degree plan preview"
              className="mt-4 w-full rounded-md border border-gray-200"
            />
          ) : (
            <div className="mt-4 flex min-h-64 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-500">
              Preparing preview...
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
