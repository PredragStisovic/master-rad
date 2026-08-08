export const TASK_ASSIGNED_EVENT = 'task.assigned';

export class TaskAssignedEvent {
  taskId: number;
  assigneeId: number;
  actorId: number;
}
