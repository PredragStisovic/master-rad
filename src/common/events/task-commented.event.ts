export const TASK_COMMENTED_EVENT = 'task.comment.created';

export class TaskCommentedEvent {
  taskId: number;
  actorId: number;
}
