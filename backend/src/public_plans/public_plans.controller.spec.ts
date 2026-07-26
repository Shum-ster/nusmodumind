import { Test, TestingModule } from '@nestjs/testing';
import { PublicPlansController } from './public_plans.controller';
import { PublicPlansService } from './public_plans.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';

describe('PublicPlansController', () => {
  let controller: PublicPlansController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findCurrentUserPlan: jest.Mock;
    findOne: jest.Mock;
    getLikeState: jest.Mock;
    like: jest.Mock;
    unlike: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'student@example.com',
  };
  const plan = {
    id: '11111111-1111-1111-1111-111111111111',
    authorId: user.id,
    title: 'Four-year CS plan',
    description: 'Balanced workload',
    planSnapshot: { semesters: [] },
    planImageDataUrl: 'data:image/png;base64,plan',
    coverImageDataUrl: null,
    upvotes: 3,
    viewCount: 12,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(plan),
      findAll: jest.fn().mockResolvedValue({ items: [plan], nextPage: null }),
      findCurrentUserPlan: jest.fn().mockResolvedValue(plan),
      findOne: jest.fn().mockResolvedValue(plan),
      getLikeState: jest.fn().mockResolvedValue({
        canLike: true,
        liked: false,
        upvotes: 0,
      }),
      like: jest.fn().mockResolvedValue({
        canLike: true,
        liked: true,
        upvotes: 1,
      }),
      unlike: jest.fn().mockResolvedValue({
        canLike: true,
        liked: false,
        upvotes: 0,
      }),
      update: jest.fn().mockResolvedValue(plan),
      remove: jest.fn().mockResolvedValue(plan),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPlansController],
      providers: [{ provide: PublicPlansService, useValue: service }],
    }).compile();

    controller = module.get<PublicPlansController>(PublicPlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a public plan for the current user', async () => {
    const dto: CreatePublicPlanDto = {
      title: plan.title,
      description: plan.description,
      planSnapshot: plan.planSnapshot,
      planImageDataUrl: plan.planImageDataUrl,
      coverImageDataUrl: plan.coverImageDataUrl,
    };

    await expect(controller.create(user, dto)).resolves.toEqual(plan);
    expect(service.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('finds all public plans', async () => {
    await expect(controller.findAll()).resolves.toEqual({
      items: [plan],
      nextPage: null,
    });
    expect(service.findAll).toHaveBeenCalledWith({
      degree: undefined,
      degrees: undefined,
      faculties: undefined,
      faculty: undefined,
      page: undefined,
    });
  });

  it('passes marketplace filters to the service', async () => {
    await expect(
      controller.findAll('Computing', 'Computer Science'),
    ).resolves.toEqual({ items: [plan], nextPage: null });
    expect(service.findAll).toHaveBeenCalledWith({
      degree: 'Computer Science',
      degrees: undefined,
      faculties: undefined,
      faculty: 'Computing',
      page: undefined,
    });
  });

  it('passes marketplace alias filters to the service', async () => {
    await expect(
      controller.findAll(
        undefined,
        undefined,
        'School of Computing|Computing',
        'Common Computer Science Programmes|Computer Science',
      ),
    ).resolves.toEqual({ items: [plan], nextPage: null });
    expect(service.findAll).toHaveBeenCalledWith({
      degree: undefined,
      degrees: ['Common Computer Science Programmes', 'Computer Science'],
      faculties: ['School of Computing', 'Computing'],
      faculty: undefined,
      page: undefined,
    });
  });

  it('parses the requested marketplace page', async () => {
    await controller.findAll(undefined, undefined, undefined, undefined, '3');

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3 }),
    );
  });

  it('finds one public plan', async () => {
    await expect(controller.findOne(plan.id)).resolves.toEqual(plan);
    expect(service.findOne).toHaveBeenCalledWith(plan.id);
  });

  it('finds the current user public plan', async () => {
    await expect(controller.findCurrentUserPlan(user)).resolves.toEqual(plan);
    expect(service.findCurrentUserPlan).toHaveBeenCalledWith(user.id);
  });

  it('gets, creates, and removes the current user like', async () => {
    await controller.getLikeState(user, plan.id);
    await controller.like(user, plan.id);
    await controller.unlike(user, plan.id);

    expect(service.getLikeState).toHaveBeenCalledWith(user.id, plan.id);
    expect(service.like).toHaveBeenCalledWith(user.id, plan.id);
    expect(service.unlike).toHaveBeenCalledWith(user.id, plan.id);
  });

  it('updates a public plan for the current user', async () => {
    const dto = { title: 'Updated plan' };

    await expect(controller.update(user, plan.id, dto)).resolves.toEqual(plan);
    expect(service.update).toHaveBeenCalledWith(user.id, plan.id, dto);
  });

  it('removes a public plan for the current user', async () => {
    await expect(controller.remove(user, plan.id)).resolves.toEqual(plan);
    expect(service.remove).toHaveBeenCalledWith(user.id, plan.id);
  });
});
