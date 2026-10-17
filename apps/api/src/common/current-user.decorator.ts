import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../auth/auth.guard';

/** Id del usuario autenticado, que deja el `AuthGuard` global a partir del token. */
export const CurrentUserId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  const { userId } = context.switchToHttp().getRequest<AuthedRequest>();
  if (!userId) throw new UnauthorizedException('Iniciá sesión para continuar');
  return userId;
});
