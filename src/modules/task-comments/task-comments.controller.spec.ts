import { TaskCommentEntity } from './entities/task-comment.entity';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsService } from './task-comments.service';

const comment: TaskCommentEntity = {
  id: 1,
  body: 'Looks good to me',
  taskId: 5,
  authorId: 7,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const createServiceMock = () => ({
  create: jest.fn().mockResolvedValue(comment),
  findAll: jest.fn().mockResolvedValue([comment]),
  findOne: jest.fn().mockResolvedValue(comment),
  update: jest.fn().mockResolvedValue(comment),
  remove: jest.fn().mockResolvedValue(comment),
});

describe('TaskCommentsController', () => {
  let controller: TaskCommentsController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards declared on the controller are
  // policy, exercised in the e2e specs, not part of this unit.
  beforeEach(() => {
    service = createServiceMock();
    controller = new TaskCommentsController(
      service as unknown as TaskCommentsService,
    );
  });

  describe('create', () => {
    it('passes the caller through as the author', async () => {
      const dto = { body: 'Looks good to me' };

      await expect(controller.create(1, 5, 7, dto)).resolves.toEqual(comment);
      expect(service.create).toHaveBeenCalledWith(1, 5, 7, dto);
    });
  });

  describe('findAll', () => {
    it('returns the comments of the task', async () => {
      await expect(controller.findAll(1, 5)).resolves.toEqual([comment]);
      expect(service.findAll).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('findOne', () => {
    it('returns a single comment', async () => {
      await expect(controller.findOne(1, 5, 1)).resolves.toEqual(comment);
      expect(service.findOne).toHaveBeenCalledWith(1, 5, 1);
    });
  });

  describe('update', () => {
    it('forwards the payload and the caller to the service', async () => {
      const dto = { body: 'Edited' };

      await expect(controller.update(1, 5, 1, 7, dto)).resolves.toEqual(
        comment,
      );
      expect(service.update).toHaveBeenCalledWith(1, 5, 1, 7, dto);
    });
  });

  describe('remove', () => {
    it('forwards the caller so the service can check authorship', async () => {
      await expect(controller.remove(1, 5, 1, 7)).resolves.toEqual(comment);
      expect(service.remove).toHaveBeenCalledWith(1, 5, 1, 7);
    });
  });
});
