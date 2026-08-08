import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { AuditAction } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogInterceptor } from './audit-log.interceptor';

const handler = () => undefined;

const mockContext = (
  method: string,
  params: Record<string, string> = { id: '2' },
): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => class TasksController {},
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url: '/projects/1/tasks/2/assignee',
        params,
        user: { userId: 7 },
      }),
    }),
  }) as unknown as ExecutionContext;

const nextReturning = (payload: unknown) => ({ handle: () => of(payload) });

interface AuditLogData {
  userId: number | null;
  entityType: string;
  entityId: number | null;
  action: AuditAction;
}

describe('AuditLogInterceptor', () => {
  let create: jest.Mock<Promise<void>, [{ data: AuditLogData }]>;
  let prisma: PrismaService;
  let reflector: Reflector;
  let interceptor: AuditLogInterceptor;

  const next = nextReturning({ id: 2 });

  const loggedData = (): AuditLogData => create.mock.calls[0][0].data;

  beforeEach(() => {
    create = jest
      .fn<Promise<void>, [{ data: AuditLogData }]>()
      .mockResolvedValue(undefined);
    prisma = { auditLog: { create } } as unknown as PrismaService;
    reflector = { get: jest.fn() } as unknown as Reflector;
    interceptor = new AuditLogInterceptor(prisma, reflector);
  });

  it('records the action declared by @AuditActionType over the HTTP verb', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.UPDATE);

    interceptor.intercept(mockContext('DELETE'), next).subscribe(() => {
      expect(loggedData()).toMatchObject({
        action: AuditAction.UPDATE,
        entityType: 'Tasks',
        userId: 7,
      });
      done();
    });
  });

  it('falls back to the HTTP verb when the handler is undecorated', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    interceptor.intercept(mockContext('POST'), next).subscribe(() => {
      expect(loggedData().action).toBe(AuditAction.CREATE);
      done();
    });
  });

  it('logs nothing for a read request on an undecorated handler', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    interceptor.intercept(mockContext('GET'), next).subscribe((result) => {
      expect(create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 2 });
      done();
    });
  });

  describe('entityId', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(AuditAction.CREATE);
    });

    it('takes the id of the returned entity, which is all a create has', (done) => {
      const context = mockContext('POST', {});

      interceptor
        .intercept(context, nextReturning({ id: 42, title: 'New task' }))
        .subscribe(() => {
          expect(loggedData().entityId).toBe(42);
          done();
        });
    });

    it('falls back to the :id route param when the response carries no id', (done) => {
      const context = mockContext('PATCH', { id: '2' });

      interceptor
        .intercept(context, nextReturning({ storageKey: 'a.png' }))
        .subscribe(() => {
          expect(loggedData().entityId).toBe(2);
          done();
        });
    });

    it('is null for a handler returning a collection with no :id param', (done) => {
      const context = mockContext('POST', {});

      interceptor
        .intercept(context, nextReturning([{ storageKey: 'a.png' }]))
        .subscribe(() => {
          expect(loggedData().entityId).toBeNull();
          done();
        });
    });

    it('is null for a handler returning void', (done) => {
      const context = mockContext('POST', {});

      interceptor.intercept(context, nextReturning(undefined)).subscribe(() => {
        expect(loggedData().entityId).toBeNull();
        done();
      });
    });
  });
});
