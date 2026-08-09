import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ProjectRelation } from '../auth/decorators/project-relation.decorator';
import { ProjectSummaryEntity } from './entities/project-summary.entity';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Auth()
@ProjectRelation('member')
@Controller('projects/:projectId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermissions('tasks:read')
  @Get('summary')
  @ApiOperation({ summary: 'Task counts of a project, by status and assignee' })
  @ApiOkResponse({ type: ProjectSummaryEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  projectSummary(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectSummaryEntity> {
    return this.reportsService.projectSummary(projectId);
  }
}
