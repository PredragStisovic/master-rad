import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersHelper } from './users.helper';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersHelper, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
