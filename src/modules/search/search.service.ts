import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ProjectsRepository } from '../projects/projects.repository';
import { TaskEntity } from '../tasks/entities/task.entity';
import { TasksRepository } from '../tasks/tasks.repository';
import { QuerySearchDto, SearchScope } from './dto/query-search.dto';
import { SearchResultsEntity } from './entities/search-results.entity';
import { SearchHelper } from './search.helper';

/** Matches the project list: stable, and cheap on the primary key. */
const TASK_ORDER_BY: Prisma.TaskOrderByWithRelationInput[] = [{ id: 'asc' }];

@Injectable()
export class SearchService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly searchHelper: SearchHelper,
  ) {}

  async search(
    userId: number,
    query: QuerySearchDto,
  ): Promise<SearchResultsEntity> {
    const wantsProjects = query.type !== SearchScope.TASKS;
    const wantsTasks = query.type !== SearchScope.PROJECTS;

    const projectWhere = this.searchHelper.buildProjectWhere(userId, query);
    const taskWhere = this.searchHelper.buildTaskWhere(userId, query);

    const [projects, projectTotal, tasks, taskTotal] = await Promise.all([
      wantsProjects
        ? this.projectsRepository.findMany(
            projectWhere,
            query.skip,
            query.limit,
          )
        : Promise.resolve<ProjectEntity[]>([]),
      wantsProjects
        ? this.projectsRepository.count(projectWhere)
        : Promise.resolve(0),
      wantsTasks
        ? this.tasksRepository.findMany(
            taskWhere,
            TASK_ORDER_BY,
            query.skip,
            query.limit,
          )
        : Promise.resolve<TaskEntity[]>([]),
      wantsTasks ? this.tasksRepository.count(taskWhere) : Promise.resolve(0),
    ]);

    return {
      projects: this.searchHelper.toPage(projects, projectTotal, query),
      tasks: this.searchHelper.toPage(tasks, taskTotal, query),
    };
  }
}
