import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(input: CreateUserDto) {
    const entity = this.usersRepository.create({
      username: input.username,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      isPublic: input.isPublic ?? false,
    });
    return this.usersRepository.save(entity);
  }

  async findByUsername(username: string) {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setPublicFlag(id: string, isPublic: boolean) {
    await this.usersRepository.update({ id }, { isPublic });
    return this.findById(id);
  }
}
