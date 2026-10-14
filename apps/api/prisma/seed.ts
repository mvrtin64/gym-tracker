import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { DEMO_USER_ID } from '../src/common/current-user.decorator';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, email: 'demo@gymtracker.dev', name: 'Demo' },
  });

  // Multiarticulares: pocas reps. Monoarticulares: más reps (ver SCHEME_PRESETS en @gym/domain).
  const compound = { type: 'compound', repMin: 5, repMax: 8 } as const;
  const isolation = { type: 'isolation', repMin: 10, repMax: 15, weightIncrementKg: 2 } as const;
  const exercises = [
    { name: 'Press banca', muscleGroup: 'chest', startingWeightKg: 40, ...compound },
    { name: 'Press militar', muscleGroup: 'shoulders', startingWeightKg: 25, ...compound, weightIncrementKg: 1.25 },
    { name: 'Elevaciones laterales', muscleGroup: 'shoulders', startingWeightKg: 6, ...isolation },
    { name: 'Extensión de tríceps en polea', muscleGroup: 'arms', startingWeightKg: 15, ...isolation },
    { name: 'Sentadilla', muscleGroup: 'legs', startingWeightKg: 60, ...compound, weightIncrementKg: 5 },
    { name: 'Remo con barra', muscleGroup: 'back', startingWeightKg: 40, ...compound },
    { name: 'Curl con mancuernas', muscleGroup: 'arms', startingWeightKg: 10, ...isolation },
  ] as const;

  const ids: Record<string, string> = {};
  for (const e of exercises) {
    const row = await prisma.exercise.upsert({
      where: { userId_name: { userId: DEMO_USER_ID, name: e.name } },
      update: {},
      create: { ...e, userId: DEMO_USER_ID },
    });
    ids[e.name] = row.id;
  }

  const routines = {
    Empuje: ['Press banca', 'Press militar', 'Elevaciones laterales', 'Extensión de tríceps en polea'],
    'Pierna y tirón': ['Sentadilla', 'Remo con barra', 'Curl con mancuernas'],
  };
  for (const [name, names] of Object.entries(routines)) {
    await prisma.routine.upsert({
      where: { userId_name: { userId: DEMO_USER_ID, name } },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        name,
        exercises: { create: names.map((n, position) => ({ exerciseId: ids[n], position })) },
      },
    });
  }

  // Una sesión de "Empuje" de hace 3 días, para ver la comparación con la última vez.
  const empuje = await prisma.routine.findUniqueOrThrow({ where: { userId_name: { userId: DEMO_USER_ID, name: 'Empuje' } } });
  if ((await prisma.workoutSession.count({ where: { routineId: empuje.id } })) === 0) {
    const past: Record<string, [number, number[]]> = {
      'Press banca': [40, [8, 7, 6]],
      'Press militar': [25, [8, 8, 8]],
      'Elevaciones laterales': [6, [15, 13, 12]],
      'Extensión de tríceps en polea': [15, [12, 11, 10]],
    };
    await prisma.workoutSession.create({
      data: {
        userId: DEMO_USER_ID,
        routineId: empuje.id,
        performedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        entries: {
          create: Object.entries(past).map(([n, [weightKg, reps]], position) => ({
            exerciseId: ids[n],
            position,
            sets: { create: reps.map((r, j) => ({ weightKg, reps: r, position: j })) },
          })),
        },
      },
    });
  }
  console.log(`Seed listo: usuario demo, ${exercises.length} ejercicios y ${Object.keys(routines).length} rutinas.`);
}

main().finally(() => prisma.$disconnect());
