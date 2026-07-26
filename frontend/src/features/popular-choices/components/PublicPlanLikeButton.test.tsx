import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { saveToken } from '@/features/auth/lib/token-storage';
import { server } from '@/test/server';
import { PublicPlanLikeButton } from './PublicPlanLikeButton';

const planId = '11111111-1111-1111-1111-111111111111';
const likeUrl = `http://localhost:3001/public-plans/${planId}/like`;

describe('PublicPlanLikeButton', () => {
  it('loads the current state and toggles a real like', async () => {
    let liked = false;
    saveToken('signed-jwt');
    server.use(
      http.get(likeUrl, () =>
        HttpResponse.json({ canLike: true, liked, upvotes: 2 }),
      ),
      http.put(likeUrl, () => {
        liked = true;
        return HttpResponse.json({ canLike: true, liked, upvotes: 3 });
      }),
    );
    const user = userEvent.setup();

    render(<PublicPlanLikeButton planId={planId} initialUpvotes={2} />);

    const button = await screen.findByRole('button', {
      name: 'Like this public plan',
    });
    expect(button).toHaveTextContent('2 likes');

    await user.click(button);

    expect(
      await screen.findByRole('button', {
        name: 'Unlike this public plan',
      }),
    ).toHaveTextContent('3 likes');
  });

  it('disables likes on the current user plan', async () => {
    saveToken('signed-jwt');
    server.use(
      http.get(likeUrl, () =>
        HttpResponse.json({ canLike: false, liked: false, upvotes: 0 }),
      ),
    );

    render(<PublicPlanLikeButton planId={planId} initialUpvotes={0} />);

    expect(
      await screen.findByRole('button', { name: 'Like this public plan' }),
    ).toBeDisabled();
  });

  it('keeps the count and reports a failed update', async () => {
    saveToken('signed-jwt');
    server.use(
      http.get(likeUrl, () =>
        HttpResponse.json({ canLike: true, liked: false, upvotes: 4 }),
      ),
      http.put(likeUrl, () =>
        HttpResponse.json({ message: 'Like unavailable' }, { status: 503 }),
      ),
    );
    const user = userEvent.setup();

    render(<PublicPlanLikeButton planId={planId} initialUpvotes={4} />);
    await user.click(
      await screen.findByRole('button', { name: 'Like this public plan' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Like unavailable',
    );
    expect(
      screen.getByRole('button', { name: 'Like this public plan' }),
    ).toHaveTextContent('4 likes');
  });
});
