import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  onModuleInit() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const uniqueKey = `${Date.now()}-${randomUUID()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, uniqueKey);

    await fs.promises.writeFile(filePath, file.buffer);

    return uniqueKey;
  }
}
