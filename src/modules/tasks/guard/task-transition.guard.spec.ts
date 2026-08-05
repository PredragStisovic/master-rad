import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TaskTransitionGuard } from './task-transition.guard';
import { TasksRepository } from '../tasks.repository';
import { TaskStatus } from '../../../../generated/prisma/client';
import { UpdateTaskDto } from '../dto/update-task.dto';

const createContext = (params: Record<string, string>, body: UpdateTaskDto) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ params, body }),
    }),
  }) as unknown as ExecutionContext;

describe('TaskTransitionGuard', () => {
  let guard: TaskTransitionGuard;
  let taskRepository: TasksRepository;

  const mockExistingStatus = (status: TaskStatus | null) =>
    jest
      .spyOn(taskRepository, 'findById')
      .mockResolvedValue(status ? ({ status } as never) : null);

  beforeEach(() => {
    taskRepository = { findById: jest.fn() } as unknown as TasksRepository;
    guard = new TaskTransitionGuard(new Reflector(), taskRepository);
  });

  it('allows the request when no status change is requested', async () => {
    mockExistingStatus(TaskStatus.TODO);

    const result = await guard.canActivate(createContext({ id: '1' }, {}));

    expect(result).toBe(true);
  });

  it('allows the request when the existing task has no status', async () => {
    jest.spyOn(taskRepository, 'findById').mockResolvedValue({} as never);

    const result = await guard.canActivate(
      createContext({ id: '1' }, { status: TaskStatus.DONE }),
    );

    expect(result).toBe(true);
  });

  it('allows the request when the task does not exist', async () => {
    mockExistingStatus(null);

    const result = await guard.canActivate(
      createContext({ id: '1' }, { status: TaskStatus.DONE }),
    );

    expect(result).toBe(true);
  });

  it('allows a valid transition', async () => {
    mockExistingStatus(TaskStatus.TODO);

    const result = await guard.canActivate(
      createContext({ id: '1' }, { status: TaskStatus.IN_PROGRESS }),
    );

    expect(result).toBe(true);
  });

  it('rejects an invalid transition', async () => {
    mockExistingStatus(TaskStatus.DONE);

    const result = await guard.canActivate(
      createContext({ id: '1' }, { status: TaskStatus.TODO }),
    );

    expect(result).toBe(false);
  });

  it('looks up the task by the numeric id from the route params', async () => {
    const spy = mockExistingStatus(TaskStatus.TODO);

    await guard.canActivate(
      createContext({ id: '42' }, { status: TaskStatus.DONE }),
    );

    expect(spy).toHaveBeenCalledWith(42);
  });
});
