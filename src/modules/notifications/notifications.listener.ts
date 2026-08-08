import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TASK_ASSIGNED_EVENT,
  TaskAssignedEvent,
} from '../../common/events/task-assigned.event';
import {
  TASK_COMMENTED_EVENT,
  TaskCommentedEvent,
} from '../../common/events/task-commented.event';
import { NotificationsHelper } from './notifications.helper';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsHelper: NotificationsHelper,
  ) {}

  @OnEvent(TASK_ASSIGNED_EVENT)
  async handleTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    try {
      const dto =
        await this.notificationsHelper.buildTaskAssignedNotification(event);

      if (dto) {
        await this.notificationsService.create(dto);
      }
    } catch (error) {
      // Notifying is a side effect: a failure here must not surface as a
      // failed assignment to the caller that emitted the event.
      this.logger.error(
        `Failed to notify on ${TASK_ASSIGNED_EVENT} for task ${event.taskId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @OnEvent(TASK_COMMENTED_EVENT)
  async handleTaskCommented(event: TaskCommentedEvent): Promise<void> {
    try {
      const dto =
        await this.notificationsHelper.buildTaskCommentedNotification(event);

      if (dto) {
        await this.notificationsService.create(dto);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify on ${TASK_COMMENTED_EVENT} for task ${event.taskId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
