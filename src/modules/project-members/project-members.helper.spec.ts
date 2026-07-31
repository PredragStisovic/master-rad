import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRole } from '../../../generated/prisma/client';
import { ProjectMemberEntity } from './entities/project-member.entity';
import { ProjectMembersHelper } from './project-members.helper';
import { ProjectMembersRepository } from './project-members.repository';

const member: ProjectMemberEntity = {
  id: 1,
  projectId: 1,
  userId: 2,
  role: ProjectRole.MEMBER,
  joinedAt: new Date('2026-01-01'),
};

const createRepositoryMock = () => ({
  findByProjectAndUser: jest.fn().mockResolvedValue(null),
  projectExists: jest.fn().mockResolvedValue(true),
  userExists: jest.fn().mockResolvedValue(true),
});

describe('ProjectMembersHelper', () => {
  let helper: ProjectMembersHelper;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersHelper,
        { provide: ProjectMembersRepository, useValue: repositoryMock },
      ],
    }).compile();

    helper = module.get(ProjectMembersHelper);
    repository = repositoryMock;
  });

  describe('assertProjectExists', () => {
    it('passes when the project exists', async () => {
      await expect(helper.assertProjectExists(1)).resolves.toBeUndefined();
    });

    it('throws when the project is missing', async () => {
      repository.projectExists.mockResolvedValue(false);

      await expect(helper.assertProjectExists(99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertUserExists', () => {
    it('passes when the user exists', async () => {
      await expect(helper.assertUserExists(1)).resolves.toBeUndefined();
    });

    it('throws when the user is missing', async () => {
      repository.userExists.mockResolvedValue(false);

      await expect(helper.assertUserExists(99)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertNotAlreadyMember', () => {
    it('passes when the user is not yet a member', async () => {
      await expect(
        helper.assertNotAlreadyMember(1, 2),
      ).resolves.toBeUndefined();
    });

    it('throws when the user is already a member', async () => {
      repository.findByProjectAndUser.mockResolvedValue(member);

      await expect(helper.assertNotAlreadyMember(1, 2)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getExistingMember', () => {
    it('returns the member when found', async () => {
      repository.findByProjectAndUser.mockResolvedValue(member);

      await expect(helper.getExistingMember(1, 2)).resolves.toEqual(member);
    });

    it('throws when the member does not exist', async () => {
      await expect(helper.getExistingMember(1, 99)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
