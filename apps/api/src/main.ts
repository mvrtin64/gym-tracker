import 'dotenv/config';
import { createApp } from './app.factory';

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 para que el celular lo alcance por la red local.
  await app.listen(port, '0.0.0.0');
}

bootstrap();
