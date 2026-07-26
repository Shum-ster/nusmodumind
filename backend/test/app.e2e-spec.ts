/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import { json, urlencoded } from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ModuleRecommendationService } from '../src/module-recommendations/module-recommendation.service';
import { OpenAiGateway } from '../src/openai/openai.gateway';
import { PrismaService } from '../src/prisma/prisma.service';
import { publicPlanRequestBodyLimit } from '../src/public_plans/public-plan-images.constants';

jest.setTimeout(120_000);

const password = 'test-password';
const planImageDataUrl = 'data:image/png;base64,AA==';
const degreeRequirementsModelOutput = {
  coreRequirements: [
    {
      allowsDoubleCounting: false,
      kind: 'CORE' as const,
      manualReviewReason: null,
      minimumCourses: 1,
      moduleCodes: ['CS1010S'],
      name: 'Programming Methodology',
      notes: null,
      requirementId: 'soc-programming-methodology',
      units: 4,
    },
  ],
  electiveBuckets: [],
};

const openAiGatewayFake = {
  async runStructuredWebSearch() {
    return {
      data: degreeRequirementsModelOutput,
      responseId: 'response-e2e',
      sources: [
        {
          title: 'NUS Computer Science curriculum',
          url: 'https://www.comp.nus.edu.sg/programmes/ug/cs/curr/',
        },
      ],
    };
  },
  async *streamTextGeneration() {
    yield 'Consider ';
    yield 'CS2100.';
  },
};

const moduleRecommendationServiceFake = {
  generate: jest.fn().mockResolvedValue({
    candidateCount: 1,
    generatedAt: '2026-07-26T00:00:00.000Z',
    recommendations: [
      {
        availableSemesters: [1, 2],
        cautions: [],
        lifestyleFit: 'Matches the requested workload.',
        matchedRequirementIds: ['soc-programming-methodology'],
        moduleCode: 'CS2100',
        moduleCredit: 4,
        rank: 1,
        rationale: 'Builds core computer organisation knowledge.',
        reviewSummary: { averageRating: 8, reviewCount: 1 },
        title: 'Computer Organisation',
        workloadHours: 10,
      },
    ],
    targetSemester: { acadYear: '2026/2027', semesterNumber: 1 },
    workflowVersion: 'module-recommendations-v1',
  }),
};

describe('Application API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    config({
      path: join(process.cwd(), '.env.test.local'),
      override: false,
      quiet: true,
    });
    const testDatabaseUrl = getSafeTestDatabaseUrl();

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.DIRECT_URL = testDatabaseUrl;
    process.env.JWT_SECRET = 'e2e-jwt-secret';
    process.env.NODE_ENV = 'test';

    execFileSync(
      join(process.cwd(), 'node_modules', '.bin', 'prisma'),
      ['migrate', 'deploy'],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'pipe',
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OpenAiGateway)
      .useValue(openAiGatewayFake)
      .overrideProvider(ModuleRecommendationService)
      .useValue(moduleRecommendationServiceFake)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.use(json({ limit: publicPlanRequestBodyLimit }));
    app.use(urlencoded({ extended: true, limit: publicPlanRequestBodyLimit }));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    moduleRecommendationServiceFake.generate.mockClear();
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "module_update_notifications",
        "plan_reviews",
        "public_plans",
        "module_reviews",
        "planned_modules",
        "semesters",
        "nus_modules",
        "users"
      RESTART IDENTITY CASCADE
    `);
    await prisma.nusModule.createMany({
      data: [
        {
          attributes: { su: true },
          department: 'Computer Science',
          description: 'Introduction to programming and problem solving.',
          faculty: 'Computing',
          moduleCode: 'CS1010S',
          moduleCredit: '4',
          semesterData: [{ semester: 1 }, { semester: 2 }],
          title: 'Programming Methodology',
          workload: [2, 1, 1, 3, 3],
        },
        {
          department: 'Computer Science',
          description: 'Digital logic and computer organisation.',
          faculty: 'Computing',
          moduleCode: 'CS2100',
          moduleCredit: '4',
          prerequisite: 'CS1010S',
          semesterData: [{ semester: 1 }, { semester: 2 }],
          title: 'Computer Organisation',
          workload: [2, 1, 1, 3, 3],
        },
        {
          department: 'Centre for Future-ready Graduates',
          description: 'Career catalyst.',
          faculty: 'NUS',
          gradingBasisDescription: 'CS/CU',
          moduleCode: 'CFG1002',
          moduleCredit: '2',
          semesterData: [{ semester: 1 }],
          title: 'Career Catalyst',
        },
      ],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers, logs in, reads and updates the authenticated profile', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'student@u.nus.edu', password })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ email: 'student@u.nus.edu' });
        expect(body.passwordHash).toBeUndefined();
      });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'student@u.nus.edu', password })
      .expect(409);

    const token = await login('student@u.nus.edu');

    await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          email: 'student@u.nus.edu',
          username: null,
        });
      });

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(auth(token))
      .send({ lifestylePreferences: 'No 8am classes', username: 'Student' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          lifestylePreferences: 'No 8am classes',
          username: 'Student',
        });
      });

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(auth(token))
      .send({
        degree: 'Computer Science',
        faculty: 'School of Computing',
        matriculationYear: 2026,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.academicProfileChangeAllowedAt).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get('/ai-planner/degree-requirements')
      .set(auth(token))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          academicYear: 'AY2026/2027',
          degree: 'Computer Science',
          promptVersion: 'degree-requirements-v2',
        });
      });

    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(auth(token))
      .send({ degree: 'Information Systems' })
      .expect(409);
  });

  it('validates authentication and request DTOs', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);

    await register('student@u.nus.edu');
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@u.nus.edu', password: 'wrong-password' })
      .expect(401);
  });

  it('searches and retrieves canonical NUS module data', async () => {
    await request(app.getHttpServer())
      .get('/nusmodule')
      .query({ limit: 1, moduleCodePrefix: 'cs' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(1);
        expect(body.items[0].moduleCode).toBe('CS1010S');
        expect(body.nextCursor).toBe('CS1010S');
      });

    await request(app.getHttpServer())
      .get('/nusmodule')
      .query({ search: 'organisation' })
      .expect(200)
      .expect(({ body }) => {
        expect(
          body.items.map((item: { moduleCode: string }) => item.moduleCode),
        ).toContain('CS2100');
      });

    await request(app.getHttpServer())
      .get('/nusmodule/cs2100')
      .expect(200)
      .expect(({ body }) => expect(body.title).toBe('Computer Organisation'));

    await request(app.getHttpServer()).get('/nusmodule/XX9999').expect(404);
  });

  it('performs semester and planned-module CRUD with ownership checks', async () => {
    const first = await createAuthenticatedUser('first@u.nus.edu');
    const second = await createAuthenticatedUser('second@u.nus.edu');

    const semester = await request(app.getHttpServer())
      .post('/semesters')
      .set(auth(first.token))
      .send({ acadYear: '2026/2027', semesterNumber: 1 })
      .expect(201)
      .then(({ body }) => body as { id: string });

    await request(app.getHttpServer())
      .post('/semesters')
      .set(auth(first.token))
      .send({ acadYear: '2026/2027', semesterNumber: 5 })
      .expect(400);

    const plannedModule = await request(app.getHttpServer())
      .post('/planned-modules')
      .set(auth(first.token))
      .send({
        actualGrade: 'A-',
        moduleCode: 'cs1010s',
        semesterId: semester.id,
        status: 'PLANNED',
      })
      .expect(201)
      .then(({ body }) => body as { id: string; moduleCode: string });
    expect(plannedModule.moduleCode).toBe('CS1010S');

    await request(app.getHttpServer())
      .get(`/semesters/${semester.id}`)
      .set(auth(first.token))
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(semester.id));

    await request(app.getHttpServer())
      .get(`/semesters/${semester.id}`)
      .set(auth(second.token))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/planned-modules/${plannedModule.id}`)
      .set(auth(second.token))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/planned-modules/${plannedModule.id}`)
      .set(auth(first.token))
      .send({
        actualGrade: 'S',
        selectedLessons: { Tutorial: '02' },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.actualGrade).toBe('S');
        expect(body.selectedLessons).toEqual({ Tutorial: '02' });
      });

    await request(app.getHttpServer())
      .post('/planned-modules')
      .set(auth(first.token))
      .send({ moduleCode: 'CFG1002', actualGrade: 'A', status: 'SELECTED' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/semesters/me/plan')
      .set(auth(first.token))
      .expect(200)
      .expect(({ body }) => {
        expect(body.semesters).toHaveLength(1);
        expect(body.plannedModules).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get(`/semesters/user/${first.id}`)
      .set(auth(second.token))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/semesters/${semester.id}`)
      .set(auth(first.token))
      .send({ semesterNumber: 2 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/planned-modules/${plannedModule.id}`)
      .set(auth(first.token))
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/semesters/${semester.id}`)
      .set(auth(first.token))
      .expect(200);
  });

  it('performs module-review CRUD and prevents cross-user changes', async () => {
    const author = await createAuthenticatedUser('author@u.nus.edu');
    const other = await createAuthenticatedUser('other@u.nus.edu');

    const review = await request(app.getHttpServer())
      .post('/module-reviews')
      .set(auth(author.token))
      .send({
        content: 'Clear lectures and fair assessments.',
        moduleCode: 'cs1010s',
        rating: 9,
      })
      .expect(201)
      .then(({ body }) => body as { id: string });

    await request(app.getHttpServer())
      .get('/module-reviews/module/CS1010S')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].user).toEqual({ username: null });
        expect(body[0].user.email).toBeUndefined();
      });

    await request(app.getHttpServer())
      .get(`/module-reviews/${review.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/module-reviews/${review.id}`)
      .set(auth(other.token))
      .send({ rating: 2 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/module-reviews/${review.id}`)
      .set(auth(author.token))
      .send({ content: 'Updated review', rating: 8 })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/module-reviews/${review.id}`)
      .set(auth(author.token))
      .expect(200);

    await request(app.getHttpServer())
      .post('/module-reviews')
      .set(auth(author.token))
      .send({ content: 'Invalid rating', moduleCode: 'CS1010S', rating: 11 })
      .expect(400);
  });

  it('publishes, filters, updates, views, reviews, and deletes a public plan', async () => {
    const author = await createAuthenticatedUser('author@u.nus.edu');
    const reviewer = await createAuthenticatedUser('reviewer@u.nus.edu');
    await setAcademicProfile(author.id, 'Computer Science');
    await setAcademicProfile(reviewer.id, 'Information Systems');

    const plan = await request(app.getHttpServer())
      .post('/public-plans')
      .set(auth(author.token))
      .send({
        description: 'Four-year SOC plan',
        planImageDataUrl,
        planSnapshot: { semesters: [] },
        title: 'Computer Science Plan',
      })
      .expect(201)
      .then(({ body }) => body as { id: string });

    const incompleteProfile = await createAuthenticatedUser(
      'incomplete@u.nus.edu',
    );
    await request(app.getHttpServer())
      .post('/public-plans')
      .set(auth(incompleteProfile.token))
      .send({
        planImageDataUrl,
        planSnapshot: { semesters: [] },
        title: 'Incomplete Profile Plan',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/public-plans')
      .set(auth(author.token))
      .send({
        planImageDataUrl,
        planSnapshot: { semesters: [] },
        title: 'Duplicate',
      })
      .expect(409);

    await request(app.getHttpServer())
      .get('/public-plans')
      .query({ degree: 'Computer Science', faculty: 'School of Computing' })
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));

    await request(app.getHttpServer())
      .get('/public-plans/me')
      .set(auth(author.token))
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(plan.id));

    await request(app.getHttpServer())
      .get(`/public-plans/${plan.id}`)
      .expect(200)
      .expect(({ body }) => expect(body.viewCount).toBe(1));

    await request(app.getHttpServer())
      .patch(`/public-plans/${plan.id}`)
      .set(auth(reviewer.token))
      .send({ title: 'Not mine' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/public-plans/${plan.id}`)
      .set(auth(author.token))
      .send({ title: 'Updated Computer Science Plan' })
      .expect(200);

    const planReview = await request(app.getHttpServer())
      .post('/plan-reviews')
      .set(auth(reviewer.token))
      .send({
        content: 'Useful reference plan.',
        publicPlanId: plan.id,
        rating: 9,
      })
      .expect(201)
      .then(({ body }) => body as { id: string });

    await request(app.getHttpServer())
      .post('/plan-reviews')
      .set(auth(reviewer.token))
      .send({
        content: 'Missing plan',
        publicPlanId: '00000000-0000-4000-8000-000000000000',
        rating: 5,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/plan-reviews/plan/${plan.id}`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(1));

    await request(app.getHttpServer())
      .get(`/plan-reviews/${planReview.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/plan-reviews/${planReview.id}`)
      .set(auth(author.token))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/plan-reviews/${planReview.id}`)
      .set(auth(reviewer.token))
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/public-plans/${plan.id}`)
      .set(auth(author.token))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/public-plans/${plan.id}`)
      .expect(404);
  });

  it('streams AI text and exposes the recommendation workflow', async () => {
    const user = await createAuthenticatedUser('ai@u.nus.edu');

    await request(app.getHttpServer())
      .post('/ai-planner/prompt')
      .set(auth(user.token))
      .send({ mode: 'chat', prompt: 'What should I take next?' })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/)
      .expect(({ text }) => {
        expect(text).toContain('event: progress\ndata: {"stage":"generating"}');
        expect(text).toContain('event: delta\ndata: {"text":"Consider "}');
        expect(text).toContain('event: delta\ndata: {"text":"CS2100."}');
        expect(text).toContain('event: done\ndata: {}');
      });

    await request(app.getHttpServer())
      .post('/ai-planner/prompt')
      .set(auth(user.token))
      .send({ mode: 'chat', prompt: '   ' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/ai-planner/module-recommendations')
      .set(auth(user.token))
      .expect(201)
      .expect(({ body }) => {
        expect(body.recommendations[0].moduleCode).toBe('CS2100');
      });
    expect(moduleRecommendationServiceFake.generate).toHaveBeenCalledWith(
      user.id,
    );
  });

  async function register(email: string) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);
  }

  async function login(email: string) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201)
      .then(({ body }) => body.access_token as string);
  }

  async function createAuthenticatedUser(email: string) {
    await register(email);
    const token = await login(email);
    const profile = await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth(token))
      .expect(200);

    return { id: profile.body.id as string, token };
  }

  async function setAcademicProfile(userId: string, degree: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { degree, faculty: 'School of Computing' },
    });
  }
});

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function getSafeTestDatabaseUrl() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL is required. Point it to a disposable PostgreSQL database whose name contains "test" or "e2e".',
    );
  }

  let databaseName: string;

  try {
    databaseName = decodeURIComponent(
      new URL(testDatabaseUrl).pathname.replace(/^\//, ''),
    );
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!/(test|e2e)/i.test(databaseName)) {
    throw new Error(
      `Refusing to run destructive E2E cleanup against database "${databaseName}". Its name must contain "test" or "e2e".`,
    );
  }

  return testDatabaseUrl;
}
