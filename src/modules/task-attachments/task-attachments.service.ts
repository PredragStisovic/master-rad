import { Injectable } from '@nestjs/common';
import { LocalStorageService } from '../s3/local-storage.service';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { TaskAttachmentsEntity } from './entities/task-attachments.entity';
import { TaskAttachmentsHelper } from './task.attachments.helper';
import { TaskAttachmentsRepository } from './task.attachments.repository';

@Injectable()
export class TaskAttachmentsService {
  constructor(
    private readonly repository: TaskAttachmentsRepository,
    private readonly localStorageService: LocalStorageService,
    private readonly helper: TaskAttachmentsHelper,
  ) {}

  async create(
    createTaskAttachmentDto: CreateTaskAttachmentDto,
    files: Array<Express.Multer.File>,
    uploadedById: number,
  ): Promise<TaskAttachmentsEntity[]> {
    await this.helper.assertTaskIsAccessible(
      createTaskAttachmentDto.taskId,
      uploadedById,
    );

    const attachments: TaskAttachmentsEntity[] = [];

    for (const file of files) {
      const storageKey = await this.localStorageService.uploadFile(file);

      attachments.push(
        await this.repository.create(
          this.helper.toCreateInput(
            createTaskAttachmentDto,
            file,
            uploadedById,
            storageKey,
          ),
        ),
      );
    }

    return attachments;
  }
}
