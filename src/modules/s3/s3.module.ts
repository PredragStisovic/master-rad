import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';

@Module({
  providers: [LocalStorageService],
})
export class S3Module {}
