import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from './public_plans.service';

describe('PublicPlansService', () => {
  let service: PublicPlansService;
  let prisma: {
    user: { findUnique: jest.Mock };
    publicPlan: {
      create: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    publicPlanLike: {
      count: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const authorId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';
  const planId = '11111111-1111-1111-1111-111111111111';
  const author = {
    degree: 'Computer Science',
    faculty: 'School of Computing',
    username: 'Student',
  };
  const plan = {
    id: planId,
    authorId,
    title: 'Four-year CS plan',
    description: 'Balanced workload',
    planSnapshot: { semesters: [] },
    planImageDataUrl: 'data:image/png;base64,plan',
    coverImageDataUrl: null,
    viewCount: 12,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    author,
    reviews: [],
    _count: { likes: 3 },
  };
  const listPlan = {
    id: plan.id,
    title: plan.title,
    coverImageDataUrl: plan.coverImageDataUrl,
    viewCount: plan.viewCount,
    createdAt: plan.createdAt,
    author,
    _count: { likes: 3 },
  };
  const authorSelect = {
    username: true,
    faculty: true,
    degree: true,
  };
  const detailInclude = {
    author: { select: authorSelect },
    reviews: {
      include: { user: { select: authorSelect } },
      orderBy: { createdAt: 'desc' },
    },
    _count: { select: { likes: true } },
  };
  const listSelect = {
    id: true,
    title: true,
    coverImageDataUrl: true,
    viewCount: true,
    createdAt: true,
    author: { select: authorSelect },
    _count: { select: { likes: true } },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(author),
      },
      publicPlan: {
        create: jest.fn().mockResolvedValue(plan),
        delete: jest.fn().mockResolvedValue(plan),
        findMany: jest.fn().mockResolvedValue([listPlan]),
        findUnique: jest.fn().mockResolvedValue(plan),
        update: jest
          .fn()
          .mockResolvedValue({ ...plan, viewCount: plan.viewCount + 1 }),
      },
      publicPlanLike: {
        count: jest.fn().mockResolvedValue(4),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPlansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PublicPlansService);
  });

  it('creates a detailed public plan with relation-backed upvotes', async () => {
    const data = {
      title: plan.title,
      description: plan.description,
      planSnapshot: plan.planSnapshot,
      planImageDataUrl: plan.planImageDataUrl,
      coverImageDataUrl: plan.coverImageDataUrl,
    };
    prisma.publicPlan.findUnique.mockResolvedValueOnce(null);

    await expect(service.create(authorId, data)).resolves.toEqual({
      ...plan,
      _count: undefined,
      upvotes: 3,
    });
    expect(prisma.publicPlan.create).toHaveBeenCalledWith({
      data: { ...data, authorId },
      include: detailInclude,
    });
  });

  it('rejects submission without a complete academic profile', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      degree: null,
      faculty: 'School of Computing',
    });

    await expect(
      service.create(authorId, {
        title: plan.title,
        planSnapshot: plan.planSnapshot,
        planImageDataUrl: plan.planImageDataUrl,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.publicPlan.create).not.toHaveBeenCalled();
  });

  it('rejects a second public plan for the same author', async () => {
    await expect(
      service.create(authorId, {
        title: plan.title,
        planSnapshot: plan.planSnapshot,
        planImageDataUrl: plan.planImageDataUrl,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a lightweight first page ordered by real likes', async () => {
    await expect(service.findAll()).resolves.toEqual({
      items: [
        {
          ...listPlan,
          _count: undefined,
          upvotes: 3,
        },
      ],
      nextPage: null,
    });
    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
      skip: 0,
      take: 21,
      select: listSelect,
    });
  });

  it('returns 20 records and a next page without list-detail fields', async () => {
    prisma.publicPlan.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        ...listPlan,
        id: `${index}`.padStart(36, '0'),
      })),
    );

    const result = await service.findAll({ page: 2 });

    expect(result.items).toHaveLength(20);
    expect(result.nextPage).toBe(3);
    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 21 }),
    );
    expect(result.items[0]).not.toHaveProperty('planSnapshot');
    expect(result.items[0]).not.toHaveProperty('description');
    expect(result.items[0]).not.toHaveProperty('reviews');
  });

  it('filters by current and legacy faculty and degree values', async () => {
    await service.findAll({
      degrees: ['Computer Science', 'Common Computer Science Programmes'],
      faculties: ['School of Computing', 'Computing'],
    });

    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          author: {
            degree: {
              in: ['Computer Science', 'Common Computer Science Programmes'],
            },
            faculty: {
              in: ['School of Computing', 'Computing'],
            },
          },
        },
      }),
    );
  });

  it('increments views only when fetching full plan detail', async () => {
    await expect(service.findOne(planId)).resolves.toEqual({
      ...plan,
      _count: undefined,
      viewCount: 13,
      upvotes: 3,
    });
    expect(prisma.publicPlan.update).toHaveBeenCalledWith({
      where: { id: planId },
      data: { viewCount: { increment: 1 } },
      include: detailInclude,
    });
  });

  it('returns a like state for an eligible user', async () => {
    prisma.publicPlan.findUnique.mockResolvedValueOnce({
      authorId,
      likes: [{ userId }],
      _count: { likes: 3 },
    });

    await expect(service.getLikeState(userId, planId)).resolves.toEqual({
      canLike: true,
      liked: true,
      upvotes: 3,
    });
  });

  it('idempotently likes a public plan and returns the canonical count', async () => {
    prisma.publicPlan.findUnique.mockResolvedValueOnce({
      authorId,
      likes: [],
      _count: { likes: 3 },
    });

    await expect(service.like(userId, planId)).resolves.toEqual({
      canLike: true,
      liked: true,
      upvotes: 4,
    });
    expect(prisma.publicPlanLike.upsert).toHaveBeenCalledWith({
      where: { userId_publicPlanId: { publicPlanId: planId, userId } },
      create: { publicPlanId: planId, userId },
      update: {},
    });
  });

  it('blocks an author from liking their own plan', async () => {
    prisma.publicPlan.findUnique.mockResolvedValueOnce({
      authorId,
      likes: [],
      _count: { likes: 0 },
    });

    await expect(service.like(authorId, planId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.publicPlanLike.upsert).not.toHaveBeenCalled();
  });

  it('idempotently removes a like', async () => {
    prisma.publicPlan.findUnique.mockResolvedValueOnce({
      authorId,
      likes: [{ userId }],
      _count: { likes: 4 },
    });
    prisma.publicPlanLike.count.mockResolvedValueOnce(3);

    await expect(service.unlike(userId, planId)).resolves.toEqual({
      canLike: true,
      liked: false,
      upvotes: 3,
    });
    expect(prisma.publicPlanLike.deleteMany).toHaveBeenCalledWith({
      where: { publicPlanId: planId, userId },
    });
  });

  it('throws when a like target does not exist', async () => {
    prisma.publicPlan.findUnique.mockResolvedValueOnce(null);

    await expect(service.getLikeState(userId, planId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only the author plan and returns full detail', async () => {
    const update = { title: 'Updated plan' };
    prisma.publicPlan.update.mockResolvedValueOnce({ ...plan, ...update });

    await expect(service.update(authorId, planId, update)).resolves.toEqual({
      ...plan,
      ...update,
      _count: undefined,
      upvotes: 3,
    });
    expect(prisma.publicPlan.update).toHaveBeenCalledWith({
      where: { id: planId },
      data: update,
      include: detailInclude,
    });
  });

  it('rejects updating or deleting another user plan', async () => {
    await expect(
      service.update(userId, planId, { title: 'Nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(userId, planId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('maps a missing detail update to not found', async () => {
    prisma.publicPlan.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        clientVersion: 'test',
        code: 'P2025',
      }),
    );

    await expect(service.findOne(planId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
