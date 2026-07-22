import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const user = {
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        create: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('finds a user by email', async () => {
    await expect(service.findUserByEmail('test@example.com')).resolves.toEqual(
      user,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('creates a user', async () => {
    const data = {
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    };

    await expect(service.createUser(data)).resolves.toEqual(user);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });

  it('finds a user by id', async () => {
    await expect(service.findUserById('user-id')).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
  });

  it('updates a user', async () => {
    const data = { username: 'Jason' };

    await expect(service.updateUser('user-id', data)).resolves.toEqual(user);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data,
    });
  });

  it('atomically updates an academic profile only after its cooldown', async () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    const data = {
      faculty: 'School of Computing',
      degree: 'Computer Science',
    };

    await expect(
      service.updateUserIfAcademicProfileAllowed('user-id', now, data),
    ).resolves.toEqual(user);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'user-id',
        OR: [
          { academicProfileChangeAllowedAt: null },
          { academicProfileChangeAllowedAt: { lte: now } },
        ],
      },
      data,
    });
  });

  it('returns null when another academic update owns the cooldown', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateUserIfAcademicProfileAllowed(
        'user-id',
        new Date('2026-07-19T00:00:00.000Z'),
        { degree: 'Computer Science' },
      ),
    ).resolves.toBeNull();
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(0);
  });
});
