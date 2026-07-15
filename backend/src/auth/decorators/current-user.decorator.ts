import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../shared/types';

type RequestWithUser = Request & {
  user: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator<unknown, AuthenticatedUser>(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
