import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from './admin.guard';
import { User } from '../../users/user.entity';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  const adminUser: User = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@test.com',
    type: 'admin',
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const regularUser: User = {
    id: 'user-1',
    name: 'User',
    email: 'user@test.com',
    type: 'user',
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  function createContext(user: User | undefined): ExecutionContext {
    const request = { user };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminGuard],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('returns true when user is admin', () => {
    const ctx = createContext(adminUser);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user is not admin', () => {
    const ctx = createContext(regularUser);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Admin access required');
  });

  it('throws ForbiddenException when user is missing', () => {
    const ctx = createContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Authentication required');
  });
});
