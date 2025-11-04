import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as { id?: unknown } | undefined;
    if (!user || typeof user.id !== 'string') {
      throw new BadRequestException('Invalid user context');
    }
    return { id: user.id };
  },
);
