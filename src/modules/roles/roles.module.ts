import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesHelper } from './roles.helper';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, RolesHelper, RolesRepository],
  exports: [RolesRepository],
})
export class RolesModule {}
