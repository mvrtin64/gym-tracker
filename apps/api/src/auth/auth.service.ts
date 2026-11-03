import {
  BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { User } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, ResendCodeDto, VerifyEmailDto } from './dto/auth.dto';
import { hashPassword, verifyPassword } from './password';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const publicUser = ({ id, email, name }: User) => ({ id, email, name });

/** El código vence a los 15 minutos, admite 5 intentos y se puede pedir otro cada 60 segundos. */
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const hashCode = (code: string) => createHash('sha256').update(code).digest();

/** Respuesta de registro y login cuando falta confirmar el mail: no hay sesión todavía. */
export interface VerificationRequired {
  verificationRequired: true;
  email: string;
}

@Injectable()
export class AuthService {
  /** Hash de relleno: si el email no existe se verifica igual, para que no se note por el tiempo de respuesta. */
  private readonly dummyHash = hashPassword('sin-cuenta');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  /**
   * Crea la cuenta sin verificar y manda el código. Si el email ya estaba registrado pero nunca se
   * verificó, se pisan nombre y contraseña: sin el código nadie puede usarla igual.
   */
  async register(dto: RegisterDto): Promise<VerificationRequired> {
    const email = normalizeEmail(dto.email);
    const data = { name: dto.name.trim(), passwordHash: await hashPassword(dto.password) };
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.emailVerifiedAt) throw new ConflictException('Ya hay una cuenta con ese email');
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data })
      : await this.prisma.user.create({ data: { email, ...data } });
    await this.sendCode(user);
    return { verificationRequired: true, email };
  }

  /** Con la contraseña correcta pero el mail sin verificar, manda un código en vez de abrir sesión. */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? (await this.dummyHash));
    if (!user?.passwordHash || !valid) throw new UnauthorizedException('Email o contraseña incorrectos');
    if (!user.emailVerifiedAt) {
      if (!this.inCooldown(user)) await this.sendCode(user);
      return { verificationRequired: true, email: user.email } satisfies VerificationRequired;
    }
    return this.session(user);
  }

  /** Confirma el código: la cuenta queda verificada y se abre la sesión. */
  async verify(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    if (!user || user.emailVerifiedAt || !user.verificationCodeHash || !user.verificationExpiresAt) {
      throw new BadRequestException('No hay un código pendiente para ese email');
    }
    if (user.verificationExpiresAt < new Date()) throw new BadRequestException('El código venció: pedí otro');
    if (user.verificationAttempts >= MAX_ATTEMPTS) throw new BadRequestException('Demasiados intentos: pedí otro código');
    if (!timingSafeEqual(hashCode(dto.code), Buffer.from(user.verificationCodeHash, 'hex'))) {
      await this.prisma.user.update({ where: { id: user.id }, data: { verificationAttempts: { increment: 1 } } });
      throw new BadRequestException('Código incorrecto');
    }
    const verified = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verificationCodeHash: null, verificationExpiresAt: null, verificationAttempts: 0 },
    });
    return this.session(verified);
  }

  /** Manda otro código. Si el email no existe o ya está verificado no hace nada, y no lo dice. */
  async resend(dto: ResendCodeDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: normalizeEmail(dto.email) } });
    if (!user || user.emailVerifiedAt) return;
    if (this.inCooldown(user)) {
      throw new HttpException('Esperá un minuto antes de pedir otro código', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.sendCode(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('La cuenta no existe');
    return publicUser(user);
  }

  private inCooldown(user: User): boolean {
    return !!user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS;
  }

  /** Código nuevo de 6 dígitos: reemplaza al anterior y reinicia los intentos. */
  private async sendCode(user: User): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCodeHash: hashCode(code).toString('hex'),
        verificationExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
        verificationAttempts: 0,
        verificationSentAt: now,
      },
    });
    await this.mail.send({
      to: user.email,
      subject: `Tu código de Gym Tracker: ${code}`,
      text: `Hola ${user.name}:\n\nTu código para confirmar el mail es ${code}. Vence en 15 minutos.\n\nSi no te registraste en Gym Tracker, ignorá este mail.`,
    });
  }

  private async session(user: User) {
    return { token: await this.jwt.signAsync({ sub: user.id }), user: publicUser(user) };
  }
}
