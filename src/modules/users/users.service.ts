import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private sanitize(user: User) {
    const { passwordHash: _p, ...rest } = user;
    return rest;
  }

  async findAll() {
    const rows = await this.usersRepo.find();
    return rows.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string) {
    return this.usersRepo.findOne({ where: { googleId } });
  }

  async upsertGoogleUser(data: {
    googleId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!data.email) {
      throw new BadRequestException('Google account has no email');
    }
    let user = await this.findByGoogleId(data.googleId);
    if (user) {
      user.lastLoginAt = new Date();
      await this.usersRepo.save(user);
      return this.sanitize(user);
    }
    const byEmail = await this.findByEmail(data.email);
    if (byEmail) {
      byEmail.googleId = data.googleId;
      byEmail.lastLoginAt = new Date();
      const saved = await this.usersRepo.save(byEmail);
      return this.sanitize(saved);
    }
    const created = this.usersRepo.create({
      email: data.email,
      googleId: data.googleId,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      passwordHash: null,
      role: UserRole.MEMBER,
    });
    const saved = await this.usersRepo.save(created);
    return this.sanitize(saved);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
    });
    const saved = await this.usersRepo.save(user);
    return this.sanitize(saved);
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; role: UserRole }) {
    if (actor.role === UserRole.MEMBER && actor.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    if (actor.role === UserRole.MEMBER && (dto.role !== undefined || dto.isActive !== undefined)) {
      throw new BadRequestException('Members cannot change role or active status');
    }
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.email) user.email = dto.email;
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.role !== undefined && actor.role !== UserRole.MEMBER) {
      user.role = dto.role;
    }
    if (dto.isActive !== undefined && actor.role !== UserRole.MEMBER) {
      user.isActive = dto.isActive;
    }
    if (dto.biometricEnabled !== undefined) {
      user.biometricEnabled = dto.biometricEnabled;
    }
    const saved = await this.usersRepo.save(user);
    return this.sanitize(saved);
  }

  async remove(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepo.remove(user);
    return { deleted: true };
  }
}
