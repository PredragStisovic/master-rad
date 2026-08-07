import { PayloadTooLargeException } from '@nestjs/common';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { TaskAttachmentsRepository } from './task.attachments.repository';
import { LocalStorageService } from '../s3/local-storage.service';

export class TaskAttachmentsService {
  constructor(
    private readonly repository: TaskAttachmentsRepository,
    private readonly localStorageService: LocalStorageService,
  ) {}

  async create(
    createTaskAttachmentDto: CreateTaskAttachmentDto,
    files: Array<Express.Multer.File>,
  ) {
    for (const file of files) {
      createTaskAttachmentDto.storageKey =
        await this.localStorageService.uploadFile(file);
    }
    return await this.repository.create(createTaskAttachmentDto);
  }
}
