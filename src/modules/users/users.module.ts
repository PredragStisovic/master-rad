import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { UsersController } from './users.controller';
import { UsersHelper } from './users.helper';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersHelper, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
