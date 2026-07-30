import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRolesDto } from './dto/query-roles.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from './entities/role.entity';
import { RolesHelper } from './roles.helper';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly rolesHelper: RolesHelper,
  ) {}

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    await this.rolesHelper.assertNameIsFree(dto.name);

    return this.rolesRepository.create(dto);
  }

  async findAll(query: QueryRolesDto): Promise<PaginatedResult<RoleEntity>> {
    const where = this.rolesHelper.buildWhere(query);

    const [data, total] = await Promise.all([
      this.rolesRepository.findMany(where, query.skip, query.limit),
      this.rolesRepository.count(where),
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

  findOne(id: number): Promise<RoleEntity> {
    return this.rolesHelper.getExistingRole(id);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleEntity> {
    await this.rolesHelper.getExistingRole(id);

    if (dto.name) {
      await this.rolesHelper.assertNameIsFree(dto.name, id);
    }

    return this.rolesRepository.update(id, dto);
  }

  async remove(id: number): Promise<RoleEntity> {
    await this.rolesHelper.getExistingRole(id);
    await this.rolesHelper.assertRoleIsUnassigned(id);

    return this.rolesRepository.delete(id);
  }
}
