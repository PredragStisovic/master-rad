import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { RolesRepository } from '../roles/roles.repository';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

const DEFAULT_ROLE_NAME = 'user';

/**
 * Supporting logic for `UsersService` — guard clauses and query building that
 * are shared between endpoints rather than owned by any single one.
 */
@Injectable()
export class UsersHelper {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  buildWhere(query: QueryUsersDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (query.roleId !== undefined) {
      where.roleId = query.roleId;
    }

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' } as const;

      where.OR = [
        { email: contains },
        { firstName: contains },
        { lastName: contains },
      ];
    }

    return where;
  }

  async getExistingUser(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async getExistingUserWithPasswordByEmail(
    email: string,
  ): Promise<UserEntity & { password: string }> {
    const user = await this.usersRepository.findByEmailWithPassword(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async assertEmailIsFree(email: string, ignoreId?: number): Promise<void> {
    const existing = await this.usersRepository.findByEmail(email);

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(`Email ${email} is already taken`);
    }
  }

  async assertRoleExists(roleId: number): Promise<void> {
    if (!(await this.usersRepository.roleExists(roleId))) {
      throw new BadRequestException(`Role with id ${roleId} does not exist`);
    }
  }

  async resolveRoleId(roleId?: number): Promise<number> {
    if (roleId !== undefined) {
      await this.assertRoleExists(roleId);

      return roleId;
    }

    const defaultRoleId =
      await this.rolesRepository.findIdByName(DEFAULT_ROLE_NAME);

    if (defaultRoleId === null) {
      throw new InternalServerErrorException(
        `Default role "${DEFAULT_ROLE_NAME}" is not configured`,
      );
    }

    return defaultRoleId;
  }
}
