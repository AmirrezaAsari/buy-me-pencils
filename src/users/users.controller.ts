import { Body, Controller, Headers, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // One-time admin creation, protected by setup token
  @Post()
  async createAdmin(
    @Body() body: CreateUserDto,
    @Headers('x-admin-setup-token') token?: string,
  ) {
    const isValid = this.authService.validateAdminSetupToken(token);

    if (!isValid) {
      // Generic error to avoid leaking token details
      throw new Error('Invalid admin setup token');
    }

    return this.usersService.createAdmin(body);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(id, body);
  }
}

