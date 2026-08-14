import { Injectable } from '@nestjs/common';
import { ProjectEntity } from '../projects/entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { QuerySearchDto, SearchScope } from './dto/query-search.dto';
import { SearchResultsEntity } from './entities/search-results.entity';
import { SearchHelper } from './search.helper';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly searchHelper: SearchHelper,
  ) {}

  async search(
    userId: number,
    query: QuerySearchDto,
  ): Promise<SearchResultsEntity> {
    const wantsProjects = query.type !== SearchScope.TASKS;
    const wantsTasks = query.type !== SearchScope.PROJECTS;

    const [projects, projectTotal, tasks, taskTotal] = await Promise.all([
      wantsProjects
        ? this.searchRepository.findProjects(
            userId,
            query.q,
            query.skip,
            query.limit,
          )
        : Promise.resolve<ProjectEntity[]>([]),
      wantsProjects
        ? this.searchRepository.countProjects(userId, query.q)
        : Promise.resolve(0),
      wantsTasks
        ? this.searchRepository.findTasks(
            userId,
            query.q,
            query.skip,
            query.limit,
          )
        : Promise.resolve<TaskEntity[]>([]),
      wantsTasks
        ? this.searchRepository.countTasks(userId, query.q)
        : Promise.resolve(0),
    ]);

    return {
      projects: this.searchHelper.toPage(projects, projectTotal, query),
      tasks: this.searchHelper.toPage(tasks, taskTotal, query),
    };
  }
}
