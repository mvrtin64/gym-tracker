-- CreateEnum
CREATE TYPE "JointPain" AS ENUM ('none', 'mild', 'moderate', 'severe');

-- CreateEnum
CREATE TYPE "Soreness" AS ENUM ('never_sore', 'healed_early', 'healed_just_in_time', 'still_sore');

-- AlterTable
ALTER TABLE "ExerciseEntry" ADD COLUMN     "jointPain" "JointPain";

-- CreateTable
CREATE TABLE "MuscleSoreness" (
    "sessionId" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "soreness" "Soreness" NOT NULL,

    CONSTRAINT "MuscleSoreness_pkey" PRIMARY KEY ("sessionId","muscle")
);

-- AddForeignKey
ALTER TABLE "MuscleSoreness" ADD CONSTRAINT "MuscleSoreness_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
