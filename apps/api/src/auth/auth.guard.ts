import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from './public.decorator';

/** Request con el usuario que dejó el guard. */
export type AuthedRequest = Request & { userId?: string };

/**
 * Guard global: exige `Authorization: Bearer <token>` salvo en los endpoints `@Public()`.
 * Deja el id del usuario en la request para `@CurrentUserId()`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Iniciá sesión para continuar');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      request.userId = payload.sub;
    } catch {
      throw new UnauthorizedException('La sesión venció: volvé a iniciar sesión');
    }
    return true;
  }
}
