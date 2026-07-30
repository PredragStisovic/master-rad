import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../../common/constants/permissions';
import { Prisma, PrismaClient } from '../../../generated/prisma/client';

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const name of PERMISSIONS) {
      await tx.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    for (const [role, permissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS,
    )) {
      const connect = permissions.map((name) => ({ name }));

      await tx.role.upsert({
        where: { name: role },
        update: { permissions: { set: [], connect } },
        create: { name: role, permissions: { connect } },
      });
    }
  });

  console.log(
    `Seeded ${PERMISSIONS.length} permission(s) across ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length} role(s)`,
  );
}
