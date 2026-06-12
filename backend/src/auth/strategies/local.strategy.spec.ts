import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  beforeEach(() => {
    authService = {
      validateUser: jest
        .fn()
        .mockResolvedValue({ id: 1, email: 'test@example.com' }),
    };

    strategy = new LocalStrategy(authService as unknown as AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('returns the validated user', async () => {
    await expect(
      strategy.validate('test@example.com', 'password123'),
    ).resolves.toEqual({ id: 1, email: 'test@example.com' });
    expect(authService.validateUser).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
  });

  it('throws when credentials are invalid', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      strategy.validate('test@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
