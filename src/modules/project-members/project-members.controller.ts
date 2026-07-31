import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectMembersService } from './project-members.service';

@ApiTags('project-members')
@Auth()
@Controller('projects/:projectId/members')
export class ProjectMembersController {
  constructor(private readonly membersService: ProjectMembersService) {}

  @RequirePermissions('projects:update')
  @Post()
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiCreatedResponse({ type: ProjectMemberEntity })
  @ApiNotFoundResponse({ description: 'Project or user not found' })
  @ApiConflictResponse({ description: 'User is already a member' })
  add(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: AddMemberDto,
  ): Promise<ProjectMemberEntity> {
    return this.membersService.add(projectId, dto);
  }

  @RequirePermissions('projects:read')
  @Get()
  @ApiOperation({ summary: 'List members of a project' })
  @ApiOkResponse({ type: [ProjectMemberEntity] })
  @ApiNotFoundResponse({ description: 'Project not found' })
  list(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectMemberEntity[]> {
    return this.membersService.list(projectId);
  }

  @RequirePermissions('projects:update')
  @Patch(':userId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiOkResponse({ type: ProjectMemberEntity })
  @ApiNotFoundResponse({ description: 'Member not found' })
  update(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateMemberDto,
  ): Promise<ProjectMemberEntity> {
    return this.membersService.update(projectId, userId, dto);
  }

  @RequirePermissions('projects:update')
  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiOkResponse({ type: ProjectMemberEntity })
  @ApiNotFoundResponse({ description: 'Member not found' })
  remove(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ProjectMemberEntity> {
    return this.membersService.remove(projectId, userId);
  }
}
