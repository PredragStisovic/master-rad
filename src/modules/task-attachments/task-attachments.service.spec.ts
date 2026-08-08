import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from '../s3/local-storage.service';
import { CreateTaskAttachmentDto } from './dto/create-task-attachments.dto';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskAttachmentsHelper } from './task.attachments.helper';
import { TaskAttachmentsRepository } from './task.attachments.repository';

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

const UPLOADER_ID = 7;

const dto: CreateTaskAttachmentDto = { taskId: 5 };

const diagram = multerFile({ originalname: 'diagram.png' });
const report = multerFile({
  originalname: 'report.pdf',
  mimetype: 'application/pdf',
  size: 4096,
});

const createRepositoryMock = () => ({
  create: jest.fn((data: { filename: string; storageKey: string }) => ({
    filename: data.filename,
    storageKey: data.storageKey,
  })),
});

const createStorageMock = () => ({
  uploadFile: jest.fn(
    (file: Express.Multer.File) => `stored-${file.originalname}`,
  ),
});

const createHelperMock = () => ({
  assertTaskIsAccessible: jest.fn().mockResolvedValue(undefined),
  // Mirrors the real mapper so the service assertions stay meaningful.
  toCreateInput: jest.fn(
    (
      createDto: CreateTaskAttachmentDto,
      file: Express.Multer.File,
      uploadedById: number,
      storageKey: string,
    ) => ({
      taskId: createDto.taskId,
      uploadedById,
      storageKey,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }),
  ),
});

describe('TaskAttachmentsService', () => {
  let service: TaskAttachmentsService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const storageMock = createStorageMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAttachmentsService,
        { provide: TaskAttachmentsRepository, useValue: repositoryMock },
        { provide: LocalStorageService, useValue: storageMock },
        { provide: TaskAttachmentsHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(TaskAttachmentsService);
    repository = repositoryMock;
    storage = storageMock;
    helper = helperMock;
  });

  describe('create', () => {
    it('checks the caller may attach to the task before storing anything', async () => {
      await service.create(dto, [diagram], UPLOADER_ID);

      expect(helper.assertTaskIsAccessible).toHaveBeenCalledWith(
        dto.taskId,
        UPLOADER_ID,
      );
    });

    it('persists the metadata of the stored file', async () => {
      await service.create(dto, [diagram], UPLOADER_ID);

      expect(storage.uploadFile).toHaveBeenCalledWith(diagram);
      expect(repository.create).toHaveBeenCalledWith({
        taskId: 5,
        uploadedById: UPLOADER_ID,
        storageKey: 'stored-diagram.png',
        filename: 'diagram.png',
        size: 1024,
        mimeType: 'image/png',
      });
    });

    it('records the caller as the uploader', async () => {
      await service.create(dto, [diagram], UPLOADER_ID);

      expect(helper.toCreateInput).toHaveBeenCalledWith(
        dto,
        diagram,
        UPLOADER_ID,
        'stored-diagram.png',
      );
    });

    it('writes one row per uploaded file rather than only the last one', async () => {
      const attachments = await service.create(
        dto,
        [diagram, report],
        UPLOADER_ID,
      );

      expect(repository.create).toHaveBeenCalledTimes(2);
      expect(attachments).toEqual([
        { filename: 'diagram.png', storageKey: 'stored-diagram.png' },
        { filename: 'report.pdf', storageKey: 'stored-report.pdf' },
      ]);
    });

    it('gives every file of a batch its own storage key', async () => {
      await service.create(dto, [diagram, report], UPLOADER_ID);

      const keys = repository.create.mock.calls.map(
        ([data]: [{ storageKey: string }]) => data.storageKey,
      );

      expect(new Set(keys).size).toBe(2);
    });

    it('does not store or persist when the task is missing', async () => {
      helper.assertTaskIsAccessible.mockRejectedValue(new NotFoundException());

      await expect(service.create(dto, [diagram], UPLOADER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(storage.uploadFile).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not store or persist when the caller has no access', async () => {
      helper.assertTaskIsAccessible.mockRejectedValue(new ForbiddenException());

      await expect(service.create(dto, [diagram], UPLOADER_ID)).rejects.toThrow(
        ForbiddenException,
      );

      expect(storage.uploadFile).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not persist a file that failed to reach storage', async () => {
      storage.uploadFile.mockRejectedValue(new Error('disk full'));

      await expect(service.create(dto, [diagram], UPLOADER_ID)).rejects.toThrow(
        'disk full',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns nothing and touches no storage for an empty batch', async () => {
      await expect(service.create(dto, [], UPLOADER_ID)).resolves.toEqual([]);

      expect(storage.uploadFile).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });
});
