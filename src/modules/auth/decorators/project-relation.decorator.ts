import { SetMetadata } from '@nestjs/common';

export const PROJECT_RELATION_KEY = 'project_relation';

export type ProjectRelationType = 'owner' | 'member';

export const ProjectRelation = (...relations: ProjectRelationType[]) =>
  SetMetadata(PROJECT_RELATION_KEY, relations);
