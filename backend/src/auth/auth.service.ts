import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AiPlannerService } from '../ai_planner/ai-planner.service';
import type {
  AuthenticatedUser,
  LoginResponse,
  UserProfile,
} from '../shared/types';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export const academicProfileCooldownMs = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly aiPlannerService: AiPlannerService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthenticatedUser> {
    const { email, password } = registerDto;
    const existingUser = await this.usersService.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await this.usersService.createUser({
      email,
      passwordHash,
    });

    return {
      id: newUser.id,
      email: newUser.email,
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
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

    const updateData: Prisma.UserUpdateInput = {};
    const nextFaculty = getNextNullableString(
      updateProfileDto.faculty,
      user.faculty,
    );
    const nextDegree = getNextNullableString(
      updateProfileDto.degree,
      user.degree,
    );
    const nextMatriculationYear =
      updateProfileDto.matriculationYear === undefined
        ? user.matriculationYear
        : updateProfileDto.matriculationYear;
    const academicIdentityChanged =
      nextFaculty !== user.faculty ||
      nextDegree !== user.degree ||
      nextMatriculationYear !== user.matriculationYear;
    const hasCompleteAcademicIdentity =
      Boolean(nextFaculty) &&
      Boolean(nextDegree) &&
      nextMatriculationYear !== null;
    const now = new Date();
    const academicProfileIsLocked =
      user.academicProfileChangeAllowedAt instanceof Date &&
      user.academicProfileChangeAllowedAt.getTime() > now.getTime();

    if (academicIdentityChanged && !hasCompleteAcademicIdentity) {
      throw new BadRequestException(
        'Faculty, major, and matriculation year are required to update the academic profile',
      );
    }

    if (academicIdentityChanged && academicProfileIsLocked) {
      throw createAcademicProfileCooldownException(
        user.academicProfileChangeAllowedAt!,
      );
    }

    if (updateProfileDto.username !== undefined) {
      updateData.username = normalizeNullableString(updateProfileDto.username);
    }

    if (updateProfileDto.graduationYear !== undefined) {
      updateData.graduationYear = updateProfileDto.graduationYear;
    }

    if (updateProfileDto.matriculationYear !== undefined) {
      updateData.matriculationYear = updateProfileDto.matriculationYear;
    }

    if (updateProfileDto.faculty !== undefined) {
      updateData.faculty = normalizeNullableString(updateProfileDto.faculty);
    }

    if (updateProfileDto.degree !== undefined) {
      updateData.degree = normalizeNullableString(updateProfileDto.degree);
    }

    if (updateProfileDto.lifestylePreferences !== undefined) {
      updateData.lifestylePreferences = normalizeNullableString(
        updateProfileDto.lifestylePreferences,
      );
    }

    await this.addPasswordUpdate(
      user.passwordHash,
      updateProfileDto,
      updateData,
    );

    const shouldGenerateRequirements =
      hasCompleteAcademicIdentity &&
      (academicIdentityChanged ||
        (user.graduationRequirements == null && !academicProfileIsLocked));

    if (!shouldGenerateRequirements) {
      const updatedUser = await this.usersService.updateUser(
        userId,
        updateData,
      );

      return this.toUserProfile(updatedUser);
    }

    const graduationRequirements = await this.generateRequirementsIfAvailable({
      degree: nextDegree!,
      faculty: nextFaculty!,
      matriculationYear: nextMatriculationYear,
    });

    if (!graduationRequirements) {
      const updatedUser =
        await this.usersService.updateUserIfAcademicProfileAllowed(
          userId,
          now,
          updateData,
        );

      if (!updatedUser) {
        const latestUser = await this.usersService.findUserById(userId);

        if (latestUser?.academicProfileChangeAllowedAt) {
          throw createAcademicProfileCooldownException(
            latestUser.academicProfileChangeAllowedAt,
          );
        }

        throw new ConflictException(
          'The academic profile changed in another request. Refresh and try again.',
        );
      }

      return this.toUserProfile(updatedUser);
    }

    const academicProfileChangeAllowedAt = new Date(
      now.getTime() + academicProfileCooldownMs,
    );

    updateData.graduationRequirements = graduationRequirements;
    updateData.academicProfileChangeAllowedAt = academicProfileChangeAllowedAt;

    const updatedUser =
      await this.usersService.updateUserIfAcademicProfileAllowed(
        userId,
        now,
        updateData,
      );

    if (!updatedUser) {
      const latestUser = await this.usersService.findUserById(userId);

      if (latestUser?.academicProfileChangeAllowedAt) {
        throw createAcademicProfileCooldownException(
          latestUser.academicProfileChangeAllowedAt,
        );
      }

      throw new ConflictException(
        'The academic profile changed in another request. Refresh and try again.',
      );
    }

    return this.toUserProfile(updatedUser);
  }

  private async generateRequirementsIfAvailable(input: {
    degree: string;
    faculty: string;
    matriculationYear: number;
  }) {
    try {
      return await this.aiPlannerService.generateDegreeRequirements(input);
    } catch {
      return null;
    }
  }

  login(user: AuthenticatedUser): LoginResponse {
    return {
      access_token: this.jwtService.sign({ email: user.email, sub: user.id }),
    };
  }

  private async addPasswordUpdate(
    passwordHash: string,
    updateProfileDto: UpdateProfileDto,
    updateData: Prisma.UserUpdateInput,
  ) {
    const isChangingPassword =
      updateProfileDto.currentPassword !== undefined ||
      updateProfileDto.newPassword !== undefined;

    if (!isChangingPassword) {
      return;
    }

    if (!updateProfileDto.currentPassword || !updateProfileDto.newPassword) {
      throw new BadRequestException(
        'Current password and new password are required to change password',
      );
    }

    if (
      !(await bcrypt.compare(updateProfileDto.currentPassword, passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    updateData.passwordHash = await bcrypt.hash(
      updateProfileDto.newPassword,
      10,
    );
  }

  private toUserProfile(user: {
    id: string;
    email: string;
    username: string | null;
    faculty: string | null;
    degree: string | null;
    graduationYear: number | null;
    matriculationYear: number | null;
    lifestylePreferences: string | null;
    graduationRequirements: Prisma.JsonValue | null;
    academicProfileChangeAllowedAt: Date | null;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      faculty: user.faculty,
      degree: user.degree,
      graduationYear: user.graduationYear,
      matriculationYear: user.matriculationYear,
      lifestylePreferences: user.lifestylePreferences,
      academicProfileChangeAllowedAt:
        user.academicProfileChangeAllowedAt?.toISOString() ?? null,
      hasGraduationRequirements: user.graduationRequirements != null,
    };
  }
}

function getNextNullableString(
  value: string | null | undefined,
  currentValue: string | null,
) {
  return value === undefined ? currentValue : normalizeNullableString(value);
}

function normalizeNullableString(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function createAcademicProfileCooldownException(allowedAt: Date) {
  return new ConflictException({
    message: `Academic profile can be changed again after ${allowedAt.toISOString()}`,
    academicProfileChangeAllowedAt: allowedAt.toISOString(),
  });
}
