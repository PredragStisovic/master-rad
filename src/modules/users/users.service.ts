import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { UsersHelper } from './users.helper';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersHelper: UsersHelper,
  ) {}

  async create(dto: CreateUserDto): Promise<UserEntity> {
    await this.usersHelper.assertEmailIsFree(dto.email);

    const roleId = await this.usersHelper.resolveRoleId(dto.roleId);

    return this.usersRepository.create({
      ...dto,
      roleId,
      password: await bcrypt.hash(dto.password, 10),
    });
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<UserEntity>> {
    const where = this.usersHelper.buildWhere(query);

    const [data, total] = await Promise.all([
      this.usersRepository.findMany(where, query.skip, query.limit),
      this.usersRepository.count(where),
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

  findOne(id: number): Promise<UserEntity> {
    return this.usersHelper.getExistingUser(id);
  }

  findOneWithPasswordByEmail(
    email: string,
  ): Promise<UserEntity & { password: string }> {
    return this.usersHelper.getExistingUserWithPasswordByEmail(email);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    await this.usersHelper.getExistingUser(id);

    if (dto.email) {
      await this.usersHelper.assertEmailIsFree(dto.email, id);
    }

    if (dto.roleId !== undefined) {
      await this.usersHelper.assertRoleExists(dto.roleId);
    }

    return this.usersRepository.update(id, dto);
  }

  async remove(id: number): Promise<UserEntity> {
    await this.usersHelper.getExistingUser(id);

    return this.usersRepository.delete(id);
  }

  async assignRole(userId: number, roleId: number): Promise<UserEntity> {
    await this.usersHelper.getExistingUser(userId);
    await this.usersHelper.assertRoleExists(roleId);

    return this.usersRepository.update(userId, { roleId });
  }

  async unassignRole(userId: number): Promise<UserEntity> {
    await this.usersHelper.getExistingUser(userId);

    const roleId = await this.usersHelper.resolveRoleId();

    return this.usersRepository.update(userId, { roleId });
  }
}
