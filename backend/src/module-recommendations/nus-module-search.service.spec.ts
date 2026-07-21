import { PrismaService } from '../prisma/prisma.service';
import { searchNusModulesInputSchema } from './module-recommendation.schemas';
import { NusModuleSearchService } from './nus-module-search.service';

describe('NusModuleSearchService', () => {
  let findMany: jest.Mock;
  let service: NusModuleSearchService;

  const moduleRow = {
    moduleCode: 'CS2030S',
    title: 'Programming Methodology II',
    description: 'A'.repeat(700),
    moduleCredit: '4',
    faculty: 'School of Computing',
    department: 'Computer Science',
    prerequisite: 'CS1010S',
    preclusion: null,
    corequisite: null,
    workload: [2, 1, 1, 3, 3],
    semesterData: [{ semester: 1 }, { semester: 2 }],
    gradingBasisDescription: 'Graded',
    attributes: { su: false, year: 2, label: 'technical' },
  };

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([moduleRow]);
    service = new NusModuleSearchService({
      nusModule: { findMany },
    } as unknown as PrismaService);
  });

  it('queries bounded supported filters and returns compact rows', async () => {
    const result = await service.search({
      moduleCodes: ['cs2030s'],
      moduleCodePrefixes: ['is'],
      searchText: 'programming',
      faculty: 'Computing',
      department: 'Computer Science',
      semester: 1,
      limit: 10,
    });

    const query = getCallArgument<{
      take: number;
      where: {
        faculty: { contains: string; mode: string };
        department: { contains: string; mode: string };
        OR: unknown[];
      };
    }>(findMany);

    expect(query.take).toBe(100);
    expect(query.where.faculty).toEqual({
      contains: 'Computing',
      mode: 'insensitive',
    });
    expect(query.where.department).toEqual({
      contains: 'Computer Science',
      mode: 'insensitive',
    });
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { moduleCode: { in: ['CS2030S'] } },
        { moduleCode: { startsWith: 'IS', mode: 'insensitive' } },
      ]),
    );
    expect(result).toEqual([
      expect.objectContaining({
        moduleCode: 'CS2030S',
        moduleCredit: 4,
        workloadHours: 10,
        availableSemesters: [1, 2],
        attributes: { su: false, year: 2, label: 'technical' },
      }),
    ]);
    expect(result[0].description).toHaveLength(500);
    expect(result[0]).not.toHaveProperty('semesterData');
    expect(result[0]).not.toHaveProperty('workload');
  });

  it('filters modules that are not offered in the requested semester', async () => {
    findMany.mockResolvedValue([
      { ...moduleRow, semesterData: [{ semester: 2 }] },
    ]);

    await expect(
      service.search({
        moduleCodes: ['CS2030S'],
        moduleCodePrefixes: null,
        searchText: null,
        faculty: null,
        department: null,
        semester: 1,
        limit: 25,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects empty searches and result limits above 25', () => {
    expect(
      searchNusModulesInputSchema.safeParse({
        moduleCodes: null,
        moduleCodePrefixes: null,
        searchText: null,
        faculty: null,
        department: null,
        semester: 1,
        limit: 25,
      }).success,
    ).toBe(false);
    expect(
      searchNusModulesInputSchema.safeParse({
        moduleCodes: ['CS'],
        moduleCodePrefixes: null,
        searchText: null,
        faculty: null,
        department: null,
        semester: null,
        limit: 26,
      }).success,
    ).toBe(false);
  });
});

function getCallArgument<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as unknown[][];

  return calls[0][0] as T;
}
