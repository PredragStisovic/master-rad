import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { ReportsController } from './reports.controller';
import { ReportsHelper } from './reports.helper';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';
import { UserActivityController } from './user-activity.controller';
import { UserActivityHelper } from './user-activity.helper';
import { UserActivityRepository } from './user-activity.repository';
import { UserActivityService } from './user-activity.service';

@Module({
  imports: [RolesModule, UsersModule],
  controllers: [ReportsController, UserActivityController],
  providers: [
    ReportsService,
    ReportsHelper,
    ReportsRepository,
    UserActivityService,
    UserActivityHelper,
    UserActivityRepository,
  ],
})
export class ReportsModule {}
