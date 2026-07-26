import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/server';
import { PopularChoicesDegreePage } from './PopularChoicesDegreePage';
import { popularChoiceFaculties } from './popularChoicesData';

const faculty = popularChoiceFaculties.find(
  (candidate) => candidate.id === 'computing',
)!;
const degree = faculty.degrees.find(
  (candidate) => candidate.id === 'computer-science',
)!;

function listItem(id: string, title: string) {
  return {
    id,
    title,
    coverImageDataUrl: null,
    upvotes: 1,
    viewCount: 2,
    createdAt: '2026-07-01T00:00:00.000Z',
    author: {
      username: 'Student',
      faculty: faculty.title,
      degree: degree.title,
    },
  };
}

describe('PopularChoicesDegreePage', () => {
  it('appends lightweight paginated plans without duplicates', async () => {
    server.use(
      http.get('http://localhost:3001/public-plans', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');

        return page === '2'
          ? HttpResponse.json({
              items: [
                listItem('plan-1', 'Existing plan'),
                listItem('plan-2', 'Second plan'),
              ],
              nextPage: null,
            })
          : HttpResponse.json({
              items: [listItem('plan-1', 'Existing plan')],
              nextPage: 2,
            });
      }),
    );
    const user = userEvent.setup();

    render(<PopularChoicesDegreePage faculty={faculty} degree={degree} />);

    expect(await screen.findByText('Existing plan')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Load more plans' }));

    expect(await screen.findByText('Second plan')).toBeVisible();
    expect(screen.getAllByText('Existing plan')).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Load more plans' }),
    ).not.toBeInTheDocument();
  });
});
