import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('should be defined', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    expect(
      new JwtStrategy(configService as unknown as ConfigService),
    ).toBeDefined();
    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('maps the JWT payload to the current user shape', async () => {
    const strategy = new JwtStrategy({
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService);

    await expect(
      strategy.validate({ sub: 1, email: 'test@example.com' }),
    ).resolves.toEqual({ id: 1, email: 'test@example.com' });
  });
});
