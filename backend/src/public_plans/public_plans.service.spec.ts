import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPlansService } from './public_plans.service';

describe('PublicPlansService', () => {
  let service: PublicPlansService;
  let prisma: {
    publicPlan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };

  const plan = {
    id: '11111111-1111-1111-1111-111111111111',
    authorId: '22222222-2222-2222-2222-222222222222',
    title: 'Four-year CS plan',
    description: 'Balanced workload',
    planSnapshot: { semesters: [] },
    upvotes: 3,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const authorSelect = {
    username: true,
    faculty: true,
    degree: true,
  };

  beforeEach(async () => {
    prisma = {
      publicPlan: {
        create: jest.fn().mockResolvedValue(plan),
        findMany: jest.fn().mockResolvedValue([plan]),
        findUnique: jest.fn().mockResolvedValue(plan),
        delete: jest.fn().mockResolvedValue(plan),
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
    };

    await expect(service.create(plan.authorId, data)).resolves.toEqual(plan);
    expect(prisma.publicPlan.create).toHaveBeenCalledWith({
      data: { ...data, authorId: plan.authorId },
    });
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

  it('finds one public plan with author and reviews', async () => {
    await expect(service.findOne(plan.id)).resolves.toEqual(plan);
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
  });

  it('throws when a public plan does not exist', async () => {
    prisma.publicPlan.findUnique.mockResolvedValue(null);

    await expect(service.findOne(plan.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes an existing public plan for the author', async () => {
    await expect(service.remove(plan.authorId, plan.id)).resolves.toEqual(plan);
    expect(prisma.publicPlan.delete).toHaveBeenCalledWith({
      where: { id: plan.id },
    });
  });

  it('rejects deleting another user public plan', async () => {
    await expect(
      service.remove('33333333-3333-3333-3333-333333333333', plan.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
