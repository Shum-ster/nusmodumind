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

  const semester = {
    id: '11111111-1111-1111-1111-111111111111',
    acadYear: '2026/2027',
    semesterNumber: 1,
    userId: '22222222-2222-2222-2222-222222222222',
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

  it('creates a semester', async () => {
    const dto: CreateSemesterDto = {
      acadYear: '2026/2027',
      semesterNumber: 1,
      userId: semester.userId,
    };

    await expect(controller.create(dto)).resolves.toEqual(semester);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('finds a user plan', async () => {
    await expect(controller.findUserPlan(semester.userId)).resolves.toEqual([
      semester,
    ]);
    expect(service.findUserPlan).toHaveBeenCalledWith(semester.userId);
  });

  it('finds one semester', async () => {
    await expect(controller.findOne(semester.id)).resolves.toEqual(semester);
    expect(service.findOne).toHaveBeenCalledWith(semester.id);
  });

  it('updates a semester', async () => {
    const dto: UpdateSemesterDto = { semesterNumber: 2 };

    await expect(controller.update(semester.id, dto)).resolves.toEqual(semester);
    expect(service.update).toHaveBeenCalledWith(semester.id, dto);
  });

  it('removes a semester', async () => {
    await expect(controller.remove(semester.id)).resolves.toEqual(semester);
    expect(service.remove).toHaveBeenCalledWith(semester.id);
  });
});
