import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser, JwtPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extracts bearer token from auth header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Reject tokens that have expired
      ignoreExpiration: false,

      // Use the same secret key used to sign the token
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }
  // Decodes token an returns payload
  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email };
  }
}
