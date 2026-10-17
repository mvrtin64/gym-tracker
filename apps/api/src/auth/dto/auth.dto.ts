import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
