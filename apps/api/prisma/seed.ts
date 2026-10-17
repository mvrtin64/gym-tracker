import 'dotenv/config';
import { MUSCLES, SCHEME_PRESETS, type ExerciseType, type Muscle } from '@gym/domain';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/auth/password';
import { PrismaClient } from '../src/generated/prisma/client';

/** Usuario de demo: demo@gymtracker.dev / demo1234. */
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'demo1234';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/** Tip del coach para los ejercicios de dorsales. */
const LATS_TIP = 'Tirá desde el codo, no desde la mano, para sentir la contracción.';

interface CatalogItem {
  name: string;
  type: ExerciseType;
  /** El primero es el enfoque por defecto. */
  targets: Muscle[];
  coachTip?: string;
}

const c = (name: string, ...targets: Muscle[]): CatalogItem => ({ name, type: 'compound', targets });
const i = (name: string, ...targets: Muscle[]): CatalogItem => ({ name, type: 'isolation', targets });

/** Catálogo global inicial. Las demos y el resto de los tips los carga el coach. */
const CATALOG: CatalogItem[] = [
  // Pecho
  c('Press banca', 'chest'),
  c('Press inclinado con mancuernas', 'chest'),
  c('Fondos en paralelas', 'chest', 'triceps'),
  i('Aperturas en polea', 'chest'),
  // Hombro
  c('Press militar', 'front_delt'),
  i('Elevaciones frontales', 'front_delt'),
  i('Elevaciones laterales', 'side_delt'),
  i('Elevaciones laterales en polea', 'side_delt'),
  i('Face pull', 'rear_delt', 'upper_back'),
  i('Pájaros con mancuernas', 'rear_delt'),
  // Espalda
  { ...c('Dominadas', 'lats'), coachTip: LATS_TIP },
  { ...c('Jalón al pecho', 'lats'), coachTip: LATS_TIP },
  { ...c('Remo con mancuerna a una mano', 'lats', 'upper_back'), coachTip: LATS_TIP },
  i('Pullover en polea', 'lats'),
  c('Remo con barra', 'upper_back', 'lats'),
  c('Remo sentado en polea', 'upper_back', 'lats'),
  // Brazos
  i('Curl con barra', 'biceps'),
  i('Curl con mancuernas', 'biceps'),
  i('Curl martillo', 'biceps'),
  i('Extensión de tríceps en polea', 'triceps'),
  i('Press francés', 'triceps'),
  i('Extensión de tríceps sobre la cabeza', 'triceps'),
  // Pierna
  c('Sentadilla', 'quads', 'glutes'),
  c('Prensa', 'quads', 'glutes'),
  c('Sentadilla búlgara', 'glutes', 'quads'),
  i('Extensión de cuádriceps', 'quads'),
  c('Peso muerto rumano', 'hamstrings', 'glutes'),
  i('Curl femoral acostado', 'hamstrings'),
  i('Curl femoral sentado', 'hamstrings'),
  c('Hip thrust', 'glutes'),
  i('Patada de glúteo en polea', 'glutes'),
  i('Abducción de cadera en máquina', 'glutes'),
  i('Elevación de talones de pie', 'calves'),
  i('Elevación de talones sentado', 'calves'),
  // Abdominales
  i('Crunch en polea', 'abs'),
  i('Elevación de piernas colgado', 'abs'),
];

/** El ejemplo de docs/dominio.md: intermedio que prioriza glúteo, con poco volumen de tren superior. */
const DEMO_VOLUME: Record<Muscle, number> = {
  front_delt: 6, side_delt: 6, rear_delt: 4, chest: 6, upper_back: 4, lats: 6, biceps: 4,
  triceps: 4, abs: 4, quads: 9, hamstrings: 8, glutes: 12, calves: 6,
};

async function seedCatalog() {
  const ids: Record<string, string> = {};
  for (const item of CATALOG) {
    const data = {
      name: item.name,
      type: item.type,
      targetMuscles: item.targets,
      defaultTarget: item.targets[0],
      coachTip: item.coachTip ?? null,
    };
    // ownerId null no entra en un upsert por clave compuesta: se busca a mano.
    const existing = await prisma.exercise.findFirst({ where: { ownerId: null, name: item.name } });
    const row = existing
      ? await prisma.exercise.update({ where: { id: existing.id }, data })
      : await prisma.exercise.create({ data });
    ids[item.name] = row.id;
  }
  return ids;
}

async function main() {
  const ids = await seedCatalog();

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: { passwordHash },
    create: { id: DEMO_USER_ID, email: 'demo@gymtracker.dev', name: 'Demo', passwordHash },
  });
  await prisma.trainingProfile.upsert({
    where: { userId: DEMO_USER_ID },
    update: {},
    create: {
      userId: DEMO_USER_ID,
      level: 'intermediate',
      trainingDays: ['mon', 'wed', 'fri', 'sat'],
      focus: 'lower',
      priorityMuscles: ['glutes'],
    },
  });
  if ((await prisma.muscleVolume.count({ where: { userId: DEMO_USER_ID } })) === 0) {
    await prisma.muscleVolume.createMany({
      data: MUSCLES.map((muscle) => ({ userId: DEMO_USER_ID, muscle, weeklySets: DEMO_VOLUME[muscle] })),
    });
  }

  const preset = (name: string) => {
    const p = SCHEME_PRESETS[CATALOG.find((e) => e.name === name)!.type];
    return { sets: p.sets, repMin: p.repRange.min, repMax: p.repRange.max };
  };
  const routines: Record<string, { weekday: 'mon' | 'wed'; exercises: [string, Muscle?][] }> = {
    'Inferior (glúteo)': {
      weekday: 'mon',
      exercises: [['Hip thrust'], ['Sentadilla búlgara', 'glutes'], ['Peso muerto rumano'], ['Patada de glúteo en polea'], ['Elevación de talones de pie']],
    },
    'Superior': {
      weekday: 'wed',
      exercises: [['Press banca'], ['Jalón al pecho'], ['Elevaciones laterales'], ['Remo sentado en polea'], ['Curl con mancuernas'], ['Extensión de tríceps en polea']],
    },
  };
  for (const [name, r] of Object.entries(routines)) {
    await prisma.routine.upsert({
      where: { userId_name: { userId: DEMO_USER_ID, name } },
      update: {},
      create: {
        userId: DEMO_USER_ID,
        name,
        weekday: r.weekday,
        exercises: {
          create: r.exercises.map(([n, target], position) => ({
            exerciseId: ids[n],
            position,
            targetMuscle: target ?? CATALOG.find((e) => e.name === n)!.targets[0],
            ...preset(n),
          })),
        },
      },
    });
  }

  // Una sesión de "Superior" de hace 3 días, para ver la comparación con la última vez.
  const superior = await prisma.routine.findUniqueOrThrow({ where: { userId_name: { userId: DEMO_USER_ID, name: 'Superior' } } });
  if ((await prisma.workoutSession.count({ where: { routineId: superior.id } })) === 0) {
    const past: [string, Muscle, number, number[]][] = [
      ['Press banca', 'chest', 60, [8, 7, 6]],
      ['Jalón al pecho', 'lats', 50, [8, 8, 7]],
      ['Elevaciones laterales', 'side_delt', 8, [15, 13, 12]],
    ];
    await prisma.workoutSession.create({
      data: {
        userId: DEMO_USER_ID,
        routineId: superior.id,
        performedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        entries: {
          create: past.map(([n, targetMuscle, weightKg, reps], position) => ({
            exerciseId: ids[n],
            position,
            targetMuscle,
            sets: { create: reps.map((r, j) => ({ weightKg, reps: r, rpe: 9, rir: 1, position: j })) },
          })),
        },
      },
    });
  }
  console.log(`Seed listo: ${CATALOG.length} ejercicios en el catálogo, usuario demo con perfil, volumen y ${Object.keys(routines).length} rutinas.`);
}

main().finally(() => prisma.$disconnect());
