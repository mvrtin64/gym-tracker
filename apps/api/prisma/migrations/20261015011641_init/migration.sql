-- CreateEnum
CREATE TYPE "Muscle" AS ENUM ('front_delt', 'side_delt', 'rear_delt', 'chest', 'upper_back', 'lats', 'biceps', 'triceps', 'abs', 'quads', 'hamstrings', 'glutes', 'calves');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('compound', 'isolation');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "Focus" AS ENUM ('general', 'lower', 'upper', 'specific');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- CreateEnum
CREATE TYPE "Feel" AS ENUM ('failure', 'one_two_left', 'several_left', 'very_easy');

-- CreateEnum
CREATE TYPE "RoutineOrigin" AS ENUM ('manual', 'generated');

-- CreateEnum
CREATE TYPE "AdjustMode" AS ENUM ('suggest', 'auto');

-- CreateEnum
CREATE TYPE "VolumeChangeStatus" AS ENUM ('suggested', 'applied', 'dismissed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProfile" (
    "userId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "trainingDays" "Weekday"[],
    "focus" "Focus" NOT NULL DEFAULT 'general',
    "priorityMuscles" "Muscle"[],
    "preferredRepMin" INTEGER,
    "preferredRepMax" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MuscleVolume" (
    "userId" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "weeklySets" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MuscleVolume_pkey" PRIMARY KEY ("userId","muscle")
);

-- CreateTable
CREATE TABLE "VolumeChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "VolumeChangeStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolumeChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ExerciseType" NOT NULL,
    "targetMuscles" "Muscle"[],
    "defaultTarget" "Muscle" NOT NULL,
    "demoUrl" TEXT,
    "coachTip" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserExercise" (
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "note" TEXT,
    "weightIncrementKg" DOUBLE PRECISION NOT NULL,
    "startingWeightKg" DOUBLE PRECISION NOT NULL,
    "deloadFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "failuresBeforeDeload" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "UserExercise_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" "RoutineOrigin" NOT NULL DEFAULT 'manual',
    "adjustMode" "AdjustMode" NOT NULL DEFAULT 'suggest',
    "weekday" "Weekday",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "routineId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "targetMuscle" "Muscle" NOT NULL,
    "sets" INTEGER NOT NULL,
    "repMin" INTEGER NOT NULL,
    "repMax" INTEGER NOT NULL,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("routineId","exerciseId")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeload" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "targetMuscle" "Muscle" NOT NULL,

    CONSTRAINT "ExerciseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetEntry" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "warmup" BOOLEAN NOT NULL DEFAULT false,
    "feel" "Feel",
    "rpe" DOUBLE PRECISION,
    "rir" DOUBLE PRECISION,

    CONSTRAINT "SetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "VolumeChange_userId_createdAt_idx" ON "VolumeChange"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_ownerId_name_key" ON "Exercise"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Routine_userId_name_key" ON "Routine"("userId", "name");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_performedAt_idx" ON "WorkoutSession"("userId", "performedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_routineId_performedAt_idx" ON "WorkoutSession"("routineId", "performedAt");

-- CreateIndex
CREATE INDEX "ExerciseEntry_exerciseId_idx" ON "ExerciseEntry"("exerciseId");

-- AddForeignKey
ALTER TABLE "TrainingProfile" ADD CONSTRAINT "TrainingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MuscleVolume" ADD CONSTRAINT "MuscleVolume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolumeChange" ADD CONSTRAINT "VolumeChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExercise" ADD CONSTRAINT "UserExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExercise" ADD CONSTRAINT "UserExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEntry" ADD CONSTRAINT "ExerciseEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseEntry" ADD CONSTRAINT "ExerciseEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetEntry" ADD CONSTRAINT "SetEntry_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ExerciseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
