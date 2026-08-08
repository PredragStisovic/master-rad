import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProjectEntity } from './../src/modules/projects/entities/project.entity';
import { TaskAttachmentsEntity } from './../src/modules/task-attachments/entities/task-attachments.entity';
import { TaskEntity } from './../src/modules/tasks/entities/task.entity';
import { PrismaService } from './../src/prisma/prisma.service';

/** Unwraps the envelope added by the global `TransformInterceptor`. */
const unwrap = <T>(response: { body: unknown }): T =>
  (response.body as { data: T }).data;

const uploadDir = path.join(process.cwd(), 'uploads');

// `FileTypeValidator` checks magic numbers, not the extension, so these have
// to be real files: a 1x1 transparent PNG and a minimal PDF.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
);

describe('TaskAttachmentsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let roleId: number;
  let readerRoleId: number;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let readerToken: string;
  let projectId: number;
  let taskId: number;
  let ownerId: number;

  const ownerEmail = 'e2e.attachments.owner@example.com';
  const memberEmail = 'e2e.attachments.member@example.com';
  const outsiderEmail = 'e2e.attachments.outsider@example.com';
  const readerEmail = 'e2e.attachments.reader@example.com';
  const password = 'S3cretPassw0rd';

  const emails = [ownerEmail, memberEmail, outsiderEmail, readerEmail];

  const createUser = async (email: string, role = roleId): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
        firstName: 'Attachment',
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

  const upload = (token = ownerToken) =>
    request(app.getHttpServer())
      .post('/task-attachments')
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
      where: { name: 'e2e-attachments-role' },
      create: { name: 'e2e-attachments-role' },
      update: {},
    });
    roleId = role.id;

    await prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          connectOrCreate: [
            'projects:create',
            'tasks:read',
            'tasks:create',
            'tasks:update',
          ].map((name) => ({ where: { name }, create: { name } })),
        },
      },
    });

    // Same project access, but without `tasks:update`.
    const readerRole = await prisma.role.upsert({
      where: { name: 'e2e-attachments-reader-role' },
      create: { name: 'e2e-attachments-reader-role' },
      update: {},
    });
    readerRoleId = readerRole.id;

    await prisma.role.update({
      where: { id: readerRoleId },
      data: {
        permissions: {
          set: [],
          connectOrCreate: ['tasks:read'].map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });

    // A run that died before `afterAll` leaves users owning projects behind,
    // and `projects_owner_id_fkey` then blocks the delete.
    const stale = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });

    await prisma.project.deleteMany({
      where: { ownerId: { in: stale.map((user) => user.id) } },
    });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });

    ownerId = await createUser(ownerEmail);
    const memberId = await createUser(memberEmail);
    await createUser(outsiderEmail);
    const readerId = await createUser(readerEmail, readerRoleId);

    ownerToken = await login(ownerEmail);
    memberToken = await login(memberEmail);
    outsiderToken = await login(outsiderEmail);
    readerToken = await login(readerEmail);

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'E2e attachments project' })
      .expect(201);

    projectId = unwrap<ProjectEntity>(projectResponse).id;

    await prisma.projectMember.createMany({
      data: [
        { projectId, userId: memberId },
        { projectId, userId: readerId },
      ],
    });

    const taskResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Task with attachments' })
      .expect(201);

    taskId = unwrap<TaskEntity>(taskResponse).id;
  });

  /** Drops the rows *and* the files they point at, so `uploads/` stays clean. */
  const clearAttachments = async (): Promise<void> => {
    const written = await prisma.taskAttachment.findMany({
      where: { task: { projectId } },
      select: { storageKey: true },
    });

    await Promise.all(
      written.map(({ storageKey }) =>
        fs.promises.rm(path.join(uploadDir, storageKey), { force: true }),
      ),
    );

    await prisma.taskAttachment.deleteMany({ where: { task: { projectId } } });
  };

  beforeEach(clearAttachments);

  afterAll(async () => {
    await clearAttachments();

    await prisma.task.deleteMany({ where: { projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.role.deleteMany({
      where: { id: { in: [roleId, readerRoleId] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /task-attachments stores the file and records the uploader', async () => {
    const response = await upload()
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png')
      .expect(201);

    expect(unwrap<TaskAttachmentsEntity[]>(response)).toEqual([
      {
        filename: 'diagram.png',
        storageKey: expect.stringContaining('diagram.png') as unknown,
      },
    ]);

    const rows = await prisma.taskAttachment.findMany({ where: { taskId } });

    expect(rows).toEqual([
      expect.objectContaining({
        filename: 'diagram.png',
        mimeType: 'image/png',
        size: png.length,
        taskId,
        uploadedById: ownerId,
      }),
    ]);
  });

  it('POST /task-attachments writes the bytes under the returned storage key', async () => {
    const response = await upload()
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png')
      .expect(201);

    const [attachment] = unwrap<TaskAttachmentsEntity[]>(response);

    await expect(
      fs.promises.readFile(path.join(uploadDir, attachment.storageKey)),
    ).resolves.toEqual(png);
  });

  it('POST /task-attachments keeps every file of a batch, not just the last', async () => {
    const response = await upload()
      .field('taskId', taskId)
      .attach('files', png, 'first.png')
      .attach('files', pdf, 'second.pdf')
      .expect(201);

    const attachments = unwrap<TaskAttachmentsEntity[]>(response);

    expect(attachments.map((attachment) => attachment.filename)).toEqual([
      'first.png',
      'second.pdf',
    ]);

    const rows = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { id: 'asc' },
    });

    expect(rows.map((row) => row.mimeType)).toEqual([
      'image/png',
      'application/pdf',
    ]);
  });

  it('POST /task-attachments lets a project member attach a file', async () => {
    const response = await upload(memberToken)
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png');

    expect(response.status).toBe(201);
  });

  it('POST /task-attachments requires authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/task-attachments')
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png');

    expect(response.status).toBe(401);
  });

  it('POST /task-attachments rejects a role without tasks:update', async () => {
    const response = await upload(readerToken)
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png');

    expect(response.status).toBe(403);
  });

  it('POST /task-attachments rejects a user outside the project', async () => {
    const response = await upload(outsiderToken)
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png');

    expect(response.status).toBe(403);
  });

  it('POST /task-attachments stores nothing when the caller has no access', async () => {
    await upload(outsiderToken)
      .field('taskId', taskId)
      .attach('files', png, 'diagram.png');

    await expect(
      prisma.taskAttachment.count({ where: { taskId } }),
    ).resolves.toBe(0);
  });

  it('POST /task-attachments returns 404 for an unknown task', async () => {
    const response = await upload()
      .field('taskId', 0)
      .attach('files', png, 'diagram.png');

    expect(response.status).toBe(404);
  });

  it('POST /task-attachments rejects a missing task id', async () => {
    const response = await upload().attach('files', png, 'diagram.png');

    expect(response.status).toBe(400);
  });

  it('POST /task-attachments rejects an unsupported file type', async () => {
    const response = await upload()
      .field('taskId', taskId)
      .attach('files', Buffer.from('#!/bin/sh'), 'payload.sh');

    expect(response.status).toBe(422);
  });

  it('POST /task-attachments rejects bytes that do not match the extension', async () => {
    const response = await upload()
      .field('taskId', taskId)
      .attach('files', Buffer.from('#!/bin/sh\nrm -rf /'), 'payload.png');

    expect(response.status).toBe(422);
  });

  it('POST /task-attachments rejects a file larger than 5 MB', async () => {
    // Keeps the PNG header so the size validator is what rejects it.
    const huge = Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]);

    const response = await upload()
      .field('taskId', taskId)
      .attach('files', huge, 'huge.png');

    expect(response.status).toBe(422);
  });

  it('POST /task-attachments persists nothing when one file of a batch is invalid', async () => {
    await upload()
      .field('taskId', taskId)
      .attach('files', png, 'fine.png')
      .attach('files', Buffer.from('#!/bin/sh'), 'payload.sh');

    await expect(
      prisma.taskAttachment.count({ where: { taskId } }),
    ).resolves.toBe(0);
  });

  it('deletes the attachments of a task together with the task', async () => {
    const disposableResponse = await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Disposable task' })
      .expect(201);

    const disposableTaskId = unwrap<TaskEntity>(disposableResponse).id;

    const uploadResponse = await upload()
      .field('taskId', disposableTaskId)
      .attach('files', png, 'diagram.png')
      .expect(201);

    // The cascade takes the row with it, so the file has to be claimed now.
    const [{ storageKey }] = unwrap<TaskAttachmentsEntity[]>(uploadResponse);

    await prisma.task.delete({ where: { id: disposableTaskId } });

    await expect(
      prisma.taskAttachment.count({ where: { taskId: disposableTaskId } }),
    ).resolves.toBe(0);

    // The row is gone but the file is not: deleting a task orphans its blobs.
    await fs.promises.rm(path.join(uploadDir, storageKey), { force: true });
  });
});
