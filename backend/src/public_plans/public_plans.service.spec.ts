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
    user: {
      findUnique: jest.Mock;
    };
    publicPlan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
  };

  const plan = {
    id: '11111111-1111-1111-1111-111111111111',
    authorId: '22222222-2222-2222-2222-222222222222',
    title: 'Four-year CS plan',
    description: 'Balanced workload',
    planSnapshot: { semesters: [] },
    planImageDataUrl: 'data:image/png;base64,plan',
    coverImageDataUrl: null,
    upvotes: 3,
    viewCount: 12,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const authorSelect = {
    username: true,
    faculty: true,
    degree: true,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          degree: 'Computer Science',
          faculty: 'School of Computing',
        }),
      },
      publicPlan: {
        create: jest.fn().mockResolvedValue(plan),
        findMany: jest.fn().mockResolvedValue([plan]),
        findUnique: jest.fn().mockResolvedValue(plan),
        delete: jest.fn().mockResolvedValue(plan),
        update: jest.fn().mockResolvedValue({ ...plan, viewCount: 13 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPlansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PublicPlansService>(PublicPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a public plan for the current user', async () => {
    const data = {
      title: plan.title,
      description: plan.description,
      planSnapshot: plan.planSnapshot,
      planImageDataUrl: plan.planImageDataUrl,
      coverImageDataUrl: plan.coverImageDataUrl,
    };

    prisma.publicPlan.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(plan.authorId, data)).resolves.toEqual(plan);
    expect(prisma.publicPlan.findUnique).toHaveBeenCalledWith({
      where: { authorId: plan.authorId },
      select: { id: true },
    });
    expect(prisma.publicPlan.create).toHaveBeenCalledWith({
      data: { ...data, authorId: plan.authorId },
    });
  });

  it('rejects creating a public plan without faculty and major', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      degree: null,
      faculty: 'School of Computing',
    });

    await expect(
      service.create(plan.authorId, {
        title: plan.title,
        description: plan.description,
        planSnapshot: plan.planSnapshot,
        planImageDataUrl: plan.planImageDataUrl,
        coverImageDataUrl: plan.coverImageDataUrl,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.publicPlan.create).not.toHaveBeenCalled();
  });

  it('rejects creating a second public plan for the same user', async () => {
    await expect(
      service.create(plan.authorId, {
        title: plan.title,
        description: plan.description,
        planSnapshot: plan.planSnapshot,
        planImageDataUrl: plan.planImageDataUrl,
        coverImageDataUrl: plan.coverImageDataUrl,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.publicPlan.create).not.toHaveBeenCalled();
  });

  it('finds all public plans ordered by upvotes with author profile', async () => {
    await expect(service.findAll()).resolves.toEqual([plan]);
    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { upvotes: 'desc' },
      include: {
        author: { select: authorSelect },
      },
    });
  });

  it('filters public plans by author faculty', async () => {
    await service.findAll({ faculty: 'Computing' });

    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          author: {
            faculty: 'Computing',
          },
        },
      }),
    );
  });

  it('filters public plans by author degree', async () => {
    await service.findAll({ degree: 'Computer Science' });

    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          author: {
            degree: 'Computer Science',
          },
        },
      }),
    );
  });

  it('filters public plans by author faculty and degree', async () => {
    await service.findAll({
      degree: 'Computer Science',
      faculty: 'Computing',
    });

    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          author: {
            degree: 'Computer Science',
            faculty: 'Computing',
          },
        },
      }),
    );
  });

  it('filters public plans by author faculty and degree aliases', async () => {
    await service.findAll({
      degrees: ['Common Computer Science Programmes', 'Computer Science'],
      faculties: ['School of Computing', 'Computing'],
    });

    expect(prisma.publicPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          author: {
            degree: {
              in: ['Common Computer Science Programmes', 'Computer Science'],
            },
            faculty: {
              in: ['School of Computing', 'Computing'],
            },
          },
        },
      }),
    );
  });

  it('finds one public plan for display and increments views', async () => {
    await expect(service.findOne(plan.id)).resolves.toEqual({
      ...plan,
      viewCount: 13,
    });
    expect(prisma.publicPlan.update).toHaveBeenCalledWith({
      where: { id: plan.id },
      data: { viewCount: { increment: 1 } },
      include: {
        author: { select: authorSelect },
        reviews: {
          include: { user: { select: authorSelect } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  });

  it('finds one public plan without incrementing views for internal checks', async () => {
    await expect(service.findOneWithoutViewIncrement(plan.id)).resolves.toEqual(
      plan,
    );
    expect(prisma.publicPlan.findUnique).toHaveBeenCalledWith({
      where: { id: plan.id },
      include: {
        author: { select: authorSelect },
        reviews: {
          include: { user: { select: authorSelect } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    expect(prisma.publicPlan.update).not.toHaveBeenCalled();
  });

  it('finds the current user public plan without incrementing views', async () => {
    await expect(service.findCurrentUserPlan(plan.authorId)).resolves.toEqual(
      plan,
    );
    expect(prisma.publicPlan.findUnique).toHaveBeenCalledWith({
      where: { authorId: plan.authorId },
      include: {
        author: { select: authorSelect },
        reviews: {
          include: { user: { select: authorSelect } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    expect(prisma.publicPlan.update).not.toHaveBeenCalled();
  });

  it('updates an existing public plan for the author', async () => {
    const update = {
      title: 'Updated plan',
      description: 'Updated description',
      planSnapshot: { semesters: [{ modules: [] }] },
      planImageDataUrl: 'data:image/png;base64,next',
      coverImageDataUrl: 'data:image/png;base64,cover',
    };

    prisma.publicPlan.update.mockResolvedValueOnce({ ...plan, ...update });

    await expect(
      service.update(plan.authorId, plan.id, update),
    ).resolves.toEqual({ ...plan, ...update });
    expect(prisma.publicPlan.update).toHaveBeenCalledWith({
      where: { id: plan.id },
      data: update,
    });
  });

  it('rejects updating another user public plan', async () => {
    await expect(
      service.update('33333333-3333-3333-3333-333333333333', plan.id, {
        title: 'Nope',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.publicPlan.update).not.toHaveBeenCalled();
  });

  it('throws when a public plan does not exist for display', async () => {
    prisma.publicPlan.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        clientVersion: 'test',
        code: 'P2025',
      }),
    );

    await expect(service.findOne(plan.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when an internal public plan lookup does not exist', async () => {
    prisma.publicPlan.findUnique.mockResolvedValue(null);

    await expect(
      service.findOneWithoutViewIncrement(plan.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes an existing public plan for the author', async () => {
    await expect(service.remove(plan.authorId, plan.id)).resolves.toEqual(plan);
    expect(prisma.publicPlan.delete).toHaveBeenCalledWith({
      where: { id: plan.id },
    });
    expect(prisma.publicPlan.update).not.toHaveBeenCalled();
  });

  it('rejects deleting another user public plan', async () => {
    await expect(
      service.remove('33333333-3333-3333-3333-333333333333', plan.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
