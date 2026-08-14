import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProjectEntity } from './../src/modules/projects/entities/project.entity';
import { SearchResultsEntity } from './../src/modules/search/entities/search-results.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

describe('SearchController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let blindRoleId: number;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let blindToken: string;
  let memberId: number;
  let ownedProjectId: number;
  let joinedProjectId: number;
  let foreignProjectId: number;

  const password = 'S3cretPassw0rd';
  const ownerEmail = 'e2e.search.owner@example.com';
  const memberEmail = 'e2e.search.member@example.com';
  const outsiderEmail = 'e2e.search.outsider@example.com';
  const blindEmail = 'e2e.search.blind@example.com';
  const emails = [ownerEmail, memberEmail, outsiderEmail, blindEmail];

  const createUser = async (email: string, role: number): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Search',
        lastName: 'E2e',
        roleId: role,
      })
      .expect(201);

    return unwrap<{ id: number }>(response).id;
  };

  const login = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return unwrap<{ access_token: string }>(response).access_token;
  };

  const createProject = async (
    token: string,
    name: string,
    description?: string,
  ): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, description })
      .expect(201);

    return unwrap<ProjectEntity>(response).id;
  };

  const createTask = async (
    token: string,
    projectId: number,
    title: string,
    description?: string,
  ): Promise<void> => {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title, description })
      .expect(201);
  };

  const search = async (token: string, queryString: string) =>
    request(app.getHttpServer())
      .get(`/search?${queryString}`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const role = await prisma.role.upsert({
      where: { name: 'e2e-search-role' },
      create: { name: 'e2e-search-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: [
            'projects:read',
            'projects:create',
            'tasks:read',
            'tasks:create',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    // A role that may read projects but not tasks: `/search` reads both.
    const blindRole = await prisma.role.upsert({
      where: { name: 'e2e-search-blind-role' },
      create: { name: 'e2e-search-blind-role' },
      update: {},
    });
    blindRoleId = blindRole.id;

    await prisma.role.update({
      where: { id: blindRoleId },
      data: {
        permissions: {
          connectOrCreate: [
            {
              where: { name: 'projects:read' },
              create: { name: 'projects:read' },
            },
          ],
        },
      },
    });

    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    await createUser(ownerEmail, roleId);
    memberId = await createUser(memberEmail, roleId);
    await createUser(outsiderEmail, roleId);
    await createUser(blindEmail, blindRoleId);

    ownerToken = await login(ownerEmail);
    memberToken = await login(memberEmail);
    outsiderToken = await login(outsiderEmail);
    blindToken = await login(blindEmail);

    ownedProjectId = await createProject(
      ownerToken,
      'E2e search alpha',
      'Covers the 100% edge case',
    );
    joinedProjectId = await createProject(ownerToken, 'E2e search beta');
    foreignProjectId = await createProject(
      outsiderToken,
      'E2e search gamma alpha',
    );

    await prisma.projectMember.create({
      data: { projectId: joinedProjectId, userId: memberId },
    });

    await createTask(ownerToken, ownedProjectId, 'E2e search ALPHA task');
    await createTask(
      ownerToken,
      joinedProjectId,
      'Unrelated title',
      'Body mentions e2e search alpha',
    );
    await createTask(
      outsiderToken,
      foreignProjectId,
      'E2e search alpha secret',
    );
  });

  afterAll(async () => {
    await prisma.project.deleteMany({
      where: {
        id: { in: [ownedProjectId, joinedProjectId, foreignProjectId] },
      },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.role.deleteMany({
      where: { id: { in: [roleId, blindRoleId] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /search matches projects and tasks regardless of case', async () => {
    const response = await search(ownerToken, 'q=e2e%20search%20alpha');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.data.map((project) => project.id)).toEqual([
      ownedProjectId,
    ]);
    // The lower-cased title and the description-only match both come back.
    expect(results.tasks.meta.total).toBe(2);
  });

  it('GET /search matches a project description as well as its name', async () => {
    const response = await search(ownerToken, 'q=covers%20the');

    expect(response.status).toBe(200);
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([ownedProjectId]);
  });

  it('GET /search hides projects the caller has no access to', async () => {
    const response = await search(ownerToken, 'q=gamma');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.data).toEqual([]);
    expect(results.projects.meta.total).toBe(0);
  });

  it('GET /search hides tasks living in somebody else’s project', async () => {
    const response = await search(outsiderToken, 'q=e2e%20search%20alpha');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.tasks.meta.total).toBe(1);
    expect(results.tasks.data[0].projectId).toBe(foreignProjectId);
  });

  it('GET /search keeps a warmed entry off a different caller', async () => {
    const term = 'q=e2e%20search%20alpha';

    // Warms the cache for the owner first: both callers match the same term,
    // but each may only reach their own projects, so a key that ignored the
    // caller would replay the owner's matches to the outsider.
    const owner = unwrap<SearchResultsEntity>(await search(ownerToken, term));
    const outsider = unwrap<SearchResultsEntity>(
      await search(outsiderToken, term),
    );

    expect(owner.projects.data.map((project) => project.id)).toEqual([
      ownedProjectId,
    ]);
    expect(outsider.projects.data.map((project) => project.id)).toEqual([
      foreignProjectId,
    ]);
  });

  it('GET /search reaches a project the caller only belongs to', async () => {
    const response = await search(memberToken, 'q=e2e%20search%20beta');

    expect(response.status).toBe(200);
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([joinedProjectId]);
  });

  it('GET /search?type=projects leaves the task collection empty', async () => {
    const response = await search(
      ownerToken,
      'q=e2e%20search%20alpha&type=projects',
    );
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.tasks).toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it('GET /search?type=tasks leaves the project collection empty', async () => {
    const response = await search(
      ownerToken,
      'q=e2e%20search%20alpha&type=tasks',
    );
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.data).toEqual([]);
    expect(results.tasks.meta.total).toBe(2);
  });

  it('GET /search pages each collection independently', async () => {
    const response = await search(ownerToken, 'q=e2e%20search&page=1&limit=1');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.data).toHaveLength(1);
    expect(results.projects.meta.total).toBe(2);
  });

  it('GET /search matches a number token inside a description', async () => {
    const response = await search(ownerToken, 'q=100%25');

    expect(response.status).toBe(200);
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([ownedProjectId]);
  });

  it('GET /search stems the term, so a different inflection still matches', async () => {
    const response = await search(ownerToken, 'q=covering');

    expect(response.status).toBe(200);
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([ownedProjectId]);
  });

  it('GET /search combines words with AND, not OR', async () => {
    const response = await search(ownerToken, 'q=e2e%20zzzznotpresent');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.meta.total).toBe(0);
    expect(results.tasks.meta.total).toBe(0);
  });

  it('GET /search honours a quoted phrase', async () => {
    const response = await search(ownerToken, 'q=%22search%20alpha%22');

    expect(response.status).toBe(200);
    // Only the project whose name has the two words adjacent, so `beta` drops.
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([ownedProjectId]);
  });

  it('GET /search honours a -excluded word', async () => {
    const response = await search(ownerToken, 'q=e2e%20search%20-beta');

    expect(response.status).toBe(200);
    expect(
      unwrap<SearchResultsEntity>(response).projects.data.map(
        (project) => project.id,
      ),
    ).toEqual([ownedProjectId]);
  });

  it('GET /search ranks a title match above a description-only match', async () => {
    const response = await search(ownerToken, 'q=e2e%20search%20alpha');
    const tasks = unwrap<SearchResultsEntity>(response).tasks.data;

    expect(response.status).toBe(200);
    // The migration weights title/name as A and description as B.
    expect(tasks.map((task) => task.title)).toEqual([
      'E2e search ALPHA task',
      'Unrelated title',
    ]);
  });

  it('GET /search returns nothing for a term of only stopwords', async () => {
    const response = await search(ownerToken, 'q=the');
    const results = unwrap<SearchResultsEntity>(response);

    expect(response.status).toBe(200);
    expect(results.projects.meta.total).toBe(0);
    expect(results.tasks.meta.total).toBe(0);
  });

  it('GET /search survives punctuation that is not a valid tsquery', async () => {
    const response = await search(ownerToken, 'q=%27%3B%20DROP%20TABLE%20--');

    // `to_tsquery` would raise a syntax error here; `websearch_to_tsquery` does not.
    expect(response.status).toBe(200);
    expect(unwrap<SearchResultsEntity>(response).projects.data).toEqual([]);
  });

  it('GET /search rejects a missing term', async () => {
    const response = await search(ownerToken, 'type=tasks');

    expect(response.status).toBe(400);
  });

  it('GET /search rejects a one-character term', async () => {
    const response = await search(ownerToken, 'q=a');

    expect(response.status).toBe(400);
  });

  it('GET /search rejects an unknown scope', async () => {
    const response = await search(ownerToken, 'q=alpha&type=comments');

    expect(response.status).toBe(400);
  });

  it('GET /search is forbidden without tasks:read', async () => {
    const response = await search(blindToken, 'q=alpha');

    expect(response.status).toBe(403);
  });

  it('GET /search rejects an anonymous caller', async () => {
    const response = await request(app.getHttpServer()).get('/search?q=alpha');

    expect(response.status).toBe(401);
  });
});
