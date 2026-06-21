import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';

describe('SemestersController', () => {
  let controller: SemestersController;
  let service: {
    create: jest.Mock;
    findUserPlan: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'student@example.com',
  };
  const semester = {
    id: '11111111-1111-1111-1111-111111111111',
    acadYear: '2026/2027',
    semesterNumber: 1,
    userId: user.id,
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(semester),
      findUserPlan: jest.fn().mockResolvedValue([semester]),
      findOne: jest.fn().mockResolvedValue(semester),
      update: jest.fn().mockResolvedValue(semester),
      remove: jest.fn().mockResolvedValue(semester),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SemestersController],
      providers: [{ provide: SemestersService, useValue: service }],
    }).compile();

    controller = module.get<SemestersController>(SemestersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a semester for the current user', async () => {
    const dto: CreateSemesterDto = {
      acadYear: '2026/2027',
      semesterNumber: 1,
    };

    await expect(controller.create(user, dto)).resolves.toEqual(semester);
    expect(service.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('finds the current user plan', async () => {
    await expect(controller.findUserPlan(user, user.id)).resolves.toEqual([
      semester,
    ]);
    expect(service.findUserPlan).toHaveBeenCalledWith(user.id);
  });

  it('rejects access to another user plan', () => {
    expect(() =>
      controller.findUserPlan(user, '33333333-3333-3333-3333-333333333333'),
    ).toThrow(ForbiddenException);
  });

  it('finds one semester for the current user', async () => {
    await expect(controller.findOne(user, semester.id)).resolves.toEqual(
      semester,
    );
    expect(service.findOne).toHaveBeenCalledWith(semester.id, user.id);
  });

  it('updates a semester for the current user', async () => {
    const dto: UpdateSemesterDto = { semesterNumber: 2 };

    await expect(controller.update(user, semester.id, dto)).resolves.toEqual(
      semester,
    );
    expect(service.update).toHaveBeenCalledWith(semester.id, user.id, dto);
  });

  it('removes a semester for the current user', async () => {
    await expect(controller.remove(user, semester.id)).resolves.toEqual(
      semester,
    );
    expect(service.remove).toHaveBeenCalledWith(semester.id, user.id);
  });
});
