-- CreateEnum
CREATE TYPE "DeloadStatus" AS ENUM ('suggested', 'started', 'dismissed');

-- AlterTable
ALTER TABLE "VolumeChange" ADD COLUMN     "decidedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Deload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DeloadStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),

    CONSTRAINT "Deload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deload_userId_createdAt_idx" ON "Deload"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deload" ADD CONSTRAINT "Deload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
