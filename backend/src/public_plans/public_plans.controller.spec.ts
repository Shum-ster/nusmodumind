import { Test, TestingModule } from '@nestjs/testing';
import { PublicPlansController } from './public_plans.controller';
import { PublicPlansService } from './public_plans.service';
import { CreatePublicPlanDto } from './dto/create-public_plan.dto';

describe('PublicPlansController', () => {
  let controller: PublicPlansController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
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

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(plan),
      findAll: jest.fn().mockResolvedValue([plan]),
      findOne: jest.fn().mockResolvedValue(plan),
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

  it('creates a public plan', async () => {
    const dto: CreatePublicPlanDto = {
      authorId: plan.authorId,
      title: plan.title,
      description: plan.description,
      planSnapshot: plan.planSnapshot,
    };

    await expect(controller.create(dto)).resolves.toEqual(plan);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('finds all public plans', async () => {
    await expect(controller.findAll()).resolves.toEqual([plan]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('finds one public plan', async () => {
    await expect(controller.findOne(plan.id)).resolves.toEqual(plan);
    expect(service.findOne).toHaveBeenCalledWith(plan.id);
  });

  it('removes a public plan', async () => {
    await expect(controller.remove(plan.id)).resolves.toEqual(plan);
    expect(service.remove).toHaveBeenCalledWith(plan.id);
  });
});
