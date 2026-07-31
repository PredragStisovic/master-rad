import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
} from '../../common/constants/permissions';
import { PrismaClient } from '../../../generated/prisma/client';
import { seedPermissions } from './seed-permissions';

const createPrismaMock = () => {
  const tx = {
    permission: { upsert: jest.fn().mockResolvedValue({}) },
    role: { upsert: jest.fn().mockResolvedValue({}) },
  };

  return {
    tx,
    prisma: {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
};

const roleUpsertCall = (
  tx: ReturnType<typeof createPrismaMock>['tx'],
  role: string,
) =>
  tx.role.upsert.mock.calls
    .map(([args]) => args as { where: { name: string } })
    .find((args) => args.where.name === role);

describe('seedPermissions', () => {
  let mock: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation();

    mock = createPrismaMock();

    await seedPermissions(mock.prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('catalog', () => {
    it('runs everything inside a single transaction', () => {
      expect(mock.prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('upserts every catalog permission by name', () => {
      expect(mock.tx.permission.upsert).toHaveBeenCalledTimes(
        PERMISSIONS.length,
      );

      for (const name of PERMISSIONS) {
        expect(mock.tx.permission.upsert).toHaveBeenCalledWith({
          where: { name },
          update: {},
          create: { name },
        });
      }
    });

    it('leaves an existing permission untouched', () => {
      for (const [args] of mock.tx.permission.upsert.mock.calls) {
        expect((args as { update: unknown }).update).toEqual({});
      }
    });

    it('only wires roles to permissions the catalog declares', () => {
      for (const permissions of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
        for (const name of permissions) {
          expect(PERMISSIONS).toContain(name);
        }
      }
    });
  });

  describe('default roles', () => {
    it('upserts every default role', () => {
      expect(mock.tx.role.upsert).toHaveBeenCalledTimes(
        Object.keys(DEFAULT_ROLE_PERMISSIONS).length,
      );
    });

    it('replaces the permissions of an existing role instead of appending', () => {
      for (const [role, permissions] of Object.entries(
        DEFAULT_ROLE_PERMISSIONS,
      )) {
        expect(roleUpsertCall(mock.tx, role)).toEqual(
          expect.objectContaining({
            update: {
              permissions: {
                set: [],
                connect: permissions.map((name) => ({ name })),
              },
            },
          }),
        );
      }
    });

    it('grants the admin role the whole catalog', () => {
      expect(roleUpsertCall(mock.tx, 'admin')).toEqual(
        expect.objectContaining({
          create: {
            name: 'admin',
            permissions: {
              connect: PERMISSIONS.map((name) => ({ name })),
            },
          },
        }),
      );
    });

    it('grants the user role its default permissions', () => {
      expect(roleUpsertCall(mock.tx, 'user')).toEqual(
        expect.objectContaining({
          create: {
            name: 'user',
            permissions: {
              connect: DEFAULT_ROLE_PERMISSIONS.user.map((name) => ({ name })),
            },
          },
        }),
      );
    });
  });

  describe('idempotence', () => {
    it('issues the same writes on a second run', async () => {
      const second = createPrismaMock();

      await seedPermissions(second.prisma as unknown as PrismaClient);

      expect(second.tx.permission.upsert.mock.calls).toEqual(
        mock.tx.permission.upsert.mock.calls,
      );
      expect(second.tx.role.upsert.mock.calls).toEqual(
        mock.tx.role.upsert.mock.calls,
      );
    });
  });
});
