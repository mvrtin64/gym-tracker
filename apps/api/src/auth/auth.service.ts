import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const publicUser = ({ id, email, name }: User) => ({ id, email, name });

@Injectable()
export class AuthService {
  /** Hash de relleno: si el email no existe se verifica igual, para que no se note por el tiempo de respuesta. */
  private readonly dummyHash = hashPassword('sin-cuenta');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const user = await this.prisma.user.create({
        data: { email: normalizeEmail(dto.email), name: dto.name.trim(), passwordHash: await hashPassword(dto.password) },
      });
      return this.session(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya hay una cuenta con ese email');
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? (await this.dummyHash));
    if (!user?.passwordHash || !valid) throw new UnauthorizedException('Email o contraseña incorrectos');
    return this.session(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('La cuenta no existe');
    return publicUser(user);
  }

  private async session(user: User) {
    return { token: await this.jwt.signAsync({ sub: user.id }), user: publicUser(user) };
  }
}
