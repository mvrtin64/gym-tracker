import { createParamDecorator } from '@nestjs/common';

/** Usuario de demo creado por el seed. */
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Id del usuario autenticado. Por ahora devuelve el usuario de demo;
 * al sumar autenticación (JWT) solo cambia esta función y los controllers quedan igual.
 */
export const CurrentUserId = createParamDecorator((): string => DEMO_USER_ID);
