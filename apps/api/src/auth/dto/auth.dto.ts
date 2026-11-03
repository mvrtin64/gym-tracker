import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** " Demo@Mail.com " → "demo@mail.com", antes de validar. */
const NormalizeEmail = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString() @MinLength(1)
  password: string;
}

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsString() @MinLength(8, { message: 'La contraseña tiene que tener al menos 8 caracteres' }) @MaxLength(128)
  password: string;

  @IsString() @MinLength(1, { message: 'Poné tu nombre' }) @MaxLength(60)
  name: string;
}

export class VerifyEmailDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  /** Acepta "123 456": se sacan los espacios antes de validar. */
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s/g, '') : value))
  @Matches(/^\d{6}$/, { message: 'El código tiene 6 números' })
  code: string;
}

export class ResendCodeDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;
}
