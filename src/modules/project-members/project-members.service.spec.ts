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
import { ProjectMembersService } from './project-members.service';

const member: ProjectMemberEntity = {
  id: 1,
  projectId: 1,
  userId: 2,
  role: ProjectRole.MEMBER,
  joinedAt: new Date('2026-01-01'),
};

const createRepositoryMock = () => ({
  create: jest.fn().mockResolvedValue(member),
  findMany: jest.fn().mockResolvedValue([member]),
  update: jest.fn().mockResolvedValue(member),
  delete: jest.fn().mockResolvedValue(member),
});

const createHelperMock = () => ({
  assertProjectExists: jest.fn().mockResolvedValue(undefined),
  assertUserExists: jest.fn().mockResolvedValue(undefined),
  assertNotAlreadyMember: jest.fn().mockResolvedValue(undefined),
  getExistingMember: jest.fn().mockResolvedValue(member),
});

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let repository: ReturnType<typeof createRepositoryMock>;
  let helper: ReturnType<typeof createHelperMock>;

  beforeEach(async () => {
    const repositoryMock = createRepositoryMock();
    const helperMock = createHelperMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        { provide: ProjectMembersRepository, useValue: repositoryMock },
        { provide: ProjectMembersHelper, useValue: helperMock },
      ],
    }).compile();

    service = module.get(ProjectMembersService);
    repository = repositoryMock;
    helper = helperMock;
  });

  describe('add', () => {
    it('adds a member after all guard checks pass', async () => {
      await expect(service.add(1, { userId: 2 })).resolves.toEqual(member);

      expect(helper.assertProjectExists).toHaveBeenCalledWith(1);
      expect(helper.assertUserExists).toHaveBeenCalledWith(2);
      expect(helper.assertNotAlreadyMember).toHaveBeenCalledWith(1, 2);
      expect(repository.create).toHaveBeenCalledWith({
        projectId: 1,
        userId: 2,
        role: undefined,
      });
    });

    it('does not persist when the project is missing', async () => {
      helper.assertProjectExists.mockRejectedValue(new NotFoundException());

      await expect(service.add(99, { userId: 2 })).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not persist when the user is missing', async () => {
      helper.assertUserExists.mockRejectedValue(new BadRequestException());

      await expect(service.add(1, { userId: 99 })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not persist when already a member', async () => {
      helper.assertNotAlreadyMember.mockRejectedValue(new ConflictException());

      await expect(service.add(1, { userId: 2 })).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns members after verifying the project exists', async () => {
      await expect(service.list(1)).resolves.toEqual([member]);

      expect(helper.assertProjectExists).toHaveBeenCalledWith(1);
      expect(repository.findMany).toHaveBeenCalledWith(1);
    });

    it('throws when the project is missing', async () => {
      helper.assertProjectExists.mockRejectedValue(new NotFoundException());

      await expect(service.list(99)).rejects.toThrow(NotFoundException);
      expect(repository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the member role', async () => {
      await expect(
        service.update(1, 2, { role: ProjectRole.OWNER }),
      ).resolves.toEqual(member);

      expect(helper.getExistingMember).toHaveBeenCalledWith(1, 2);
      expect(repository.update).toHaveBeenCalledWith(1, 2, {
        role: ProjectRole.OWNER,
      });
    });

    it('throws when the member does not exist', async () => {
      helper.getExistingMember.mockRejectedValue(new NotFoundException());

      await expect(
        service.update(1, 99, { role: ProjectRole.OWNER }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes an existing member', async () => {
      await expect(service.remove(1, 2)).resolves.toEqual(member);

      expect(helper.getExistingMember).toHaveBeenCalledWith(1, 2);
      expect(repository.delete).toHaveBeenCalledWith(1, 2);
    });

    it('throws when the member does not exist', async () => {
      helper.getExistingMember.mockRejectedValue(new NotFoundException());

      await expect(service.remove(1, 99)).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
