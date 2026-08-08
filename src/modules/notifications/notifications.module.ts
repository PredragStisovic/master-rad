import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsListener } from './notifications.listener';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [RolesModule, TasksModule, UsersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsHelper,
    NotificationsRepository,
    NotificationsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
