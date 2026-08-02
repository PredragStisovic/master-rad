import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsService } from './projects.service';
import { ProjectRelation } from '../auth/decorators/project-relation.decorator';

@ApiTags('projects')
@Auth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @RequirePermissions('projects:create')
  @Post()
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectEntity })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser('userId') ownerId: number,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(dto, ownerId);
  }

  @RequirePermissions('projects:read')
  @Get()
  @ApiOperation({ summary: 'List projects (paginated)' })
  @ApiOkResponse({ type: [ProjectEntity] })
  findAll(
    @Query() query: QueryProjectsDto,
  ): Promise<PaginatedResult<ProjectEntity>> {
    return this.projectsService.findAll(query);
  }

  @RequirePermissions('projects:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ProjectEntity> {
    return this.projectsService.findOne(id);
  }

  @ProjectRelation('owner')
  @RequirePermissions('projects:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, dto);
  }

  @RequirePermissions('projects:delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiOkResponse({ type: ProjectEntity })
  @ApiNotFoundResponse({ description: 'Project not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<ProjectEntity> {
    return this.projectsService.remove(id);
  }
}
