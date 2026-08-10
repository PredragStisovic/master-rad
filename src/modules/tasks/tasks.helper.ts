import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ProjectMembersRepository } from '../project-members/project-members.repository';
import { QueryTasksDto, SortOrder, TaskSortBy } from './dto/query-tasks.dto';

@Injectable()
export class TasksHelper {
  constructor(private readonly membersRepository: ProjectMembersRepository) {}

  buildWhere(projectId: number, query: QueryTasksDto): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = { projectId };

    if (query.status !== undefined) {
      where.status = query.status;
    }

    if (query.priority !== undefined) {
      where.priority = query.priority;
    }

    if (query.assigneeId !== undefined) {
      where.assigneeId = query.assigneeId;
    }

    return where;
  }

  buildOrderBy(query: QueryTasksDto): Prisma.TaskOrderByWithRelationInput[] {
    if (query.sortBy === TaskSortBy.ID) {
      return [{ id: query.sortOrder }];
    }

    // `id` breaks ties so a page window stays stable across requests.
    return [{ [query.sortBy]: query.sortOrder }, { id: SortOrder.ASC }];
  }

  async assertUserIsProjectMember(
    projectId: number,
    userId: number,
  ): Promise<void> {
    const member = await this.membersRepository.findByProjectAndUser(
      projectId,
      userId,
    );

    if (!member) {
      throw new BadRequestException(
        `User ${userId} is not a member of project ${projectId}`,
      );
    }
  }
}
