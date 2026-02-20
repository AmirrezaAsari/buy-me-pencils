import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { User } from './user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = {
    id: 'uuid-1',
    name: 'Admin',
    email: 'admin@test.com',
    type: 'admin',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockUsersService = {
      createAdmin: jest.fn().mockResolvedValue(mockUser),
      updateUser: jest.fn().mockResolvedValue(mockUser),
    };
    const mockAuthService = {
      validateAdminSetupToken: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);
  });

  describe('createAdmin', () => {
    const dto = {
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password',
    };

    it('creates admin when token is valid', async () => {
      const result = await controller.createAdmin(dto, 'valid-token');

      expect(authService.validateAdminSetupToken).toHaveBeenCalledWith(
        'valid-token',
      );
      expect(usersService.createAdmin).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUser);
    });

    it('throws when token is invalid', async () => {
      (authService.validateAdminSetupToken as jest.Mock).mockReturnValue(false);

      await expect(controller.createAdmin(dto, 'invalid')).rejects.toThrow(
        'Invalid admin setup token',
      );
      expect(usersService.createAdmin).not.toHaveBeenCalled();
    });

    it('throws when token is undefined', async () => {
      (authService.validateAdminSetupToken as jest.Mock).mockReturnValue(false);

      await expect(controller.createAdmin(dto, undefined)).rejects.toThrow(
        'Invalid admin setup token',
      );
    });
  });

  describe('updateUser', () => {
    it('calls usersService.updateUser with id and body', async () => {
      const body = { name: 'New Name' };
      const result = await controller.updateUser('uuid-1', body);

      expect(usersService.updateUser).toHaveBeenCalledWith('uuid-1', body);
      expect(result).toEqual(mockUser);
    });
  });
});
