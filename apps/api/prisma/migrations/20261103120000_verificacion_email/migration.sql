-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationCodeHash" TEXT,
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationSentAt" TIMESTAMP(3);

-- Las cuentas que ya existían quedan verificadas: no se las deja afuera.
UPDATE "User" SET "emailVerifiedAt" = "createdAt";
