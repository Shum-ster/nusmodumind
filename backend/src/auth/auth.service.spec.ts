import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AiPlannerService } from '../ai_planner/ai-planner.service';
import { UsersService } from '../users/users.service';
import { academicProfileCooldownMs, AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    updateUserIfAcademicProfileAllowed: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let aiPlannerService: { generateDegreeRequirements: jest.Mock };

  const generatedRequirements = {
    faculty: 'School of Computing',
    degree: 'Computer Science',
    matriculationYear: 2024,
    academicYear: 'AY2024/2025',
    coreRequirements: [],
    electiveBuckets: [],
    sources: [
      {
        title: 'www.comp.nus.edu.sg',
        url: 'https://www.comp.nus.edu.sg/cugresource/',
      },
    ],
    generatedAt: '2026-07-19T00:00:00.000Z',
    promptVersion: 'degree-requirements-v2',
  };
  const baseUser = {
    id: 'user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    username: null,
    faculty: null,
    degree: null,
    graduationYear: null,
    matriculationYear: null,
    lifestylePreferences: null,
    graduationRequirements: null,
    academicProfileChangeAllowedAt: null,
  };

  beforeEach(() => {
    usersService = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn().mockResolvedValue(baseUser),
      createUser: jest.fn(),
      updateUser: jest
        .fn()
        .mockImplementation((_userId, data) =>
          Promise.resolve({ ...baseUser, ...data }),
        ),
      updateUserIfAcademicProfileAllowed: jest
        .fn()
        .mockImplementation((_userId, _now, data) =>
          Promise.resolve({ ...baseUser, ...data }),
        ),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    aiPlannerService = {
      generateDegreeRequirements: jest
        .fn()
        .mockResolvedValue(generatedRequirements),
    };
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      aiPlannerService as unknown as AiPlannerService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
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
    const createUserCalls = usersService.createUser.mock.calls as Array<
      [{ email: string; passwordHash: string }]
    >;
    const payload = createUserCalls[0][0];

    expect(payload.email).toBe('test@example.com');
    await expect(
      bcrypt.compare('password123', payload.passwordHash),
    ).resolves.toBe(true);
    expect(result).toEqual({ id: 'user-id', email: 'test@example.com' });
  });

  it('rejects registration with an existing email', async () => {
    usersService.findUserByEmail.mockResolvedValue(baseUser);

    await expect(
      service.register({
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates matching credentials and signs login tokens', async () => {
    const passwordHash = await bcrypt.hash('password123', 1);
    usersService.findUserByEmail.mockResolvedValue({
      ...baseUser,
      passwordHash,
    });

    await expect(
      service.validateUser('test@example.com', 'password123'),
    ).resolves.toEqual({ id: 'user-id', email: 'test@example.com' });
    expect(service.login({ id: 'user-id', email: 'test@example.com' })).toEqual(
      { access_token: 'signed-token' },
    );
  });

  it('returns profile cooldown metadata without exposing requirements JSON', async () => {
    const allowedAt = new Date('2026-07-20T00:00:00.000Z');
    usersService.findUserById.mockResolvedValue({
      ...baseUser,
      graduationRequirements: generatedRequirements,
      academicProfileChangeAllowedAt: allowedAt,
    });

    await expect(service.getProfile('user-id')).resolves.toEqual({
      id: 'user-id',
      email: 'test@example.com',
      username: null,
      faculty: null,
      degree: null,
      graduationYear: null,
      matriculationYear: null,
      lifestylePreferences: null,
      academicProfileChangeAllowedAt: allowedAt.toISOString(),
      hasGraduationRequirements: true,
    });
  });

  it('generates and atomically stores requirements for a complete academic profile', async () => {
    const now = new Date('2026-07-19T04:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const result = await service.updateProfile('user-id', {
      faculty: '  School of Computing  ',
      degree: 'Computer Science',
      matriculationYear: 2024,
    });

    expect(aiPlannerService.generateDegreeRequirements).toHaveBeenCalledWith({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
    });
    expect(usersService.updateUser).not.toHaveBeenCalled();
    expect(
      usersService.updateUserIfAcademicProfileAllowed,
    ).toHaveBeenCalledWith(
      'user-id',
      now,
      expect.objectContaining({
        faculty: 'School of Computing',
        degree: 'Computer Science',
        matriculationYear: 2024,
        graduationRequirements: generatedRequirements,
        academicProfileChangeAllowedAt: new Date(
          now.getTime() + academicProfileCooldownMs,
        ),
      }),
    );
    expect(result.hasGraduationRequirements).toBe(true);
  });

  it.each([
    ['faculty', { faculty: 'College of Design and Engineering' }],
    ['major', { degree: 'Information Security' }],
    ['cohort', { matriculationYear: 2025 }],
  ])('regenerates when the %s changes', async (_label, change) => {
    const currentUser = {
      ...baseUser,
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      graduationRequirements: generatedRequirements,
    };
    usersService.findUserById.mockResolvedValue(currentUser);
    usersService.updateUserIfAcademicProfileAllowed.mockImplementation(
      (_userId, _now, data) => Promise.resolve({ ...currentUser, ...data }),
    );

    await service.updateProfile('user-id', change);

    expect(aiPlannerService.generateDegreeRequirements).toHaveBeenCalledTimes(
      1,
    );
  });

  it('does not call OpenAI for unchanged academic values or personal edits', async () => {
    const currentUser = {
      ...baseUser,
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      graduationRequirements: generatedRequirements,
    };
    usersService.findUserById.mockResolvedValue(currentUser);
    usersService.updateUser.mockImplementation((_userId, data) =>
      Promise.resolve({ ...currentUser, ...data }),
    );

    await service.updateProfile('user-id', {
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      graduationYear: 2028,
      lifestylePreferences: 'Prefer morning classes',
    });

    expect(aiPlannerService.generateDegreeRequirements).not.toHaveBeenCalled();
    expect(usersService.updateUser).toHaveBeenCalled();
  });

  it('generates missing requirements for a migrated complete profile', async () => {
    usersService.findUserById.mockResolvedValue({
      ...baseUser,
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
    });

    await service.updateProfile('user-id', { username: 'Student' });

    expect(aiPlannerService.generateDegreeRequirements).toHaveBeenCalledTimes(
      1,
    );
    expect(usersService.updateUserIfAcademicProfileAllowed).toHaveBeenCalled();
  });

  it('rejects incomplete academic changes before calling OpenAI', async () => {
    await expect(
      service.updateProfile('user-id', {
        faculty: 'School of Computing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(aiPlannerService.generateDegreeRequirements).not.toHaveBeenCalled();
    expect(usersService.updateUser).not.toHaveBeenCalled();
  });

  it('enforces the cooldown without calling OpenAI', async () => {
    const now = new Date('2026-07-19T04:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    usersService.findUserById.mockResolvedValue({
      ...baseUser,
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      graduationRequirements: generatedRequirements,
      academicProfileChangeAllowedAt: new Date(now.getTime() + 1000),
    });

    await expect(
      service.updateProfile('user-id', { degree: 'Information Security' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(aiPlannerService.generateDegreeRequirements).not.toHaveBeenCalled();
  });

  it('allows an academic change at the exact cooldown boundary', async () => {
    const now = new Date('2026-07-20T04:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    usersService.findUserById.mockResolvedValue({
      ...baseUser,
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      graduationRequirements: generatedRequirements,
      academicProfileChangeAllowedAt: now,
    });

    await service.updateProfile('user-id', {
      degree: 'Information Security',
    });

    expect(aiPlannerService.generateDegreeRequirements).toHaveBeenCalled();
  });

  it('saves the profile without requirements when OpenAI fails', async () => {
    aiPlannerService.generateDegreeRequirements.mockRejectedValue(
      new Error('provider unavailable'),
    );

    await expect(
      service.updateProfile('user-id', {
        faculty: 'School of Computing',
        degree: 'Computer Science',
        matriculationYear: 2024,
      }),
    ).resolves.toMatchObject({
      faculty: 'School of Computing',
      degree: 'Computer Science',
      matriculationYear: 2024,
      hasGraduationRequirements: false,
      academicProfileChangeAllowedAt: null,
    });
    expect(usersService.updateUser).not.toHaveBeenCalled();
    expect(
      usersService.updateUserIfAcademicProfileAllowed,
    ).toHaveBeenCalledWith(
      'user-id',
      expect.any(Date),
      expect.objectContaining({
        faculty: 'School of Computing',
        degree: 'Computer Science',
        matriculationYear: 2024,
      }),
    );
  });

  it('rejects the losing concurrent academic update', async () => {
    usersService.updateUserIfAcademicProfileAllowed.mockResolvedValue(null);
    usersService.findUserById
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce({
        ...baseUser,
        academicProfileChangeAllowedAt: new Date('2026-07-20T00:00:00.000Z'),
      });

    await expect(
      service.updateProfile('user-id', {
        faculty: 'School of Computing',
        degree: 'Computer Science',
        matriculationYear: 2024,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates and hashes password changes without calling OpenAI', async () => {
    const passwordHash = await bcrypt.hash('password123', 1);
    usersService.findUserById.mockResolvedValue({
      ...baseUser,
      passwordHash,
    });

    await service.updateProfile('user-id', {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    });

    const updateUserCalls = usersService.updateUser.mock.calls as Array<
      [string, { passwordHash: string }]
    >;
    const updateData = updateUserCalls[0][1];
    await expect(
      bcrypt.compare('newpassword123', updateData.passwordHash),
    ).resolves.toBe(true);
    expect(aiPlannerService.generateDegreeRequirements).not.toHaveBeenCalled();
  });
});
