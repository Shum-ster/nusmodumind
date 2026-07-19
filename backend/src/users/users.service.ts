import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateUserIfAcademicProfileAllowed(
    id: string,
    now: Date,
    data: Prisma.UserUpdateInput,
  ): Promise<User | null> {
    const result = await this.prisma.user.updateMany({
      where: {
        id,
        OR: [
          { academicProfileChangeAllowedAt: null },
          { academicProfileChangeAllowedAt: { lte: now } },
        ],
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findUserById(id);
  }
}
