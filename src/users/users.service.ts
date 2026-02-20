import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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
      throw new ForbiddenException('Admin user already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      type: 'admin',
    });

    const saved = await this.usersRepository.save(user);
    this.logger.log(`Admin user created with id=${saved.id}`);
    return saved;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const updates: Partial<User> = { ...updateUserDto };
    if (updateUserDto.password) {
      updates.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    Object.assign(user, updates);
    return this.usersRepository.save(user);
  }
}

