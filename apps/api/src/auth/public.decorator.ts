import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Endpoint sin sesión (registro y login). Todo lo demás requiere token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
