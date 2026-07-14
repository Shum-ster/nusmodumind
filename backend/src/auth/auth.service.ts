import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type {
  AuthenticatedUser,
  LoginResponse,
  UserProfile,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthenticatedUser> {
    const { email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.usersService.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hashing password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user in db
    const newUser = await this.usersService.createUser({
      email,
      passwordHash: hashedPassword,
    });

    return {
      id: newUser.id,
      email: newUser.email,
    };
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findUserByEmail(email);

    if (user) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        return {
          id: user.id,
          email: user.email,
        };
      }
    }

    return null;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User profile was not found');
    }

    return this.toUserProfile(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User profile was not found');
    }

    const isChangingPassword =
      updateProfileDto.currentPassword !== undefined ||
      updateProfileDto.newPassword !== undefined;
    const updateData: Parameters<UsersService['updateUser']>[1] = {};

    if (updateProfileDto.username !== undefined) {
      const username = updateProfileDto.username?.trim();

      updateData.username = username ? username : null;
    }

    if (updateProfileDto.graduationYear !== undefined) {
      updateData.graduationYear = updateProfileDto.graduationYear;
    }

    if (isChangingPassword) {
      if (!updateProfileDto.currentPassword || !updateProfileDto.newPassword) {
        throw new BadRequestException(
          'Current password and new password are required to change password',
        );
      }

      const isPasswordMatch = await bcrypt.compare(
        updateProfileDto.currentPassword,
        user.passwordHash,
      );

      if (!isPasswordMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      updateData.passwordHash = await bcrypt.hash(
        updateProfileDto.newPassword,
        10,
      );
    }

    const updatedUser = await this.usersService.updateUser(userId, updateData);

    return this.toUserProfile(updatedUser);
  }

  login(user: AuthenticatedUser): LoginResponse {
    const payload = { email: user.email, sub: user.id };
    // Sign the payload using secret key and return
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    username: string | null;
    faculty: string | null;
    degree: string | null;
    graduationYear: number | null;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      faculty: user.faculty,
      degree: user.degree,
      graduationYear: user.graduationYear,
    };
  }
}
