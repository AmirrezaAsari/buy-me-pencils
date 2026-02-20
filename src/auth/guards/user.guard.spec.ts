import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserGuard } from './user.guard';
import { AuthService } from '../auth.service';
import { User } from '../../users/user.entity';

describe('UserGuard', () => {
  let guard: UserGuard;
  let jwtService: jest.Mocked<JwtService>;
  let authService: jest.Mocked<AuthService>;

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

  function createMockContext(authHeader: string | undefined): ExecutionContext {
    const request = { headers: { authorization: authHeader } } as any;
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockJwt = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: mockUser.id }),
    };
    const mockAuth = {
      findUserById: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuard,
        { provide: JwtService, useValue: mockJwt },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();

    guard = module.get<UserGuard>(UserGuard);
    jwtService = module.get(JwtService);
    authService = module.get(AuthService);
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    const ctx = createMockContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Missing or invalid authorization token',
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when Authorization is not Bearer', async () => {
    const ctx = createMockContext('Basic xyz');

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('attaches user to request and returns true when token is valid', async () => {
    const ctx = createMockContext('Bearer valid-token');
    const request = (ctx.switchToHttp() as any).getRequest();

    const result = await guard.canActivate(ctx);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(authService.findUserById).toHaveBeenCalledWith(mockUser.id);
    expect(request.user).toEqual(mockUser);
    expect(result).toBe(true);
  });

  it('throws UnauthorizedException when user not found', async () => {
    (authService.findUserById as jest.Mock).mockResolvedValue(null);
    const ctx = createMockContext('Bearer valid-token');

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('User not found');
  });

  it('throws UnauthorizedException when token is invalid or expired', async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid'));
    const ctx = createMockContext('Bearer bad-token');

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Invalid or expired token',
    );
  });
});
