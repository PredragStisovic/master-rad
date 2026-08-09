import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction } from '../../../generated/prisma/client';
import { UserEntity } from '../users/entities/user.entity';
import { UsersRepository } from '../users/users.repository';
import { QueryUserActivityDto } from './dto/query-user-activity.dto';
import { UserActivityHelper } from './user-activity.helper';

const user: UserEntity = {
  id: 7,
  email: 'auditee@example.com',
  firstName: 'Audited',
  lastName: 'User',
  roleId: 1,
};

const query = (
  overrides: Partial<QueryUserActivityDto> = {},
): QueryUserActivityDto => Object.assign(new QueryUserActivityDto(), overrides);

const from = new Date('2026-01-01T00:00:00.000Z');
const to = new Date('2026-02-01T00:00:00.000Z');

const createUsersRepositoryMock = () => ({
  findById: jest.fn().mockResolvedValue(user),
});

describe('UserActivityHelper', () => {
  let helper: UserActivityHelper;
  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;

  beforeEach(async () => {
    const usersRepositoryMock = createUsersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserActivityHelper,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    helper = module.get(UserActivityHelper);
    usersRepository = usersRepositoryMock;
  });

  describe('assertUserExists', () => {
    it('passes for a known user', async () => {
      await expect(helper.assertUserExists(7)).resolves.toBeUndefined();
      expect(usersRepository.findById).toHaveBeenCalledWith(7);
    });

    it('keeps "no such person" apart from "did nothing"', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(helper.assertUserExists(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('assertWindowIsOrdered', () => {
    it('accepts a window that runs forwards', () => {
      expect(() =>
        helper.assertWindowIsOrdered(query({ from, to })),
      ).not.toThrow();
    });

    it('accepts a half-open window', () => {
      expect(() => helper.assertWindowIsOrdered(query({ from }))).not.toThrow();
    });

    it('accepts a window of a single instant', () => {
      expect(() =>
        helper.assertWindowIsOrdered(query({ from, to: from })),
      ).not.toThrow();
    });

    it('rejects an inverted window instead of reporting zero', () => {
      expect(() =>
        helper.assertWindowIsOrdered(query({ from: to, to: from })),
      ).toThrow(BadRequestException);
    });
  });

  describe('buildWhere', () => {
    it('scopes to the user when no window is given', () => {
      expect(helper.buildWhere(7, query())).toEqual({ userId: 7 });
    });

    it('bounds both sides inclusively', () => {
      expect(helper.buildWhere(7, query({ from, to }))).toEqual({
        userId: 7,
        createdAt: { gte: from, lte: to },
      });
    });

    it('leaves the missing side open', () => {
      expect(helper.buildWhere(7, query({ to }))).toEqual({
        userId: 7,
        createdAt: { lte: to },
      });
    });
  });

  describe('toActionCounts', () => {
    it('fills in the actions the user never performed', () => {
      expect(
        helper.toActionCounts([{ action: AuditAction.CREATE, count: 9 }]),
      ).toEqual({ CREATE: 9, UPDATE: 0, DELETE: 0 });
    });

    it('reports a silent window as all zeroes', () => {
      expect(helper.toActionCounts([])).toEqual({
        CREATE: 0,
        UPDATE: 0,
        DELETE: 0,
      });
    });

    it('covers every action the schema defines', () => {
      expect(Object.keys(helper.toActionCounts([]))).toEqual(
        Object.values(AuditAction),
      );
    });
  });

  describe('toEntityTypeCounts', () => {
    it('puts the most-touched resource first', () => {
      expect(
        helper.toEntityTypeCounts([
          { entityType: 'Projects', count: 2 },
          { entityType: 'Tasks', count: 8 },
        ]),
      ).toEqual([
        { entityType: 'Tasks', count: 8 },
        { entityType: 'Projects', count: 2 },
      ]);
    });

    it('breaks ties by name so the order is stable between requests', () => {
      expect(
        helper.toEntityTypeCounts([
          { entityType: 'Tasks', count: 3 },
          { entityType: 'Projects', count: 3 },
        ]),
      ).toEqual([
        { entityType: 'Projects', count: 3 },
        { entityType: 'Tasks', count: 3 },
      ]);
    });

    it('leaves the rows it was given untouched', () => {
      const rows = [
        { entityType: 'Projects', count: 1 },
        { entityType: 'Tasks', count: 9 },
      ];

      helper.toEntityTypeCounts(rows);

      expect(rows[0].entityType).toBe('Projects');
    });
  });
});
