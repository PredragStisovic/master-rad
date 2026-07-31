import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectsRepository } from '../../projects/projects.repository';
import {
  PROJECT_RELATION_KEY,
  ProjectRelationType,
} from '../decorators/project-relation.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectRepository: ProjectsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRelations = this.reflector.getAllAndOverride<
      ProjectRelationType[]
    >(PROJECT_RELATION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRelations?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: Record<string, string>;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not sent with request');
    }

    const projectId = Number(request.params.projectId ?? request.params.id);

    const project = await this.projectRepository.findOneWithRelations(
      { id: projectId },
      { members: true },
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isOwner = project.ownerId === user.userId;
    const isMember = project.members?.some(
      (member) => member.userId === user.userId,
    );

    const hasAccess =
      (requiredRelations.includes('owner') && isOwner) ||
      (requiredRelations.includes('member') && (isOwner || isMember));

    if (!hasAccess) {
      throw new ForbiddenException(
        'This user has no access rights for project',
      );
    }
    return true;
  }
}
