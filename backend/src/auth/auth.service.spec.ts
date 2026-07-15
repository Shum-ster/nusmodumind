import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  const userWithPassword = {
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    username: null,
    faculty: null,
    degree: null,
    graduationYear: null,
    matriculationYear: null,
    lifestylePreferences: null,
  };

  beforeEach(() => {
    usersService = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
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
    const createUserCalls = usersService.createUser.mock.calls as [
      [{ email: string; passwordHash: string }],
    ];
    const createUserPayload = createUserCalls[0][0];

    expect(createUserPayload.email).toBe('test@example.com');
    expect(createUserPayload.passwordHash).not.toMatch(/^password123$/);
    await expect(
      bcrypt.compare('password123', createUserPayload.passwordHash),
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

  it('signs a login payload', () => {
    expect(service.login({ id: 'user-id', email: 'test@example.com' })).toEqual(
      {
        access_token: 'signed-token',
      },
    );
    expect(jwtService.sign).toHaveBeenCalledWith({
      email: 'test@example.com',
      sub: 'user-id',
    });
  });

  it('returns the current user profile without the password hash', async () => {
    usersService.findUserById.mockResolvedValue({
      ...userWithPassword,
      username: 'Jason',
      graduationYear: 2030,
    });

    await expect(service.getProfile('user-id')).resolves.toEqual({
      id: 'user-id',
      email: 'test@example.com',
      username: 'Jason',
      faculty: null,
      degree: null,
      graduationYear: 2030,
      matriculationYear: null,
      lifestylePreferences: null,
    });
  });

  it('updates academic and lifestyle profile information', async () => {
    usersService.findUserById.mockResolvedValue(userWithPassword);
    usersService.updateUser.mockImplementation((_userId, data) =>
      Promise.resolve({ ...userWithPassword, ...data }),
    );

    await expect(
      service.updateProfile('user-id', {
        faculty: '  School of Computing  ',
        degree: 'Computer Science',
        lifestylePreferences: '  Prefer morning classes  ',
      }),
    ).resolves.toMatchObject({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      lifestylePreferences: 'Prefer morning classes',
    });

    expect(usersService.updateUser).toHaveBeenCalledWith('user-id', {
      faculty: 'School of Computing',
      degree: 'Computer Science',
      lifestylePreferences: 'Prefer morning classes',
    });
  });

  it('requires the current password before changing password', async () => {
    const hashedPassword = await bcrypt.hash('password123', 1);

    usersService.findUserById.mockResolvedValue({
      ...userWithPassword,
      passwordHash: hashedPassword,
    });
    usersService.updateUser.mockResolvedValue({
      ...userWithPassword,
      passwordHash: 'next-hash',
    });

    await service.updateProfile('user-id', {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    });

    const updateUserCalls = usersService.updateUser.mock.calls as [
      [string, { passwordHash: string }],
    ];
    const updatePayload = updateUserCalls[0][1];

    expect(updatePayload.passwordHash).not.toBe('newpassword123');
    await expect(
      bcrypt.compare('newpassword123', updatePayload.passwordHash),
    ).resolves.toBe(true);
  });
});
