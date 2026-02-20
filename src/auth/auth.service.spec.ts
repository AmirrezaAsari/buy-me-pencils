import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { Otp } from './entities/otp.entity';
import { MailService } from '../mail/mail.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let otpRepo: jest.Mocked<Repository<Otp>>;
  let mailService: jest.Mocked<MailService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-uuid-1',
    name: 'Test User',
    email: 'user@test.com',
    type: 'user',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const validOtp = (purpose: 'signup' | 'forgot_password'): Otp => ({
    id: 'otp-uuid',
    email: 'user@test.com',
    code: '123456',
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockUsersRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((u) => Promise.resolve({ ...u, id: mockUser.id })),
    };
    const mockOtpRepo = {
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((dto) => dto),
      save: jest.fn((o) => Promise.resolve({ ...o, id: 'otp-id' })),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const mockMail = {
      sendOtpEmail: jest.fn().mockResolvedValue(undefined),
    };
    const mockJwt = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: getRepositoryToken(Otp), useValue: mockOtpRepo },
        { provide: MailService, useValue: mockMail },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepo = module.get(getRepositoryToken(User));
    otpRepo = module.get(getRepositoryToken(Otp));
    mailService = module.get(MailService);
    jwtService = module.get(JwtService);
  });

  describe('validateAdminSetupToken', () => {
    it('returns true when token matches ADMIN_SETUP_TOKEN', () => {
      const token = process.env.ADMIN_SETUP_TOKEN ?? 'change-this-token';
      expect(service.validateAdminSetupToken(token)).toBe(true);
    });

    it('returns false when token is wrong', () => {
      expect(service.validateAdminSetupToken('wrong')).toBe(false);
    });

    it('returns false when token is undefined or null', () => {
      expect(service.validateAdminSetupToken(undefined)).toBe(false);
      expect(service.validateAdminSetupToken(null)).toBe(false);
    });
  });

  describe('validateUser', () => {
    it('returns user when email and password match', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('user@test.com', 'password');

      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', mockUser.password);
      expect(result).toEqual(mockUser);
    });

    it('throws UnauthorizedException when user not found', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateUser('nobody@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('nobody@test.com', 'password'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws UnauthorizedException when password does not match', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('user@test.com', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('returns accessToken with payload sub, email, type', async () => {
      const result = await service.login(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        type: mockUser.type,
      });
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('requestSignUpOtp', () => {
    it('throws ConflictException when email already registered', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.requestSignUpOtp('user@test.com')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.requestSignUpOtp('user@test.com')).rejects.toThrow(
        'An account with this email already exists',
      );
      expect(otpRepo.save).not.toHaveBeenCalled();
      expect(mailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('creates OTP, sends email, and returns message when email is new', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);
      (otpRepo.create as jest.Mock).mockImplementation((d) => d);

      const result = await service.requestSignUpOtp('new@test.com');

      expect(otpRepo.delete).toHaveBeenCalledWith({
        email: 'new@test.com',
        purpose: 'signup',
      });
      expect(otpRepo.save).toHaveBeenCalled();
      expect(mailService.sendOtpEmail).toHaveBeenCalledWith(
        'new@test.com',
        expect.stringMatching(/^\d{6}$/),
        'signup',
      );
      expect(result).toEqual({
        message: 'Verification code sent to your email',
      });
    });
  });

  describe('verifySignUp', () => {
    it('throws BadRequestException when no OTP found', async () => {
      (otpRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifySignUp('user@test.com', '123456', 'Name', 'password'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifySignUp('user@test.com', '123456', 'Name', 'password'),
      ).rejects.toThrow('Invalid or expired verification code');
    });

    it('throws BadRequestException when OTP expired', async () => {
      const expired = validOtp('signup');
      expired.expiresAt = new Date(Date.now() - 1000);
      (otpRepo.findOne as jest.Mock).mockResolvedValue(expired);

      await expect(
        service.verifySignUp('user@test.com', '123456', 'Name', 'password'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifySignUp('user@test.com', '123456', 'Name', 'password'),
      ).rejects.toThrow('Verification code has expired');
    });

    it('throws BadRequestException when code does not match', async () => {
      (otpRepo.findOne as jest.Mock).mockResolvedValue(validOtp('signup'));

      await expect(
        service.verifySignUp('user@test.com', '000000', 'Name', 'password'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifySignUp('user@test.com', '000000', 'Name', 'password'),
      ).rejects.toThrow('Invalid verification code');
    });

    it('creates user and returns accessToken when OTP valid', async () => {
      (otpRepo.findOne as jest.Mock).mockResolvedValue(validOtp('signup'));
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);
      (usersRepo.create as jest.Mock).mockImplementation((d) => d);
      (usersRepo.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifySignUp(
        'user@test.com',
        '123456',
        'Test User',
        'password',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(usersRepo.create).toHaveBeenCalledWith({
        email: 'user@test.com',
        name: 'Test User',
        password: 'hashed-password',
        type: 'user',
      });
      expect(usersRepo.save).toHaveBeenCalled();
      expect(otpRepo.remove).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('requestForgotPasswordOtp', () => {
    it('returns generic message when user does not exist (no leak)', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.requestForgotPasswordOtp('nobody@test.com');

      expect(otpRepo.save).not.toHaveBeenCalled();
      expect(mailService.sendOtpEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'If an account exists with this email, a code has been sent',
      });
    });

    it('creates OTP and sends email when user exists', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (otpRepo.create as jest.Mock).mockImplementation((d) => d);

      const result = await service.requestForgotPasswordOtp('user@test.com');

      expect(otpRepo.delete).toHaveBeenCalledWith({
        email: 'user@test.com',
        purpose: 'forgot_password',
      });
      expect(otpRepo.save).toHaveBeenCalled();
      expect(mailService.sendOtpEmail).toHaveBeenCalledWith(
        'user@test.com',
        expect.stringMatching(/^\d{6}$/),
        'forgot_password',
      );
      expect(result).toEqual({
        message: 'If an account exists with this email, a code has been sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException when no OTP', async () => {
      (otpRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resetPassword('user@test.com', '123456', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when OTP expired', async () => {
      const expired = validOtp('forgot_password');
      expired.expiresAt = new Date(Date.now() - 1000);
      (otpRepo.findOne as jest.Mock).mockResolvedValue(expired);

      await expect(
        service.resetPassword('user@test.com', '123456', 'newpass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password and returns message when OTP valid', async () => {
      (otpRepo.findOne as jest.Mock).mockResolvedValue(
        validOtp('forgot_password'),
      );
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (usersRepo.save as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.resetPassword(
        'user@test.com',
        '123456',
        'newpass',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(usersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-password' }),
      );
      expect(otpRepo.remove).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });
  });

  describe('findUserById', () => {
    it('returns user when found', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findUserById('user-uuid-1');

      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      (usersRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findUserById('missing');

      expect(result).toBeNull();
    });
  });
});
