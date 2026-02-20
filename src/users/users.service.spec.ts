import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'uuid-1',
    name: 'Admin',
    email: 'admin@test.com',
    type: 'admin',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'uuid-1' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'uuid-1' })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  describe('createAdmin', () => {
    const dto: CreateUserDto = {
      name: 'Admin',
      email: 'admin@test.com',
      password: 'plain-password',
    };

    it('should create admin when no admin exists', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      (repo.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.createAdmin(dto);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { type: 'admin' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(repo.create).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        password: 'hashed-password',
        type: 'admin',
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ email: dto.email, type: 'admin' });
    });

    it('should throw ForbiddenException when admin already exists', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.createAdmin(dto)).rejects.toThrow(ForbiddenException);
      await expect(service.createAdmin(dto)).rejects.toThrow(
        'Admin user already exists',
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('admin@test.com');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user name and hash password when provided', async () => {
      const updateDto: UpdateUserDto = {
        name: 'New Name',
        password: 'new-password',
      };
      const existingUser = { ...mockUser };
      (repo.findOne as jest.Mock).mockResolvedValue(existingUser);
      (repo.save as jest.Mock).mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateUser('uuid-1', updateDto);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          password: 'hashed-password',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should update only name when password not provided', async () => {
      const updateDto: UpdateUserDto = { name: 'New Name' };
      const existingUser = { ...mockUser };
      (repo.findOne as jest.Mock).mockResolvedValue(existingUser);
      (repo.save as jest.Mock).mockImplementation((u) => Promise.resolve(u));

      await service.updateUser('uuid-1', updateDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUser('missing-uuid', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateUser('missing-uuid', { name: 'X' }),
      ).rejects.toThrow('User not found');
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
