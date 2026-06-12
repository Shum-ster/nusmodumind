import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
  };

  const user = { id: 1, email: 'test@example.com' };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(user),
      login: jest.fn().mockResolvedValue({ access_token: 'signed-token' }),
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

  it('returns the current user for me', () => {
    expect(controller.getMe(user)).toEqual(user);
  });
});
