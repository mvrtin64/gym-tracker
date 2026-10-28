// Tests de integración: levantan la API entera contra una base aparte (gym_tracker_test).
// Se compilan con tsc porque Nest necesita la metadata de los decoradores, que esbuild (vitest) no emite.
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import 'dotenv/config';

const fallback = (process.env.DATABASE_URL ?? 'postgresql://gym:gym@localhost:5432/gym_tracker').replace(/\/[^/?]+(\?|$)/, '/gym_tracker_test$1');
const env = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? fallback,
  JWT_SECRET: process.env.JWT_SECRET || 'secreto-de-los-tests',
};
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env });

// migrate deploy crea la base si no existe; el seed carga el catálogo (y es idempotente).
run('npx prisma migrate deploy');
run('npx prisma db seed');
run('npx tsc -p tsconfig.e2e.json');

const dir = 'dist-e2e/test';
const files = readdirSync(dir).filter((f) => f.endsWith('.e2e.js')).map((f) => `${dir}/${f}`);
run(`node --disable-warning=ExperimentalWarning --test --test-concurrency=1 ${files.join(' ')}`);
