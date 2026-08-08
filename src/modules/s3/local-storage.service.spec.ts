import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: { writeFile: jest.fn().mockResolvedValue(undefined) },
}));

const mockedFs = jest.mocked(fs);

/** The parts of an uploaded file the storage code actually reads. */
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

const uploadDir = path.join(process.cwd(), 'uploads');

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService],
    }).compile();

    service = module.get(LocalStorageService);
  });

  describe('onModuleInit', () => {
    it('creates the upload directory when it is missing', () => {
      mockedFs.existsSync.mockReturnValue(false);

      service.onModuleInit();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(uploadDir, {
        recursive: true,
      });
    });

    it('leaves an existing upload directory alone', () => {
      service.onModuleInit();

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('writes the buffer into the upload directory under the returned key', async () => {
      const file = multerFile();

      const key = await service.uploadFile(file);

      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        path.join(uploadDir, key),
        file.buffer,
      );
    });

    it('keeps the original name in the key so a file stays recognisable', async () => {
      const key = await service.uploadFile(
        multerFile({ originalname: 'report.pdf' }),
      );

      expect(key.endsWith('-report.pdf')).toBe(true);
    });

    it('gives two files uploaded in the same millisecond distinct keys', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1767225600000);

      const [first, second] = await Promise.all([
        service.uploadFile(multerFile()),
        service.uploadFile(multerFile()),
      ]);

      expect(first).not.toBe(second);
    });
  });
});
