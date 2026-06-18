import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findUserByEmail: jest.Mock;
    createUser: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const userWithPassword = {
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
  };

  beforeEach(() => {
    usersService = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a new user without returning the password', async () => {
    usersService.findUserByEmail.mockResolvedValue(null);
    usersService.createUser.mockImplementation((data) =>
      Promise.resolve({ id: 'user-id', ...data }),
    );

    const result = await service.register({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(usersService.findUserByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'test@example.com',
      passwordHash: expect.not.stringMatching(/^password123$/),
    });
    await expect(
      bcrypt.compare(
        'password123',
        usersService.createUser.mock.calls[0][0].passwordHash,
      ),
    ).resolves.toBe(true);
    expect(result).toEqual({ id: 'user-id', email: 'test@example.com' });
  });

  it('throws when registering with an existing email', async () => {
    usersService.findUserByEmail.mockResolvedValue(userWithPassword);

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('validates a user when the password matches', async () => {
    const hashedPassword = await bcrypt.hash('password123', 1);
    usersService.findUserByEmail.mockResolvedValue({
      ...userWithPassword,
      passwordHash: hashedPassword,
    });

    await expect(
      service.validateUser('test@example.com', 'password123'),
    ).resolves.toEqual({ id: 'user-id', email: 'test@example.com' });
  });

  it('returns null when the user does not exist', async () => {
    usersService.findUserByEmail.mockResolvedValue(null);

    await expect(
      service.validateUser('missing@example.com', 'password123'),
    ).resolves.toBeNull();
  });

  it('returns null when the password does not match', async () => {
    const hashedPassword = await bcrypt.hash('password123', 1);
    usersService.findUserByEmail.mockResolvedValue({
      ...userWithPassword,
      passwordHash: hashedPassword,
    });

    await expect(
      service.validateUser('test@example.com', 'wrong-password'),
    ).resolves.toBeNull();
  });

  it('signs a login payload', async () => {
    await expect(
      service.login({ id: 'user-id', email: 'test@example.com' }),
    ).resolves.toEqual({ access_token: 'signed-token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      email: 'test@example.com',
      sub: 'user-id',
    });
  });
});
