import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { QueryRolesDto } from './dto/query-roles.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesRepository } from './roles.repository';

/**
 * Supporting logic for `RolesService` — guard clauses and query building that
 * are shared between endpoints rather than owned by any single one.
 */
@Injectable()
export class RolesHelper {
  constructor(private readonly rolesRepository: RolesRepository) {}

  buildWhere(query: QueryRolesDto): Prisma.RoleWhereInput {
    const where: Prisma.RoleWhereInput = {};

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    return where;
  }

  async getExistingRole(id: number): Promise<RoleEntity> {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return role;
  }

  async assertNameIsFree(name: string, ignoreId?: number): Promise<void> {
    const existing = await this.rolesRepository.findByName(name);

    if (existing && existing.id !== ignoreId) {
      throw new ConflictException(`Role ${name} already exists`);
    }
  }

  async assertRoleIsUnassigned(id: number): Promise<void> {
    const users = await this.rolesRepository.countUsers(id);

    if (users > 0) {
      throw new ConflictException(
        `Role with id ${id} is still assigned to ${users} user(s)`,
      );
    }
  }
}
