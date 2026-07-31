import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectMembersRepository } from './project-members.repository';

@Injectable()
export class ProjectMembersHelper {
  constructor(private readonly membersRepository: ProjectMembersRepository) {}

  async assertProjectExists(projectId: number): Promise<void> {
    if (!(await this.membersRepository.projectExists(projectId))) {
      throw new NotFoundException(`Project with id ${projectId} not found`);
    }
  }

  async assertUserExists(userId: number): Promise<void> {
    if (!(await this.membersRepository.userExists(userId))) {
      throw new BadRequestException(`User with id ${userId} does not exist`);
    }
  }

  async assertNotAlreadyMember(projectId: number, userId: number): Promise<void> {
    const existing = await this.membersRepository.findByProjectAndUser(projectId, userId);

    if (existing) {
      throw new ConflictException(
        `User ${userId} is already a member of project ${projectId}`,
      );
    }
  }

  async getExistingMember(projectId: number, userId: number): Promise<ProjectMemberEntity> {
    const member = await this.membersRepository.findByProjectAndUser(projectId, userId);

    if (!member) {
      throw new NotFoundException(
        `User ${userId} is not a member of project ${projectId}`,
      );
    }

    return member;
  }
}
