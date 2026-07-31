import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsHelper } from './projects.helper';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectsHelper: ProjectsHelper,
  ) {}

  create(dto: CreateProjectDto, ownerId: number): Promise<ProjectEntity> {
    return this.projectsRepository.create({ ...dto, ownerId });
  }

  async findAll(
    query: QueryProjectsDto,
  ): Promise<PaginatedResult<ProjectEntity>> {
    const where = this.projectsHelper.buildWhere(query);

    const [data, total] = await Promise.all([
      this.projectsRepository.findMany(where, query.skip, query.limit),
      this.projectsRepository.count(where),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findOne(id: number): Promise<ProjectEntity> {
    return this.projectsHelper.getExistingProject(id);
  }

  async update(id: number, dto: UpdateProjectDto): Promise<ProjectEntity> {
    await this.projectsHelper.getExistingProject(id);

    return this.projectsRepository.update(id, dto);
  }

  async remove(id: number): Promise<ProjectEntity> {
    await this.projectsHelper.getExistingProject(id);

    return this.projectsRepository.delete(id);
  }
}
