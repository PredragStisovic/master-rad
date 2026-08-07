import {
  Body,
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { TaskAttachmentsService } from './task-attachments.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';

@Controller('task-attachments')
export class TaskAttachmentsController {
  constructor(private readonly taskAttachmentService: TaskAttachmentsService) {}

  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async createTaskAttachment(
    @Body() createTaskAttachmentDto: CreateTaskAttachmentDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return await this.taskAttachmentService.create(
      createTaskAttachmentDto,
      files,
    );
  }
}
