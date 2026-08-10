import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectMemberEntity } from './entities/project-member.entity';

const memberSelect = {
  id: true,
  projectId: true,
  userId: true,
  role: true,
  joinedAt: true,
} satisfies Prisma.ProjectMemberSelect;

@Injectable()
export class ProjectMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: Prisma.ProjectMemberUncheckedCreateInput,
  ): Promise<ProjectMemberEntity> {
    return this.prisma.projectMember.create({ data, select: memberSelect });
  }

  findMany(projectId: number): Promise<ProjectMemberEntity[]> {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { joinedAt: 'asc' },
      select: memberSelect,
    });
  }

  findByProjectAndUser(
    projectId: number,
    userId: number,
  ): Promise<ProjectMemberEntity | null> {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: memberSelect,
    });
  }

  update(
    projectId: number,
    userId: number,
    data: Prisma.ProjectMemberUncheckedUpdateInput,
  ): Promise<ProjectMemberEntity> {
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data,
      select: memberSelect,
    });
  }

  delete(projectId: number, userId: number): Promise<ProjectMemberEntity> {
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
      select: memberSelect,
    });
  }

  async userExists(userId: number): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id: userId } });

    return count > 0;
  }
}
