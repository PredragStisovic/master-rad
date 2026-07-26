import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

/**
 * Supporting logic for `UsersService` — guard clauses and query building that
 * are shared between endpoints rather than owned by any single one.
 */
@Injectable()
export class UsersHelper {
  constructor(private readonly usersRepository: UsersRepository) {}

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
}
