import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditAction } from '../../../generated/prisma/client';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const AUDIT_ACTION_BY_METHOD: Record<string, AuditAction | undefined> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

/**
 * The id of the entity the request affected, for `@@index([entityType, entityId])`.
 *
 * Handlers return the affected entity, so its `id` is the most accurate source and
 * is the only one available on a create. The `:id` route param covers handlers that
 * return something else. Stays null when neither applies — a handler returning void
 * (`POST /auth/register`) or a collection (`POST /task-attachments`).
 */
const resolveEntityId = (payload: unknown, req: Request): number | null => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const { id } = payload as { id?: unknown };
    if (typeof id === 'number') {
      return id;
    }
  }

  const paramId = Number(req.params.id);

  return Number.isInteger(paramId) ? paramId : null;
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const entityType = context.getClass().name.replace('Controller', '');
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const user = req.user as AuthenticatedUser | undefined;

    const action =
      this.reflector.get<AuditAction | undefined>(AUDIT_ACTION_KEY, handler) ??
      AUDIT_ACTION_BY_METHOD[method];
    if (!action) {
      return next.handle();
    }

    const logData = {
      userId: user ? user.userId : null,
      entityType: entityType,
      action: action,
      metadata: { method, url },
      createdAt: new Date(),
    };

    return next.handle().pipe(
      tap((payload) => {
        const data = { ...logData, entityId: resolveEntityId(payload, req) };

        this.prisma.auditLog.create({ data }).catch((error) => {
          Logger.error('Failed to create audit log', error);
        });
      }),
    );
  }
}
