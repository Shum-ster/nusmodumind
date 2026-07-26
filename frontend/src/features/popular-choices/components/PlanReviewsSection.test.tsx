import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveToken } from '@/features/auth/lib/token-storage';
import type { PlanReview } from '@/shared/types';
import { server } from '@/test/server';
import { PlanReviewsSection } from './PlanReviewsSection';

const profileMocks = vi.hoisted(() => ({
  useUserProfile: vi.fn(),
}));

vi.mock('@/features/user', () => ({
  useUserProfile: profileMocks.useUserProfile,
}));

const planId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';
const review: PlanReview = {
  id: '33333333-3333-3333-3333-333333333333',
  userId,
  publicPlanId: planId,
  rating: 8,
  content: 'Useful plan',
  createdAt: '2026-07-01T00:00:00.000Z',
  user: {
    username: 'Reviewer',
    faculty: 'School of Computing',
    degree: 'Computer Science',
  },
};

describe('PlanReviewsSection', () => {
  beforeEach(() => {
    saveToken('signed-jwt');
    profileMocks.useUserProfile.mockReturnValue({
      profile: { id: userId },
    });
  });

  it('creates the current user review', async () => {
    server.use(
      http.post('http://localhost:3001/plan-reviews', async ({ request }) => {
        const body = (await request.json()) as {
          content: string;
          publicPlanId: string;
          rating: number;
        };

        return HttpResponse.json(
          {
            ...review,
            content: body.content,
            publicPlanId: body.publicPlanId,
            rating: body.rating,
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    render(<PlanReviewsSection planId={planId} initialReviews={[]} />);
    await user.selectOptions(screen.getByLabelText('Rating'), '9');
    await user.type(screen.getByLabelText('Comment'), 'A balanced plan');
    await user.click(screen.getByRole('button', { name: 'Add review' }));

    expect(await screen.findByText('A balanced plan')).toBeVisible();
    expect(screen.getByText('Reviewer (you)')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Add review' }),
    ).not.toBeInTheDocument();
  });

  it('edits the current user review without changing its plan', async () => {
    server.use(
      http.patch(
        `http://localhost:3001/plan-reviews/${review.id}`,
        async ({ request }) => {
          const body = (await request.json()) as {
            content: string;
            rating: number;
          };
          return HttpResponse.json({ ...review, ...body });
        },
      ),
    );
    const user = userEvent.setup();

    render(<PlanReviewsSection planId={planId} initialReviews={[review]} />);
    await user.click(screen.getByRole('button', { name: 'Edit your review' }));
    await user.clear(screen.getByLabelText('Comment'));
    await user.type(screen.getByLabelText('Comment'), 'Updated review');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Updated review')).toBeVisible();
  });

  it('deletes the current user review after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.delete(
        `http://localhost:3001/plan-reviews/${review.id}`,
        () => HttpResponse.json(review),
      ),
    );
    const user = userEvent.setup();

    render(<PlanReviewsSection planId={planId} initialReviews={[review]} />);
    await user.click(
      screen.getByRole('button', { name: 'Delete your review' }),
    );

    expect(
      await screen.findByText(
        'No reviews have been added for this degree plan yet.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add review' })).toBeVisible();
  });

  it('keeps partial UI state and reports backend conflicts', async () => {
    server.use(
      http.post('http://localhost:3001/plan-reviews', () =>
        HttpResponse.json(
          { message: 'You already reviewed this public plan.' },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();

    render(<PlanReviewsSection planId={planId} initialReviews={[]} />);
    await user.type(screen.getByLabelText('Comment'), 'Duplicate');
    await user.click(screen.getByRole('button', { name: 'Add review' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You already reviewed this public plan.',
    );
    expect(screen.getByLabelText('Comment')).toHaveValue('Duplicate');
  });
});
