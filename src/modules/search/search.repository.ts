import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';

const TEXT_SEARCH_CONFIG = 'english';

const tsQuery = (term: string): Prisma.Sql =>
  Prisma.sql`websearch_to_tsquery(${TEXT_SEARCH_CONFIG}, ${term})`;

const accessibleProjectIds = (userId: number): Prisma.Sql =>
  Prisma.sql`
    SELECT ap."id"
    FROM "projects" ap
    WHERE ap."owner_id" = ${userId}
       OR EXISTS (
         SELECT 1
         FROM "project_members" m
         WHERE m."project_id" = ap."id" AND m."user_id" = ${userId}
       )
  `;

interface CountRow {
  count: number;
}

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findProjects(
    userId: number,
    term: string,
    skip: number,
    take: number,
  ): Promise<ProjectEntity[]> {
    const query = tsQuery(term);

    return this.prisma.$queryRaw<ProjectEntity[]>`
      SELECT p."id",
             p."name",
             p."description",
             p."owner_id"   AS "ownerId",
             p."created_at" AS "createdAt",
             p."updated_at" AS "updatedAt"
      FROM "projects" p
      WHERE p."search" @@ ${query}
        AND p."id" IN (${accessibleProjectIds(userId)})
      ORDER BY ts_rank(p."search", ${query}) DESC, p."id" ASC
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  async countProjects(userId: number, term: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "projects" p
      WHERE p."search" @@ ${tsQuery(term)}
        AND p."id" IN (${accessibleProjectIds(userId)})
    `;

    return row.count;
  }

  findTasks(
    userId: number,
    term: string,
    skip: number,
    take: number,
  ): Promise<TaskEntity[]> {
    const query = tsQuery(term);

    return this.prisma.$queryRaw<TaskEntity[]>`
      SELECT t."id",
             t."title",
             t."description",
             t."status",
             t."priority",
             t."project_id"  AS "projectId",
             t."assignee_id" AS "assigneeId",
             t."created_at"  AS "createdAt",
             t."updated_at"  AS "updatedAt"
      FROM "tasks" t
      WHERE t."search" @@ ${query}
        AND t."project_id" IN (${accessibleProjectIds(userId)})
      ORDER BY ts_rank(t."search", ${query}) DESC, t."id" ASC
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  async countTasks(userId: number, term: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "tasks" t
      WHERE t."search" @@ ${tsQuery(term)}
        AND t."project_id" IN (${accessibleProjectIds(userId)})
    `;

    return row.count;
  }
}
