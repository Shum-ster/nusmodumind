import { Test, TestingModule } from '@nestjs/testing';
import { NusmoduleController } from './nusmodule.controller';
import { NusmoduleService } from './nusmodule.service';

describe('NusmoduleController', () => {
  let controller: NusmoduleController;
  let service: Pick<NusmoduleService, 'findAll' | 'findOne'>;

  const nusModule = {
    moduleCode: 'CS1010S',
    title: 'Programming Methodology',
    description: null,
    moduleCredit: 4,
    department: 'Computer Science',
    faculty: 'School of Computing',
    prerequisite: null,
    preclusion: null,
    workload: null,
    semesterData: null,
    lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([nusModule]),
      findOne: jest.fn().mockResolvedValue(nusModule),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NusmoduleController],
      providers: [{ provide: NusmoduleService, useValue: service }],
    }).compile();

    controller = module.get<NusmoduleController>(NusmoduleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns all NUS modules', async () => {
    await expect(controller.findAll()).resolves.toEqual([nusModule]);
  });

  it('normalizes module code before lookup', async () => {
    await expect(controller.findOne(' cs1010s ')).resolves.toEqual(nusModule);
    expect(service.findOne).toHaveBeenCalledWith('CS1010S');
  });

  it('throws when the NUS module does not exist', async () => {
    jest.mocked(service.findOne).mockResolvedValue(null);

    await expect(controller.findOne('CS9999')).rejects.toThrow(
      'NUS module CS9999 was not found',
    );
  });
});
