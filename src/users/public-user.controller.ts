import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { PublicUserService } from './public-user.service';

/**
 * Public user endpoints. No authentication. Only non-sensitive data.
 */
@Controller('users/public')
export class PublicUserController {
  constructor(private readonly publicUserService: PublicUserService) {}

  @Get(':userId')
  async getPublicProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ name: string }> {
    const profile = await this.publicUserService.getPublicName(userId);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }
}
