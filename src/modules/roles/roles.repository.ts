import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findIdByName(name: string): Promise<number | null> {
    const role = await this.prisma.role.findFirst({
      where: { name },
      select: { id: true },
    });

    return role?.id ?? null;
  }
}
