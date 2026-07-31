import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsHelper {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  buildWhere(query: QueryProjectsDto): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {};

    if (query.ownerId !== undefined) {
      where.ownerId = query.ownerId;
    }

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;

      where.OR = [{ name: contains }, { description: contains }];
    }

    return where;
  }

  async getExistingProject(id: number): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    return project;
  }
}
