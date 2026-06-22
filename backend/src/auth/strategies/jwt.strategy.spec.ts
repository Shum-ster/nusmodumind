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

  it('maps the JWT payload to the current user shape', () => {
    const strategy = new JwtStrategy({
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService);

    expect(
      strategy.validate({ sub: 'user-id', email: 'test@example.com' }),
    ).toEqual({
      id: 'user-id',
      email: 'test@example.com',
    });
  });
});
