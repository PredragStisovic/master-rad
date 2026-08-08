import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
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
import { AuditAction } from '../../../generated/prisma/client';
import { AuditActionType } from '../../common/decorators/audit-action.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @AuditActionType(AuditAction.CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ type: UserEntity })
  @ApiBadRequestResponse({ description: 'Validation failed or unknown role' })
  @ApiConflictResponse({ description: 'Email already taken' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Auth()
  @RequirePermissions('users:read')
  @Get()
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiOkResponse({ type: [UserEntity] })
  findAll(@Query() query: QueryUsersDto): Promise<PaginatedResult<UserEntity>> {
    return this.usersService.findAll(query);
  }

  @Auth()
  @RequirePermissions('users:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  @Auth()
  @RequirePermissions('users:update')
  @AuditActionType(AuditAction.UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email already taken' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, updateUserDto);
  }

  @Auth()
  @RequirePermissions('users:delete')
  @AuditActionType(AuditAction.DELETE)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.remove(id);
  }

  @Auth()
  @RequirePermissions('users:update')
  @AuditActionType(AuditAction.UPDATE)
  @Put(':id/roles/:roleId')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Role not found' })
  assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<UserEntity> {
    return this.usersService.assignRole(id, roleId);
  }

  @Auth()
  @RequirePermissions('users:update')
  @AuditActionType(AuditAction.UPDATE)
  @Delete(':id/roles')
  @ApiOperation({ summary: 'Unassign role from a user (resets to default)' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  unassignRole(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.unassignRole(id);
  }
}
