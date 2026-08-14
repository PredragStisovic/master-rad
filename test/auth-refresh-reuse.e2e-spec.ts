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

describe('AuthController /auth/refresh reuse detection (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let userId: number;

  const payload = {
    email: 'e2e.refresh.reuse@example.com',
    password: 'S3cretPassw0rd',
    firstName: 'E2e',
    lastName: 'Reuse',
  };

  const login = async (): Promise<TokenPair> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(201);

    return unwrap<TokenPair>(response);
  };

  const refresh = (tokens: TokenPair, refreshToken = tokens.refresh_token) =>
    request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .send({ refreshToken });

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
      where: { name: 'e2e-refresh-reuse-role' },
      create: { name: 'e2e-refresh-reuse-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.user.deleteMany({ where: { email: payload.email } });
    const created = await request(app.getHttpServer())
      .post('/users')
      .send({ ...payload, roleId })
      .expect(201);

    userId = unwrap<{ id: number }>(created).id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: payload.email } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  });

  it('POST /auth/refresh rotates the token and keeps the successor in the same family', async () => {
    const tokens = await login();

    const rotated = await refresh(tokens);

    expect(rotated.status).toBe(201);

    const rotatedTokens = unwrap<TokenPair>(rotated);

    expect(rotatedTokens.refresh_token).not.toEqual(tokens.refresh_token);

    const stored = await prisma.refreshToken.findMany({ where: { userId } });
    const families = new Set(stored.map((token) => token.familyId));

    expect(families.size).toBe(1);
  });

  it('POST /auth/refresh rejects a token that was already rotated out', async () => {
    const tokens = await login();

    const rotated = await refresh(tokens);

    expect(rotated.status).toBe(201);

    const replay = await refresh(tokens);

    expect(replay.status).toBe(401);
  });

  it('POST /auth/refresh kills the successor token too when the old one is replayed', async () => {
    const tokens = await login();

    const rotated = await refresh(tokens);

    expect(rotated.status).toBe(201);

    const rotatedTokens = unwrap<TokenPair>(rotated);

    const replay = await refresh(tokens);

    expect(replay.status).toBe(401);

    // The attacker replayed the stolen token; the token the honest client is
    // holding must not survive that.
    const afterReuse = await refresh(rotatedTokens);

    expect(afterReuse.status).toBe(401);
  });

  it('POST /auth/refresh revokes every token in the family on reuse', async () => {
    const tokens = await login();

    const rotated = await refresh(tokens);

    expect(rotated.status).toBe(201);

    await refresh(tokens);

    const stored = await prisma.refreshToken.findMany({ where: { userId } });

    expect(stored.every((token) => token.revokedAt !== null)).toBe(true);
  });

  it('POST /auth/refresh leaves other sessions alone when one family is invalidated', async () => {
    const compromised = await login();
    const otherSession = await login();

    const rotated = await refresh(compromised);

    expect(rotated.status).toBe(201);

    const replay = await refresh(compromised);

    expect(replay.status).toBe(401);

    const stillValid = await refresh(otherSession);

    expect(stillValid.status).toBe(201);
  });

  it('POST /auth/refresh rejects a refresh token it has never issued', async () => {
    const tokens = await login();

    const response = await refresh(tokens, 'not-a-token-we-ever-issued');

    expect(response.status).toBe(404);
  });

  it('POST /auth/refresh rejects a request without an access token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'whatever' });

    expect(response.status).toBe(401);
  });
});
