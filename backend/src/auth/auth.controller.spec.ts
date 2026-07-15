import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
  };

  const user = { id: 'user-id', email: 'test@example.com' };
  const profile = {
    id: 'user-id',
    email: 'test@example.com',
    username: 'Jason',
    faculty: null,
    degree: null,
    graduationYear: 2030,
    matriculationYear: 2026,
    lifestylePreferences: null,
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(user),
      login: jest.fn().mockResolvedValue({ access_token: 'signed-token' }),
      getProfile: jest.fn().mockResolvedValue(profile),
      updateProfile: jest.fn().mockResolvedValue(profile),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('registers a user', async () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    await expect(controller.register(registerDto)).resolves.toEqual(user);
    expect(authService.register).toHaveBeenCalledWith(registerDto);
  });

  it('logs in the current user', async () => {
    await expect(controller.login(user)).resolves.toEqual({
      access_token: 'signed-token',
    });
    expect(authService.login).toHaveBeenCalledWith(user);
  });

  it('returns the current user profile for me', async () => {
    await expect(controller.getMe(user)).resolves.toEqual(profile);
    expect(authService.getProfile).toHaveBeenCalledWith('user-id');
  });

  it('updates the current user profile', async () => {
    const updateProfileDto = {
      username: 'Jason',
      faculty: 'School of Computing',
      degree: 'Computer Science',
      graduationYear: 2030,
      matriculationYear: 2026,
      lifestylePreferences: 'Prefer morning classes',
    };

    await expect(controller.updateMe(user, updateProfileDto)).resolves.toEqual(
      profile,
    );
    expect(authService.updateProfile).toHaveBeenCalledWith(
      'user-id',
      updateProfileDto,
    );
  });
});
