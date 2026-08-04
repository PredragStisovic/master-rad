import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { TaskEntity } from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const task: TaskEntity = {
  id: 1,
  title: 'Write the migration',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  projectId: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createServiceMock = () => ({
  create: jest.fn().mockResolvedValue(task),
  findAll: jest.fn().mockResolvedValue([task]),
  findOne: jest.fn().mockResolvedValue(task),
  update: jest.fn().mockResolvedValue(task),
  remove: jest.fn().mockResolvedValue(task),
});

describe('TasksController', () => {
  let controller: TasksController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new TasksController(service as unknown as TasksService);
  });

  describe('create', () => {
    it('creates the task under the project from the route', async () => {
      const dto = { title: 'Write the migration' };

      await expect(controller.create(1, dto)).resolves.toEqual(task);
      expect(service.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('findAll', () => {
    it('lists the tasks of the project', async () => {
      await expect(controller.findAll(1)).resolves.toEqual([task]);
      expect(service.findAll).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('returns a single task', async () => {
      await expect(controller.findOne(1, 1)).resolves.toEqual(task);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('forwards the payload to the service', async () => {
      const dto = { status: TaskStatus.DONE };

      await expect(controller.update(1, 1, dto)).resolves.toEqual(task);
      expect(service.update).toHaveBeenCalledWith(1, 1, dto);
    });
  });

  describe('remove', () => {
    it('deletes the task', async () => {
      await expect(controller.remove(1, 1)).resolves.toEqual(task);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
