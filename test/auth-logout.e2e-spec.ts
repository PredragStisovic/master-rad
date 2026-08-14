import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

describe('AuthController /auth/logout (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;

  const payload = {
    email: 'e2e.logout@example.com',
    password: 'S3cretPassw0rd',
    firstName: 'E2e',
    lastName: 'Logout',
  };

  const login = async (): Promise<TokenPair> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    return unwrap<TokenPair>(response);
  };

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
      where: { name: 'e2e-logout-role' },
      create: { name: 'e2e-logout-role' },
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

  it('POST /auth/logout revokes the refresh token', async () => {
    const tokens = await login();

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({ refreshToken: tokens.refresh_token });

    expect(logout.status).toBe(204);

    // A revoked token presented to /auth/refresh now reads as reuse (401),
    // where it used to be indistinguishable from an unknown token (404).
    const refresh = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({ refreshToken: tokens.refresh_token });

    expect(refresh.status).toBe(401);
  });

  it('POST /auth/logout rejects a refresh token that was already revoked', async () => {
    const tokens = await login();

    const firstLogout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({ refreshToken: tokens.refresh_token });

    expect(firstLogout.status).toBe(204);

    const secondLogout = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({ refreshToken: tokens.refresh_token });

    expect(secondLogout.status).toBe(401);
  });

  it('POST /auth/logout rejects a request without an access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'whatever' });

    expect(response.status).toBe(401);
  });

  it('POST /auth/logout validates the body', async () => {
    const tokens = await login();

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({});

    expect(response.status).toBe(400);
  });
});
