import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService extends BaseRepository<User> {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly i18n: I18nService,
  ) {
    super(usersRepository);
  }

  async createAdmin(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Attempting to create admin user with email=${createUserDto.email}`);
    const existingAdmin = await this.usersRepository.findOne({
      where: { type: 'admin' },
    });

    if (existingAdmin) {
      this.logger.warn('Admin user creation attempted but admin already exists');
      const message = await this.i18n.translate('errors.users.admin_already_exists');
      throw new ForbiddenException(message);
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      type: 'admin',
    });

    const saved = await this.usersRepository.save(user);
    this.logger.log(`Admin user created with id=${saved.id}`);
    return saved;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      const message = await this.i18n.translate('errors.users.not_found');
      throw new ForbiddenException(message);
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }
}

