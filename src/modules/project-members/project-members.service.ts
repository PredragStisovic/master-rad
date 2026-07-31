import { Injectable } from '@nestjs/common';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectMembersHelper } from './project-members.helper';
import { ProjectMembersRepository } from './project-members.repository';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly membersRepository: ProjectMembersRepository,
    private readonly membersHelper: ProjectMembersHelper,
  ) {}

  async add(projectId: number, dto: AddMemberDto): Promise<ProjectMemberEntity> {
    await this.membersHelper.assertProjectExists(projectId);
    await this.membersHelper.assertUserExists(dto.userId);
    await this.membersHelper.assertNotAlreadyMember(projectId, dto.userId);

    return this.membersRepository.create({
      projectId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  async list(projectId: number): Promise<ProjectMemberEntity[]> {
    await this.membersHelper.assertProjectExists(projectId);

    return this.membersRepository.findMany(projectId);
  }

  async update(projectId: number, userId: number, dto: UpdateMemberDto): Promise<ProjectMemberEntity> {
    await this.membersHelper.getExistingMember(projectId, userId);

    return this.membersRepository.update(projectId, userId, { role: dto.role });
  }

  async remove(projectId: number, userId: number): Promise<ProjectMemberEntity> {
    await this.membersHelper.getExistingMember(projectId, userId);

    return this.membersRepository.delete(projectId, userId);
  }
}
