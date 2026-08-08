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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { AuditAction } from '../../../generated/prisma/client';
import { AuditActionType } from '../../common/decorators/audit-action.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Auth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions('roles:create')
  @AuditActionType(AuditAction.CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a role' })
  @ApiCreatedResponse({ type: RoleEntity })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Role name already taken' })
  create(@Body() createRoleDto: CreateRoleDto): Promise<RoleEntity> {
    return this.rolesService.create(createRoleDto);
  }

  @RequirePermissions('roles:read')
  @Get()
  @ApiOperation({ summary: 'List roles (paginated)' })
  @ApiOkResponse({ type: [RoleEntity] })
  findAll(@Query() query: QueryRolesDto): Promise<PaginatedResult<RoleEntity>> {
    return this.rolesService.findAll(query);
  }

  @RequirePermissions('roles:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a role by id' })
  @ApiOkResponse({ type: RoleEntity })
  @ApiNotFoundResponse({ description: 'Role not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<RoleEntity> {
    return this.rolesService.findOne(id);
  }

  @RequirePermissions('roles:update')
  @AuditActionType(AuditAction.UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiOkResponse({ type: RoleEntity })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiConflictResponse({ description: 'Role name already taken' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleEntity> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @RequirePermissions('roles:delete')
  @AuditActionType(AuditAction.DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiOkResponse({ type: RoleEntity })
  @ApiNotFoundResponse({ description: 'Role not found' })
  @ApiConflictResponse({ description: 'Role is still assigned to users' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<RoleEntity> {
    return this.rolesService.remove(id);
  }
}
