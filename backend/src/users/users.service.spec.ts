import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  const user = {
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        create: jest.fn().mockResolvedValue(user),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
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
      password: 'hashed-password',
    };

    await expect(service.createUser(data)).resolves.toEqual(user);
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });
});
