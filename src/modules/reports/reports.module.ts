import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { ReportsController } from './reports.controller';
import { ReportsHelper } from './reports.helper';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

@Module({
  imports: [RolesModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsHelper, ReportsRepository],
})
export class ReportsModule {}
