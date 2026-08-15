import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getOptionsToken, ThrottlerModuleOptions } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AUTH_THROTTLER } from './../src/config/throttler.config';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

/**
 * `test:e2e` runs with a deliberately huge `AUTH_THROTTLE_LIMIT` so the other
 * suites can hammer `/auth/login` freely. This suite is the one that cares, so
 * it replaces the module options with a limit small enough to trip on purpose.
 */
const LIMIT = 3;

const tightThrottler: ThrottlerModuleOptions = {
  throttlers: [{ name: AUTH_THROTTLER, ttl: 60_000, limit: LIMIT }],
};

describe('AuthController rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let accessToken: string;

  const payload = {
    email: 'e2e.rate-limit@example.com',
    password: 'S3cretPassw0rd',
    firstName: 'E2e',
    lastName: 'RateLimit',
  };

  const login = () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getOptionsToken())
      .useValue(tightThrottler)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const role = await prisma.role.upsert({
      where: { name: 'e2e-rate-limit-role' },
      create: { name: 'e2e-rate-limit-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.user.deleteMany({ where: { email: payload.email } });
    await request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: payload.email } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /auth/login serves the requests inside the window and rejects the next one', async () => {
    const statuses: number[] = [];

    for (let attempt = 0; attempt < LIMIT + 1; attempt++) {
      const response = await login();

      statuses.push(response.status);

      if (attempt === 0) {
        accessToken = unwrap<{ access_token: string }>(response).access_token;
      }
    }

    expect(statuses).toEqual([...Array<number>(LIMIT).fill(201), 429]);
  });

  it('POST /auth/login counts failed attempts too, so guessing is capped', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: 'wrong-on-purpose' });

    // The window from the previous test has not elapsed: the limit answers
    // before the credentials are ever checked, which is the point — a wrong
    // password must not buy another attempt.
    expect(response.status).toBe(429);
  });

  it('GET /auth/me stays available while the auth limit is exhausted', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });
});
