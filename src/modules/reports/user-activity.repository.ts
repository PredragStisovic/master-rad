import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** One `GROUP BY` bucket, already flattened out of Prisma's `_count` shape. */
export interface ActionCount {
  action: AuditAction;
  count: number;
}

export interface EntityTypeCount {
  entityType: string;
  count: number;
}

@Injectable()
export class UserActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countByAction(
    where: Prisma.AuditLogWhereInput,
  ): Promise<ActionCount[]> {
    const rows = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({ action: row.action, count: row._count._all }));
  }

  async countByEntityType(
    where: Prisma.AuditLogWhereInput,
  ): Promise<EntityTypeCount[]> {
    const rows = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({
      entityType: row.entityType,
      count: row._count._all,
    }));
  }
}
