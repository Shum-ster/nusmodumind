import { Test, TestingModule } from '@nestjs/testing';
import { NusmoduleController } from './nusmodule.controller';
import { NusmoduleService } from './nusmodule.service';

describe('NusmoduleController', () => {
  let controller: NusmoduleController;
  let service: Pick<NusmoduleService, 'findAll' | 'findOne'>;

  const nusModule = {
    moduleCode: 'CS1010S',
    title: 'Programming Methodology',
    description: 'Introductory programming module',
    moduleCredit: '4',
    department: 'Computer Science',
    faculty: 'School of Computing',
    gradingBasisDescription: 'Graded',
    prerequisite: null,
    preclusion: null,
    corequisite: null,
    workload: [2, 1, 1, 3, 3],
    semesterData: [{ semester: 1 }],
    attributes: null,
    lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
  };

  const paginatedResponse = {
    items: [
      {
        moduleCode: nusModule.moduleCode,
        title: nusModule.title,
        faculty: nusModule.faculty,
        department: nusModule.department,
        moduleCredit: nusModule.moduleCredit,
        prerequisite: nusModule.prerequisite,
        semesterData: nusModule.semesterData,
        workload: nusModule.workload,
        gradingBasisDescription: nusModule.gradingBasisDescription,
      },
    ],
    nextCursor: null,
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue(paginatedResponse),
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

  it('returns paginated NUS modules', async () => {
    await expect(
      controller.findAll(
        'CS1010S',
        'Computer Science',
        'School of Computing',
        '25',
        'CS',
        'programming',
      ),
    ).resolves.toEqual(paginatedResponse);
    expect(service.findAll).toHaveBeenCalledWith({
      cursor: 'CS1010S',
      department: 'Computer Science',
      faculty: 'School of Computing',
      limit: 25,
      moduleCodePrefix: 'CS',
      search: 'programming',
    });
  });

  it('ignores invalid limit values', async () => {
    await controller.findAll(undefined, undefined, undefined, 'invalid');

    expect(service.findAll).toHaveBeenCalledWith({
      cursor: undefined,
      department: undefined,
      faculty: undefined,
      limit: undefined,
      moduleCodePrefix: undefined,
      search: undefined,
    });
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
