'use client';

import { ArrowLeft, ImagePlus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getToken } from '@/features/auth/lib/token-storage';
import { useDashboardModuleSelection } from '@/features/dashboard/DashboardModuleSelectionContext';
import {
  buildDashboardPlanIssues,
  buildDashboardPlanSnapshot,
  formatDashboardPlanIssueMessage,
  renderDashboardPlanImage,
} from '@/features/dashboard/dashboard-plan-export';
import { useUserProfile } from '@/features/user';
import {
  deletePublicPlan,
  getCurrentUserPublicPlan,
  updatePublicPlan,
  type PublicPlanDetail,
} from './popular-choices-api';
import { readImageFileAsDataUrl } from './image-file';

export function MySubmittedDegreePlanPage() {
  const dashboardPlan = useDashboardModuleSelection();
  const { isLoadingProfile, profile } = useUserProfile();
  const [plan, setPlan] = useState<PublicPlanDetail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageDataUrl, setCoverImageDataUrl] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewImageUrl =
    coverImageDataUrl ?? plan?.coverImageDataUrl ?? plan?.planImageDataUrl;

  useEffect(() => {
    let ignoreResult = false;

    async function loadSubmittedPlan() {
      const token = getToken();

      if (!token) {
        if (!ignoreResult) {
          setErrorMessage('Your session has expired. Please log in again.');
          setIsLoading(false);
        }
        return;
      }

      try {
        const nextPlan = await getCurrentUserPublicPlan(token);

        if (ignoreResult) {
          return;
        }

        setPlan(nextPlan);
        setTitle(nextPlan?.title ?? '');
        setDescription(nextPlan?.description ?? '');
        setCoverImageDataUrl(nextPlan?.coverImageDataUrl ?? null);
      } catch (error) {
        if (!ignoreResult) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your submitted degree plan.',
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadSubmittedPlan();

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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    const token = getToken();

    if (!token) {
      setErrorMessage('Your session has expired. Please log in again.');
      return;
    }

    if (!plan) {
      setErrorMessage('You do not have a submitted degree plan yet.');
      return;
    }

    if (!profile?.faculty || !profile.degree) {
      setErrorMessage(
        'Add your faculty and major in Settings before updating your public degree plan.',
      );
      return;
    }

    const issueMessage = formatDashboardPlanIssueMessage(
      buildDashboardPlanIssues({
        exemptedModules: dashboardPlan.exemptedModules,
        semesterModules: dashboardPlan.semesterModules,
      }),
    );

    if (issueMessage) {
      setErrorMessage(issueMessage);
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Add a title before saving your degree plan.');
      return;
    }

    setIsSaving(true);

    try {
      const snapshot = buildDashboardPlanSnapshot(dashboardPlan);
      const planImageDataUrl = await renderDashboardPlanImage(snapshot);
      const updatedPlan = await updatePublicPlan(token, plan.id, {
        coverImageDataUrl,
        description: description.trim() || undefined,
        planImageDataUrl,
        planSnapshot: snapshot,
        title: title.trim(),
      });

      setPlan({
        ...plan,
        ...updatedPlan,
        author: plan.author,
        reviews: plan.reviews,
      });
      setStatusMessage('Submitted degree plan updated.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update your degree plan.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setStatusMessage(null);
    setErrorMessage(null);

    const token = getToken();

    if (!token) {
      setErrorMessage('Your session has expired. Please log in again.');
      return;
    }

    if (!plan) {
      return;
    }

    setIsDeleting(true);

    try {
      await deletePublicPlan(token, plan.id);
      setPlan(null);
      setTitle('');
      setDescription('');
      setCoverImageDataUrl(null);
      setStatusMessage('Submitted degree plan deleted.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete your degree plan.',
      );
    } finally {
      setIsDeleting(false);
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
          My Submitted Degree Plan
        </h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Manage your public library submission.
        </p>
      </section>

      {isLoading ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Loading submitted degree plan...
          </p>
        </section>
      ) : !plan ? (
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            You have not submitted a degree plan yet.
          </p>
          {statusMessage ? (
            <p className="mt-3 text-sm font-medium text-green-700">
              {statusMessage}
            </p>
          ) : null}
        </section>
      ) : (
        <form
          onSubmit={handleSave}
          className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-gray-700">
                Title
                <input
                  type="text"
                  value={title}
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

              {statusMessage ? (
                <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  {statusMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving || isDeleting || isLoadingProfile}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:bg-gray-300"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  disabled={isSaving || isDeleting}
                  onClick={handleDelete}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Current Cover</h2>
            {previewImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImageUrl}
                alt="Submitted degree plan preview"
                className="mt-4 w-full rounded-md border border-gray-200"
              />
            ) : (
              <div className="mt-4 flex min-h-64 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-500">
                No preview available.
              </div>
            )}
          </section>
        </form>
      )}
    </div>
  );
}
