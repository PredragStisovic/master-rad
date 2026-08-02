import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ProjectAccessGuard } from '../guards/project-access.guard';

export const Auth = () =>
  applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, ProjectAccessGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' }),
  );
