import {
  Body,
  Controller,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuditAction } from '../../../generated/prisma/client';
import { AuditActionType } from '../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Auth } from '../auth/decorators/auth.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { TaskAttachmentsEntity } from './entities/task-attachments.entity';
import { TaskAttachmentsService } from './task-attachments.service';

@ApiTags('task-attachments')
@Auth()
@Controller('task-attachments')
export class TaskAttachmentsController {
  constructor(private readonly taskAttachmentService: TaskAttachmentsService) {}

  @RequirePermissions('tasks:update')
  @AuditActionType(AuditAction.CREATE)
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Attach one or more files to a task' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['taskId', 'files'],
      properties: {
        taskId: { type: 'integer' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiCreatedResponse({ type: [TaskAttachmentsEntity] })
  @ApiForbiddenResponse({ description: 'Caller has no access to the project' })
  @ApiNotFoundResponse({ description: 'Task not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Unsupported file type, or a file larger than 5 MB',
  })
  async createTaskAttachment(
    @Body() createTaskAttachmentDto: CreateTaskAttachmentDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    files: Array<Express.Multer.File>,
    @CurrentUser('userId') uploadedById: number,
  ): Promise<TaskAttachmentsEntity[]> {
    return await this.taskAttachmentService.create(
      createTaskAttachmentDto,
      files,
      uploadedById,
    );
  }
}
