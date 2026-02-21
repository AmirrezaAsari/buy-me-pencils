import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

/**
 * Public-facing user data. No auth. Only returns non-sensitive fields.
 */
@Injectable()
export class PublicUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Get public profile (name only) by userId. Returns null if not found.
   */
  async getPublicName(userId: string): Promise<{ name: string } | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['name'],
    });
    if (!user) return null;
    return { name: user.name };
  }
}
