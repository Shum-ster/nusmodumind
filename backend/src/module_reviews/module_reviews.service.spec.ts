import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleReviewsService } from './module_reviews.service';

describe('ModuleReviewsService', () => {
  let service: ModuleReviewsService;
  let prisma: {
    moduleReview: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const review = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: '22222222-2222-2222-2222-222222222222',
    moduleCode: 'CS1010S',
    rating: 9,
    content: 'Good module',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      moduleReview: {
        create: jest.fn().mockResolvedValue(review),
        findMany: jest.fn().mockResolvedValue([review]),
        findUnique: jest.fn().mockResolvedValue(review),
        update: jest.fn().mockResolvedValue(review),
        delete: jest.fn().mockResolvedValue(review),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ModuleReviewsService>(ModuleReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a module review with uppercase module code for the current user', async () => {
    await expect(
      service.create(review.userId, {
        moduleCode: 'cs1010s',
        rating: 9,
        content: 'Good module',
      }),
    ).resolves.toEqual(review);
    expect(prisma.moduleReview.create).toHaveBeenCalledWith({
      data: {
        userId: review.userId,
        moduleCode: 'CS1010S',
        rating: 9,
        content: 'Good module',
      },
    });
  });

  it('finds reviews by uppercase module code ordered newest first', async () => {
    await expect(service.findByModule('cs1010s')).resolves.toEqual([review]);
    expect(prisma.moduleReview.findMany).toHaveBeenCalledWith({
      where: { moduleCode: 'CS1010S' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('finds one review', async () => {
    await expect(service.findOne(review.id)).resolves.toEqual(review);
    expect(prisma.moduleReview.findUnique).toHaveBeenCalledWith({
      where: { id: review.id },
    });
  });

  it('throws when a review does not exist', async () => {
    prisma.moduleReview.findUnique.mockResolvedValue(null);

    await expect(service.findOne(review.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates an existing review with uppercase module code for the owner', async () => {
    await expect(
      service.update(review.userId, review.id, {
        moduleCode: 'ma1521',
        rating: 8,
      }),
    ).resolves.toEqual(review);
    expect(prisma.moduleReview.update).toHaveBeenCalledWith({
      where: { id: review.id },
      data: {
        moduleCode: 'MA1521',
        rating: 8,
      },
    });
  });

  it('rejects review updates by another user', async () => {
    await expect(
      service.update('33333333-3333-3333-3333-333333333333', review.id, {
        rating: 8,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes an existing review for the owner', async () => {
    await expect(service.remove(review.userId, review.id)).resolves.toEqual(
      review,
    );
    expect(prisma.moduleReview.delete).toHaveBeenCalledWith({
      where: { id: review.id },
    });
  });
});
