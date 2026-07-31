import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectEntity } from './entities/project.entity';

const projectSelect = {
  id: true,
  name: true,
  description: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProjectUncheckedCreateInput): Promise<ProjectEntity> {
    return this.prisma.project.create({ data, select: projectSelect });
  }

  findMany(
    where: Prisma.ProjectWhereInput,
    skip: number,
    take: number,
  ): Promise<ProjectEntity[]> {
    return this.prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'asc' },
      select: projectSelect,
    });
  }

  findOneWithRelations(
    where: Prisma.ProjectWhereInput,
    include: Prisma.ProjectInclude,
  ): Promise<ProjectEntity | null> {
    return this.prisma.project.findFirst({
      where,
      include,
    });
  }

  count(where: Prisma.ProjectWhereInput): Promise<number> {
    return this.prisma.project.count({ where });
  }

  findById(id: number): Promise<ProjectEntity | null> {
    return this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    });
  }

  update(
    id: number,
    data: Prisma.ProjectUncheckedUpdateInput,
  ): Promise<ProjectEntity> {
    return this.prisma.project.update({
      where: { id },
      data,
      select: projectSelect,
    });
  }

  delete(id: number): Promise<ProjectEntity> {
    return this.prisma.project.delete({ where: { id }, select: projectSelect });
  }
}
