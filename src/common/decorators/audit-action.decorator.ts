import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../../generated/prisma/client';

export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Labels a route handler with the `AuditAction` that `AuditLogInterceptor` records.
 *
 * Without it the interceptor falls back to mapping the HTTP verb, which mislabels
 * routes whose verb and meaning disagree — `DELETE /tasks/:id/assignee` only clears
 * a field, so it is an `UPDATE` of the task, not a `DELETE`.
 */
export const AuditActionType = (action: AuditAction) =>
  SetMetadata(AUDIT_ACTION_KEY, action);
