import { TaskAttachmentsEntity } from './entities/task-attachments.entity';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';

/** The parts of an uploaded file the attachment code actually reads. */
const multerFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: 'files',
    originalname: 'diagram.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('a png, honestly'),
    ...overrides,
  }) as Express.Multer.File;

const attachment: TaskAttachmentsEntity = {
  filename: 'diagram.png',
  storageKey: '1767225600000-uuid-diagram.png',
};

const createServiceMock = () => ({
  create: jest.fn().mockResolvedValue([attachment]),
});

describe('TaskAttachmentsController', () => {
  let controller: TaskAttachmentsController;
  let service: ReturnType<typeof createServiceMock>;

  // Instantiated directly: the route guards and the file validation pipe
  // declared on the controller are policy, exercised in the e2e specs.
  beforeEach(() => {
    service = createServiceMock();
    controller = new TaskAttachmentsController(
      service as unknown as TaskAttachmentsService,
    );
  });

  describe('createTaskAttachment', () => {
    it('passes the caller through as the uploader', async () => {
      const files = [multerFile()];

      await expect(
        controller.createTaskAttachment({ taskId: 5 }, files, 7),
      ).resolves.toEqual([attachment]);

      expect(service.create).toHaveBeenCalledWith({ taskId: 5 }, files, 7);
    });

    it('forwards the whole batch in one call', async () => {
      const files = [
        multerFile({ originalname: 'a.png' }),
        multerFile({ originalname: 'b.png' }),
      ];

      await controller.createTaskAttachment({ taskId: 5 }, files, 7);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith({ taskId: 5 }, files, 7);
    });

    it('propagates a service rejection to the caller', async () => {
      service.create.mockRejectedValue(new Error('task gone'));

      await expect(
        controller.createTaskAttachment({ taskId: 99 }, [multerFile()], 7),
      ).rejects.toThrow('task gone');
    });
  });
});
