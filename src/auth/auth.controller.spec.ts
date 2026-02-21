import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserGuard } from './guards/user.guard';
import { User } from '../users/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: 'user-uuid',
    name: 'Test',
    email: 'test@test.com',
    type: 'user',
    password: 'hashed',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockAuthService = {
      validateUser: jest.fn(),
      login: jest.fn().mockResolvedValue({ accessToken: 'jwt-token' }),
      requestSignUpOtp: jest.fn().mockResolvedValue({
        message: 'Verification code sent to your email',
      }),
      verifySignUp: jest.fn().mockResolvedValue({ accessToken: 'jwt-token' }),
      requestForgotPasswordOtp: jest.fn().mockResolvedValue({
        message: 'If an account exists with this email, a code has been sent',
      }),
      resetPassword: jest.fn().mockResolvedValue({
        message: 'Password has been reset successfully',
      }),
    };
    const mockUsersService = {
      updateUser: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  describe('signIn', () => {
    it('validates user and returns accessToken', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.signIn({
        email: 'test@test.com',
        password: 'password',
      });

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@test.com',
        'password',
      );
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('signUpRequestOtp', () => {
    it('calls requestSignUpOtp and returns message', async () => {
      const result = await controller.signUpRequestOtp({
        email: 'new@test.com',
      });

      expect(authService.requestSignUpOtp).toHaveBeenCalledWith('new@test.com');
      expect(result).toEqual({
        message: 'Verification code sent to your email',
      });
    });
  });

  describe('signUpVerify', () => {
    it('calls verifySignUp with body fields and returns accessToken', async () => {
      const result = await controller.signUpVerify({
        email: 'new@test.com',
        code: '123456',
        name: 'New User',
        password: 'secret',
      });

      expect(authService.verifySignUp).toHaveBeenCalledWith(
        'new@test.com',
        '123456',
        'New User',
        'secret',
      );
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('forgotPasswordRequestOtp', () => {
    it('calls requestForgotPasswordOtp and returns message', async () => {
      const result = await controller.forgotPasswordRequestOtp({
        email: 'user@test.com',
      });

      expect(authService.requestForgotPasswordOtp).toHaveBeenCalledWith(
        'user@test.com',
      );
      expect(result).toEqual({
        message: 'If an account exists with this email, a code has been sent',
      });
    });
  });

  describe('forgotPasswordReset', () => {
    it('calls resetPassword and returns message', async () => {
      const result = await controller.forgotPasswordReset({
        email: 'user@test.com',
        code: '123456',
        newPassword: 'newpass',
      });

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'user@test.com',
        '123456',
        'newpass',
      );
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });
  });

  describe('me', () => {
    it('returns user id, email, name, type', () => {
      const result = controller.me(mockUser);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        type: mockUser.type,
      });
    });
  });
});
